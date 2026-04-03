import type { ClipResult, SaveResult, AppSettings } from '../shared/types';
import { getDirectoryHandle, getSetting } from './storage';
import { DEFAULT_CLIP_FOLDER, upsertUrlInIndex } from './url-index';

function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function getSourceName(url: string): string {
  const domain = new URL(url).hostname;
  if (domain.includes('github.com')) return 'GitHub';
  if (domain.includes('x.com') || domain.includes('twitter.com')) return 'X';
  if (domain.includes('mp.weixin.qq.com')) return 'WeChat';
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) return 'YouTube';
  if (domain.includes('xiaohongshu.com')) return 'Xiaohongshu';
  if (domain.includes('juejin.cn')) return 'Juejin';
  if (domain.includes('zhihu.com')) return 'Zhihu';
  if (domain.includes('bilibili.com')) return 'Bilibili';
  
  // Fallback: simplified domain name
  return domain.replace('www.', '').split('.')[0].toUpperCase();
}

function buildFilename(clip: ClipResult): string {
  const source = getSourceName(clip.url);
  const title = sanitizeFilename(clip.title);
  return `${clip.date}-[${source}]-${title}.md`;
}

async function findUniqueFilename(
  dirHandle: FileSystemDirectoryHandle,
  baseName: string,
): Promise<string> {
  let name = baseName;
  let counter = 1;
  const base = baseName.replace(/\.md$/, '');

  while (true) {
    try {
      await dirHandle.getFileHandle(name);
      // File exists, try next number
      name = `${base}-${counter}.md`;
      counter++;
    } catch {
      // File doesn't exist, use this name
      return name;
    }
  }
}

async function getRecursiveDirectoryHandle(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemDirectoryHandle> {
  // Normalize and split by / or \
  const parts = path.split(/[/\\]/).filter((p) => p.length > 0);
  let currentHandle = root;
  for (const part of parts) {
    currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
  }
  return currentHandle;
}

export async function saveToVault(clip: ClipResult): Promise<SaveResult> {
  const vaultHandle = await getDirectoryHandle();
  if (!vaultHandle) {
    return { success: false, filename: '', vaultName: '', error: 'Vault directory not configured' };
  }

  const settings = await getSetting<AppSettings>('appSettings');
  const baseFolderName = settings?.folderName || DEFAULT_CLIP_FOLDER;

  try {
    // 1. Verify permission
    const perm = await vaultHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      const req = await vaultHandle.requestPermission({ mode: 'readwrite' });
      if (req !== 'granted') {
        return { success: false, filename: '', vaultName: '', error: 'Permission denied for vault directory' };
      }
    }

    // 2. Access the base folder (for index)
    const baseFolder = await getRecursiveDirectoryHandle(vaultHandle, baseFolderName);

    // 3. Construct the nested path for the note (Year/Month)
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const noteSubPath = `${year}/${month}`;
    const noteFolderFull = `${baseFolderName}/${noteSubPath}`;
    
    // 4. Access/Create the note folder
    const noteFolder = await getRecursiveDirectoryHandle(vaultHandle, noteFolderFull);

    // 5. Build filename and ensure uniqueness within the monthly folder
    const filenameOnly = await findUniqueFilename(noteFolder, buildFilename(clip));

    // 6. Write the file
    const fileHandle = await noteFolder.getFileHandle(filenameOnly, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(clip.content);
    await writable.close();

    // 7. Update the global index (located in base folder)
    const relativeFilePath = `${noteSubPath}/${filenameOnly}`;
    try {
      await upsertUrlInIndex(baseFolder, clip.url, {
        title: clip.title,
        oneSentence: clip.oneSentence || '',
        filename: relativeFilePath,
      });
    } catch (err) {
      console.warn('[File] Index update failed:', err);
    }

    return { 
      success: true, 
      filename: relativeFilePath, // Path relative to BASE folder or VAULT? Let's use relative to BASE
      vaultName: vaultHandle.name 
    };
  } catch (err) {
    return {
      success: false,
      filename: '',
      vaultName: '',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
