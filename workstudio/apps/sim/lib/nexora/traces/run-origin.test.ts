/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { noteRunOrigin, takeRunOrigin } from '@/lib/nexora/traces/run-origin'

describe('run-origin', () => {
  it('rend l’indice noté pour une exécution, une seule fois', () => {
    noteRunOrigin('exec-a', { source: 'api_key', apiKeyId: 'key-1' })
    expect(takeRunOrigin('exec-a')).toEqual({ source: 'api_key', apiKeyId: 'key-1' })
    expect(takeRunOrigin('exec-a')).toBeUndefined()
  })

  it('ne confond pas deux exécutions', () => {
    noteRunOrigin('exec-b', { source: 'api_key', apiKeyId: 'key-b' })
    noteRunOrigin('exec-c', { source: 'api_key', apiKeyId: 'key-c' })
    expect(takeRunOrigin('exec-c')?.apiKeyId).toBe('key-c')
    expect(takeRunOrigin('exec-b')?.apiKeyId).toBe('key-b')
  })

  it('ne connaît pas une exécution jamais notée', () => {
    expect(takeRunOrigin('exec-inconnue')).toBeUndefined()
  })
})
