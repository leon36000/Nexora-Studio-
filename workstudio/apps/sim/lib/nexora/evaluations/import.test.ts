/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import {
  DatasetImportError,
  guessMapping,
  parseCsvRows,
  parseJsonlRows,
  rowsFromConversation,
  rowsFromRecords,
  rowsFromTraces,
} from '@/lib/nexora/evaluations/import'
import { MAX_DATASET_ROWS } from '@/lib/nexora/evaluations/types'

describe('CSV', () => {
  it('reconnaît le séparateur « ; », le BOM, les guillemets et les colonnes en français', async () => {
    const text =
      '﻿question;réponse attendue;consigne\n' +
      '"Combien coûte le forfait Pro ; le mensuel ?";"49 € par mois";"Le prix doit être exact"\n' +
      'Y a-t-il un engagement ?;Aucun engagement;\n'
    const { rows, skipped } = await parseCsvRows(text)
    expect(skipped).toBe(0)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      input: 'Combien coûte le forfait Pro ; le mensuel ?',
      expected: '49 € par mois',
      guidance: 'Le prix doit être exact',
      candidate: null,
      humanVerdict: null,
    })
    expect(rows[1].guidance).toBeNull()
  })

  it('lit les annotations : réponse annotée, verdict (oui/non) et justification', async () => {
    const text =
      'question,réponse,verdict,justification\n' +
      'Prix ?,49 €,oui,Exact\n' +
      'Prix ?,59 €,non,Le prix est faux\n' +
      'Prix ?,peut-être,bof,Indécis\n'
    const { rows } = await parseCsvRows(text)
    expect(rows.map((row) => row.humanVerdict)).toEqual(['pass', 'fail', null])
    expect(rows[1]).toMatchObject({ candidate: '59 €', humanNote: 'Le prix est faux' })
  })

  it('ignore une ligne sans question et la compte', async () => {
    const { rows, skipped } = await parseCsvRows('question,attendu\nA ?,a\n,b\n  ,c\n')
    expect(rows).toHaveLength(1)
    expect(skipped).toBe(2)
  })

  it('refuse un fichier sans colonne de question reconnue, en nommant les colonnes trouvées', async () => {
    await expect(parseCsvRows('colonne1,colonne2\nA,B\n')).rejects.toThrow(/colonne1/)
  })

  it('suit le choix de colonnes de l’utilisateur', async () => {
    const { rows } = await parseCsvRows('c1,c2\nQuestion ?,Réponse\n', {
      input: 'c1',
      expected: 'c2',
    })
    expect(rows[0]).toMatchObject({ input: 'Question ?', expected: 'Réponse' })
  })
})

describe('JSONL', () => {
  it('lit un objet par ligne et compte les lignes illisibles sans échouer', () => {
    const text = [
      '{"question": "Prix ?", "attendu": "49 €"}',
      'ceci n’est pas du JSON',
      '',
      '[1, 2]',
      '{"question": "Durée ?", "attendu": 12}',
    ].join('\n')
    const { rows, skipped } = parseJsonlRows(text)
    expect(rows.map((row) => [row.input, row.expected])).toEqual([
      ['Prix ?', '49 €'],
      ['Durée ?', '12'],
    ])
    expect(skipped).toBe(2)
  })

  it('lit le format de conversation : dernière question et dernière réponse', () => {
    const line = JSON.stringify({
      messages: [
        { role: 'system', content: 'Tu es aimable.' },
        { role: 'user', content: 'Prix ?' },
        { role: 'assistant', content: '49 €' },
      ],
    })
    const { rows } = parseJsonlRows(line)
    expect(rows[0]).toMatchObject({ input: 'Prix ?', expected: '49 €' })
  })
})

describe('plafond', () => {
  it('refuse plus de 10 000 lignes', () => {
    const records = Array.from({ length: MAX_DATASET_ROWS + 1 }, (_, index) => ({
      question: `Q${index}`,
    }))
    expect(() => rowsFromRecords(records)).toThrow(DatasetImportError)
    expect(() => rowsFromRecords(records)).toThrow(/10 000/)
  })

  it('accepte exactement 10 000 lignes', () => {
    const records = Array.from({ length: MAX_DATASET_ROWS }, (_, index) => ({
      question: `Q${index}`,
    }))
    expect(rowsFromRecords(records).rows).toHaveLength(MAX_DATASET_ROWS)
  })
})

describe('correspondance des colonnes', () => {
  it('ignore les accents et la casse', () => {
    expect(guessMapping(['Question', 'Réponse attendue', 'CONSIGNE', 'Entrée'])).toMatchObject({
      input: 'Question',
      expected: 'Réponse attendue',
      guidance: 'CONSIGNE',
    })
  })

  it('distingue « réponse » (annotée) de « réponse attendue »', () => {
    const mapping = guessMapping(['question', 'réponse', 'réponse attendue'])
    expect(mapping.candidate).toBe('réponse')
    expect(mapping.expected).toBe('réponse attendue')
  })
})

describe('depuis des traces', () => {
  it('garde la question, la réponse obtenue et la trace d’origine ; saute les traces sans question', () => {
    const rows = rowsFromTraces([
      { id: 't1', input: 'Prix ?', output: '49 €' },
      { id: 't2', input: null, output: 'x' },
      { id: 't3', input: '  ', output: 'y' },
    ])
    expect(rows).toEqual([
      expect.objectContaining({
        input: 'Prix ?',
        candidate: '49 €',
        expected: null,
        sourceRef: 'trace:t1',
      }),
    ])
  })
})

describe('depuis une conversation de l’Assistant', () => {
  it('fait un échange par question suivie de sa réponse', () => {
    const rows = rowsFromConversation('c1', [
      { role: 'user', content: 'Bonjour' },
      { role: 'assistant', content: 'Bonjour !', interrupted: false },
      { role: 'user', content: 'Prix ?' },
      { role: 'assistant', content: '49 €', interrupted: false },
    ])
    expect(rows.map((row) => [row.input, row.candidate, row.sourceRef])).toEqual([
      ['Bonjour', 'Bonjour !', 'conversation:c1:0'],
      ['Prix ?', '49 €', 'conversation:c1:2'],
    ])
  })

  it('saute une question restée sans réponse ou dont la réponse a été interrompue', () => {
    const rows = rowsFromConversation('c1', [
      { role: 'user', content: 'Une' },
      { role: 'assistant', content: 'début…', interrupted: true },
      { role: 'user', content: 'Deux' },
    ])
    expect(rows).toEqual([])
  })
})
