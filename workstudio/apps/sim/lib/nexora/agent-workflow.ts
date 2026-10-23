import { generateId } from '@sim/utils/id'
import { resolveTemplateModel } from '@/lib/nexora/templates'

const AGENT_SYSTEM_PROMPT =
  'Vous êtes l’assistant d’une PME française. Répondez en français professionnel, avec vouvoiement et des phrases courtes. N’inventez aucune information : si une donnée manque, dites-le.'

/**
 * A ready-to-chat agent (Start → Agent on `nexora-default` → Response), as workflow JSON the
 * workflow importer reads. Start is the unified entry point: a deployed chat sends its message
 * as `<start.input>`. Stands in for the agent editor until it exists.
 */
export function buildAgentWorkflowJson(): string {
  const startId = generateId()
  const agentId = generateId()
  const responseId = generateId()
  const blocks = {
    [startId]: {
      id: startId,
      type: 'start_trigger',
      name: 'Start',
      position: { x: 0, y: 0 },
      enabled: true,
      subBlocks: { inputFormat: { id: 'inputFormat', type: 'input-format', value: [] } },
      outputs: {},
    },
    [agentId]: {
      id: agentId,
      type: 'agent',
      name: 'Agent',
      position: { x: 420, y: 0 },
      enabled: true,
      subBlocks: {
        messages: {
          id: 'messages',
          type: 'messages-input',
          value: [
            { role: 'system', content: AGENT_SYSTEM_PROMPT },
            { role: 'user', content: '<start.input>' },
          ],
        },
        model: { id: 'model', type: 'combobox', value: resolveTemplateModel(undefined) },
      },
      outputs: {},
    },
    [responseId]: {
      id: responseId,
      type: 'response',
      name: 'Response',
      position: { x: 840, y: 0 },
      enabled: true,
      subBlocks: {
        dataMode: { id: 'dataMode', type: 'dropdown', value: 'structured' },
        builderData: {
          id: 'builderData',
          type: 'response-format',
          value: [{ id: generateId(), name: 'reponse', type: 'string', value: '<agent.content>' }],
        },
      },
      outputs: {},
    },
  }
  const edges = [
    [startId, agentId],
    [agentId, responseId],
  ].map(([source, target]) => ({
    id: generateId(),
    source,
    target,
    sourceHandle: 'source',
    targetHandle: 'target',
  }))
  return JSON.stringify({ blocks, edges, loops: {}, parallels: {} })
}
