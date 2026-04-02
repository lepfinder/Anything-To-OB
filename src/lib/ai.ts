import OpenAI from 'openai';
import type { AppSettings } from '../shared/types';
import { getSetting } from './storage';

export interface AiProviderConfig {
  url: string;
  defaultModel: string;
}

export const AI_PROVIDERS: Record<string, AiProviderConfig> = {
  deepseek: { url: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  ollama: { url: 'http://localhost:11434/v1', defaultModel: '' },
  ollama_remote: { url: '', defaultModel: '' },
  qwen: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-turbo' },
  zhipu: { url: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4' },
  kimi: { url: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k' },
  openai: { url: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  custom: { url: '', defaultModel: '' },
};

export function getProviderConfig(p?: string): AiProviderConfig | null {
  return (p && AI_PROVIDERS[p]) || null;
}

export interface AiSummaryResult {
  oneSentence: string;
  summary: string;
  tags: string[];
}

export async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    // Ollama's tags API: GET /api/tags
    // We normalize the base URL (remove /v1 if present)
    const apiBase = baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, '');
    const response = await fetch(`${apiBase}/api/tags`);
    if (!response.ok) return [];
    
    const data = await response.json();
    if (data && Array.isArray(data.models)) {
      return data.models.map((m: any) => m.name);
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch Ollama models:', err);
    return [];
  }
}

export async function extractAiMetadata(content: string, title: string): Promise<AiSummaryResult | null> {
  const settings = await getSetting<AppSettings>('appSettings');
  if (!settings?.aiEnabled || !settings.aiProvider || !settings.aiConfigs) {
    return null;
  }

  const provider = settings.aiProvider;
  const config = settings.aiConfigs[provider];
  if (!config) return null;

  // Ollama usually doesn't need a key, but the SDK might require one
  const isOllama = provider === 'ollama' || provider === 'ollama_remote';
  let apiKey = config.apiKey || (isOllama ? 'ollama' : '');
  if (!apiKey && !isOllama) {
    return null;
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: config.baseUrl || 'https://api.openai.com/v1',
    dangerouslyAllowBrowser: true,
  });

  const locale = settings.locale === 'en' ? 'en' : 'zh';
  const language = locale === 'zh' ? '中文' : 'English';
  const rawPrompt = settings.aiPrompt || (import('../shared/i18n').then(m => m.t(locale, 'optDefaultPrompt')) as any);
  
  // Actually, we should get the string synchronously because it's already in settings or defaults
  // Let's import t from i18n at the top to make it cleaner
  const { t: translate } = await import('../shared/i18n');
  const promptTemplate = settings.aiPrompt || translate(locale, 'optDefaultPrompt');
  
  const finalPrompt = promptTemplate
    .replace('{title}', title)
    .replace('{language}', language);

  const prompt = `${finalPrompt}\n\nContent:\n${content.slice(0, 5000)}...`;

  try {
    const response = await client.chat.completions.create({
      model: config.model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      oneSentence: result.oneSentence || '',
      summary: result.summary || '',
      tags: Array.isArray(result.tags) ? result.tags : [],
    };
  } catch (err) {
    console.error('AI extraction failed:', err);
    return null;
  }
}
