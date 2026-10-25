/** Longest piece sent to the voice in one request (Nexora API takes 4 096; shorter starts sooner). */
export const SPEECH_CHUNK_CHARACTERS = 1200

const SENTENCE_END = /[.!?…:;]$/

/** An answer in Markdown as something to say: no symbols, no code, no addresses. */
export function speechText(markdown: string): string {
  const lines: string[] = []
  let inFence = false
  for (const raw of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(raw)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    let line = raw.trim()
    if (/^[-*_]{3,}$/.test(line) || /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line))
      continue
    const isHeading = /^#{1,6}\s+/.test(line)
    line = line
      .replace(/^#{1,6}\s+/, '')
      .replace(/^>\s?/, '')
      .replace(/^(?:[-*+]|\d+[.)])\s+/, '')
    if (line.startsWith('|')) {
      line = line
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean)
        .join(', ')
      line = line ? `${line}.` : line
    }
    line = line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/(\*|_)(.+?)\1/g, '$2')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (!line) {
      if (lines.at(-1) !== '') lines.push('')
      continue
    }
    const listed = /^(?:\s*(?:[-*+]|\d+[.)])\s+)/.test(raw)
    lines.push(isHeading || listed ? (SENTENCE_END.test(line) ? line : `${line}.`) : line)
  }
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Pieces of at most `max` characters, cut after a sentence (or at a space when one is longer). */
export function chunkForSpeech(text: string, max = SPEECH_CHUNK_CHARACTERS): string[] {
  const sentences =
    text
      .replace(/\s+/g, ' ')
      .trim()
      .match(/[^.!?…]+(?:[.!?…]+|$)\s*/g) ?? []
  const chunks: string[] = []
  let current = ''
  const flush = () => {
    if (current.trim()) chunks.push(current.trim())
    current = ''
  }
  for (const sentence of sentences) {
    if (sentence.length > max) {
      flush()
      let rest = sentence.trim()
      while (rest.length > max) {
        const cut = rest.lastIndexOf(' ', max)
        const at = cut > 0 ? cut : max
        chunks.push(rest.slice(0, at).trim())
        rest = rest.slice(at).trim()
      }
      current = rest
      continue
    }
    if ((current + sentence).trim().length > max) flush()
    current += sentence
  }
  flush()
  return chunks
}
