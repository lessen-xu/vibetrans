import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { ModelConfig } from '../types'
import { PRESETS, newConfig } from '../lib/presets'
import { IconEye, IconEyeOff, IconTrash, IconX } from './Icons'

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  trailing,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  trailing?: ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <div className="relative mt-1">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-xl border border-zinc-200 bg-white/70 px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-zinc-600 dark:focus:border-indigo-400/60"
        />
        {trailing}
      </div>
    </label>
  )
}

interface Props {
  open: boolean
  hint: string
  configs: ModelConfig[]
  activeId: string
  onClose: () => void
  onSave: (configs: ModelConfig[], activeId: string) => void
}

export function SettingsModal({ open, hint, configs, activeId, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<ModelConfig[]>(configs)
  const [current, setCurrent] = useState(activeId)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (open) {
      // 旧数据没有 presetId：按 Base URL 匹配回服务商，匹配不上算自定义
      const seed = configs.length ? configs : [newConfig()]
      setDraft(
        seed.map((c) => ({
          ...c,
          presetId:
            c.presetId ?? PRESETS.find((p) => p.baseUrl === c.baseUrl.trim())?.id ?? 'custom',
        })),
      )
      setCurrent(activeId)
      setShowKey(false)
    }
  }, [open, configs, activeId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const cfg = draft.find((c) => c.id === current) ?? draft[0]
  if (!cfg) return null

  const patch = (partial: Partial<ModelConfig>) => {
    setDraft((prev) => prev.map((c) => (c.id === cfg.id ? { ...c, ...partial } : c)))
  }

  // 切换服务商：已有该服务商的配置（含填过的 Key）就切过去，否则按模板新建
  const selectPreset = (pid: string) => {
    const existing = draft.find((c) => (c.presetId ?? 'custom') === pid)
    if (existing) {
      setCurrent(existing.id)
      setShowKey(false)
      return
    }
    const p = PRESETS.find((x) => x.id === pid)
    const next: ModelConfig = p
      ? { id: crypto.randomUUID(), presetId: p.id, name: p.name, baseUrl: p.baseUrl, model: p.model, apiKey: '' }
      : { id: crypto.randomUUID(), presetId: 'custom', name: '', baseUrl: '', model: '', apiKey: '' }
    setDraft((prev) => [...prev, next])
    setCurrent(next.id)
    setShowKey(false)
  }

  const removeConfig = () => {
    const rest = draft.filter((c) => c.id !== cfg.id)
    if (!rest.length) {
      const fresh = newConfig()
      setDraft([fresh])
      setCurrent(fresh.id)
      return
    }
    setDraft(rest)
    setCurrent(rest[0].id)
  }

  const save = () => {
    const cleaned = draft.map((c) => ({
      ...c,
      name: c.name.trim(),
      baseUrl: c.baseUrl.trim(),
      model: c.model.trim(),
      apiKey: c.apiKey.trim(),
    }))
    onSave(cleaned, current)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="glass animate-rise relative w-full max-w-md rounded-3xl bg-white/90 p-5 sm:p-6 dark:bg-[#12151d]/95">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">API 设置</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-500/10 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <IconX size={16} />
          </button>
        </div>

        {hint && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-700 dark:text-amber-300">
            {hint}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">服务商</span>
            <select
              value={cfg.presetId ?? 'custom'}
              onChange={(e) => selectPreset(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white/70 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 dark:border-white/10 dark:bg-white/5 dark:focus:border-indigo-400/60"
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="custom">其他（自定义）</option>
            </select>
          </label>

          <Field label="名称" value={cfg.name} onChange={(v) => patch({ name: v })} placeholder="随便起，方便识别" />
          <Field
            label="Base URL"
            value={cfg.baseUrl}
            onChange={(v) => patch({ baseUrl: v })}
            placeholder="https://api.deepseek.com"
          />
          <Field
            label="模型"
            value={cfg.model}
            onChange={(v) => patch({ model: v })}
            placeholder="deepseek-v4-flash"
          />
          <Field
            label="API Key"
            value={cfg.apiKey}
            onChange={(v) => patch({ apiKey: v })}
            placeholder="sk-…"
            type={showKey ? 'text' : 'password'}
            trailing={
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {showKey ? <IconEyeOff size={15} /> : <IconEye size={15} />}
              </button>
            }
          />
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-zinc-400 dark:text-zinc-500">
          每个服务商的配置和 Key 分开保存，切换不会丢。Key
          只存在本机浏览器（localStorage），请求直接从浏览器发往上面填写的地址，不经过任何中间服务器。
        </p>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={removeConfig}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-zinc-400 transition-colors hover:text-red-500"
          >
            <IconTrash size={13} />
            删除此配置
          </button>
          <button
            type="button"
            onClick={save}
            className="btn-primary rounded-xl px-5 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            保存并使用
          </button>
        </div>
      </div>
    </div>
  )
}
