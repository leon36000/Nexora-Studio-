import { describe, expect, it } from 'vitest'
import {
  CITATION_INSTRUCTIONS,
  citedSourceIndexes,
  createCitationRegistry,
  withCitationInstructions,
} from '@/lib/nexora/citations'

const knowledgeOutput = {
  query: 'livraison',
  totalResults: 2,
  results: [
    {
      documentId: 'doc-1',
      documentName: 'CGV.pdf',
      sourceUrl: null,
      content: 'Livraison offerte dès 80 euros.',
      chunkIndex: 0,
    },
    {
      documentId: 'doc-2',
      documentName: 'FAQ.md',
      sourceUrl: 'https://wiki.pme.fr/faq',
      content: 'Délai de 3 jours.',
      chunkIndex: 4,
    },
  ],
}
const webOutput = {
  results: [
    {
      title: 'Code de la consommation',
      url: 'https://legifrance.gouv.fr/x',
      snippet: 'Le délai de rétractation est de 14 jours.',
    },
  ],
}

describe('citation registry', () => {
  it('numbers the results of every search of a run in one sequence', () => {
    const registry = createCitationRegistry({ workspaceId: 'ws-1' })
    const first = registry.numberResults(
      'knowledge_search',
      { knowledgeBaseId: 'kb-1' },
      knowledgeOutput
    )
    const second = registry.numberResults('searxng_search', {}, webOutput)
    const refsOf = (output: unknown): number[] =>
      (output as { results: Array<{ ref: number }> }).results.map((r) => r.ref)
    expect(refsOf(first)).toEqual([1, 2])
    expect(refsOf(second)).toEqual([3])
    expect(registry.sources().map((source) => [source.index, source.kind, source.title])).toEqual([
      [1, 'document', 'CGV.pdf'],
      [2, 'document', 'FAQ.md'],
      [3, 'web', 'Code de la consommation'],
    ])
  })

  it('links an uploaded document inside the workspace, a connector document to its source, a web result to its page', () => {
    const registry = createCitationRegistry({ workspaceId: 'ws-1' })
    registry.numberResults('knowledge_search', { knowledgeBaseId: 'kb-1' }, knowledgeOutput)
    registry.numberResults('searxng_search', {}, webOutput)
    const [upload, connector, web] = registry.sources()
    expect(upload.url).toBe('/workspace/ws-1/knowledge/kb-1/doc-1?docName=CGV.pdf')
    expect(connector.url).toBe('https://wiki.pme.fr/faq')
    expect(web.url).toBe('https://legifrance.gouv.fr/x')
    expect(upload.excerpt).toBe('Livraison offerte dès 80 euros.')
  })

  it('leaves the output of any other tool untouched and adds no source', () => {
    const registry = createCitationRegistry({ workspaceId: 'ws-1' })
    const output = { result: 42 }
    expect(registry.numberResults('function_execute', {}, output)).toBe(output)
    expect(registry.sources()).toEqual([])
  })

  it('does not number twice a passage a second search returns again', () => {
    const registry = createCitationRegistry({ workspaceId: 'ws-1' })
    registry.numberResults('knowledge_search', { knowledgeBaseId: 'kb-1' }, knowledgeOutput)
    const again = registry.numberResults(
      'knowledge_search',
      { knowledgeBaseId: 'kb-1' },
      knowledgeOutput
    ) as {
      results: Array<{ ref: number }>
    }
    expect(again.results.map((r) => r.ref)).toEqual([1, 2])
    expect(registry.sources()).toHaveLength(2)
  })

  it('tolerates a malformed output and refuses a link that is not http(s)', () => {
    const registry = createCitationRegistry({})
    expect(registry.numberResults('knowledge_search', {}, null)).toBeNull()
    expect(registry.numberResults('knowledge_search', {}, { results: 'oups' })).toEqual({
      results: 'oups',
    })
    registry.numberResults(
      'searxng_search',
      {},
      { results: [{ title: 'x', url: 'javascript:alert(1)', snippet: '' }] }
    )
    expect(registry.sources()[0].url).toBeUndefined()
  })
})

describe('citedSourceIndexes', () => {
  it('lists the numbers an answer cites, in order, without duplicates', () => {
    expect(
      citedSourceIndexes('Livraison offerte [2], délai de 3 jours [1][2] et [5].', [1, 2, 3, 5])
    ).toEqual([2, 1, 5])
  })

  it('ignores a number no search returned and a number in a code block', () => {
    expect(citedSourceIndexes('Voir [9].', [1, 2])).toEqual([])
    expect(citedSourceIndexes('```py\nx = tab[1]\n```\nSans citation.', [1])).toEqual([])
    expect(citedSourceIndexes('Pas de source.', [1])).toEqual([])
  })
})

describe('withCitationInstructions', () => {
  it('adds the citation rule once to the system prompt', () => {
    const once = withCitationInstructions('Vous aidez les clients.')
    expect(once).toContain(CITATION_INSTRUCTIONS)
    expect(withCitationInstructions(once)).toBe(once)
  })
})
