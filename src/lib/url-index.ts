import type { AppSettings } from '../shared/types';
import { getDirectoryHandle, getSetting } from './storage';

export const DEFAULT_CLIP_FOLDER = 'Clippings';

/** Filename inside the clip folder; syncs with vault. */
export const CLIP_URL_INDEX_FILE = 'clip-url-index.json';

export interface UrlIndexItem {
  url: string;
  savedAt: string;
  title?: string;
  oneSentence?: string;
  filename?: string;
}

export interface UrlIndexFile {
  version: number;
  items: UrlIndexItem[];
}

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
] as const;

/** Stable string for dedup (hash stripped; common tracking params removed; host lowercased). */
export function normalizeUrlForIndex(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return raw.trim();
  }

  u.hash = '';
  for (const p of TRACKING_PARAMS) {
    u.searchParams.delete(p);
  }
  u.searchParams.sort();

  let pathname = u.pathname;
  if (pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  const host = u.hostname.toLowerCase();
  const origin = `${u.protocol}//${host}${u.port ? `:${u.port}` : ''}`;
  const rebuilt = new URL(pathname + u.search, origin);
  return rebuilt.toString();
}

export function emptyIndex(): UrlIndexFile {
  return { version: 1, items: [] };
}

function parseIndexJson(text: string): UrlIndexFile {
  const data = JSON.parse(text) as unknown;
  if (!data || typeof data !== 'object') return emptyIndex();
  const rec = data as Record<string, unknown>;
  const itemsRaw = rec.items;
  if (!Array.isArray(itemsRaw)) return emptyIndex();
  const items: UrlIndexItem[] = [];
  for (const row of itemsRaw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const url = typeof r.url === 'string' ? r.url : '';
    const savedAt = typeof r.savedAt === 'string' ? r.savedAt : '';
    if (url && savedAt) {
      items.push({
        url,
        savedAt,
        title: typeof r.title === 'string' ? r.title : undefined,
        oneSentence: typeof r.oneSentence === 'string' ? r.oneSentence : undefined,
        filename: typeof r.filename === 'string' ? r.filename : undefined,
      });
    }
  }
  return { version: 1, items };
}

export async function readUrlIndex(subfolder: FileSystemDirectoryHandle): Promise<UrlIndexFile> {
  try {
    const fh = await subfolder.getFileHandle(CLIP_URL_INDEX_FILE);
    const file = await fh.getFile();
    const text = await file.text();
    if (!text.trim()) return emptyIndex();
    const index = parseIndexJson(text);
    // Sync to local cache for instant lookup next time
    void syncUrlCacheToStorage(index);
    return index;
  } catch {
    return emptyIndex();
  }
}

/** Mirror normalized URLs to chrome.storage for permission-less instant lookup */
async function syncUrlCacheToStorage(index: UrlIndexFile): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage) return;

  const cache: Record<string, UrlIndexItem> = {};
  for (const item of index.items) {
    if (item.url) cache[item.url] = item;
  }
  await chrome.storage.local.set({ urlHistoryCache: cache });
}

export async function writeUrlIndex(
  subfolder: FileSystemDirectoryHandle,
  index: UrlIndexFile,
): Promise<void> {
  const fh = await subfolder.getFileHandle(CLIP_URL_INDEX_FILE, { create: true });
  const writable = await fh.createWritable();
  await writable.write(`${JSON.stringify(index, null, 2)}\n`);
  await writable.close();
  // Update cache immediately
  void syncUrlCacheToStorage(index);
}

/** Returns the full item if this normalized URL exists in the index. */
export async function findItemForUrl(
  subfolder: FileSystemDirectoryHandle,
  rawUrl: string,
): Promise<UrlIndexItem | null> {
  const key = normalizeUrlForIndex(rawUrl);
  const index = await readUrlIndex(subfolder);
  return index.items.find(i => i.url === key) ?? null;
}

export async function upsertUrlInIndex(
  subfolder: FileSystemDirectoryHandle,
  rawUrl: string,
  extra?: { title?: string; oneSentence?: string; filename?: string },
): Promise<void> {
  const key = normalizeUrlForIndex(rawUrl);
  
  // Use local ISO format for human readability in JSON
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localIso = new Date(now.getTime() - offset).toISOString().slice(0, 19).replace('T', ' ');
  
  const index = await readUrlIndex(subfolder);
  const idx = index.items.findIndex(i => i.url === key);
  
  const newItem: UrlIndexItem = { url: key, savedAt: localIso, ...extra };
  
  if (idx >= 0) {
    index.items[idx] = newItem;
  } else {
    // New item at the beginning
    index.items.unshift(newItem);
  }
  
  // Optional: keep index size within a reasonable limit if it gets too huge
  await writeUrlIndex(subfolder, index);
}

export async function verifyVaultReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const status = await handle.queryPermission({ mode: 'read' });
  return status === 'granted';
}

async function ensureVaultReadWrite(vaultHandle: FileSystemDirectoryHandle): Promise<boolean> {
  const perm = await vaultHandle.queryPermission({ mode: 'readwrite' });
  if (perm === 'granted') return true;
  
  try {
    const req = await vaultHandle.requestPermission({ mode: 'readwrite' });
    return req === 'granted';
  } catch (err) {
    console.warn('[Storage] Could not request permission (need user gesture):', err);
    return false;
  }
}

/**
 * Open clip subfolder without creating it. Used before first save to read index only.
 */
export async function getExistingClipSubfolder(request = false): Promise<FileSystemDirectoryHandle | null> {
  const vaultHandle = await getDirectoryHandle();
  if (!vaultHandle) return null;
  
  if (request) {
    if (!(await ensureVaultReadWrite(vaultHandle))) return null;
  } else {
    if (!(await verifyVaultReadPermission(vaultHandle))) return null;
  }

  const settings = await getSetting<AppSettings>('appSettings');
  const folderName = settings?.folderName?.trim() || DEFAULT_CLIP_FOLDER;

  const parts = folderName.split(/[/\\]/).filter((p) => p.length > 0);
  let currentHandle = vaultHandle;
  
  try {
    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part, { create: false });
    }
    return currentHandle;
  } catch {
    return null;
  }
}
