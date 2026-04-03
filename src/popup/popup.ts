import { clipPage } from '../lib/clipper';
import { saveToVault } from '../lib/file';
import { getDirectoryHandle, getSetting } from '../lib/storage';
import { applyDataI18n, formatSavedAt, resolveLocale, tf, t } from '../shared/i18n';
import { applyTheme, resolveTheme } from '../shared/theme';
import { extractAiMetadata } from '../lib/ai';
import {
  findSavedAtForUrl,
  getExistingClipSubfolder,
  DEFAULT_CLIP_FOLDER,
  readUrlIndex,
} from '../lib/url-index';
import type { AppLocale, AppSettings, ClipRequest, SaveResult } from '../shared/types';

const titleEl = document.getElementById('page-title') as HTMLDivElement;
const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
const btnText = btnSave.querySelector('.btn-text') as HTMLSpanElement;
const btnLoader = btnSave.querySelector('.btn-loader') as HTMLSpanElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement;

const dupOverlay = document.getElementById('dup-overlay') as HTMLDivElement;
const dupCard = dupOverlay.querySelector('.dup-card') as HTMLElement | null;
const dupTimeEl = document.getElementById('dup-time') as HTMLTimeElement;
const dupCancel = document.getElementById('dup-cancel') as HTMLButtonElement;
const dupConfirm = document.getElementById('dup-confirm') as HTMLButtonElement;

let saving = false;
let uiLocale: AppLocale = 'zh';

async function refreshPopupLocale(): Promise<void> {
  const settings = await getSetting<AppSettings>('appSettings');
  uiLocale = resolveLocale(settings);
  applyTheme(resolveTheme(settings));
  document.documentElement.lang = uiLocale === 'zh' ? 'zh-CN' : 'en';
  applyDataI18n(uiLocale);
}

/** Resolves true = proceed with save, false = user cancelled. */
function promptDuplicateSave(prevSavedAtIso: string): Promise<boolean> {
  return new Promise(resolve => {
    dupTimeEl.dateTime = prevSavedAtIso;
    dupTimeEl.textContent = formatSavedAt(prevSavedAtIso, uiLocale);
    dupOverlay.classList.remove('hidden');
    dupOverlay.setAttribute('aria-hidden', 'false');

    const cleanup = (proceed: boolean): void => {
      dupOverlay.classList.add('hidden');
      dupOverlay.setAttribute('aria-hidden', 'true');
      dupCancel.removeEventListener('click', onCancel);
      dupConfirm.removeEventListener('click', onConfirm);
      resolve(proceed);
    };

    const onCancel = (): void => cleanup(false);
    const onConfirm = (): void => cleanup(true);

    dupCancel.addEventListener('click', onCancel);
    dupConfirm.addEventListener('click', onConfirm);
    dupConfirm.focus();
  });
}

// Load current tab title
async function loadTabInfo(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    titleEl.textContent = tab.title || t(uiLocale, 'popupUntitled');
    titleEl.title = tab.title || '';

    // Disable save on unsupported pages
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      btnSave.disabled = true;
      showStatus(t(uiLocale, 'popupPageNotSupported'), 'error');
    }
  }
}

function showStatus(message: string, type: 'success' | 'error'): void {
  statusEl.textContent = message;
  statusEl.className = `status-container ${type}`;
}

function setSaving(value: boolean): void {
  saving = value;
  btnSave.disabled = value;
  btnText.textContent = value ? t(uiLocale, 'popupSaving') : t(uiLocale, 'popupSaveToObsidian');
  btnLoader.classList.toggle('hidden', !value);
}

