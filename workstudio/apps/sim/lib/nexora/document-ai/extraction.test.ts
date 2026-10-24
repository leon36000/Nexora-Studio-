import { jsonResponse } from '@sim/testing/helpers/http'
import { describe, expect, it, vi } from 'vitest'
import { extractDocumentData, validateExtraction } from '@/lib/nexora/document-ai/extraction'
import {
  annotationFormat,
  EXTRACTION_TEMPLATES,
  type ExtractionField,
  toExtractionFields,
} from '@/lib/nexora/document-ai/fields'

const config = { baseUrl: 'http://nexora-api:8000/v1', apiKey: 'workstudio-key' }
const invoice = EXTRACTION_TEMPLATES.invoice

const GOOD_INVOICE = {
  numero: 'FA-2026-0142',
  date: '2026-03-12',
  fournisseur: 'Atelier Dubois SARL',
  client: null,
  total_ht: 1250,
  total_tva: 250,
  total_ttc: 1500,
  date_echeance: null,
  devise: 'EUR',
}

function fakeNexoraApi(answer: Record<string, unknown>, status = 200) {
  const bodies: Record<string, unknown>[] = []
  const fetchFn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/models')) {
      return jsonResponse({
        data: [
          { id: 'cloud-glm-5-3', type: 'text-generation', aliases: ['nexora-default'] },
          { id: 'qwen2.5vl:3b', type: 'image-to-text', aliases: [] },
        ],
      })
    }
    bodies.push(JSON.parse(String(init?.body)))
    return jsonResponse(answer, status)
  })
  return { fetchFn: fetchFn as unknown as typeof fetch, bodies }
}

describe('validateExtraction', () => {
  it('parses French amounts', () => {
    const fields: ExtractionField[] = [
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' },
      { name: 'c', type: 'number' },
      { name: 'd', type: 'number' },
      { name: 'e', type: 'number' },
      { name: 'f', type: 'number' },
      { name: 'g', type: 'number' },
    ]
    const result = validateExtraction(
      {
        a: '1 234,56 €',
        b: '1.234,56',
        c: '1,234.56',
        d: '1250',
        e: 99.5,
        f: '12,5 %',
        g: '1 500,00 EUR',
      },
      fields
    )
    expect(result.data).toEqual({
      a: 1234.56,
      b: 1234.56,
      c: 1234.56,
      d: 1250,
      e: 99.5,
      f: 12.5,
      g: 1500,
    })
    expect(result.toVerify).toBe(false)
  })

  it('flags a value that is not a number', () => {
    const result = validateExtraction({ a: 'environ mille' }, [{ name: 'a', type: 'number' }])
    expect(result.data.a).toBeNull()
    expect(result.toVerify).toBe(true)
    expect(result.issues.join()).toContain('a')
  })

  it('normalises dates', () => {
    const fields: ExtractionField[] = ['a', 'b', 'c', 'd', 'e'].map((name) => ({
      name,
      type: 'date',
    }))
    const result = validateExtraction(
      { a: '15/03/2026', b: '15 mars 2026', c: '2026-03-15', d: '1er avril 2026', e: '15.03.26' },
      fields
    )
    expect(result.data).toEqual({
      a: '2026-03-15',
      b: '2026-03-15',
      c: '2026-03-15',
      d: '2026-04-01',
      e: '2026-03-15',
    })
    expect(result.toVerify).toBe(false)
    const impossible = validateExtraction({ a: '31/02/2026' }, [{ name: 'a', type: 'date' }])
    expect(impossible.data.a).toBeNull()
    expect(impossible.toVerify).toBe(true)
  })

  it('flags a missing required field', () => {
    const result = validateExtraction({ ...GOOD_INVOICE, numero: null }, invoice)
    expect(result.toVerify).toBe(true)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toContain('numero')
  })

  it('keeps optional fields empty without flagging', () => {
    const result = validateExtraction(GOOD_INVOICE, invoice)
    expect(result.toVerify).toBe(false)
    expect(result.issues).toEqual([])
    expect(result.data.client).toBeNull()
  })

  it('flags totals that do not add up', () => {
    expect(validateExtraction({ ...GOOD_INVOICE, total_ttc: 1500.01 }, invoice).toVerify).toBe(
      false
    )
    const result = validateExtraction({ ...GOOD_INVOICE, total_ttc: 1600 }, invoice)
    expect(result.toVerify).toBe(true)
    expect(result.issues[0]).toMatch(/1\s?600/)
  })

  it('flags an answer that is not JSON', () => {
    for (const raw of [null, 'du texte', ['une', 'liste']]) {
      const result = validateExtraction(raw, invoice)
      expect(result.toVerify).toBe(true)
      expect(Object.values(result.data).every((value) => value === null)).toBe(true)
    }
  })

  it('drops keys the schema does not name', () => {
    const result = validateExtraction({ ...GOOD_INVOICE, iban: 'FR76…' }, invoice)
    expect(result.data).not.toHaveProperty('iban')
  })
})

