# anything-to-ob

Chrome 扩展（Manifest V3）：把当前网页 **抽成 Markdown**，带 YAML  frontmatter，**直接写入本地 Obsidian 库**（通过文件系统访问 API）。无需自建后端。

## 功能概览

- 在任意页面（除部分受限制的 `chrome://` 等）采集 **当前 DOM 快照**，用 [Defuddle](https://github.com/kepano/defuddle) 抽取正文并转为 Markdown。
- 生成的笔记包含：`title`、`source`（来源 URL）、`date`（保存日 ISO 日期），便于在 Obsidian 里检索与溯源。
- 默认保存到库根目录下的 **`Clippings`** 子文件夹（可在选项里改名）；文件名为 `YYYY-MM-DD-标题.md`，同名会自动加序号。
- **GitHub**（仓库、Issue、PR、代码文件等）有额外处理：例如仓库页会尽量等待 README 区域加载后再抓取。

## 技术栈

- TypeScript、Vite、[CRXJS Vite 插件](https://crxjs.dev/vite-plugin)
- 内容脚本采集 HTML → 扩展页内 `DOMParser` + Defuddle → `FileSystemDirectoryHandle` 写入 `.md`

## 开发与构建

```bash
npm install
npm run build
```

产物在 **`dist/`**。在 Chrome 中打开 `chrome://extensions`，开启「开发者模式」，选择「加载已解压的扩展程序」，指向 **`dist`** 目录。

开发时可使用：

```bash
npm run dev
```

按 CRXJS 习惯配合 Vite 热更新调试（具体以当前插件版本行为为准）。

## 首次使用

1. 安装扩展后，打开 **扩展选项**（或弹窗里的 Settings）。
2. 点击选择目录，授予读写权限，选中你的 **Obsidian 库根目录**（vault 根）。
3. 如需，修改「剪藏子文件夹」名称（默认 `Clippings`）。
4. 在目标页面点击工具栏图标，在弹窗中点击 **Save to Obsidian**。

若提示需要重新授权，回到选项页重新选择库目录即可。

## 权限说明

- **`activeTab`**：对当前标签页注入脚本并发消息采集页面信息。
- **`scripting`**：在需要时与内容脚本配合工作。

数据 **只写入你本地选择的文件夹**，不经过远程服务器。

## 已知限制

- `chrome://`、`chrome-extension://` 等页面无法采集。
- 依赖浏览器对 **File System Access API** 与 **IndexedDB** 保存目录句柄的支持；需在选项页完成一次目录授权。
- 单页应用若正文高度依赖异步渲染，可能需要等待页面加载完整后再保存（GitHub 仓库页已做简单等待）。

## 项目结构（节选）

```
src/
  background/     # Service worker
  content/         # 全站内容脚本，负责 EXTRACT_PAGE
  popup/           # 工具栏弹窗
  options/         # 选项页（库路径、子文件夹名）
  lib/             # clipper（Defuddle）、storage、file 写入
  shared/          # 类型定义
icons/             # 扩展图标
```

## 许可证

仓库内如未单独提供 `LICENSE` 文件，以你本地约定为准；依赖库（如 Defuddle）各自遵循其许可证。
