import { describe, expect, it } from 'vitest'
import type { AssistantWorkflowField } from '@/lib/api/contracts/nexora-assistant-extras'
import {
  buildRunInput,
  buildSubmission,
  outputText,
  readRunResult,
} from '@/lib/nexora/assistant/workflow-run'

const fields: AssistantWorkflowField[] = [
  { name: 'client', label: 'Client', type: 'string', required: true, example: '' },
  { name: 'quantite', label: 'Quantité', type: 'number', required: false, example: '' },
  { name: 'urgent', label: 'Urgent', type: 'boolean', required: false, example: '' },
  { name: 'lignes', label: 'Lignes', type: 'json', required: false, example: '' },
]

describe('buildRunInput', () => {
  it('reads each field as its type, leaving out what was not filled', () => {
    expect(
      buildRunInput(fields, { client: ' Martin ', quantite: '3', urgent: true, lignes: '[1,2]' })
    ).toEqual({ ok: true, input: { client: 'Martin', quantite: 3, urgent: true, lignes: [1, 2] } })
    expect(buildRunInput(fields, { client: 'Martin' })).toEqual({
      ok: true,
      input: { client: 'Martin', urgent: false },
    })
  })

  it('reports a required field left empty, a bad number and bad JSON, by field', () => {
    expect(buildRunInput(fields, { client: '  ', quantite: 'trois', lignes: '[1,' })).toEqual({
      ok: false,
      errors: { client: 'required', quantite: 'number', lignes: 'json' },
    })
  })

  it('accepts a decimal comma in a number', () => {
    expect(buildRunInput(fields, { client: 'x', quantite: '2,5' })).toMatchObject({
      ok: true,
      input: { quantite: 2.5 },
    })
  })
})

describe('outputText', () => {
  it.each([
    ['a string', 'Devis prêt', 'Devis prêt'],
    ['the content of an agent', { content: 'Devis prêt', model: 'x' }, 'Devis prêt'],
    ['a response', { response: 'Bonjour' }, 'Bonjour'],
    ['nothing', undefined, null],
    ['null', null, null],
    ['an empty text', { content: '   ' }, null],
  ])('reads %s', (_name, output, expected) => {
    expect(outputText(output)).toBe(expected)
  })

  it('shows any other output as readable JSON, cut when it is huge', () => {
    expect(outputText({ total: 12 })).toBe('{\n  "total": 12\n}')
    expect(outputText({ big: 'x'.repeat(200_000) })?.length).toBeLessThanOrEqual(100_001)
  })
})

describe('readRunResult', () => {
  it('reads a completed run', () => {
    expect(
      readRunResult({ success: true, executionId: 'e-1', output: { content: 'Devis prêt' } })
    ).toEqual({
      status: 'completed',
      executionId: 'e-1',
      output: 'Devis prêt',
      error: null,
      pause: null,
    })
  })

  it('reads a failed run, with the reason', () => {
    expect(readRunResult({ success: false, executionId: 'e-2', error: 'Modèle indisponible' })).toEqual({
      status: 'failed',
      executionId: 'e-2',
      output: null,
      error: 'Modèle indisponible',
      pause: null,
    })
  })

  it('reads a run paused for a validation: where to answer, and what to ask', () => {
    const result = readRunResult({
      success: true,
      executionId: 'e-3',
      output: {
        data: {
          _resume: {
            apiUrl: 'https://nexora.pme.fr/api/resume/wf-1/e-3/ctx-1',
          },
          message: 'Valider le devis avant envoi ?',
          inputFormat: [
            { name: 'approuve', type: 'boolean', description: 'Approuvez-vous ?', required: true },
            { name: 'commentaire', type: 'string', description: 'Commentaire' },
          ],
        },
      },
    })
    expect(result).toEqual({
      status: 'paused',
      executionId: 'e-3',
      output: null,
      error: null,
      pause: {
        resumePath: '/api/resume/wf-1/e-3/ctx-1',
        message: 'Valider le devis avant envoi ?',
        fields: [
          { name: 'approuve', label: 'Approuvez-vous ?', type: 'boolean', required: true },
          { name: 'commentaire', label: 'Commentaire', type: 'string', required: false },
        ],
      },
    })
  })

  it('does not trust a resume address that is not the resume API', () => {
    const result = readRunResult({
      success: true,
      executionId: 'e-4',
      output: { data: { _resume: { apiUrl: 'https://evil.example/steal' } } },
    })
    expect(result.status).not.toBe('paused')
  })
})

describe('buildSubmission', () => {
  const pauseFields = [
    { name: 'approuve', label: 'Approuvez-vous ?', type: 'boolean' as const, required: true },
    { name: 'commentaire', label: 'Commentaire', type: 'string' as const, required: false },
  ]

  it('answers yes or no with the comment, as the resume API reads it', () => {
    expect(buildSubmission(pauseFields, true, ' Ok pour moi ')).toEqual({
      input: { submission: { approuve: true, commentaire: 'Ok pour moi' } },
    })
    expect(buildSubmission(pauseFields, false, '')).toEqual({
      input: { submission: { approuve: false } },
    })
  })
})
