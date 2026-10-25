import { isRecordLike } from '@sim/utils/object'

/** The model name as people know it: Sim prefixes the models it reaches through Nexora API with `vllm/`. */
export function modelLabel(name: string): string {
  return name.replace(/^vllm\//, '')
}

/** The text of a chat message's `content`: a string, or the text parts of a multi-part content. */
export function contentText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (typeof part === 'string') return part
      if (!isRecordLike(part)) return ''
      if (typeof part.text === 'string') return part.text
      return typeof part.type === 'string' && part.type.includes('image') ? '[image]' : ''
    })
    .filter(Boolean)
    .join(' ')
}

interface ChatLine {
  role: string
  text: string
}

function chatLines(messages: unknown): ChatLine[] | null {
  if (!Array.isArray(messages)) return null
  return messages.flatMap((message): ChatLine[] => {
    if (!isRecordLike(message)) return []
    const text = contentText(message.content)
    return text && typeof message.role === 'string' ? [{ role: message.role, text }] : []
  })
}

/** A conversation as `role: text` lines; `null` when `messages` is not a list. */
export function messagesToText(messages: unknown): string | null {
  const lines = chatLines(messages)
  if (!lines || lines.length === 0) return null
  return lines.map(({ role, text }) => `${role}: ${text}`).join('\n')
}

/** What the person last said in a conversation (text only); `null` when nothing was. */
export function lastUserText(messages: unknown): string | null {
  const lines = chatLines(messages) ?? []
  for (let index = lines.length - 1; index >= 0; index--) {
    if (lines[index].role === 'user') return lines[index].text.replace(/\[image\]/g, '').trim() || null
  }
  return null
}

/** Any value as readable text: a string as is, anything else as indented JSON; empty ⇒ `null`. */
export function valueToText(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') return value
  try {
    const json = JSON.stringify(value, null, 2)
    return json === '{}' || json === '[]' ? null : (json ?? null)
  } catch {
    return null
  }
}
