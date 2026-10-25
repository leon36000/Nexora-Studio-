import { describe, expect, it } from 'vitest'
import {
  applyDelegationFrame,
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

describe('delegations shown with an answer', () => {
  const start = (id: string, agent: string) => ({
    event: 'delegation' as const,
    data: { id, agentId: `wf-${id}`, agent, mode: 'reply' as const, phase: 'start' as const },
  })
  const end = (id: string, agent: string, ok: boolean, message?: string) => ({
    event: 'delegation' as const,
    data: {
      id,
      agentId: `wf-${id}`,
      agent,
      mode: 'reply' as const,
      phase: 'end' as const,
      ok,
      ...(message ? { message } : {}),
    },
  })

  it('shows an agent answering from the moment the delegation starts, then as done', () => {
    const running = applyDelegationFrame([], start('a', 'Agent tarifs'))
    expect(running).toEqual([
      { id: 'a', agentId: 'wf-a', agent: 'Agent tarifs', mode: 'reply', status: 'running' },
    ])
    expect(applyDelegationFrame(running, end('a', 'Agent tarifs', true))[0].status).toBe('done')
  })

  it('keeps the French reason of a delegation that was stopped', () => {
    const notes = applyDelegationFrame(
      applyDelegationFrame([], start('a', 'Assistant général')),
      end(
        'a',
        'Assistant général',
        false,
        'Boucle de délégation : « Assistant général » a déjà été sollicité.'
      )
    )
    expect(notes[0]).toMatchObject({
      status: 'failed',
      message: 'Boucle de délégation : « Assistant général » a déjà été sollicité.',
    })
  })

  it('shows a delegation that ends without having started (a refusal) as failed', () => {
    const notes = applyDelegationFrame([], end('b', 'Agent SAV', false, 'Limite atteinte'))
    expect(notes).toEqual([
      {
        id: 'b',
        agentId: 'wf-b',
        agent: 'Agent SAV',
        mode: 'reply',
        status: 'failed',
        message: 'Limite atteinte',
      },
    ])
  })

  it('keeps several delegations of one answer in the order they started', () => {
    let notes = applyDelegationFrame([], start('a', 'Agent tarifs'))
    notes = applyDelegationFrame(notes, start('b', 'Agent SAV'))
    notes = applyDelegationFrame(notes, end('b', 'Agent SAV', true))
    expect(notes.map((note) => [note.agent, note.status])).toEqual([
      ['Agent tarifs', 'running'],
      ['Agent SAV', 'done'],
    ])
  })

  it('stores them with the answer and reads them back; an older answer has none', () => {
    const delegations = [
      {
        id: 'a',
        agentId: 'wf-a',
        agent: 'Agent tarifs',
        mode: 'reply' as const,
        status: 'done' as const,
      },
    ]
    const stored = withExtras('La baguette coûte 1,20 euro.', {
      files: [],
      sources: [],
      delegations,
    })
    expect(splitExtras(stored)).toEqual({
      text: 'La baguette coûte 1,20 euro.',
      extras: { files: [], sources: [], delegations },
    })
    expect(splitExtras('Bonjour').extras.delegations).toBeUndefined()
  })

  it('stores a delegation that was still running when the answer was cut as stopped', () => {
    const stored = withExtras('Un instant', {
      files: [],
      sources: [],
      delegations: [
        { id: 'a', agentId: 'wf-a', agent: 'Agent tarifs', mode: 'reply', status: 'running' },
      ],
    })
    expect(splitExtras(stored).extras.delegations?.[0].status).toBe('failed')
  })

  it('ignores a damaged delegation entry', () => {
    const stored =
      'x\n\n<!--nexora-extras:{"delegations":[{"agent":3},{"id":"b","agentId":"wf-b","agent":"X","mode":"broadcast","status":"done"},{"id":"a","agentId":"wf-a","agent":"Agent tarifs","mode":"reply","status":"done"}]}-->'
    expect(splitExtras(stored).extras.delegations).toEqual([
      { id: 'a', agentId: 'wf-a', agent: 'Agent tarifs', mode: 'reply', status: 'done' },
    ])
  })
})
