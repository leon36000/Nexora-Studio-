/** Terms the company's recordings are likely to contain, given to Whisper as its initial prompt. */
export const MAX_LEXICON_TERMS = 100
/** Whisper reads about 220 tokens of prompt; 800 characters of names stay well inside. */
export const MAX_LEXICON_CHARACTERS = 800

const SEPARATOR = ', '

/** A clean list of distinct terms that fits the prompt: extra terms are dropped, never cut. */
export function normalizeLexicon(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const kept: string[] = []
  let length = 0
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const term = entry.replace(/\s+/g, ' ').trim().slice(0, MAX_LEXICON_CHARACTERS)
    const key = term.toLowerCase()
    if (!term || seen.has(key)) continue
    const added = term.length + (kept.length > 0 ? SEPARATOR.length : 0)
    if (kept.length >= MAX_LEXICON_TERMS || length + added > MAX_LEXICON_CHARACTERS) continue
    seen.add(key)
    kept.push(term)
    length += added
  }
  return kept
}

/** The prompt sent with a recording: the lexicon as a sentence, then the block's own prompt. */
export function buildTranscriptionPrompt(
  lexicon: readonly string[],
  userPrompt?: string
): string | undefined {
  const parts = [
    lexicon.length > 0 ? `Vocabulaire : ${lexicon.join(SEPARATOR)}.` : '',
    userPrompt?.trim() ?? '',
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : undefined
}
