import { saveDirectoryHandle, getDirectoryHandle, saveSetting, getSetting } from '../lib/storage';
import { applyDataI18n, resolveLocale, t } from '../shared/i18n';
import { applyTheme, resolveTheme } from '../shared/theme';
import { AI_PROVIDERS, getProviderConfig, fetchOllamaModels } from '../lib/ai';
import type { AppLocale, AppSettings, AppTheme } from '../shared/types';

const vaultPathEl = document.getElementById('vault-path') as HTMLSpanElement;
const btnChoose = document.getElementById('btn-choose') as HTMLButtonElement;
const folderNameInput = document.getElementById('folder-name') as HTMLInputElement;
const warnDuplicateEl = document.getElementById('warn-duplicate') as HTMLInputElement | null;
const aiEnabledEl = document.getElementById('ai-enabled') as HTMLInputElement | null;
const aiProviderSelect = document.getElementById('ai-provider') as HTMLSelectElement | null;
const aiApiKeyEl = document.getElementById('ai-api-key') as HTMLInputElement | null;
const aiBaseUrlEl = document.getElementById('ai-base-url') as HTMLInputElement | null;
const aiModelEl = document.getElementById('ai-model') as HTMLInputElement | null;
const aiPromptEl = document.getElementById('ai-prompt') as HTMLTextAreaElement | null;
const aiConfigPanel = document.getElementById('ai-config') as HTMLDivElement | null;
const aiUrlField = document.getElementById('ai-url-field') as HTMLDivElement | null;
const aiModelList = document.getElementById('ai-model-list') as HTMLDataListElement | null;
const localeSelect = document.getElementById('locale-select') as HTMLSelectElement | null;
const themeSelect = document.getElementById('theme-select') as HTMLSelectElement | null;
const statusEl = document.getElementById('status') as HTMLDivElement;

const mainContent = document.querySelector('.main-content') as HTMLDivElement;
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.settings-section');

function currentUiLocale(): AppLocale {
  return localeSelect?.value === 'en' ? 'en' : 'zh';
}

async function persistAppSettings(partial: Partial<AppSettings>): Promise<void> {
  const prev: Partial<AppSettings> = (await getSetting<AppSettings>('appSettings')) ?? {};
  const currentLocale: AppLocale = prev.locale === 'en' ? 'en' : 'zh';
  const currentTheme: AppTheme = prev.theme === 'light' ? 'light' : 'dark';
  
  const next: AppSettings = {
    folderName: partial.folderName ?? prev.folderName ?? 'Clippings',
    warnOnDuplicate: partial.warnOnDuplicate ?? (prev.warnOnDuplicate === false ? false : true),
    locale: partial.locale !== undefined ? partial.locale : currentLocale,
    theme: partial.theme !== undefined ? partial.theme : currentTheme,
    aiEnabled: partial.aiEnabled !== undefined ? partial.aiEnabled : (prev.aiEnabled ?? false),
    aiProvider: partial.aiProvider !== undefined ? partial.aiProvider : (prev.aiProvider ?? 'deepseek'),
    aiConfigs: partial.aiConfigs !== undefined ? partial.aiConfigs : (prev.aiConfigs ?? {}),
    aiPrompt: partial.aiPrompt !== undefined ? partial.aiPrompt : (prev.aiPrompt ?? '')
  };
  await saveSetting<AppSettings>('appSettings', next);
}

function updateAiConfigVisibility(enabled: boolean): void {
  if (aiConfigPanel) {
    aiConfigPanel.style.display = enabled ? 'grid' : 'none';
  }
}

function updateUrlFieldVisibility(provider: string): void {
  if (aiUrlField) {
    const isCustom = provider === 'custom' || provider === 'ollama_remote';
    aiUrlField.style.display = isCustom ? 'flex' : 'none';
  }
}

async function tryFetchOllamaModels(baseUrl: string): Promise<void> {
  const list = document.getElementById('ai-model-list') as HTMLDataListElement | null;
  if (!list) return;
  
  const models = await fetchOllamaModels(baseUrl);
  if (models.length > 0) {
    list.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
    if (aiModelEl && !aiModelEl.value.trim()) {
      aiModelEl.value = models[0];
    }
  }
}

function updateAiFieldsUI(provider: string, config?: { apiKey: string; baseUrl: string; model: string }): void {
  const c = config || { apiKey: '', baseUrl: '', model: '' };
  if (aiApiKeyEl) aiApiKeyEl.value = c.apiKey;
  if (aiBaseUrlEl) aiBaseUrlEl.value = c.baseUrl;
  if (aiModelEl) aiModelEl.value = c.model;
  updateUrlFieldVisibility(provider);
  
  const isOllama = provider === 'ollama' || provider === 'ollama_remote';
  if (isOllama && c.baseUrl) {
    void tryFetchOllamaModels(c.baseUrl);
  } else if (aiModelList) {
    aiModelList.innerHTML = '';
  }
}

