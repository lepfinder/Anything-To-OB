interface GitHubRepoInfo {
  owner: string;
  repo: string;
  description?: string;
  stars?: string;
  forks?: string;
  language?: string;
  license?: string;
}

interface GitHubPageData {
  html: string;
  url: string;
  title: string;
  description: string;
  isGitHub: boolean;
  pageType: 'repo' | 'file' | 'issue' | 'pull' | 'wiki' | 'other';
  repoInfo?: GitHubRepoInfo;
  codeContent?: string;
  readmeContent?: string;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_PAGE') {
    const data = extractGitHubPage();
    sendResponse(data);
  }
  return true; // Keep message channel open for async
});

/** Collapse stray whitespace/newlines inside URLs (some CMS HTML breaks long src attributes). */
function normalizeUrlAttr(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

/** Lazy-loaded images often use a 1×1 SVG or blank gif in `src` while the real URL lives in data-* attrs (e.g. WeChat MP). */
function isPlaceholderImageUrl(src: string | null | undefined): boolean {
  if (src == null) return true;
  const s = src.trim().toLowerCase();
  if (!s || s === 'about:blank') return true;
  if (s.startsWith('data:image/gif')) return true;
  if (s.startsWith('data:image/svg')) {
    if (s.includes('viewbox') && (s.includes('0 0 1 1') || s.includes('0,0,1,1'))) return true;
    if (s.includes('width') && s.includes('1px') && s.includes('height') && s.includes('1px')) return true;
  }
  return false;
}

const LAZY_IMG_SRC_ATTRS = [
  'data-src',
  'data-original',
  'data-lazy-src',
  'data-lazyload',
  'data-url',
  'data-img',
  'data-imgurl',
  'data-s',
  'data-lazyload-src',
  /** 部分腾讯系页面 */
  'data-backsrc',
  'data-graph-src',
  'data-before-load-src',
] as const;

const LAZY_IMG_SRCSET_ATTRS = ['data-srcset', 'data-original-srcset', 'data-lazy-srcset'] as const;

function firstUrlInSrcset(srcset: string | null | undefined): string | null {
  if (!srcset?.trim()) return null;
  const first = srcset.split(',')[0]?.trim();
  if (!first) return null;
  const url = first.split(/\s+/)[0];
  return url ? normalizeUrlAttr(url) : null;
}

function firstNonPlaceholderFromAttrs(el: Element, attrs: readonly string[]): string | null {
  for (const name of attrs) {
    const raw = el.getAttribute(name);
    if (!raw) continue;
    const v = normalizeUrlAttr(raw);
    if (v && !isPlaceholderImageUrl(v)) return v;
  }
  return null;
}

/** Rewrite lazy-load attributes to real src/srcset on a detached clone (does not touch the live page). */
function resolveLazyImagesInTree(root: ParentNode): void {
  root.querySelectorAll('picture > source').forEach(source => {
    let srcset = source.getAttribute('srcset');
    if (srcset) {
      const fixed = normalizeUrlAttr(srcset);
      if (fixed !== srcset) source.setAttribute('srcset', fixed);
      srcset = fixed;
    }
    const first = firstUrlInSrcset(srcset);
    const needBetter = !first || isPlaceholderImageUrl(first);
    if (!needBetter) return;
    const realSrcset = firstNonPlaceholderFromAttrs(source, LAZY_IMG_SRCSET_ATTRS);
    if (realSrcset) {
      source.setAttribute('srcset', normalizeUrlAttr(realSrcset));
      return;
    }
    const realSrc = firstNonPlaceholderFromAttrs(source, LAZY_IMG_SRC_ATTRS);
    if (realSrc) {
      source.setAttribute('srcset', realSrc);
    }
  });

  root.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    const srcNorm = src != null ? normalizeUrlAttr(src) : '';
    if (srcNorm && srcNorm !== src) {
      img.setAttribute('src', srcNorm);
    }
    let needBetterSrc = isPlaceholderImageUrl(img.getAttribute('src'));
    if (!needBetterSrc) {
      const fromSet = firstUrlInSrcset(img.getAttribute('srcset'));
      if (fromSet && isPlaceholderImageUrl(fromSet)) needBetterSrc = true;
    }
    let realSrc = firstNonPlaceholderFromAttrs(img, LAZY_IMG_SRC_ATTRS);
    if (!realSrc && needBetterSrc) {
      const fromSrcset = firstUrlInSrcset(img.getAttribute('srcset'));
      if (fromSrcset && !isPlaceholderImageUrl(fromSrcset)) {
        realSrc = fromSrcset;
      }
    }
    if (realSrc && needBetterSrc) {
      img.setAttribute('src', realSrc);
    }
    const realSrcset = firstNonPlaceholderFromAttrs(img, LAZY_IMG_SRCSET_ATTRS);
    if (realSrcset) {
      const cur = img.getAttribute('srcset');
      const curFirst = firstUrlInSrcset(cur);
      if (!cur?.trim() || !curFirst || isPlaceholderImageUrl(curFirst)) {
        img.setAttribute('srcset', normalizeUrlAttr(realSrcset));
      }
    }
  });
}

function serializePageHtmlForClip(): string {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  resolveLazyImagesInTree(clone);
  return clone.outerHTML;
}

