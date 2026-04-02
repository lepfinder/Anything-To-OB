import { saveDirectoryHandle, getDirectoryHandle, saveSetting, getSetting } from '../lib/storage';
import { applyDataI18n, resolveLocale, t } from '../shared/i18n';
import { applyTheme, resolveTheme } from '../shared/theme';
import type { AppLocale, AppSettings, AppTheme } from '../shared/types';

const vaultPathEl = document.getElementById('vault-path') as HTMLSpanElement;
const btnChoose = document.getElementById('btn-choose') as HTMLButtonElement;
const folderNameInput = document.getElementById('folder-name') as HTMLInputElement;
const warnDuplicateEl = document.getElementById('warn-duplicate') as HTMLInputElement | null;
const localeSelect = document.getElementById('locale-select') as HTMLSelectElement | null;
const themeSelect = document.getElementById('theme-select') as HTMLSelectElement | null;
const statusEl = document.getElementById('status') as HTMLDivElement;

function currentUiLocale(): AppLocale {
  return localeSelect?.value === 'en' ? 'en' : 'zh';
}

async function persistAppSettings(partial: Partial<AppSettings>): Promise<void> {
  const prev: Partial<AppSettings> = (await getSetting<AppSettings>('appSettings')) ?? {};
  const resolvedLocale: AppLocale = prev.locale === 'en' ? 'en' : 'zh';
  const resolvedTheme: AppTheme = prev.theme === 'light' ? 'light' : 'dark';
  const next: AppSettings = {
    folderName: partial.folderName ?? prev.folderName ?? 'Clippings',
    warnOnDuplicate:
      partial.warnOnDuplicate ?? (prev.warnOnDuplicate === false ? false : true),
    locale: partial.locale !== undefined ? partial.locale : resolvedLocale,
    theme: partial.theme !== undefined ? partial.theme : resolvedTheme,
  };
  await saveSetting<AppSettings>('appSettings', next);
}

function applyOptionsLocale(locale: AppLocale): void {
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  applyDataI18n(locale);
}

async function loadSettings(): Promise<void> {
  const settings = await getSetting<AppSettings>('appSettings');
  const locale = resolveLocale(settings);
  const theme = resolveTheme(settings);
  applyTheme(theme);
  applyOptionsLocale(locale);

  if (themeSelect) {
    themeSelect.value = theme;
  }
  if (localeSelect) {
    localeSelect.value = locale;
  }

  const handle = await getDirectoryHandle();
  vaultPathEl.textContent = handle ? handle.name : t(locale, 'optNotConfigured');

  if (settings?.folderName) {
    folderNameInput.value = settings.folderName;
  }
  if (warnDuplicateEl) {
    warnDuplicateEl.checked = settings?.warnOnDuplicate !== false;
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
  const loc = currentUiLocale();
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await saveDirectoryHandle(handle);
    vaultPathEl.textContent = handle.name;
    showStatus(t(loc, 'optStatusVaultSaved'), 'success');
  } catch (err) {
    if ((err as DOMException).name !== 'AbortError') {
      showStatus(t(loc, 'optStatusChooseDirFailed'), 'error');
    }
  }
});

folderNameInput.addEventListener('change', async () => {
  const loc = currentUiLocale();
  const folderName = folderNameInput.value.trim() || 'Clippings';
  folderNameInput.value = folderName;
  await persistAppSettings({ folderName });
  showStatus(t(loc, 'optStatusFolderSaved'), 'success');
});

warnDuplicateEl?.addEventListener('change', async () => {
  const loc = currentUiLocale();
  await persistAppSettings({ warnOnDuplicate: warnDuplicateEl.checked });
  showStatus(t(loc, 'optStatusDupSaved'), 'success');
});

localeSelect?.addEventListener('change', async () => {
  const loc = currentUiLocale();
  await persistAppSettings({ locale: loc });
  applyOptionsLocale(loc);
  const handle = await getDirectoryHandle();
  vaultPathEl.textContent = handle ? handle.name : t(loc, 'optNotConfigured');
  showStatus(t(loc, 'optStatusLangSaved'), 'success');
});

function currentTheme(): AppTheme {
  return themeSelect?.value === 'light' ? 'light' : 'dark';
}

themeSelect?.addEventListener('change', async () => {
  const loc = currentUiLocale();
  const th = currentTheme();
  await persistAppSettings({ theme: th });
  applyTheme(th);
  showStatus(t(loc, 'optStatusThemeSaved'), 'success');
});

void loadSettings();
