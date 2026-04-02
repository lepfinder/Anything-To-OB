import type { AppSettings } from '../shared/types';
import { getDirectoryHandle, getSetting } from './storage';

export const DEFAULT_CLIP_FOLDER = 'Clippings';

/** Filename inside the clip folder; syncs with vault. */
export const CLIP_URL_INDEX_FILE = 'clip-url-index.json';

export interface UrlIndexItem {
  url: string;
  savedAt: string;
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
  if (pathname.length > 1 && pathname.endsWith('/')) {
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
    if (url && savedAt) items.push({ url, savedAt });
  }
  return { version: 1, items };
}

export async function readUrlIndex(subfolder: FileSystemDirectoryHandle): Promise<UrlIndexFile> {
  try {
    const fh = await subfolder.getFileHandle(CLIP_URL_INDEX_FILE);
    const file = await fh.getFile();
    const text = await file.text();
    if (!text.trim()) return emptyIndex();
    return parseIndexJson(text);
  } catch {
    return emptyIndex();
  }
}

export async function writeUrlIndex(
  subfolder: FileSystemDirectoryHandle,
  index: UrlIndexFile,
): Promise<void> {
  const fh = await subfolder.getFileHandle(CLIP_URL_INDEX_FILE, { create: true });
  const writable = await fh.createWritable();
  await writable.write(`${JSON.stringify(index, null, 2)}\n`);
  await writable.close();
}

/** Returns ISO savedAt if this normalized URL exists in the index. */
export async function findSavedAtForUrl(
  subfolder: FileSystemDirectoryHandle,
  rawUrl: string,
): Promise<string | null> {
  const key = normalizeUrlForIndex(rawUrl);
  const index = await readUrlIndex(subfolder);
  const hit = index.items.find(i => i.url === key);
  return hit?.savedAt ?? null;
}

export async function upsertUrlInIndex(
  subfolder: FileSystemDirectoryHandle,
  rawUrl: string,
): Promise<void> {
  const key = normalizeUrlForIndex(rawUrl);
  const savedAt = new Date().toISOString();
  const index = await readUrlIndex(subfolder);
  const idx = index.items.findIndex(i => i.url === key);
  if (idx >= 0) index.items[idx].savedAt = savedAt;
  else index.items.push({ url: key, savedAt });
  await writeUrlIndex(subfolder, index);
}

async function ensureVaultReadWrite(vaultHandle: FileSystemDirectoryHandle): Promise<boolean> {
  const perm = await vaultHandle.queryPermission({ mode: 'readwrite' });
  if (perm === 'granted') return true;
  const req = await vaultHandle.requestPermission({ mode: 'readwrite' });
  return req === 'granted';
}

/**
 * Open clip subfolder without creating it. Used before first save to read index only.
 */
export async function getExistingClipSubfolder(): Promise<FileSystemDirectoryHandle | null> {
  const vaultHandle = await getDirectoryHandle();
  if (!vaultHandle) return null;
  if (!(await ensureVaultReadWrite(vaultHandle))) return null;

  const settings = await getSetting<AppSettings>('appSettings');
  const folderName = settings?.folderName?.trim() || DEFAULT_CLIP_FOLDER;

  try {
    return await vaultHandle.getDirectoryHandle(folderName, { create: false });
  } catch {
    return null;
  }
}
