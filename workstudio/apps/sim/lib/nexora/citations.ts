import { isRecordLike } from '@sim/utils/object'
import { truncate } from '@sim/utils/string'

/**
 * Nexora edition: numbered sources for agent answers. The results of the knowledge and web
 * searches of one run are numbered in one sequence (`ref`), the model is asked to cite them as
 * [n], and the sources it consulted travel with the answer so the Assistant and the chats can show
 * « Sources [1] [2] ».
 */

export interface CitationSource {
  index: number
  kind: 'document' | 'web'
  title: string
  url?: string
  excerpt?: string
}

const KNOWLEDGE_SEARCH_PREFIX = 'knowledge_search'
const WEB_SEARCH_TOOL = 'searxng_search'
const EXCERPT_CHARS = 280

export const CITATION_INSTRUCTIONS =
  "Quand vous utilisez le contenu d'un résultat de recherche (connaissances ou web), citez-le dans votre réponse par son numéro entre crochets, par exemple [1], juste après l'information. Ne citez que des numéros reçus ; ne mettez aucune liste de sources à la fin, l'interface l'affiche."

/** The system prompt with the citation rule, added once. */
export function withCitationInstructions(systemPrompt: string): string {
  if (systemPrompt.includes(CITATION_INSTRUCTIONS)) return systemPrompt
  return systemPrompt ? `${systemPrompt}\n\n${CITATION_INSTRUCTIONS}` : CITATION_INSTRUCTIONS
}

/** Whether a tool's results are numbered sources (knowledge-base search, web search). */
export function isSourceSearchTool(toolId: string): boolean {
  return isKnowledgeSearch(toolId) || toolId === WEB_SEARCH_TOOL
}

function isKnowledgeSearch(toolId: string): boolean {
  return toolId === KNOWLEDGE_SEARCH_PREFIX || toolId.startsWith(`${KNOWLEDGE_SEARCH_PREFIX}__`)
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function excerptOf(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  return truncate(value.trim().replace(/\s+/g, ' '), EXCERPT_CHARS)
}

export interface CitationRegistry {
  /** The output the model reads, with `ref` on each result of a search tool; any other output as is. */
  numberResults(toolId: string, params: Record<string, unknown>, output: unknown): unknown
  sources(): CitationSource[]
}

export function createCitationRegistry({
  workspaceId,
}: {
  workspaceId?: string
}): CitationRegistry {
  const sources: CitationSource[] = []
  const indexByKey = new Map<string, number>()

  function register(key: string, source: Omit<CitationSource, 'index'>): number {
    const known = indexByKey.get(key)
    if (known !== undefined) return known
    const index = sources.length + 1
    indexByKey.set(key, index)
    sources.push({ index, ...source })
    return index
  }

  function numberAll(
    output: Record<string, unknown>,
    describe: (
      result: Record<string, unknown>
    ) => { key: string; source: Omit<CitationSource, 'index'> } | null
  ): unknown {
    if (!Array.isArray(output.results)) return output
    const results = output.results.map((result) => {
      if (!isRecordLike(result)) return result
      const described = describe(result)
      return described ? { ...result, ref: register(described.key, described.source) } : result
    })
    return { ...output, results }
  }

  return {
    numberResults(toolId, params, output) {
      if (!isRecordLike(output)) return output
      if (isKnowledgeSearch(toolId)) {
        const knowledgeBaseId =
          typeof params.knowledgeBaseId === 'string' ? params.knowledgeBaseId : undefined
        return numberAll(output, (result) => {
          const documentId = typeof result.documentId === 'string' ? result.documentId : undefined
          const title =
            typeof result.documentName === 'string' && result.documentName
              ? result.documentName
              : documentId
          if (!title) return null
          const internal =
            workspaceId && knowledgeBaseId && documentId
              ? `/workspace/${workspaceId}/knowledge/${knowledgeBaseId}/${documentId}?docName=${encodeURIComponent(title)}`
              : undefined
          const url = isHttpUrl(result.sourceUrl) ? result.sourceUrl : internal
          const excerpt = excerptOf(result.content)
          return {
            key: `document:${knowledgeBaseId ?? ''}:${documentId ?? title}:${result.chunkIndex ?? ''}`,
            source: {
              kind: 'document',
              title,
              ...(url ? { url } : {}),
              ...(excerpt ? { excerpt } : {}),
            },
          }
        })
      }
      if (toolId === WEB_SEARCH_TOOL) {
        return numberAll(output, (result) => {
          const title = typeof result.title === 'string' && result.title ? result.title : null
          if (!title) return null
          const url = isHttpUrl(result.url) ? result.url : undefined
          const excerpt = excerptOf(result.snippet)
          return {
            key: `web:${url ?? title}`,
            source: {
              kind: 'web',
              title,
              ...(url ? { url } : {}),
              ...(excerpt ? { excerpt } : {}),
            },
          }
        })
      }
      return output
    },
    sources: () => sources.map((source) => ({ ...source })),
  }
}

const CODE_BLOCK = /```[\s\S]*?```|`[^`\n]*`/g
const CITATION = /\[(\d{1,3})\]/g

/** The source numbers an answer cites, in order of appearance, keeping only numbers a search returned. */
export function citedSourceIndexes(answer: string, available: readonly number[]): number[] {
  const known = new Set(available)
  const cited: number[] = []
  for (const match of answer.replace(CODE_BLOCK, '').matchAll(CITATION)) {
    const index = Number(match[1])
    if (known.has(index) && !cited.includes(index)) cited.push(index)
  }
  return cited
}
