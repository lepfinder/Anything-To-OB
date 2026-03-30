import { saveDirectoryHandle, getDirectoryHandle, saveSetting, getSetting } from '../lib/storage';
import type { AppSettings } from '../shared/types';

const vaultPathEl = document.getElementById('vault-path') as HTMLSpanElement;
const btnChoose = document.getElementById('btn-choose') as HTMLButtonElement;
const folderNameInput = document.getElementById('folder-name') as HTMLInputElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

async function loadSettings(): Promise<void> {
  const handle = await getDirectoryHandle();
  if (handle) {
    vaultPathEl.textContent = handle.name;
  }

  const settings = await getSetting<AppSettings>('appSettings');
  if (settings?.folderName) {
    folderNameInput.value = settings.folderName;
  }
}

function showStatus(message: string, type: 'success' | 'error'): void {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  setTimeout(() => {
    statusEl.className = 'status';
  }, 3000);
}

btnChoose.addEventListener('click', async () => {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await saveDirectoryHandle(handle);
    vaultPathEl.textContent = handle.name;
    showStatus('Vault directory saved', 'success');
  } catch (err) {
    if ((err as DOMException).name !== 'AbortError') {
      showStatus('Failed to select directory', 'error');
    }
  }
});

folderNameInput.addEventListener('change', async () => {
  const folderName = folderNameInput.value.trim() || 'Clippings';
  folderNameInput.value = folderName;
  await saveSetting<AppSettings>('appSettings', { folderName });
  showStatus('Folder name saved', 'success');
});

loadSettings();
