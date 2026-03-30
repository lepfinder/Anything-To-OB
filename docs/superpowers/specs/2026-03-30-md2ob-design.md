# md2ob - Browser Extension Design Spec

## Overview

A Chrome extension (Manifest V3) that extracts web page content using defuddle and saves it as Markdown to a local Obsidian vault directory. One-click save, zero backend dependencies.

## Architecture

### Tech Stack

- Chrome Extension (Manifest V3)
- TypeScript (no framework)
- defuddle (npm) - extract main content from HTML
- File System Access API - write files to vault
- Vite - build tool (multi-entry)

### Core Flow

1. User clicks extension icon → Popup shows save button
2. Click save → Content Script captures page HTML + metadata (title, url, description)
3. Popup runs defuddle on HTML → outputs clean Markdown
4. Popup writes Markdown file to configured vault subfolder via File System Access API
5. Popup shows success/failure status

### Components

| Component | Responsibility |
|-----------|---------------|
| Popup | Save button, status display, settings link |
| Content Script | Extract page DOM and metadata |
| Background Service Worker | Coordinate component communication |
| Options Page | Configure vault directory and save folder |
| Lib (clipper) | Defuddle invocation + Markdown generation |
| Lib (storage) | IndexedDB operations for FileSystemDirectoryHandle persistence |
| Lib (file) | File write logic |

## File Format

### Saved Markdown

```markdown
---
title: Article Title
source: https://example.com/article
date: 2026-03-30
---

Article content...
```

YAML frontmatter with title, source URL, and date for Obsidian search/queries.

### File Naming

`YYYY-MM-DD-title.md` - special characters (`/`, `:`, `*`, `?`, `"`, `<`, `>`, `|`, `#`) replaced with spaces. Consecutive spaces collapsed. Title truncated to 80 characters max.

### Save Location

Configurable subfolder within vault, default: `Clippings/`.

## UI Design

### Popup (300x200px)

- Title bar: current page title (truncated)
- Main button: "Save to Obsidian"
- Status: loading spinner / green checkmark (success) / red error message
- Gear icon at bottom → opens Options Page

### Options Page

- Vault directory: display current path + "Choose Directory" button (triggers `showDirectoryPicker()`)
- Save folder name: text input, default `Clippings`
- Shortcut hint: link to Chrome shortcut settings page

### Keyboard Shortcut

Default `Alt+Shift+S` triggers one-click save (no popup needed), configured via Manifest `commands`.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Vault not configured | Show message with link to settings |
| Vault permission expired (browser restart) | Show "Re-authorize" prompt, trigger directory picker on click |
| Filename conflict | Append sequence number: `2026-03-30-Title-1.md` |
| defuddle parse failure | Fallback to `document.body.innerText`, mark as `[Low Quality Extraction]` |
| Unsupported page (chrome://, Chrome Web Store) | Show "This page is not supported" |

No backend or network dependencies - defuddle runs locally, file writes are local filesystem operations.

## Project Structure

```
md2ob/
├── src/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── options/
│   │   ├── options.html
│   │   ├── options.ts
│   │   └── options.css
│   ├── background/
│   │   └── background.ts
│   ├── content/
│   │   └── content.ts
│   ├── lib/
│   │   ├── clipper.ts
│   │   ├── storage.ts
│   │   └── file.ts
│   └── shared/
│       └── types.ts
├── icons/
├── manifest.json
├── package.json
├── tsconfig.json
└── vite.config.ts
```

Build: `npm run build` outputs to `dist/`, load as unpacked extension in Chrome.

## Decisions

- **File System Access API** over Local REST API / URI protocol: zero dependencies, simplest implementation
- **Manual vault path config**: user chooses directory via `showDirectoryPicker()`, no auto-detection complexity
- **One-click save**: fastest workflow, V1 scope
- **No framework**: Popup and Options are simple enough for vanilla TS + CSS
- **Vite**: fast builds, native TS support, easy multi-entry config
