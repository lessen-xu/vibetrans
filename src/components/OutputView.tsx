import { useState } from 'react'
import type { Direction } from '../types'
import { parseCandidates } from '../lib/prompts'
import { IconCheck, IconCopy } from './Icons'

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="复制"
      className={`rounded-lg p-1.5 text-zinc-400 transition-all hover:bg-zinc-500/10 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 ${className}`}
    >
      {copied ? <IconCheck size={15} className="text-emerald-500" /> : <IconCopy size={15} />}
    </button>
  )
}

/** 极简富文本：支持 **加粗** 和换行 */
function RichText({ text, streaming }: { text: string; streaming: boolean }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return null
        const isLast = i === lines.length - 1
        return (
          <p
            key={i}
            className={`leading-relaxed ${i === 0 ? 'text-[16px] font-medium' : 'text-[14.5px] text-zinc-600 dark:text-zinc-300'} ${streaming && isLast ? 'stream-caret' : ''}`}
          >
            {line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
              seg.startsWith('**') && seg.endsWith('**') ? (
                <strong key={j} className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {seg.slice(2, -2)}
                </strong>
              ) : (
                seg
              ),
            )}
          </p>
        )
      })}
    </div>
  )
}

const TIERS = [
  { label: '忠实原意', color: 'text-emerald-600 dark:text-emerald-400' },
  { label: '平衡', color: 'text-indigo-500 dark:text-indigo-300' },
  { label: '最地道', color: 'text-orange-500 dark:text-orange-300' },
]

interface Props {
  direction: Direction
  raw: string
  streaming: boolean
}

export function OutputView({ direction, raw, streaming }: Props) {
  if (direction === 'toZh') {
    return (
      <div className="glass animate-rise relative rounded-2xl p-4 pr-11 sm:p-5 sm:pr-12">
        <CopyButton text={raw} className="absolute top-3 right-3" />
        <RichText text={raw} streaming={streaming} />
      </div>
    )
  }

  const candidates = parseCandidates(raw)
  return (
    <>
      {candidates.map((c, i) => {
        const isLast = i === candidates.length - 1
        const tier = TIERS[i]
        return (
          <div
            key={i}
            className="glass animate-rise group relative rounded-2xl p-4 pr-11 sm:px-5"
          >
            {tier && (
              <div className={`mb-1 text-[11px] font-semibold tracking-wide ${tier.color}`}>
                {tier.label}
              </div>
            )}
            <p
              className={`text-[17px] leading-relaxed font-medium ${streaming && isLast ? 'stream-caret' : ''}`}
            >
              {c.text}
            </p>
            {c.note && (
              <p className="mt-1.5 text-[13px] text-zinc-500 dark:text-zinc-400">{c.note}</p>
            )}
            <CopyButton
              text={c.text}
              className="absolute top-3 right-3 opacity-50 group-hover:opacity-100"
            />
          </div>
        )
      })}
    </>
  )
}
