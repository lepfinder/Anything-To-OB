import Defuddle from 'defuddle/full';
import type { ClipRequest, ClipResult } from '../shared/types';

export function clipPage(request: ClipRequest): ClipResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(request.html, 'text/html');

  let title = request.title;
  let content = '';

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

  const now = new Date();
  const date = now.toISOString().split('T')[0];

  const markdown = `---
title: ${title}
source: ${request.url}
date: ${date}
---

${content}`;

  return { title, content: markdown, url: request.url, date };
}
