import { describe, expect, it } from 'vitest'
import {
  readAgentOutputFrame,
  sameOriginPath,
  splitExtras,
  withExtras,
} from '@/lib/nexora/agent-extras'

const png = {
  id: 'f1',
  name: 'ventes.png',
  type: 'image/png',
  size: 10088,
  key: 'execution/ws/wf/ex/ventes.png',
  url: 'https://nexora.pme.fr/api/files/serve/execution%2Fws%2Fwf%2Fex%2Fventes.png?context=execution',
  base64: 'iVBORw0KGgo=',
}

describe('readAgentOutputFrame', () => {
  it('reads the files an agent produced, without their bytes and with a same-origin link', () => {
    const read = readAgentOutputFrame({
      event: 'output',
      blockId: 'b',
      path: 'files',
      data: [png, { nom: 'x' }],
    })
    expect(read).toEqual({
      kind: 'files',
      files: [
        {
          name: 'ventes.png',
          type: 'image/png',
          size: 10088,
          url: '/api/files/serve/execution%2Fws%2Fwf%2Fex%2Fventes.png?context=execution',
        },
      ],
    })
  })

  it('reads the numbered sources of an answer and drops anything that is not one', () => {
    const read = readAgentOutputFrame({
      event: 'output',
      blockId: 'b',
      path: 'sources',
      data: [
        { index: 1, kind: 'document', title: 'CGV.pdf', url: '/workspace/ws/knowledge/kb/doc' },
        { index: 2, kind: 'web', title: 'Légifrance', url: 'javascript:alert(1)' },
        { index: 'x', title: 'cassée' },
        'oups',
      ],
    })
    expect(read).toEqual({
      kind: 'sources',
      sources: [
        { index: 1, kind: 'document', title: 'CGV.pdf', url: '/workspace/ws/knowledge/kb/doc' },
        { index: 2, kind: 'web', title: 'Légifrance' },
      ],
    })
  })

  it('ignores the other outputs, frames without a path and malformed data', () => {
    expect(
      readAgentOutputFrame({ event: 'output', blockId: 'b', path: 'result', data: 3 })
    ).toBeNull()
    expect(readAgentOutputFrame({ event: 'output', blockId: 'b', data: [png] })).toBeNull()
    expect(
      readAgentOutputFrame({ event: 'output', blockId: 'b', path: 'files', data: 'oups' })
    ).toBeNull()
    expect(readAgentOutputFrame({ event: 'chunk' })).toBeNull()
  })
})

describe('sameOriginPath', () => {
  it('keeps path and query of an absolute file link and refuses a link outside http(s)', () => {
    expect(sameOriginPath('http://127.0.0.1:3215/api/files/serve/a%2Fb?context=execution')).toBe(
      '/api/files/serve/a%2Fb?context=execution'
    )
    expect(sameOriginPath('/api/files/serve/x')).toBe('/api/files/serve/x')
    expect(sameOriginPath('javascript:alert(1)')).toBeNull()
    expect(sameOriginPath('')).toBeNull()
  })
})

describe('answers kept with their files and sources', () => {
  const extras = {
    files: [{ name: 'ventes.png', type: 'image/png', size: 10, url: '/api/files/serve/k' }],
    sources: [
      { index: 1, kind: 'document' as const, title: 'CGV.pdf', url: '/workspace/w/knowledge/k/d' },
    ],
  }

  it('stores them after the text and reads them back, the text untouched', () => {
    const stored = withExtras('Livraison offerte dès 80 € [1].', extras)
    expect(stored.startsWith('Livraison offerte dès 80 € [1].')).toBe(true)
    expect(splitExtras(stored)).toEqual({ text: 'Livraison offerte dès 80 € [1].', extras })
  })

  it('stores nothing when the answer has neither', () => {
    expect(withExtras('Bonjour', { files: [], sources: [] })).toBe('Bonjour')
    expect(splitExtras('Bonjour')).toEqual({ text: 'Bonjour', extras: { files: [], sources: [] } })
  })

  it('shows the text and no extras when the stored marker is damaged or forged', () => {
    expect(splitExtras('Texte\n\n<!--nexora-extras:{pas du json-->')).toEqual({
      text: 'Texte',
      extras: { files: [], sources: [] },
    })
    const forged = withExtras('x', extras).replace('/api/files/serve/k', 'javascript:alert(1)')
    expect(splitExtras(forged).extras.files).toEqual([])
  })
})
