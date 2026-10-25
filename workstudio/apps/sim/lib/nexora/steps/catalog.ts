import { isRecordLike, toRecord } from '@sim/utils/object'

/** Where an entry sits in the step picker (« essentiels » first). */
export type StepCategory = 'essentiel' | 'communication' | 'donnees' | 'ia' | 'connect' | 'controle'

export const STEP_CATEGORIES: readonly StepCategory[] = [
  'essentiel',
  'communication',
  'donnees',
  'ia',
  'connect',
  'controle',
]

/** One business step of the catalog: a block, with the setting that makes it that step. */
export interface CatalogEntry {
  /** Stable key; its label and description live in `steps.catalog.<id>`. */
  id: string
  blockType: string
  category: StepCategory
  /** Sub-block values a new step starts with. */
  preset?: Readonly<Record<string, unknown>>
  /** Tells apart entries sharing a block type (a POST from a GET); the last of the type has none. */
  matches?: (values: Readonly<Record<string, unknown>>) => boolean
}

/** Blocks that start a workflow, as the Copilot and the templates build them. */
export const TRIGGER_BLOCK_TYPES: ReadonlySet<string> = new Set([
  'start_trigger',
  'generic_webhook',
  'schedule',
  'chat_trigger',
])

export function isTriggerType(type: string): boolean {
  return TRIGGER_BLOCK_TYPES.has(type)
}

const TABLE_WRITES: ReadonlySet<unknown> = new Set([
  'insert_row',
  'upsert_row',
  'batch_insert_rows',
])

/**
 * About twenty-five steps in the words of an SME. Specific entries come before the general one of
 * their block type, and the order is the picker's order inside a category.
 */
export const STEP_CATALOG: readonly CatalogEntry[] = [
  { id: 'agent', blockType: 'agent', category: 'essentiel' },
  { id: 'condition', blockType: 'condition', category: 'essentiel' },
  {
    id: 'api-send',
    blockType: 'api',
    category: 'essentiel',
    preset: { method: 'POST' },
    matches: (values) =>
      values.method !== undefined && values.method !== '' && values.method !== 'GET',
  },
  { id: 'api-get', blockType: 'api', category: 'essentiel', preset: { method: 'GET' } },
  { id: 'wait', blockType: 'wait', category: 'essentiel' },
  { id: 'human', blockType: 'human_in_the_loop_v2', category: 'essentiel' },
  { id: 'response', blockType: 'response', category: 'essentiel' },
  { id: 'email', blockType: 'smtp', category: 'essentiel' },
  { id: 'slack', blockType: 'slack', category: 'communication' },
  { id: 'teams', blockType: 'microsoft_teams', category: 'communication' },
  { id: 'sms', blockType: 'twilio_sms', category: 'communication' },
  {
    id: 'table-add',
    blockType: 'table_v2',
    category: 'donnees',
    preset: { operation: 'insert_row' },
    matches: (values) => TABLE_WRITES.has(values.operation),
  },
  {
    id: 'table-read',
    blockType: 'table_v2',
    category: 'donnees',
    preset: { operation: 'query_rows' },
  },
  { id: 'knowledge', blockType: 'knowledge', category: 'donnees' },
  { id: 'extract', blockType: 'nexora_extract', category: 'donnees' },
  { id: 'file', blockType: 'file_v5', category: 'donnees' },
  { id: 'variables', blockType: 'variables', category: 'donnees' },
  { id: 'transcription', blockType: 'stt_v2', category: 'ia' },
  { id: 'speech', blockType: 'tts', category: 'ia' },
  { id: 'translate', blockType: 'translate', category: 'ia' },
  { id: 'vision', blockType: 'vision_v2', category: 'ia' },
  { id: 'web-search', blockType: 'searxng', category: 'ia' },
  { id: 'connect', blockType: 'mcp', category: 'connect' },
  { id: 'subworkflow', blockType: 'workflow', category: 'controle' },
  { id: 'function', blockType: 'function', category: 'controle' },
]

const ENTRIES_BY_ID: ReadonlyMap<string, CatalogEntry> = new Map(
  STEP_CATALOG.map((entry) => [entry.id, entry])
)

export function catalogEntryById(id: string): CatalogEntry | undefined {
  return ENTRIES_BY_ID.get(id)
}

/** The values of a stored block's sub-blocks, by sub-block id. */
export function subBlockValues(block: { subBlocks?: unknown }): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const [id, subBlock] of Object.entries(toRecord(block.subBlocks))) {
    if (isRecordLike(subBlock)) values[id] = subBlock.value
  }
  return values
}

/** The catalog entry a stored block is, or `null` for a block the Steps view does not know. */
export function catalogEntryOf(block: { type: string; subBlocks?: unknown }): CatalogEntry | null {
  const sameType = STEP_CATALOG.filter((entry) => entry.blockType === block.type)
  if (sameType.length === 0) return null
  const values = subBlockValues(block)
  return (
    sameType.find((entry) => entry.matches?.(values)) ??
    sameType.find((entry) => !entry.matches) ??
    null
  )
}