function extractGitHubPage(): GitHubPageData {
  const url = window.location.href;
  const isGitHub = url.includes('github.com');

  if (!isGitHub) {
    return {
      html: serializePageHtmlForClip(),
      url,
      title: document.title,
      description: getMetaContent('description') || getMetaContent('og:description') || '',
      isGitHub: false,
      pageType: 'other',
    };
  }

  // Wait for page to fully load (GitHub uses dynamic loading)
  // Check if README element exists, if not wait a bit
  const waitForReadme = () => {
    const readmeEl = document.querySelector('turbo-frame#readme, [data-testid="readme"]');
    if (readmeEl) return true;
    // For older GitHub UI
    const legacyReadme = document.querySelector('[itemprop="about"]');
    return !!legacyReadme;
  };

  // Wait up to 2 seconds for README to load
  let attempts = 0;
  while (!waitForReadme() && attempts < 10) {
    const start = performance.now();
    while (performance.now() - start < 200) {
      // Busy wait for 200ms
    }
    attempts++;
  }

  // GitHub-specific extraction
  const pageType = detectGitHubPageType(url);
  const repoInfo = extractRepoInfo();
  let codeContent: string | undefined;

  // Extract code file content
  if (pageType === 'file') {
    codeContent = extractCodeContent();
  }

  console.log('[anything-to-ob] Extracted page:', { pageType, hasRepoInfo: !!repoInfo });

  return {
    html: serializePageHtmlForClip(),
    url,
    title: document.title,
    description: getMetaContent('description') || getMetaContent('og:description') || '',
    isGitHub: true,
    pageType,
    repoInfo,
    codeContent,
    readmeContent: undefined,
  };
}

function detectGitHubPageType(url: string): GitHubPageData['pageType'] {
  const path = new URL(url).pathname;
  const parts = path.split('/').filter(Boolean);

  if (parts.length >= 2) {
    if (parts.includes('issues')) return 'issue';
    if (parts.includes('pull')) return 'pull';
    if (parts.includes('wiki')) return 'wiki';
    if (parts.includes('blob') || parts.includes('tree')) return 'file';
    if (parts.length === 2) return 'repo';
  }

  return 'other';
}

function extractRepoInfo(): GitHubRepoInfo | undefined {
  // Try multiple selectors for stars and forks (GitHub uses different structures)
  const starsEl = document.querySelector('button[aria-label*="stars"]')?.closest('summary')?.querySelector('[id*="star-count"]') ||
                  document.querySelector('[itemprop="starButton"]')?.parentElement?.querySelector('[title]');
  const forksEl = document.querySelector('button[aria-label*="forks"]')?.closest('summary')?.querySelector('[id*="fork-count"]') ||
                  document.querySelector('[itemprop="forkButton"]')?.parentElement?.querySelector('[title]');

  const stars = starsEl?.textContent?.trim() || starsEl?.getAttribute('title') || undefined;
  const forks = forksEl?.textContent?.trim() || forksEl?.getAttribute('title') || undefined;

  const language = document.querySelector('[itemprop="programmingLanguage"]')?.textContent?.trim() ||
                   document.querySelector('.LanguageTag')?.textContent?.trim() || undefined;
  const license = document.querySelector('a[data-testid="license-link"]')?.textContent?.trim() ||
                  document.querySelector('.license-link')?.textContent?.trim() || undefined;

  return {
    owner: extractGitHubOwner(),
    repo: extractGitHubRepo(),
    description: document.querySelector('[itemprop="description"]')?.textContent?.trim() || undefined,
    stars,
    forks,
    language,
    license,
  };
}

function extractGitHubOwner(): string {
  const match = window.location.pathname.match(/^\/([^/]+)/);
  return match ? match[1] : 'unknown';
}

function extractGitHubRepo(): string {
  const match = window.location.pathname.match(/^\/[^/]+\/([^/]+)/);
  return match ? match[1] : 'unknown';
}

function extractCodeContent(): string | undefined {
  // Try to get raw code from table
  const codeTable = document.querySelector('table.highlight');
  if (codeTable) {
    const lines = codeTable.querySelectorAll('tr');
    return Array.from(lines)
      .map(row => {
        const lineNum = row.querySelector('td.line-num')?.textContent || '';
        const code = row.querySelector('td.blob-code')?.textContent || '';
        return lineNum ? `${lineNum}: ${code}` : code;
      })
      .join('\n');
  }

  // Fallback: try to get from .blob-code-inner
  const blobCode = document.querySelectorAll('.blob-code-inner');
  if (blobCode.length > 0) {
    return Array.from(blobCode).map(el => el.textContent).join('\n');
  }

  return undefined;
}

function extractReadmeContent(): string | undefined {
  // GitHub README is inside <turbo-frame id="readme">
  const turboFrame = document.querySelector('turbo-frame#readme');
  if (turboFrame) {
    // Try to get the rendered README content
    const readmeBody = turboFrame.querySelector('[id^="readme"]') ||
                       turboFrame.querySelector('.Box-body') ||
                       turboFrame.querySelector('article');
    if (readmeBody) {
      // Return the HTML content of the README
      return readmeBody.innerHTML;
    }
    // Fallback: return turbo-frame innerHTML
    return turboFrame.innerHTML || undefined;
  }

  // Fallback: try legacy selector
  const readmeContainer = document.querySelector('[itemprop="about"]');
  if (readmeContainer) {
    const readmeArticle = readmeContainer.querySelector('article');
    if (readmeArticle) {
      return readmeArticle.innerHTML || undefined;
    }
  }

  return undefined;
}

function getMetaContent(name: string): string {
  const el =
    document.querySelector(`meta[name="${name}"]`) ||
    document.querySelector(`meta[property="${name}"]`);
  return el?.getAttribute('content') || '';
}
