/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { buildSnippet, developerBaseUrl } from '@/lib/nexora/developer-api/snippets'

/** What a POSIX shell makes of a single-quoted word: `'\''` closes, escapes, reopens. */
function unquoteSingle(word: string): string {
  return word.replace(/^'|'$/g, '').replaceAll(`'\\''`, `'`)
}

describe('developerBaseUrl', () => {
  it('adds /v1 to the instance address, whatever its trailing slashes', () => {
    expect(developerBaseUrl('https://ia.pme.fr/')).toBe('https://ia.pme.fr/v1')
    expect(developerBaseUrl('http://localhost:3000')).toBe('http://localhost:3000/v1')
  })
})

describe('buildSnippet', () => {
  const options = { baseUrl: 'https://ia.pme.fr/v1', model: "agent:Agent d'accueil" }

  it('keeps an agent name with an apostrophe a valid single-quoted cURL body', () => {
    const curl = buildSnippet('curl', options)
    const body = /-d ('(?:[^']|'\\'')*')/.exec(curl)?.[1]
    expect(body).toBeDefined()
    expect(JSON.parse(unquoteSingle(body ?? ''))).toMatchObject({ model: "agent:Agent d'accueil" })
  })

  it('never puts a key in the code: it reads NEXORA_API_KEY', () => {
    for (const language of ['python', 'typescript', 'curl', 'n8n'] as const) {
      const snippet = buildSnippet(language, options)
      expect(snippet).toContain('NEXORA_API_KEY')
      expect(snippet).not.toMatch(/sk-nexora-[A-Za-z0-9_-]{8,}/)
    }
  })

  it('quotes the model as a string literal in Python and TypeScript', () => {
    expect(buildSnippet('python', options)).toContain(`model="agent:Agent d'accueil"`)
    expect(buildSnippet('typescript', options)).toContain(`model: "agent:Agent d'accueil"`)
  })
})
