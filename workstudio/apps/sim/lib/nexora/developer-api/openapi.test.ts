/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { buildDeveloperOpenApi } from '@/lib/nexora/developer-api/openapi'

const spec = buildDeveloperOpenApi('https://pme.example')
type Method = 'get' | 'post' | 'delete'
const statusesOf = (path: string, method: Method) =>
  Object.keys(
    (spec.paths as Record<string, Record<string, { responses: object }>>)[path][method].responses
  )

/** Every refusal the gateway can answer on each endpoint (see `errors.ts`, `upstream.ts`). */
const ANSWERED: [string, Method, string[]][] = [
  ['/models', 'get', ['200', '401', '429', '503']],
  ['/models/{model}', 'get', ['200', '401', '404', '429', '503']],
  [
    '/chat/completions',
    'post',
    ['200', '400', '401', '402', '403', '404', '409', '413', '429', '502', '503'],
  ],
  ['/embeddings', 'post', ['200', '400', '401', '402', '403', '404', '413', '429', '502', '503']],
  ['/audio/speech', 'post', ['200', '400', '401', '402', '403', '404', '413', '429', '502', '503']],
  [
    '/audio/transcriptions',
    'post',
    ['200', '400', '401', '402', '403', '404', '413', '429', '502', '503'],
  ],
  ['/files', 'post', ['200', '400', '401', '413', '429']],
  ['/files', 'get', ['200', '401', '429']],
  ['/files/{file_id}', 'get', ['200', '401', '404', '429']],
  ['/files/{file_id}', 'delete', ['200', '401', '404', '429']],
  ['/files/{file_id}/content', 'get', ['200', '401', '404', '429']],
  ['/batches', 'post', ['200', '400', '401', '403', '404', '429']],
  ['/batches', 'get', ['200', '401', '429']],
  ['/batches/{batch_id}', 'get', ['200', '401', '404', '429']],
  ['/batches/{batch_id}/cancel', 'post', ['200', '401', '404', '409', '429']],
]

describe('the developer API OpenAPI description', () => {
  it.each(ANSWERED)('documents every status %s (%s) can answer', (path, method, statuses) => {
    expect(statusesOf(path, method)).toEqual(expect.arrayContaining(statuses))
  })

  it('says a batch has one model, low priority and the 24 hour default window', () => {
    const description = JSON.stringify(spec.paths['/batches'].post)
    expect(description).toContain('un seul modèle')
    expect(description).toContain('24h')
  })

  it('names the ambiguous agent refusal on chat completions', () => {
    const responses = spec.paths['/chat/completions'].post.responses as Record<
      string,
      { description: string }
    >
    expect(responses['409']?.description).toContain('agent_name_ambiguous')
  })
})