async function save(): Promise<void> {
  if (saving) return;

  await refreshPopupLocale();

  // Check if vault is configured
  const handle = await getDirectoryHandle();
  if (!handle) {
    showStatus(t(uiLocale, 'popupVaultNotConfigured'), 'error');
    return;
  }

  statusEl.className = 'status-container';
  statusEl.textContent = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showStatus(t(uiLocale, 'popupNoActiveTab'), 'error');
      return;
    }

    // Extract page data from content script
    let pageData: ClipRequest;
    try {
      pageData = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PAGE' });
    } catch {
      showStatus(t(uiLocale, 'popupCannotAccessPage'), 'error');
      return;
    }

    // Clip
    const clip = clipPage(pageData);

    const appSettings = (await getSetting<AppSettings>('appSettings')) ?? { folderName: DEFAULT_CLIP_FOLDER };
    uiLocale = resolveLocale(appSettings);

    if (appSettings.warnOnDuplicate !== false) {
      // For duplicate check, we still need real folder access (needs click, we are in a click handler here)
      const sub = await getExistingClipSubfolder(true);
      if (sub) {
        const prevSavedAt = await findSavedAtForUrl(sub, pageData.url);
        if (prevSavedAt) {
          const proceed = await promptDuplicateSave(prevSavedAt);
          if (!proceed) {
            showStatus(t(uiLocale, 'popupSaveCancelled'), 'error');
            return;
          }
        }
      }
    }

    setSaving(true);

    // AI Enrichment
    const settingsForAi = await getSetting<AppSettings>('appSettings');
    console.log('[Popup] Current settings:', settingsForAi);
    if (settingsForAi?.aiEnabled) {
      console.log('[Popup] AI enabled, starting extraction...');
      showStatus(t(uiLocale, 'popupAiAnalyzing'), 'success');
      const aiResult = await extractAiMetadata(clip.content, clip.title);
      if (aiResult) {
        console.log('[Popup] AI metadata extracted:', aiResult);
        
        // If AI provides a better title, update the clip info
        if (aiResult.title && aiResult.title !== clip.title) {
          console.log(`[Popup] Renamed by AI: "${clip.title}" -> "${aiResult.title}"`);
          clip.title = aiResult.title;
        }

        const aiFields = `tags: [${aiResult.tags.join(', ')}]
summary: "${aiResult.oneSentence.replace(/"/g, '\\"')}"
description: "${aiResult.summary.replace(/"/g, '\\"')}"`;
        
        // Pass to clip object for storing in index
        clip.oneSentence = aiResult.oneSentence;

        // Update both the title in frontmatter and append AI fields
        clip.content = clip.content.replace(/^---\n([\s\S]*?)\n---/, (match, group1) => {
          const frontmatter = group1.replace(/^title:.*$/m, `title: ${clip.title}`);
          return `---\n${frontmatter}\n${aiFields}\n---`;
        });
      } else {
        console.warn('[Popup] AI extraction returned null.');
      }
    } else {
      console.log('[Popup] AI disabled in settings.');
    }

    // Save to vault
    const result: SaveResult = await saveToVault(clip);

    if (result.success) {
      const folderName = appSettings.folderName || DEFAULT_CLIP_FOLDER;
      const obsLink = `obsidian://open?vault=${encodeURIComponent(
        result.vaultName || '',
      )}&file=${encodeURIComponent(folderName + '/' + result.filename)}`;
      
      const successMsg = tf(uiLocale, 'popupSaved', { name: result.filename });
      const openLabel = t(uiLocale, 'popupOpenInObsidian');
      
      // Dynamic link for power users
      statusEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div>${successMsg}</div>
          <a href="${obsLink}" target="_blank" style="color: var(--accent-light); font-size: 11px; text-decoration: underline;">${openLabel} ↗</a>
        </div>
      `;
      statusEl.className = 'status-container success';

      // Refresh recent list (in background if permission exists)
      renderRecentClips();
    } else {
      if (result.error?.includes('Permission denied') || result.error?.includes('not configured')) {
        showStatus(t(uiLocale, 'popupNeedReauthorize'), 'error');
      } else {
        showStatus(`${t(uiLocale, 'popupErrorPrefix')}${result.error}`, 'error');
      }
    }
  } catch (err) {
    showStatus(err instanceof Error ? err.message : t(uiLocale, 'popupUnknownError'), 'error');
  } finally {
    setSaving(false);
  }
}

btnSave.addEventListener('click', save);

btnSettings.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Tabs configuration
const tabClipper = document.getElementById('tab-clipper') as HTMLButtonElement;
const tabHistory = document.getElementById('tab-history') as HTMLButtonElement;
const viewClipper = document.getElementById('view-clipper') as HTMLElement;
const viewHistory = document.getElementById('view-history') as HTMLElement;
const btnAuthHistory = document.getElementById('btn-auth-history') as HTMLButtonElement;
const historyLoading = document.getElementById('history-loading') as HTMLElement;
const historyAuth = document.getElementById('history-auth') as HTMLElement;

tabClipper.addEventListener('click', () => switchTab('clipper'));
tabHistory.addEventListener('click', () => {
  switchTab('history');
  renderRecentClips(true); // Automatically request permission on tab click!
});

btnAuthHistory.addEventListener('click', async () => {
  await renderRecentClips(true);
});

function switchTab(tab: 'clipper' | 'history') {
  if (tab === 'clipper') {
    tabClipper.classList.add('active');
    tabHistory.classList.remove('active');
    viewClipper.classList.add('active');
    viewHistory.classList.remove('active');
  } else {
    tabClipper.classList.remove('active');
    tabHistory.classList.add('active');
    viewClipper.classList.remove('active');
    viewHistory.classList.add('active');
  }
}

async function init(): Promise<void> {
  await refreshPopupLocale();
  await loadTabInfo();
}

void init();

async function renderRecentClips(forceRequest = false) {
  console.log('[Recent] Starting render process, forceRequest:', forceRequest);
  const listEl = document.getElementById('recent-list');
  if (!listEl || !historyLoading || !historyAuth) return;

  // Reset UI
  listEl.innerHTML = '';
  historyLoading.classList.remove('hidden');
  historyAuth.classList.add('hidden');

  const subfolder = await getExistingClipSubfolder(forceRequest);
  
  historyLoading.classList.add('hidden');

  if (!subfolder) {
    console.warn('[Recent] No subfolder handle - showing auth prompt');
    historyAuth.classList.remove('hidden');
    return;
  }

  console.log('[Recent] Found subfolder handle:', subfolder.name);

  try {
    const index = await readUrlIndex(subfolder);
    console.log('[Recent] Index loaded. Items:', index.items?.length || 0);
    
    if (!index.items || index.items.length === 0) {
      return;
    }

    renderItemsToList(index.items.slice(0, 10)); // Show more in the tab!
    console.log('[Recent] Render complete');
  } catch (err) {
    console.error('[Recent] Render failed with error:', err);
    historyAuth.classList.remove('hidden');
  }
}

async function renderItemsToList(items: any[]) {
  const listEl = document.getElementById('recent-list');
  if (!listEl) return;
  
  const settings = await getSetting<AppSettings>('appSettings');
  const vaultHandle = await getDirectoryHandle();
  const vaultName = vaultHandle?.name || '';
  const folderName = settings?.folderName || DEFAULT_CLIP_FOLDER;

  listEl.innerHTML = '';

  for (const item of items) {
    if (!item.filename || !item.title) continue;

    const obsLink = `obsidian://open?vault=${encodeURIComponent(
      vaultName,
    )}&file=${encodeURIComponent(folderName + '/' + item.filename)}`;

    // Time format: 08:30 or HH:mm
    let timeStr = '';
    if (item.savedAt) {
      if (item.savedAt.includes(' ')) {
        // format: "2026-04-03 08:30:00" -> "08:30"
        timeStr = item.savedAt.split(' ')[1].slice(0, 5);
      } else {
        // format: ISO -> 11:16
        timeStr = item.savedAt.slice(11, 16);
      }
    }

    const itemEl = document.createElement('a');
    itemEl.href = obsLink;
    itemEl.className = 'recent-item';
    itemEl.target = '_blank';
    itemEl.innerHTML = `
      <div class="recent-item-title">${item.title}</div>
      <div class="recent-item-summary">${item.oneSentence || ''}</div>
      <div class="recent-item-footer">
        <div class="recent-item-time">${timeStr}</div>
      </div>
    `;
    listEl.appendChild(itemEl);
  }
}
