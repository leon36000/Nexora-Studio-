/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { buildDeveloperOpenApi } from '@/lib/nexora/developer-api/openapi'

const spec = buildDeveloperOpenApi('https://pme.example')
const statusesOf = (path: string, method: 'get' | 'post') =>
  Object.keys(
    (spec.paths as Record<string, Record<string, { responses: object }>>)[path][method].responses
  )

/** Every refusal the gateway can answer on each endpoint (see `errors.ts`, `upstream.ts`). */
const ANSWERED: [string, 'get' | 'post', string[]][] = [
  ['/models', 'get', ['200', '401', '429', '503']],
  ['/models/{model}', 'get', ['200', '401', '404', '429', '503']],
  [
    '/chat/completions',
    'post',
    ['200', '400', '401', '402', '403', '404', '409', '413', '429', '502', '503'],
  ],
  ['/embeddings', 'post', ['200', '400', '401', '402', '403', '404', '413', '429', '502', '503']],
  [
    '/audio/transcriptions',
    'post',
    ['200', '400', '401', '402', '403', '404', '413', '429', '502', '503'],
  ],
]

describe('the developer API OpenAPI description', () => {
  it.each(ANSWERED)('documents every status %s (%s) can answer', (path, method, statuses) => {
    expect(statusesOf(path, method)).toEqual(expect.arrayContaining(statuses))
  })

  it('names the ambiguous agent refusal on chat completions', () => {
    const responses = spec.paths['/chat/completions'].post.responses as Record<
      string,
      { description: string }
    >
    expect(responses['409']?.description).toContain('agent_name_ambiguous')
  })
})
