<img src="icons/icon128.png" width="32" height="32" alt="Anything-to-Ob" style="vertical-align: middle; margin-right: 8px;" /> Anything-to-Ob
===

**一款为 Obsidian 设计的 AI 智能剪藏器** -- 自动年/月归档、LLM 一句话总结、DeepLink 置顶、多端无感同步。

[![GitHub release](https://img.shields.io/badge/release-v1.0.0-purple)](https://github.com/your-username/anything-to-ob/releases)
[![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20浏览器-lightgrey)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[English Version](./README.md)

---

[快速上手](#快速上手) | [核心功能](#核心功能) | [技术架构](#技术架构) | [隐私保护](#隐私保护)

---

## 为什么选择 Anything-to-Ob

**智能整理，告别无序堆积。** 不再将所有剪藏文件平铺在一个文件夹中。Anything-to-Ob 会按照年/月（如 `2026/04/`）自动创建子目录进行归档，确保您的 Obsidian 库随着知识积累依然井然有序。

**LLM 赋能，深度浓缩知识。** 剪藏不只是“存而不读”。内置 AI 对话能力，自动为您提取关键词并生成“一句话总结”，让您在数月后依然能瞬间回忆起剪藏时的上下文。

**与 Obsidian 深度联动。** 基于 `obsidian://` 协议。历史记录中的每一条剪藏都是一条“传送门”，点按即可瞬间唤起本地 Obsidian 软件并定位到对应文件。无需手动搜索。

**本地优先，隐私至上。** 您的数据完全属于您。插件通过 File System Access API 直接读写您的本地存储。历史记录通过保存在库中的 `clip-url-index.json` 进行同步，无需依赖任何第三方云端。

---

## 快速上手

### 路径 A：安装插件

1. 下载或克隆本项目源代码。
2. 从源码构建：`npm install && npm run build`。
3. 在浏览器打开 `chrome://extensions/`。
4. 开启 **开发者模式**。
5. 点击 **加载已解压的扩展程序** 并选择 `dist` 目录。

### 路径 B：基础配置

1. **设定仓库根目录**：进入 **【设置】**，选择您的 Obsidian 剪藏根文件夹（建议如 `0 Inbox/Clippings` 等路径）。
2. **AI 配置**：(可选) 填入您的 DeepSeek 或 OpenAI API 密钥，解锁智能摘要功能。
3. **剪藏与同步**：切换到 **【历史】** 页签，点击“点此授权”，即可同步您在不同浏览器上的剪藏历史。

---

## 核心功能

### 剪藏与组织

| 功能项 | 详细说明 |
|---|---|
| 目录结构 | 自动 `YYYY/MM/` 分级嵌套 |
| 文件格式 | 标准 GitHub Flavored Markdown |
| 元数据 | 包含 AI 标签和一句话总结的 YAML Frontmatter |
| 图片处理 | 自动转换并本地化保存网页图片 |
| 去重检测 | 基于全局 URL 索引的实时重复提醒 |

### 智能与 UI

| 功能项 | 详细说明 |
|---|---|
| AI 增强 | 基于 DeepSeek / OpenAI 的自动化摘要 |
| 双页签设计 | 独立的“剪藏”与“历史”交互界面 |
| 深度链接 | 瞬时跳转 Obsidian 的 `obsidian://` 协议联动 |
| UI 设计 | 玻璃拟态风格，完美支持跟随系统的深/浅色模式 |
| 同步历史 | 基于库内 JSON 索引的跨设备历史展示 |

---

## 技术架构

- **前端**：Vite + TypeScript + Vanilla CSS
- **核心 API**：File System Access API, Obsidian URI Scheme
- **格式转化**：Turndown, Markdown-it
- **存储机制**：异步索引驱动的本地存储系统

---

## 常见问题 (FAQ)

<details>
<summary>换浏览器后历史记录为空？</summary>

请进入 **历史** 页签并点击 **“授权加载历史”** 按钮。由于浏览器安全策略，读取您本地库中的 `clip-url-index.json` 需要显式的用户手势授权。授权后数据即刻同步。
</details>

<details>
<summary>AI 总结功能失效？</summary>

请确保您的 API 密钥有效，并在设置页面选择了正确的提供商。如仍失效，可右键插件点击“检查”查看是否有网络连接或额度不足的报错。
</details>

---

## 隐私保护

**原生隐私设计。** 本插件不会收集您的浏览记录、Cookies 或任何个人信息。所有文件操作均在您的机器本地完成。AI 分析仅发送至您配置的提供商（如 DeepSeek），不会被第三方转存。

---

## 开源协议

MIT
