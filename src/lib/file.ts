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

function buildFilename(clip: ClipResult): string {
  const title = sanitizeFilename(clip.title);
  return `${clip.date}-${title}.md`;
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

export async function saveToVault(clip: ClipResult): Promise<SaveResult> {
  const vaultHandle = await getDirectoryHandle();
  if (!vaultHandle) {
    return { success: false, filename: '', error: 'Vault directory not configured' };
  }

  const settings = await getSetting<AppSettings>('appSettings');
  const folderName = settings?.folderName || DEFAULT_CLIP_FOLDER;

  try {
    // Verify permission
    const perm = await vaultHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      const req = await vaultHandle.requestPermission({ mode: 'readwrite' });
      if (req !== 'granted') {
        return { success: false, filename: '', error: 'Permission denied for vault directory' };
      }
    }

    // Get or create the subfolder
    const subfolder = await vaultHandle.getDirectoryHandle(folderName, { create: true });

    // Build filename and ensure uniqueness
    const filename = await findUniqueFilename(subfolder, buildFilename(clip));

    // Write the file
    const fileHandle = await subfolder.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(clip.content);
    await writable.close();

    try {
      await upsertUrlInIndex(subfolder, clip.url);
    } catch {
      // Index update failure should not undo a successful note write
    }

    return { success: true, filename };
  } catch (err) {
    return {
      success: false,
      filename: '',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
