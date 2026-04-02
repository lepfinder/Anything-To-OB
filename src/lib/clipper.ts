import Defuddle from 'defuddle/full';
import type { ClipRequest, ClipResult } from '../shared/types';

export function clipPage(request: ClipRequest): ClipResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(request.html, 'text/html');

  let title = request.title;
  let content = '';

  // Check if this is GitHub-specific data
  const isGitHubData = 'isGitHub' in request && request.isGitHub;

  if (isGitHubData) {
    content = generateGitHubMarkdown(request);
    // For GitHub, use owner/repo as title prefix
    if (request.repoInfo) {
      title = `GitHub - ${request.repoInfo.owner}/${request.repoInfo.repo}`;
    }
  } else {
    try {
      const result = new Defuddle(doc, {
        url: request.url,
        markdown: true,
      }).parse();

      title = result.title || request.title;
      content = result.content || '';
    } catch {
      // Fallback: use body innerText if defuddle fails
      content = doc.body?.innerText || '';
      if (!content) {
        content = request.html;
      }
    }
  }

  const now = new Date();
  const date = now.toISOString().split('T')[0];

  // Escape YAML values to prevent special characters from breaking the format
  const escapeYamlValue = (value: string): string => {
    if (!value) return '""';
    // If value contains special characters, wrap in double quotes and escape internal quotes
    if (value.includes(':') || value.includes('#') || value.includes('"') || value.includes("'") || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  };

  const markdown = `---
title: ${escapeYamlValue(title)}
source: ${escapeYamlValue(request.url)}
date: ${date}
---

${content}`;

  return { title, content: markdown, url: request.url, date };
}

function generateGitHubMarkdown(request: any): string {
  const { pageType, repoInfo, codeContent, readmeContent, description } = request;
  let markdown = '';

  // Add page-specific content
  switch (pageType) {
    case 'repo':
      // Use defuddle to extract README from full page HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(request.html, 'text/html');
      try {
        const result = new Defuddle(doc, {
          url: request.url,
          markdown: true,
        }).parse();
        markdown += result.content || '(No README content)';
      } catch {
        markdown += doc.body?.innerText || '(No content)';
      }
      break;

    case 'file':
      if (codeContent) {
        const filePath = new URL(request.url).pathname.split('/').slice(4).join('/');
        markdown += `## File: \`${filePath}\`\n\n\`\`\`\n${codeContent}\n\`\`\`\n`;
      }
      break;

    case 'issue':
    case 'pull':
      // For issues and PRs, let defuddle handle the conversation
      const parser2 = new DOMParser();
      const doc2 = parser2.parseFromString(request.html, 'text/html');
      try {
        const result = new Defuddle(doc2, {
          url: request.url,
          markdown: true,
        }).parse();
        markdown += result.content || '';
      } catch {
        markdown += doc2.body?.innerText || '';
      }
      break;

    default:
      // Fallback to defuddle for other page types
      const fallbackParser = new DOMParser();
      const fallbackDoc = fallbackParser.parseFromString(request.html, 'text/html');
      try {
        const result = new Defuddle(fallbackDoc, {
          url: request.url,
          markdown: true,
        }).parse();
        markdown += result.content || '';
      } catch {
        markdown += fallbackDoc.body?.innerText || '';
      }
  }

  return markdown;
}
