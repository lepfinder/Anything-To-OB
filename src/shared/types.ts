export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  description?: string;
  stars?: string;
  forks?: string;
  language?: string;
  license?: string;
}

export type GitHubPageType = 'repo' | 'file' | 'issue' | 'pull' | 'wiki' | 'other';

export interface ClipRequest {
  html: string;
  url: string;
  title: string;
  description: string;
  isGitHub?: boolean;
  pageType?: GitHubPageType;
  repoInfo?: GitHubRepoInfo;
  codeContent?: string;
  readmeContent?: string;
}

export interface ClipResult {
  title: string;
  content: string;
  url: string;
  date: string;
}

export interface SaveResult {
  success: boolean;
  filename: string;
  error?: string;
}

/** UI language; default Chinese when omitted. */
export type AppLocale = 'zh' | 'en';

/** UI colors. Default dark. */
export type AppTheme = 'dark' | 'light';

export interface AppSettings {
  folderName: string;
  /** When true (default), warn if URL already appears in vault clip index. */
  warnOnDuplicate?: boolean;
  /** Interface language. Default zh. */
  locale?: AppLocale;
  /** Light or dark chrome. Default dark. */
  theme?: AppTheme;
  /** AI summary and tags generation. */
  aiEnabled?: boolean;
  aiProvider?: string;
  aiConfigs?: Record<string, AiConfig>;
  aiPrompt?: string;
}

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}
