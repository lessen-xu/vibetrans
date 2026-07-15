import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { ChatMessage, Direction, ModelConfig } from './types'
import { usePersistedState } from './lib/storage'
import { buildMessages, SCENES } from './lib/prompts'
import { streamChat } from './lib/client'
import { OutputView } from './components/OutputView'
import { newConfig, SettingsModal } from './components/SettingsModal'
import {
  IconGitHub,
  IconMoon,
  IconSend,
  IconSliders,
  IconStop,
  IconSun,
  IconWand,
} from './components/Icons'

const DIRECTIONS: { id: Direction; title: string; sub: string }[] = [
  { id: 'toEn', title: '说出去', sub: '中文 → 英语口语' },
  { id: 'toZh', title: '看得懂', sub: '英文 → 中文解读' },
]

const INITIAL_CONFIGS = [newConfig()]

function IconBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-zinc-500/10 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      {children}
    </button>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-9 shrink-0 text-xs text-zinc-400 dark:text-zinc-500">{label}</span>
      {children}
    </div>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[13px] transition-colors ${
        active
          ? 'bg-indigo-500/10 font-medium text-indigo-600 ring-1 ring-indigo-500/35 dark:bg-indigo-400/10 dark:text-indigo-300'
          : 'text-zinc-500 hover:bg-zinc-500/10 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  )
}

