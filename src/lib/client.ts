import type { ChatMessage, ModelConfig } from '../types'

/** 把用户填写的 Base URL 规范成 chat completions 端点。 */
export function endpointOf(baseUrl: string): string {
  let url = baseUrl.trim().replace(/\/+$/, '')
  if (!/\/chat\/completions$/.test(url)) url += '/chat/completions'
  return url
}

function friendlyHttpError(status: number, detail: string): string {
  if (status === 401) return 'API Key 无效或已过期，请检查设置'
  if (status === 402) return '账户余额不足'
  if (status === 403) return '没有权限访问这个模型'
  if (status === 404) return '接口地址或模型名不存在，请检查设置'
  if (status === 429) return '请求太频繁或额度用尽，稍等一下再试'
  if (status >= 500) return '服务商暂时出错了，稍后再试'
  const hint = detail ? `：${detail.slice(0, 160)}` : ''
  return `请求失败 (${status})${hint}`
}

export interface StreamChatOptions {
  config: ModelConfig
  messages: ChatMessage[]
  temperature: number
  signal: AbortSignal
  onDelta: (fullText: string) => void
}

/** OpenAI 兼容接口的流式请求，直接从浏览器发出。 */
export async function streamChat({
  config,
  messages,
  temperature,
  signal,
  onDelta,
}: StreamChatOptions): Promise<string> {
  const endpoint = endpointOf(config.baseUrl)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }
  // Anthropic 的接口要求浏览器直连时显式带上这个头才放行 CORS
  if (endpoint.includes('api.anthropic.com')) {
    headers['anthropic-dangerous-direct-browser-access'] = 'true'
  }

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        stream: true,
      }),
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new Error('连不上 API，请检查 Base URL 和网络')
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(friendlyHttpError(res.status, detail))
  }
  if (!res.body) throw new Error('服务商没有返回内容')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return full
      try {
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[]
        }
        const delta = json.choices?.[0]?.delta?.content ?? ''
        if (delta) {
          full += delta
          onDelta(full)
        }
      } catch {
        // 不完整的 JSON 分片，忽略
      }
    }
  }
  return full
}
