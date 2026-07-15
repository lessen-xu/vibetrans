export type Direction = 'toEn' | 'toZh'

export interface ModelConfig {
  id: string
  name: string
  baseUrl: string
  model: string
  apiKey: string
  /** 对应 PRESETS 里的服务商模板；'custom' 或缺省表示自定义 */
  presetId?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
