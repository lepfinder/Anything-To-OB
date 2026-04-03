<img src="icons/icon128.png" width="32" height="32" alt="Anything-to-Ob" style="vertical-align: middle; margin-right: 8px;" /> Anything-to-Ob
===

**An intelligent, AI-powered web clipper for Obsidian** -- Year/Month auto-organization, LLM summaries, Deep-linking, and seamless vault synchronization.

[![GitHub release](https://img.shields.io/badge/release-v1.0.0-purple)](https://github.com/your-username/anything-to-ob/releases)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Browser-lightgrey)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[中文文档](./README.zh-CN.md)

---

[Quick Start](#quick-start) | [Core Capabilities](#core-capabilities) | [Development](#development) | [Privacy](#privacy)

---

## Why Anything-to-Ob

**Intelligent Organization, Zero Clutter.** Stop dumping everything into a flat folder. Anything-to-Ob automatically archives your clips into Year/Month subdirectories (e.g., `2026/04/`), ensuring your Obsidian vault stays organized as it grows.

**LLM-Powered Summaries.** Don't just save pages; understand them. Built-in AI enrichment automatically generates "one-sentence summaries" and extracts relevant tags, helping you recall context months later.

**Deep Integration with Obsidian.** Powered by the `obsidian://` URI scheme. Every clip in your history is a live link that teleports you directly to the exact file in your local vault. No more manual searching.

**Local-First & Private.** Your data belongs to you. The extension reads and writes directly to your local file system via the File System Access API. History is synchronized through a local `.json` index within your vault, not a third-party cloud.

---

## Quick Start

### Path A: Install the Extension

1. Clone or download this repository.
2. Building from source: `npm install && npm run build`.
3. Open `chrome://extensions/` in your browser.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the `dist` folder.

### Path B: Configuration

1. **Set Vault Root**: Go to **Settings** and select your Obsidian clipping folder (e.g., `0 Inbox/Clippings`).
2. **AI Setup**: (Optional) Enter your DeepSeek or OpenAI API key to enable AI-powered summaries.
3. **Clip & Sync**: Switch to the **History** tab and click "Authorize" to enable synchronized history across your devices.

---

## Core Capabilities

### Clipping & Organization

| Capability | Details |
|---|---|
| Folder Structure | Automatic `YYYY/MM/` nesting |
| Format | Clean GitHub Flavored Markdown |
| Metadata | YAML Frontmatter with AI tags and summary |
| Image Support | Automatic image conversion and local saving |
| Deduplication | Global URL indexing to prevent duplicates |

### Intelligence & UI

| Capability | Details |
|---|---|
| AI Enrichment | DeepSeek / OpenAI automated summaries |
| Tabbed System | Separate views for Clipper and History |
| Deep Linking | Instant `obsidian://` navigation |
| Themes | Glassmorphism UI with Dark/Light support |
| Synced History | Cross-browser history via vault-level JSON index |

---

## Technical Stack

- **Frontend**: Vite + TypeScript + Vanilla CSS
- **APIs**: File System Access API, Obsidian URI Scheme
- **Formatting**: Turndown, Markdown-it
- **Architecture**: Asynchronous index-based storage

---

## FAQ

<details>
<summary>History is empty on a new browser</summary>

Go to the **History** tab and click the **Authorize** button. Because of browser security, we need your explicit permission to read the `clip-url-index.json` from your local vault. Once authorized, all your history will sync instantly.
</details>

<details>
<summary>DeepSearch / AI is not working</summary>

Ensure you have a valid API key and have selected a supported provider in the Settings page. Check the popup logs (Right-click > Inspect) for specific connectivity errors.
</details>

---

## Privacy

**Privacy by design.** This extension does NOT collect your browsing data, cookies, or personal information. All file operations are performed locally on your machine. AI analysis is sent only to the provider you configure (e.g., DeepSeek) and is not stored elsewhere.

---

## License

MIT