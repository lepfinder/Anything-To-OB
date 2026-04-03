import type { AppLocale, AppSettings } from './types';

const M = {
  zh: {
    popupSaveToObsidian: '保存到 Obsidian',
    popupSaving: '保存中…',
    popupLoading: '加载中…',
    popupPageNotSupported: '此页面不支持保存',
    popupUntitled: '无标题',
    popupVaultNotConfigured: '未配置仓库 — 请打开设置',
    popupNoActiveTab: '没有活动标签页',
    popupCannotAccessPage: '无法访问此页面',
    popupSaveCancelled: '已取消保存',
    popupSaved: '已保存：{name}',
    popupOpenInObsidian: '在 Obsidian 中打开',
    popupRecentClips: '最近剪藏',
    popupNeedReauthorize: '请重新授权仓库 — 打开设置',
    tabClipper: '剪藏',
    tabHistory: '历史',
    historyLoading: '正在同步历史...',
    historyAuthNeeded: '查看历史需要授权该文件夹',
    historyAuthBtn: '点击授权并加载',
    popupErrorPrefix: '错误：',
    popupUnknownError: '未知错误',
    popupSettings: '设置',
    popupCurrentPage: '笔记预览',
    popupAiAnalyzing: 'AI 正在分析摘要与标签...',

    dupTitle: '此前已保存过',
    dupBodyBefore: '该页面已在剪藏索引中，记录时间：',
    dupBodyAfter: '。仍要再保存一篇笔记吗？',
    dupHint: '索引文件：',
    dupCancel: '取消',
    dupConfirm: '仍要保存',

    optTitle: 'anything-to-ob 设置',
    optVaultHeading: 'Obsidian 仓库',
    optVaultHint: '选择 Obsidian 库根目录，文件将保存在该目录下。',
    optVaultDirLabel: '仓库目录：',
    optNotConfigured: '未配置',
    optChooseDir: '选择目录',
    optSaveLocationHeading: '保存位置',
    optFolderNameLabel: '文件夹名称：',
    optFolderHint: '文件将保存到「库根/文件夹名/」下。',
    optDuplicatesHeading: '重复检测',
    optWarnDuplicateLabel: '当链接已在剪藏索引中时提示（索引文件 clip-url-index.json 位于上方文件夹内）',
    optDuplicatesHint: '索引仅记录 url 与 savedAt（ISO，含毫秒），可随库同步。',
    optLanguageHeading: '界面语言',
    optLanguageLabel: '语言：',
    optLangZh: '中文',
    optLangEn: 'English',

    optThemeHeading: '外观',
    optThemeLabel: '主题：',
    optThemeDark: '深色',
    optThemeLight: '浅色',
    optStatusVaultSaved: '已保存仓库目录',
    optStatusFolderSaved: '已保存文件夹名称',
    optStatusDupSaved: '已保存重复检测选项',
    optStatusLangSaved: '已切换语言',
    optStatusThemeSaved: '已切换主题',
    optStatusAiSaved: '已保存 AI 配置',
    optStatusChooseDirFailed: '选择目录失败',

    optAiHeading: 'AI 增强（总结与标签）',
    optAiEnabledLabel: '生成 AI 摘要与标签',
    optAiProviderLabel: '供应商：',
    optAiModelLabel: '模型 (Model)：',
    optAiPromptLabel: '自定义提示词：',
    optAiPromptHelp: '支持 {title} 和 {language} 变量。AI 会根据指令生成 JSON。',
    optDefaultPrompt:
      '请分析下面标题为 "{title}" 的网页内容，并提供：\n1. 一个新的简洁标题（title），能概括核心内容，避免通用描述。\n2. 一句话总结（oneSentence）。\n3. 段落摘要（summary）。\n4. 3-5个相关的标签（tags）。\n\n请严格按 JSON 格式返回，包含上述四个键。请使用 {language} 回答。',

    optAboutHeading: '关于',
    optVersionLabel: '版本：',
    optGithubLabel: '源码地址：',
    optFeedbackLabel: '问题反馈：',
    optOpenInGithub: '在 GitHub 中查看',
    optDescription: '一个将网页一键剪藏到 Obsidian 的浏览器插件，支持 AI 摘要与标签。',
  },
  en: {
    popupSaveToObsidian: 'Save to Obsidian',
    popupSaving: 'Saving...',
    popupLoading: 'Loading...',
    popupPageNotSupported: 'This page is not supported',
    popupUntitled: 'Untitled',
    popupVaultNotConfigured: 'Vault not configured — open Settings',
    popupNoActiveTab: 'No active tab found',
    popupCannotAccessPage: 'Cannot access this page',
    popupSaveCancelled: 'Save cancelled',
    popupSaved: 'Saved: {name}',
    popupOpenInObsidian: 'Open in Obsidian',
    popupRecentClips: 'Recent Clips',
    popupNeedReauthorize: 'Need to re-authorize vault — open Settings',
    tabClipper: 'Clip',
    tabHistory: 'History',
    historyLoading: 'Syncing history...',
    historyAuthNeeded: 'Authorize directory to see history',
    historyAuthBtn: 'Authorize & Load',
    popupErrorPrefix: 'Error: ',
    popupUnknownError: 'Unknown error',
    popupSettings: 'Settings',
    popupCurrentPage: 'Note Preview',
    popupAiAnalyzing: 'AI is analyzing summary and tags...',

    dupTitle: 'Already saved',
    dupBodyBefore: 'This page is in your clip index from ',
    dupBodyAfter: '. Save another note anyway?',
    dupHint: 'Index file: ',
    dupCancel: 'Cancel',
    dupConfirm: 'Save again',

    optTitle: 'anything-to-ob Settings',
    optVaultHeading: 'Obsidian Vault',
    optVaultHint: 'Select your Obsidian vault directory. Files will be saved inside it.',
    optVaultDirLabel: 'Vault directory:',
    optNotConfigured: 'Not configured',
    optChooseDir: 'Choose Directory',
    optSaveLocationHeading: 'Save Location',
    optFolderNameLabel: 'Folder name:',
    optFolderHint: 'Files will be saved to <vault>/<folder>/',
    optDuplicatesHeading: 'Duplicates',
    optWarnDuplicateLabel:
      'Warn when URL is already in clip index (clip-url-index.json in the folder above)',
    optDuplicatesHint: 'The index stores url + savedAt (ISO, ms) and syncs with your vault.',
    optLanguageHeading: 'Language',
    optLanguageLabel: 'Interface language:',
    optLangZh: '中文',
    optLangEn: 'English',

    optThemeHeading: 'Appearance',
    optThemeLabel: 'Theme:',
    optThemeDark: 'Dark',
    optThemeLight: 'Light',
    optStatusVaultSaved: 'Vault directory saved',
    optStatusFolderSaved: 'Folder name saved',
    optStatusDupSaved: 'Duplicate preference saved',
    optStatusLangSaved: 'Language updated',
    optStatusThemeSaved: 'Theme updated',
    optStatusAiSaved: 'AI settings saved',
    optStatusChooseDirFailed: 'Failed to select directory',

    optAiHeading: 'AI Enhancement (Summary & Tags)',
    optAiEnabledLabel: 'Auto-generate summary and tags',
    optAiProviderLabel: 'Provider:',
    optAiModelLabel: 'Model:',
    optAiPromptLabel: 'Custom Prompt:',
    optAiPromptHelp: 'Supports {title} and {language} variables. AI will generate JSON output.',
    optDefaultPrompt:
      'Analyze the following web content titled "{title}" and provide:\n1. A new, concise title (title) that summarizes the core content and avoids generic descriptions.\n2. A one-sentence summary (oneSentence).\n3. A short paragraph summary (summary).\n4. A list of 3-5 relevant tags (tags).\n\nRespond strictly in JSON format with the above four keys. Please respond in {language}.',

    optAboutHeading: 'About',
    optVersionLabel: 'Version: ',
    optGithubLabel: 'Source Code: ',
    optFeedbackLabel: 'Issues & Feedback: ',
    optOpenInGithub: 'View on GitHub',
    optDescription: 'A browser extension for one-click clipping of web pages to Obsidian, with AI summaries and tags.',
  },
} as const;

export type MessageKey = keyof typeof M.zh;

export function resolveLocale(settings?: Partial<Pick<AppSettings, 'locale'>> | null): AppLocale {
  return settings?.locale === 'en' ? 'en' : 'zh';
}

export function t(locale: AppLocale, key: MessageKey): string {
  const pack = M[locale];
  return (pack[key] as string) ?? M.en[key];
}

export function tf(locale: AppLocale, key: MessageKey, vars: Record<string, string>): string {
  let s = t(locale, key);
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(v);
  }
  return s;
}

export function formatSavedAt(iso: string, locale: AppLocale): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const loc = locale === 'zh' ? 'zh-CN' : 'en-US';
    return d.toLocaleString(loc, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Apply data-i18n="key" on root (default document). */
export function applyDataI18n(locale: AppLocale, root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n as MessageKey | undefined;
    if (key) el.textContent = t(locale, key);
  });
}