async function loadSettings(): Promise<void> {
  const settings = await getSetting<AppSettings>('appSettings');
  const locale = resolveLocale(settings);
  const theme = resolveTheme(settings);
  applyTheme(theme);
  applyOptionsLocale(locale);

  if (themeSelect) themeSelect.value = theme;
  if (localeSelect) localeSelect.value = locale;

  const handle = await getDirectoryHandle();
  vaultPathEl.textContent = handle ? handle.name : t(locale, 'optNotConfigured');

  if (settings) {
    if (folderNameInput) folderNameInput.value = settings.folderName || 'Clippings';
    if (warnDuplicateEl) warnDuplicateEl.checked = settings.warnOnDuplicate !== false;
    
    if (aiEnabledEl) {
      aiEnabledEl.checked = !!settings.aiEnabled;
      updateAiConfigVisibility(!!settings.aiEnabled);
    }
    
    const provider = settings.aiProvider || 'deepseek';
    if (aiProviderSelect) aiProviderSelect.value = provider;
    
    const config = settings.aiConfigs?.[provider];
    updateAiFieldsUI(provider, config);

    if (aiPromptEl) {
      aiPromptEl.value = settings.aiPrompt || t(locale, 'optDefaultPrompt');
    }
  }
}

function showStatus(message: string, type: 'success' | 'error'): void {
  statusEl.textContent = message;
  statusEl.className = `status visible ${type}`;
  setTimeout(() => {
    statusEl.className = 'status';
  }, 3000);
}

// Navigation Logic
function updateActiveNav(): void {
  let currentSection = '';
  sections.forEach(section => {
    const rect = section.getBoundingClientRect();
    // If the section top is near the top of the main area
    if (rect.top < 150) {
      currentSection = section.id;
    }
  });

  navItems.forEach(item => {
    const href = item.getAttribute('href')?.substring(1);
    item.classList.toggle('active', href === currentSection);
  });
}

mainContent?.addEventListener('scroll', updateActiveNav);

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = item.getAttribute('href')?.substring(1);
    const targetEl = document.getElementById(targetId || '');
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Event Listeners
btnChoose?.addEventListener('click', async () => {
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

folderNameInput?.addEventListener('change', async () => {
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

aiEnabledEl?.addEventListener('change', async () => {
  const loc = currentUiLocale();
  const enabled = aiEnabledEl.checked;
  updateAiConfigVisibility(enabled);
  await persistAppSettings({ aiEnabled: enabled });
  showStatus(t(loc, 'optStatusAiSaved'), 'success');
});

aiProviderSelect?.addEventListener('change', async () => {
  const loc = currentUiLocale();
  const provider = aiProviderSelect.value;
  
  const settings = await getSetting<AppSettings>('appSettings');
  const configs = settings?.aiConfigs || {};
  
  if (!configs[provider]) {
    const defaults = getProviderConfig(provider);
    if (defaults) {
      configs[provider] = { apiKey: '', baseUrl: defaults.url, model: defaults.defaultModel };
    } else {
      configs[provider] = { apiKey: '', baseUrl: '', model: '' };
    }
  }
  
  updateAiFieldsUI(provider, configs[provider]);
  await persistAppSettings({ aiProvider: provider, aiConfigs: configs });
  showStatus(t(loc, 'optStatusAiSaved'), 'success');
});

const btnToggleKey = document.getElementById('btn-toggle-key') as HTMLButtonElement | null;
btnToggleKey?.addEventListener('click', () => {
  if (aiApiKeyEl) {
    const isPassword = aiApiKeyEl.type === 'password';
    aiApiKeyEl.type = isPassword ? 'text' : 'password';
    btnToggleKey.textContent = isPassword ? '🙈' : '👁️';
  }
});

[aiApiKeyEl, aiBaseUrlEl, aiModelEl, aiPromptEl].forEach(el => {
  el?.addEventListener('change', async () => {
    const loc = currentUiLocale();
    const settings = await getSetting<AppSettings>('appSettings');
    const provider = aiProviderSelect?.value || 'deepseek';
    const configs = settings?.aiConfigs || {};
    
    configs[provider] = {
      apiKey: aiApiKeyEl?.value.trim() || '',
      baseUrl: aiBaseUrlEl?.value.trim() || '',
      model: aiModelEl?.value.trim() || '',
    };
    
    const isOllama = provider === 'ollama' || provider === 'ollama_remote';
    if (isOllama && configs[provider].baseUrl) {
      void tryFetchOllamaModels(configs[provider].baseUrl);
    }
    
    await persistAppSettings({ 
      aiConfigs: configs,
      aiPrompt: aiPromptEl?.value.trim() || ''
    });
    showStatus(t(loc, 'optStatusAiSaved'), 'success');
  });
});

localeSelect?.addEventListener('change', async () => {
  const loc = currentUiLocale();
  await persistAppSettings({ locale: loc });
  applyOptionsLocale(loc);
  const handle = await getDirectoryHandle();
  vaultPathEl.textContent = handle ? handle.name : t(loc, 'optNotConfigured');
  showStatus(t(loc, 'optStatusLangSaved'), 'success');
});

themeSelect?.addEventListener('change', async () => {
  const loc = currentUiLocale();
  const th = themeSelect?.value === 'light' ? 'light' : 'dark';
  await persistAppSettings({ theme: th });
  applyTheme(th);
  showStatus(t(loc, 'optStatusThemeSaved'), 'success');
});

void loadSettings();

function applyOptionsLocale(locale: AppLocale): void {
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  applyDataI18n(locale);
}
