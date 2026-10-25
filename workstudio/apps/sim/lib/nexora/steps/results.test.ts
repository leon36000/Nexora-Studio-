/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { stepResultsFrom } from '@/lib/nexora/steps/results'

const entry = (over: Record<string, unknown>) => ({
  blockId: 'a',
  executionId: 'run-1',
  executionOrder: 1,
  timestamp: '2026-10-25T10:00:00.000Z',
  ...over,
})

describe('stepResultsFrom', () => {
  it('ne garde que la dernière exécution', () => {
    const results = stepResultsFrom([
      entry({ blockId: 'a', success: false, error: 'ancienne erreur' }),
      entry({
        blockId: 'b',
        executionId: 'run-2',
        timestamp: '2026-10-25T11:00:00.000Z',
        success: true,
        durationMs: 1200,
        output: { content: 'ok' },
      }),
    ])
    expect(results.has('a')).toBe(false)
    expect(results.get('b')).toEqual({
      status: 'success',
      durationMs: 1200,
      output: { content: 'ok' },
    })
  })

  it('distingue une étape en cours, réussie et en erreur', () => {
    const results = stepResultsFrom([
      entry({ blockId: 'a', isRunning: true }),
      entry({ blockId: 'b', success: true }),
      entry({ blockId: 'c', success: false, error: 'HTTP 404' }),
      entry({ blockId: 'd', success: true, error: new Error('Delai depasse') }),
    ])
    expect(results.get('a')?.status).toBe('running')
    expect(results.get('b')?.status).toBe('success')
    expect(results.get('c')).toMatchObject({ status: 'error', error: 'HTTP 404' })
    expect(results.get('d')).toMatchObject({ status: 'error', error: 'Delai depasse' })
  })

  it('prend l’entrée la plus récente d’une étape exécutée plusieurs fois', () => {
    const results = stepResultsFrom([
      entry({ executionOrder: 1, isRunning: true }),
      entry({ executionOrder: 2, success: true, durationMs: 5 }),
    ])
    expect(results.get('a')?.status).toBe('success')
  })

  it('traite une étape annulée comme non exécutée et une liste vide sans erreur', () => {
    expect(stepResultsFrom([entry({ isCanceled: true })]).get('a')?.status).toBe('idle')
    expect(stepResultsFrom([]).size).toBe(0)
  })
})
