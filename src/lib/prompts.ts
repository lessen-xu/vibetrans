import type { ChatMessage, Direction } from '../types'

export interface Scene {
  id: string
  label: string
  desc: string
  hint: string
}

export const SCENES: Scene[] = [
  {
    id: 'daily',
    label: '日常',
    desc: '面对面的日常口头交流',
    hint: '用母语者平时真的会说的口语，自然随意但清晰，避免书面腔和教科书味',
  },
  {
    id: 'social',
    label: '社交媒体',
    desc: '社交平台（X/Twitter、Instagram、TikTok、Reddit）的帖子和评论区',
    hint: '可以用缩写（ngl、fr、tbh、imo 等）、网络俚语和 emoji，语气松弛有梗',
  },
  {
    id: 'gaming',
    label: '游戏',
    desc: '游戏内语音、文字频道和电竞讨论',
    hint: '简短直接，用玩家常用语（gg、nt、clutch、carry、diff 等）',
  },
  {
    id: 'texting',
    label: '短信私聊',
    desc: '手机短信、WhatsApp、Discord 等一对一消息',
    hint: '像朋友间发消息一样随意简短，可用常见缩写，标点可以不完整',
  },
  {
    id: 'email',
    label: '邮件',
    desc: '日常邮件往来',
    hint: '自然得体，友好但不过分正式，避免陈旧生硬的商务套话',
  },
]

export function buildMessages(
  direction: Direction,
  sceneId: string,
  relationship: string,
  extra: string,
  input: string,
): ChatMessage[] {
  const scene = SCENES.find((s) => s.id === sceneId) ?? SCENES[0]
  const ctx = extra ? `\n补充信息：${extra}` : ''

  if (direction === 'toEn') {
    const rel = relationship
      ? `\n对话对象：${relationship}。根据这层关系调整亲密度、语气和用词。`
      : ''
    const system = `你是在英语环境生活多年的双语者，帮非母语者把想表达的意思用母语者真正会说的英语讲出来。
场景：${scene.desc}。${scene.hint}。${rel}${ctx}

规则：
- 给出 2-3 种地道说法，按推荐程度排序，每行一种
- 忠实原文的意思和信息量：不遗漏要点，也不要添加或引申原文没有的内容；在此前提下用母语者的习惯表达
- 自然口语，不要逐字直译；不要用破折号（— 或 –），母语者聊天几乎不这么写，改用逗号或拆成短句
- 若某种说法的语气或用法需要提醒，在该行末尾加「 // 简短中文注释」，注释必须跟说法在同一行；没必要就不加
- 除此之外不输出任何内容：不要编号、引号、标题或解释`
    return [
      { role: 'system', content: system },
      { role: 'user', content: input },
    ]
  }

  const system = `你是精通英语口语、网络文化和俚语的翻译，帮中文用户看懂英语母语者的表达。场景参考：${scene.desc}。${ctx}

规则：
- 第一行：用自然的中文说出这句话的意思，尽量还原语气
- 如果包含俚语、缩写或梗，空一行后逐条解释，每条一行，格式「**词** — 解释」
- 保持简洁，不输出其他内容`
  return [
    { role: 'system', content: system },
    { role: 'user', content: input },
  ]
}

export interface Candidate {
  text: string
  note?: string
}

const CJK = /[一-鿿]/

/** 把流式返回的多行文本解析成候选说法（每行一条，行尾「 // 注释」，兼容旧的「 — 注释」）。 */
export function parseCandidates(raw: string): Candidate[] {
  const out: Candidate[] = []
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    // 以破折号开头且含中文的行：模型把注释换行写了，归到上一条
    if (out.length && /^[—–]/.test(line) && CJK.test(line)) {
      const note = line.replace(/^[—–]+\s*/, '')
      const prev = out[out.length - 1]
      prev.note = prev.note ? `${prev.note}；${note}` : note
      continue
    }
    const cleaned = line.replace(/^(?:[-*•]|\d+[.、)])\s*/, '')
    let m = cleaned.match(/^(.+?)\s+\/\/\s*(.+)$/)
    if (!m) {
      // 兼容行尾破折号注释，但只有后半段是中文才切，避免误切英文句子里的 em dash
      const dash = cleaned.match(/^(.+?)\s+[—–]+\s+(.+)$/)
      if (dash && CJK.test(dash[2])) m = dash
    }
    if (m) out.push({ text: m[1].trim(), note: m[2].trim() })
    else out.push({ text: cleaned })
  }
  return out
}