describe('annotationFormat', () => {
  it('builds a strict JSON schema with every field nullable', () => {
    const format = annotationFormat(invoice)
    expect(format.type).toBe('json_schema')
    const schema = format.json_schema.schema
    expect(schema.additionalProperties).toBe(false)
    expect(schema.required).toEqual(invoice.map((field) => field.name))
    expect(schema.properties.total_ttc.type).toEqual(['number', 'null'])
    expect(schema.properties.date.type).toEqual(['string', 'null'])
    expect(schema.properties.date.description).toContain('AAAA-MM-JJ')
  })
})

describe('toExtractionFields', () => {
  it('reads the visual schema, skipping unnamed and repeated fields', () => {
    const fields = toExtractionFields([
      {
        id: '1',
        name: ' numero ',
        type: 'string',
        description: 'Numéro de facture',
        value: 'FA-1',
      },
      { id: '2', name: '', type: 'number' },
      { id: '3', name: 'montant', type: 'number' },
      { id: '4', name: 'montant', type: 'string' },
      { id: '5', name: 'pieces', type: 'file[]' },
    ])
    expect(fields).toEqual([
      { name: 'numero', type: 'string', description: 'Numéro de facture', example: 'FA-1' },
      { name: 'montant', type: 'number' },
      { name: 'pieces', type: 'string' },
    ])
    expect(toExtractionFields('not a list')).toEqual([])
  })
})

describe('extractDocumentData', () => {
  it('sends one OCR request with the format and the default model', async () => {
    const { fetchFn, bodies } = fakeNexoraApi({
      model: 'qwen2.5vl:3b',
      pages: [{ index: 0, images: [], markdown: '# Facture FA-2026-0142' }],
      document_annotation: JSON.stringify(GOOD_INVOICE),
    })
    const output = await extractDocumentData(
      {
        file: Buffer.from('%PDF-1.4 facture'),
        mimeType: 'application/pdf',
        fields: invoice,
        instructions: 'Montants en euros',
        pages: [0],
      },
      { config, fetchFn }
    )
    expect(bodies).toHaveLength(1)
    const body = bodies[0]
    expect(body.model).toBe('qwen2.5vl:3b')
    expect(body.annotation_model).toBe('nexora-default')
    expect(body.document_annotation_prompt).toBe('Montants en euros')
    expect(body.pages).toEqual([0])
    expect((body.document as { document_url: string }).document_url).toMatch(
      /^data:application\/pdf;base64,/
    )
    expect(body.document_annotation_format).toEqual(annotationFormat(invoice))
    expect(output.data.total_ttc).toBe(1500)
    expect(output.markdown).toContain('FA-2026-0142')
    expect(output.model).toBe('nexora-default')
    expect(output.visionModel).toBe('qwen2.5vl:3b')
  })

  it('the row carries a_verifier and motifs', async () => {
    const { fetchFn } = fakeNexoraApi({
      pages: [{ index: 0, images: [], markdown: 'Facture' }],
      document_annotation: null,
      document_annotation_error: 'the annotation model did not answer a JSON object',
    })
    const output = await extractDocumentData(
      {
        file: Buffer.from('%PDF-1.4'),
        mimeType: 'application/pdf',
        fields: invoice,
        model: 'vllm/qwen2.5:7b',
      },
      { config, fetchFn }
    )
    expect(output.toVerify).toBe(true)
    expect(output.row.a_verifier).toBe(true)
    expect(typeof output.row.motifs).toBe('string')
    expect(String(output.row.motifs).length).toBeGreaterThan(0)
    expect(Object.keys(output.row)).toEqual([...invoice.map((f) => f.name), 'a_verifier', 'motifs'])
  })

  it('asks to choose pages when the scan is too long for one request', async () => {
    const { fetchFn } = fakeNexoraApi(
      { detail: [{ msg: 'this vision model reads images only: send one image per page' }] },
      422
    )
    await expect(
      extractDocumentData(
        { file: Buffer.from('%PDF-1.4'), mimeType: 'application/pdf', fields: invoice },
        { config, fetchFn }
      )
    ).rejects.toMatchObject({ code: 'too-many-pages' })
  })
})
