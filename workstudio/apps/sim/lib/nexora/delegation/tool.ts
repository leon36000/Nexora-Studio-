import type { HandoffMode } from '@/lib/nexora/delegation/handoffs'
import type { ProviderToolConfig } from '@/providers/types'

/**
 * Nexora edition: the id of the tool an agent uses to hand a request to another agent. An agent
 * with several called agents gets one tool per agent under this id; the provider layer gives each
 * its own name on the wire. Access groups can deny it by this id.
 */
export const DELEGATE_TOOL_ID = 'delegate_to_agent'

/** A published agent a calling agent may hand a request to. */
export interface DelegationTarget {
  workflowId: string
  name: string
  description: string | null
}

interface DelegationToolInput {
  target: DelegationTarget
  mode: HandoffMode
  /** The calling agent's conversation, so the called agent keeps its own thread of it. */
  conversationId: string | undefined
}

const MODE_SENTENCE: Record<HandoffMode, string> = {
  reply:
    'Cet agent vous répond, puis vous reprenez la main : appuyez-vous sur sa réponse pour répondre à la personne.',
  transfer:
    'Après sa réponse, c’est cet agent qui poursuit la conversation avec la personne : transmettez sa réponse telle quelle, sans la reformuler ni rien ajouter.',
}

export function buildDelegationTool(input: DelegationToolInput): ProviderToolConfig {
  const { target, mode, conversationId } = input
  const about = target.description?.trim() ? ` ${target.description.trim()}` : ''
  return {
    id: DELEGATE_TOOL_ID,
    description: `Confie une demande à l’agent « ${target.name} ».${about} À utiliser quand la demande relève de sa spécialité. Rédigez la demande de façon complète et autonome : cet agent ne voit pas la conversation. ${MODE_SENTENCE[mode]}`,
    params: {
      agentId: target.workflowId,
      mode,
      ...(conversationId ? { conversationId } : {}),
    },
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description:
            'La demande à transmettre à cet agent, complète et compréhensible sans le reste de la conversation.',
        },
      },
      required: ['question'],
    },
    modelBlockedParams: ['agentId', 'mode', 'conversationId'],
  }
}
