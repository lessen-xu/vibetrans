export type Direction = 'toEn' | 'toZh'

export interface ModelConfig {
  id: string
  name: string
  baseUrl: string
  model: string
  apiKey: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
