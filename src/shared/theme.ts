import type { AppSettings, AppTheme } from './types';

export function resolveTheme(settings?: Partial<Pick<AppSettings, 'theme'>> | null): AppTheme {
  return settings?.theme === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: AppTheme): void {
  if (theme === 'light') {
    document.documentElement.dataset.theme = 'light';
  } else {
    delete document.documentElement.dataset.theme;
  }
}
