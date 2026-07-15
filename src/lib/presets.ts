import type { ModelConfig } from '../types'

export interface ProviderPreset {
  id: string
  name: string
  baseUrl: string
  model: string
}

/** 常见服务商模板（2026-07 按官方文档核对），Key 留空由用户填写。 */
export const PRESETS: ProviderPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.4-mini',
  },
  {
    id: 'claude',
    name: 'Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-5',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-3.5-flash',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-k2.6',
  },
  {
    id: 'glm',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4.7',
  },
  {
    id: 'qwen',
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
  },
  {
    id: 'grok',
    name: 'Grok',
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-4.5',
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V4-Flash',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openrouter/auto',
  },
]

export function newConfig(): ModelConfig {
  const p = PRESETS[0]
  return {
    id: crypto.randomUUID(),
    presetId: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    model: p.model,
    apiKey: '',
  }
}
