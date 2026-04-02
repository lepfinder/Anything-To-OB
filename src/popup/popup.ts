import { clipPage } from '../lib/clipper';
import { saveToVault } from '../lib/file';
import { getDirectoryHandle, getSetting } from '../lib/storage';
import { applyDataI18n, formatSavedAt, resolveLocale, tf, t } from '../shared/i18n';
import { applyTheme, resolveTheme } from '../shared/theme';
import { findSavedAtForUrl, getExistingClipSubfolder, DEFAULT_CLIP_FOLDER } from '../lib/url-index';
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
      const sub = await getExistingClipSubfolder();
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

    // Save to vault
    const result: SaveResult = await saveToVault(clip);

    if (result.success) {
      showStatus(tf(uiLocale, 'popupSaved', { name: result.filename }), 'success');
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

async function init(): Promise<void> {
  await refreshPopupLocale();
  await loadTabInfo();
}

void init();

