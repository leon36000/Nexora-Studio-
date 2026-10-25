import { LRUCache } from 'lru-cache'
import {
  findPromptRow,
  getPromptVersion,
  type PromptVersionRecord,
} from '@/lib/nexora/prompts/repository'
import { PromptRenderError, type PromptSelector, renderPrompt } from '@/lib/nexora/prompts/template'

/** What an Agent block asks for: a prompt of its workspace, a label, values for the variables. */
export interface PromptReference {
  promptId: string
  selector: PromptSelector
  values: Record<string, unknown>
}

/** The text an agent runs with, and which version it came from (shown in the run's logs). */
export interface ResolvedPrompt {
  id: string
  name: string
  version: number
  label: PromptSelector
  text: string
}

/** A refusal in French: the agent's run fails with it rather than running without instructions. */
export class PromptResolutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PromptResolutionError'
  }
}

interface PromptResolverDeps {
  loadPrompt: (
    workspaceId: string,
    promptId: string
  ) => Promise<{ id: string; name: string } | null>
  loadVersion: (promptId: string, selector: PromptSelector) => Promise<PromptVersionRecord | null>
}

interface CachedVersion {
  name: string
  version: PromptVersionRecord
}

/**
 * Labels move while agents run: the label → version read is cached briefly and dropped as soon
 * as this process moves a label, adds a version or deletes the prompt (WorkStudio runs workflows
 * in the process that serves the Prompts page). Another process sees a move within the TTL.
 */
const LABEL_CACHE_TTL_MS = 30_000

export function createPromptResolver(deps: PromptResolverDeps) {
  const cache = new LRUCache<
    string,
    CachedVersion,
    { workspaceId: string; reference: PromptReference }
  >({
    max: 10_000,
    ttl: LABEL_CACHE_TTL_MS,
    fetchMethod: async (_key, _stale, { context }) => {
      const prompt = await deps.loadPrompt(context.workspaceId, context.reference.promptId)
      if (!prompt) {
        throw new PromptResolutionError(
          `Le prompt des consignes de cet agent n'existe plus dans l'espace (${context.reference.promptId}).`
        )
      }
      const version = await deps.loadVersion(prompt.id, context.reference.selector)
      if (!version) {
        throw new PromptResolutionError(
          `Le prompt « ${prompt.name} » n'a pas de version étiquetée « ${context.reference.selector} ».`
        )
      }
      return { name: prompt.name, version }
    },
  })

  return {
    async resolve(workspaceId: string, reference: PromptReference): Promise<ResolvedPrompt> {
      const key = `${workspaceId}\u0000${reference.promptId}\u0000${reference.selector}`
      const cached = await cache.fetch(key, { context: { workspaceId, reference } })
      if (!cached) throw new PromptResolutionError('Prompt introuvable')
      const { name, version } = cached
      try {
        return {
          id: version.promptId,
          name,
          version: version.version,
          label: reference.selector,
          text: renderPrompt(version.content, version.variables, reference.values),
        }
      } catch (error) {
        if (error instanceof PromptRenderError) {
          throw new PromptResolutionError(
            `Prompt « ${name} » (version ${version.version}) : ${error.message}`
          )
        }
        throw error
      }
    },
    invalidate(promptId: string): void {
      for (const key of cache.keys()) {
        if (key.split('\u0000')[1] === promptId) cache.delete(key)
      }
    },
  }
}

const promptResolver = createPromptResolver({
  loadPrompt: findPromptRow,
  loadVersion: (promptId, selector) => getPromptVersion(promptId, { selector }),
})

/** Resolves an Agent block's prompt reference in its workspace (executor, published agents). */
export function resolvePromptReference(
  workspaceId: string,
  reference: PromptReference
): Promise<ResolvedPrompt> {
  return promptResolver.resolve(workspaceId, reference)
}

/** Drops what this process cached for a prompt: called after every write to it. */
export function invalidatePromptResolution(promptId: string): void {
  promptResolver.invalidate(promptId)
}
