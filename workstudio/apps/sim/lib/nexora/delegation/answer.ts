/**
 * Nexora edition: a called agent numbers its sources from 1 in its own answer. The calling agent
 * numbers its own, so the called agent's references are turned into the names of its sources
 * before its answer joins the calling agent's: « [1] » of one never points at the other's source.
 */

interface NamedSource {
  index: number
  title: string
}

const REFERENCE_GROUP = /[ \t]?(?:\[\d+(?:[ \t]*,[ \t]*\d+)*\])+/g
const REFERENCE_NUMBER = /\d+/g

export function citeSourcesByName(answer: string, sources: readonly NamedSource[]): string {
  const titles = new Map(sources.map((source) => [source.index, source.title]))
  return answer.replace(REFERENCE_GROUP, (group) => {
    const named: string[] = []
    for (const [digits] of group.matchAll(REFERENCE_NUMBER)) {
      const title = titles.get(Number(digits))
      if (title && !named.includes(title)) named.push(title)
    }
    if (named.length === 0) return ''
    return ` (${named.length === 1 ? 'source' : 'sources'} : ${named.join(' ; ')})`
  })
}
