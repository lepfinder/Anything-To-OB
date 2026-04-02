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
  title: string;
  oneSentence: string;
  summary: string;
  tags: string[];
}

export async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const apiBase = baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, '');
    // Using common browser headers to help avoid proxy 403s
    const response = await fetch(`${apiBase}/api/tags`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
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
  if (!settings?.aiEnabled) {
    console.log('[AI] AI is disabled in settings.');
    return null;
  }

  const provider = settings.aiProvider || 'deepseek';
  const configs = settings.aiConfigs || {};
  let config = configs[provider];

  // Resilience: If no config exists for Ollama, try default local settings
  if (!config && (provider === 'ollama' || provider === 'ollama_remote')) {
    console.warn(`[AI] No configuration found for ${provider}, using defaults.`);
    config = {
      apiKey: 'ollama',
      baseUrl: provider === 'ollama' ? 'http://localhost:11434/v1' : '',
      model: 'llama3',
    };
  }

  if (!config) {
    console.error(`[AI] No configuration found for provider: ${provider}`);
    return null;
  }

  const isOllama = provider === 'ollama' || provider === 'ollama_remote';
  const apiKey = config.apiKey || (isOllama ? 'ollama' : '');
  if (!apiKey && !isOllama) {
    console.error('[AI] API Key is missing and provider is not Ollama.');
    return null;
  }

  let baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  // Normalize Ollama Base URL to include /v1 for OpenAI SDK compatibility
  if (isOllama && baseUrl && !baseUrl.includes('/v1')) {
    baseUrl = baseUrl.replace(/\/$/, '') + '/v1';
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseUrl,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      'Cache-Control': 'no-cache',
    }
  });

  const locale = settings.locale === 'en' ? 'en' : 'zh';
  const language = locale === 'zh' ? '中文' : 'English';
  
  const { t: translate } = await import('../shared/i18n');
  const promptTemplate = settings.aiPrompt || translate(locale, 'optDefaultPrompt');
  
  const finalPrompt = promptTemplate
    .replace('{title}', title)
    .replace('{language}', language);

  // Optimized content slicing: First 2500 + Last 1500 if over 4000
  let aiContent = content;
  if (content.length > 4000) {
    aiContent = content.slice(0, 2500) + 
      '\n\n...[Content truncated for brevity, showing head and tail]...\n\n' + 
      content.slice(-1500);
  }

  const prompt = `${finalPrompt}\n\nContent:\n${aiContent}`;
  
  console.log(`[AI] Requesting ${provider} with model: ${config.model || 'default'}`);

  try {
    const params: any = {
      model: config.model || (isOllama ? 'llama3' : 'gpt-4o'),
      messages: [{ role: 'user', content: prompt }],
    };

    // Only use json_object mode for non-Ollama providers by default, 
    // as many local models/Ollama versions have mixed support for it.
    if (!isOllama) {
      params.response_format = { type: 'json_object' };
    }

    const response = await client.chat.completions.create(params);
    const contentText = response.choices[0].message.content || '';
    
    try {
      // 1. Try direct JSON parse
      const result = JSON.parse(contentText.trim());
      return {
        title: result.title || title,
        oneSentence: result.oneSentence || '',
        summary: result.summary || '',
        tags: Array.isArray(result.tags) ? result.tags : [],
      };
    } catch {
      // 2. Fallback: try to find JSON block in the text
      const match = contentText.match(/\{[\s\S]*\}/);
      if (match) {
        const result = JSON.parse(match[0]);
        return {
          title: result.title || title,
          oneSentence: result.oneSentence || '',
          summary: result.summary || '',
          tags: Array.isArray(result.tags) ? result.tags : [],
        };
      }
      throw new Error('No valid JSON found in AI response');
    }
  } catch (err) {
    console.error(`[AI] ${provider} failed:`, err);
    return null;
  }
}
