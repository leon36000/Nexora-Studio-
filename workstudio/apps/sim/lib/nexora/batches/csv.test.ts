import { describe, expect, it } from 'vitest'
import { answerOf, batchCsvStream, csvCell, resultCsvRow } from '@/lib/nexora/batches/csv'
import type { ResultRow } from '@/lib/nexora/batches/repository'

const row = (overrides: Partial<ResultRow> = {}): ResultRow => ({
  id: 'i1',
  position: 0,
  customId: 'row-1',
  rowRef: 'row-1',
  status: 'done',
  response: null,
  answer: 'Positif',
  error: null,
  latencyMs: 1234,
  inputText: 'Livraison rapide',
  ...overrides,
})

describe('csvCell', () => {
  it('quotes a cell with a separator, a quote or a line break, doubling the quotes', () => {
    expect(csvCell('a;b')).toBe('"a;b"')
    expect(csvCell('il a dit "oui"')).toBe('"il a dit ""oui"""')
    expect(csvCell('deux\nlignes')).toBe('"deux\nlignes"')
  })

  it('leaves a plain cell alone and writes nothing for null', () => {
    expect(csvCell('Positif')).toBe('Positif')
    expect(csvCell(null)).toBe('')
    expect(csvCell(42)).toBe('42')
  })

  it.each(['=SOMME(A1:A9)', '+33 1 23', '-1+1', '@cmd', '\tx'])(
    'defuses a spreadsheet formula: %s',
    (value) => {
      expect(csvCell(value).replace(/^"|"$/g, '').startsWith("'")).toBe(true)
    }
  )
})

describe('answerOf', () => {
  it('prefers the answer written in the table', () => {
    expect(answerOf(row())).toBe('Positif')
  })

  it('reads the assistant message of a chat completion', () => {
    const response = {
      status_code: 200,
      request_id: 'r',
      body: { choices: [{ message: { role: 'assistant', content: 'Négatif' } }] },
    }
    expect(answerOf(row({ answer: null, response }))).toBe('Négatif')
  })

  it('is empty for a request without an answer', () => {
    expect(answerOf(row({ answer: null, status: 'error' }))).toBe('')
  })
})

describe('resultCsvRow', () => {
  it('writes the number from 1, the input, the answer, the status in French, the error and the duration', () => {
    expect(resultCsvRow(row({ position: 4 }))).toBe(
      '5;row-1;Livraison rapide;Positif;Terminé;;1234'
    )
  })

  it('writes the error message of a failed request', () => {
    const failed = row({
      status: 'error',
      answer: null,
      error: { code: 'batch_cancelled', message: 'Le lot a été annulé.' },
      latencyMs: null,
    })
    expect(resultCsvRow(failed)).toBe('1;row-1;Livraison rapide;;Erreur;Le lot a été annulé.;')
  })
})

describe('batchCsvStream', () => {
  async function read(stream: ReadableStream<Uint8Array>) {
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
    return new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
  }

  it('starts with a byte order mark and a header, then one CRLF line per result, across pages', async () => {
    const rows = Array.from({ length: 5 }, (_, position) =>
      row({ position, customId: `r${position}` })
    )
    const stream = batchCsvStream(
      async (after, limit) => rows.filter((entry) => entry.position > after).slice(0, limit),
      2
    )
    const text = await read(stream)
    expect(text.startsWith('﻿ligne;identifiant;entrée;résultat;statut;erreur;durée_ms\r\n')).toBe(
      true
    )
    expect(text.trimEnd().split('\r\n')).toHaveLength(6)
    expect(text.endsWith('\r\n')).toBe(true)
  })

  it('is just the header for a batch without results', async () => {
    const text = await read(batchCsvStream(async () => [], 10))
    expect(text).toBe('﻿ligne;identifiant;entrée;résultat;statut;erreur;durée_ms\r\n')
  })
})