export default function App() {
  const [direction, setDirection] = usePersistedState<Direction>('vibetrans:direction', 'toEn')
  const [sceneId, setSceneId] = usePersistedState('vibetrans:scene', 'daily')
  const [rel, setRel] = usePersistedState('vibetrans:relText', '')
  const [relHistory, setRelHistory] = usePersistedState<string[]>('vibetrans:relHistory', [])
  const [configs, setConfigs] = usePersistedState<ModelConfig[]>(
    'vibetrans:configs',
    INITIAL_CONFIGS,
  )
  const [activeId, setActiveId] = usePersistedState('vibetrans:activeId', INITIAL_CONFIGS[0].id)

  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )
  const [input, setInput] = useState('')
  const [extra, setExtra] = useState('')
  const [output, setOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [refineText, setRefineText] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsHint, setSettingsHint] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  // 上一次完成的请求（含回复），供「优化」作为多轮上下文
  const lastRef = useRef<{ messages: ChatMessage[]; reply: string } | null>(null)

  const activeCfg = configs.find((c) => c.id === activeId) ?? configs[0]
  const configured = Boolean(activeCfg && activeCfg.apiKey && activeCfg.baseUrl && activeCfg.model)
  const relationship = rel.trim()

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 320)}px`
  }, [input])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      try {
        localStorage.setItem('vibetrans:theme', next)
      } catch {
        // ignore
      }
      return next
    })
  }

  const switchDirection = (d: Direction) => {
    if (d === direction) return
    abortRef.current?.abort()
    setDirection(d)
    setOutput('')
    setError('')
    setRefineText('')
    lastRef.current = null
  }

  const runStream = (messages: ChatMessage[]) => {
    if (!configured || !activeCfg) {
      setSettingsHint('先填一个 API Key 就能开始用了')
      setSettingsOpen(true)
      return
    }
    const ac = new AbortController()
    abortRef.current = ac
    setStreaming(true)
    setError('')
    setOutput('')
    let acc = ''
    streamChat({
      config: activeCfg,
      messages,
      temperature: direction === 'toEn' ? 0.7 : 0.4,
      signal: ac.signal,
      onDelta: (full) => {
        acc = full
        setOutput(full)
      },
    })
      .then((full) => {
        lastRef.current = { messages, reply: full }
        if (direction === 'toEn' && relationship) {
          setRelHistory((prev) => [relationship, ...prev.filter((x) => x !== relationship)].slice(0, 5))
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          if (acc) lastRef.current = { messages, reply: acc }
          return
        }
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => setStreaming(false))
  }

  const translate = () => {
    if (streaming) {
      abortRef.current?.abort()
      return
    }
    const text = input.trim()
    if (!text) return
    runStream(
      buildMessages(direction, sceneId, direction === 'toEn' ? relationship : '', extra.trim(), text),
    )
  }

  const refine = () => {
    const req = refineText.trim()
    const base = lastRef.current
    if (!req || !base || streaming) return
    setRefineText('')
    runStream([
      ...base.messages,
      { role: 'assistant', content: base.reply },
      { role: 'user', content: `按这个要求调整刚才的输出：${req}。仍然遵守原来的输出格式规则。` },
    ])
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      translate()
    }
  }

  const openSettings = () => {
    setSettingsHint('')
    setSettingsOpen(true)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pt-6 sm:pt-10">
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="grad-text text-xl font-bold tracking-tight">VibeTrans</h1>
          <span className="hidden text-xs text-zinc-400 sm:block dark:text-zinc-500">
            把话说得地道
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openSettings}
            className={`mr-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
              configured
                ? 'text-zinc-400 hover:bg-zinc-500/10 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                : 'bg-amber-500/10 font-medium text-amber-600 hover:bg-amber-500/20 dark:text-amber-400'
            }`}
          >
            {configured && activeCfg ? activeCfg.name || activeCfg.model : '配置 API'}
          </button>
          <IconBtn onClick={toggleTheme} title="切换主题">
            {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
          </IconBtn>
          <IconBtn onClick={openSettings} title="设置">
            <IconSliders size={17} />
          </IconBtn>
        </div>
      </header>

      <main className="flex-1">
        <section className="glass mt-6 rounded-3xl p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-zinc-500/10 p-1 dark:bg-white/5">
            {DIRECTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => switchDirection(d.id)}
                className={`rounded-xl px-3 py-2 text-sm transition-all ${
                  direction === d.id
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-white/10 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span className="font-semibold">{d.title}</span>
                <span className="ml-2 hidden text-xs opacity-60 sm:inline">{d.sub}</span>
              </button>
            ))}
          </div>

          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
            placeholder={
              direction === 'toEn' ? '想说什么？直接打中文，蹩脚英语也行' : '粘贴看不太懂的英文'
            }
            className="mt-3 max-h-80 w-full resize-none bg-transparent px-1 text-[16px] leading-relaxed outline-none placeholder:text-zinc-400/80 dark:placeholder:text-zinc-500"
          />

          <div className="my-3 h-px bg-zinc-200/80 dark:bg-white/10" />

          <div className="space-y-2">
            <Row label="场景">
              {SCENES.map((s) => (
                <Pill key={s.id} active={sceneId === s.id} onClick={() => setSceneId(s.id)}>
                  {s.label}
                </Pill>
              ))}
            </Row>
            {direction === 'toEn' && (
              <Row label="对象">
                <input
                  value={rel}
                  onChange={(e) => setRel(e.target.value)}
                  placeholder="可不填：好朋友、导师…"
                  className="w-44 border-b border-zinc-200 bg-transparent px-1 py-0.5 text-[13px] transition-colors outline-none placeholder:text-zinc-400/70 focus:border-indigo-400 sm:w-52 dark:border-white/10 dark:placeholder:text-zinc-600"
                />
                {relHistory
                  .filter((h) => h && h !== rel)
                  .slice(0, 3)
                  .map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setRel(h)}
                      title="用上次填过的"
                      className="rounded-full px-2 py-0.5 text-[12px] text-zinc-400/80 transition-colors hover:bg-zinc-500/10 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {h}
                    </button>
                  ))}
              </Row>
            )}
            <Row label="补充">
              <input
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="可不填：背景或要求，比如「对方刚帮了我个忙」「别太热情」"
                className="min-w-0 flex-1 border-b border-zinc-200 bg-transparent px-1 py-0.5 text-[13px] transition-colors outline-none placeholder:text-zinc-400/70 focus:border-indigo-400 dark:border-white/10 dark:placeholder:text-zinc-600"
              />
            </Row>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="hidden text-[11px] text-zinc-400/80 sm:block dark:text-zinc-500">
              Ctrl + Enter 发送
            </span>
            <button
              type="button"
              onClick={translate}
              disabled={!streaming && !input.trim()}
              className="btn-primary ml-auto inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
            >
              {streaming ? (
                <>
                  <IconStop size={14} />
                  停止
                </>
              ) : (
                <>
                  <IconSend size={14} />
                  翻译
                </>
              )}
            </button>
          </div>
        </section>

        {error && (
          <div className="glass animate-rise mt-5 rounded-2xl p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!error && (output || streaming) && (
          <div className="mt-5 space-y-2.5">
            <OutputView direction={direction} raw={output} streaming={streaming} />
            {output && !streaming && (
              <div className="glass animate-rise flex items-center gap-2 rounded-2xl py-2 pr-2 pl-4">
                <IconWand size={15} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
                <input
                  value={refineText}
                  onChange={(e) => setRefineText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      refine()
                    }
                  }}
                  placeholder="让 AI 再改改：更简短 / 更礼貌 / 别用缩写…"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400/70 dark:placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={refine}
                  disabled={!refineText.trim()}
                  className="btn-primary rounded-xl px-4 py-1.5 text-xs font-medium text-white shadow-md shadow-indigo-500/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
                >
                  优化
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="flex items-center justify-center gap-2 py-8 text-[11px] text-zinc-400 dark:text-zinc-600">
        <span>API Key 只保存在本机浏览器</span>
        <span aria-hidden="true">·</span>
        <a
          href="https://github.com/lessen-xu/vibetrans"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <IconGitHub size={12} />
          GitHub
        </a>
      </footer>

      <SettingsModal
        open={settingsOpen}
        hint={settingsHint}
        configs={configs}
        activeId={activeCfg?.id ?? ''}
        onClose={() => {
          setSettingsOpen(false)
          setSettingsHint('')
        }}
        onSave={(next, nextActive) => {
          setConfigs(next)
          setActiveId(nextActive)
        }}
      />
    </div>
  )
}
