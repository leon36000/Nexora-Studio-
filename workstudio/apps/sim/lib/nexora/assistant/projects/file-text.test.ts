import { describe, expect, it } from 'vitest'
import {
  PROJECT_FILE_MAX_BYTES,
  PROJECT_FILE_MAX_CHARS,
  readProjectFile,
} from '@/lib/nexora/assistant/projects/file-text'

function dataUrl(text: string, type = 'text/plain'): string {
  return `data:${type};base64,${Buffer.from(text, 'utf-8').toString('base64')}`
}

describe('readProjectFile', () => {
  it('reads a text file given as a data URL, accents included', async () => {
    const result = await readProjectFile({
      name: 'conditions.txt',
      type: 'text/plain',
      data: dataUrl('Livraison offerte dès 80 € d’achat.'),
    })
    expect(result).toMatchObject({ ok: true, text: 'Livraison offerte dès 80 € d’achat.' })
  })

  it('reads a CSV given as bare base64', async () => {
    const result = await readProjectFile({
      name: 'prix.csv',
      type: 'text/csv',
      data: Buffer.from('produit,prix\nstylo,2', 'utf-8').toString('base64'),
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.text).toContain('stylo')
  })

  it('refuses a format it cannot read, an empty file and a file that is not what its name says', async () => {
    expect(
      await readProjectFile({ name: 'outil.exe', type: 'application/octet-stream', data: dataUrl('MZ') })
    ).toEqual({ ok: false, reason: 'unsupported' })
    expect(await readProjectFile({ name: 'vide.txt', type: 'text/plain', data: '' })).toEqual({
      ok: false,
      reason: 'empty',
    })
    const damaged = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6]).toString('base64')
    expect(
      await readProjectFile({
        name: 'abime.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        data: damaged,
      })
    ).toEqual({ ok: false, reason: 'unreadable' })
  })

  it('refuses a file over the size limit before reading it, and a text over the character limit', async () => {
    const big = Buffer.alloc(PROJECT_FILE_MAX_BYTES + 1, 'a').toString('base64')
    expect(await readProjectFile({ name: 'gros.txt', type: 'text/plain', data: big })).toEqual({
      ok: false,
      reason: 'too-large',
    })
    const long = 'a'.repeat(PROJECT_FILE_MAX_CHARS + 1)
    expect(
      await readProjectFile({ name: 'long.txt', type: 'text/plain', data: dataUrl(long) })
    ).toEqual({ ok: false, reason: 'too-large' })
  })
})
