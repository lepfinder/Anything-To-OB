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

export interface AppSettings {
  folderName: string;
}
