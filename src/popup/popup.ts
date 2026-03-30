import { clipPage } from '../lib/clipper';
import { saveToVault } from '../lib/file';
import { getDirectoryHandle } from '../lib/storage';
import type { ClipRequest, SaveResult } from '../shared/types';

const titleEl = document.getElementById('page-title') as HTMLDivElement;
const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const btnSettings = document.getElementById('btn-settings') as HTMLAnchorElement;

let saving = false;

// Load current tab title
async function loadTabInfo(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    titleEl.textContent = tab.title || 'Untitled';
    titleEl.title = tab.title || '';

    // Disable save on unsupported pages
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      btnSave.disabled = true;
      showStatus('This page is not supported', 'error');
    }
  }
}

function showStatus(message: string, type: 'success' | 'error'): void {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function setSaving(value: boolean): void {
  saving = value;
  btnSave.disabled = value;
  btnSave.textContent = value ? 'Saving...' : 'Save to Obsidian';
  btnSave.classList.toggle('loading', value);
}

async function save(): Promise<void> {
  if (saving) return;

  // Check if vault is configured
  const handle = await getDirectoryHandle();
  if (!handle) {
    showStatus('Vault not configured — open Settings', 'error');
    return;
  }

  setSaving(true);
  statusEl.className = 'status';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showStatus('No active tab found', 'error');
      return;
    }

    // Extract page data from content script
    let pageData: ClipRequest;
    try {
      pageData = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PAGE' });
    } catch {
      showStatus('Cannot access this page', 'error');
      return;
    }

    // Clip with defuddle
    const clip = clipPage(pageData);

    // Save to vault
    const result: SaveResult = await saveToVault(clip);

    if (result.success) {
      showStatus(`Saved: ${result.filename}`, 'success');
    } else {
      if (result.error?.includes('Permission denied') || result.error?.includes('not configured')) {
        showStatus('Need to re-authorize vault — open Settings', 'error');
      } else {
        showStatus(`Error: ${result.error}`, 'error');
      }
    }
  } catch (err) {
    showStatus(err instanceof Error ? err.message : 'Unknown error', 'error');
  } finally {
    setSaving(false);
  }
}

btnSave.addEventListener('click', save);

btnSettings.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

loadTabInfo();
