export interface ClipRequest {
  html: string;
  url: string;
  title: string;
  description: string;
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
