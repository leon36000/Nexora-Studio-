import { describe, expect, it } from 'vitest'
import { collectProducedFiles } from '@/lib/nexora/tool-files'

const file = (id: string, name = `${id}.png`) => ({
  id,
  name,
  url: `/api/files/serve/${id}`,
  key: `execution/ws/wf/ex/${id}`,
  size: 12,
  type: 'image/png',
})

describe('collectProducedFiles', () => {
  it('gathers the files tools produced, once each, in call order', () => {
    const toolCalls = [
      { name: 'function_execute', result: { stdout: '', files: [file('a'), file('b')] } },
      { name: 'knowledge_search', result: { results: [] } },
      { name: 'function_execute', result: { files: [file('b'), file('c')] } },
    ]
    expect(collectProducedFiles(toolCalls).map((f) => f.id)).toEqual(['a', 'b', 'c'])
  })

  it('ignores failed calls, malformed results and objects that are not files', () => {
    expect(
      collectProducedFiles([
        { name: 'x', result: null },
        { name: 'x', result: { files: 'oups' } },
        { name: 'x', result: { files: [{ name: 'sans-id.png' }, 3, null] } },
        undefined,
      ])
    ).toEqual([])
    expect(collectProducedFiles(undefined)).toEqual([])
  })

  it('finds files in the output of a call, not only in its result', () => {
    expect(
      collectProducedFiles([{ name: 'x', output: { files: [file('z')] } }]).map((f) => f.id)
    ).toEqual(['z'])
  })
})
