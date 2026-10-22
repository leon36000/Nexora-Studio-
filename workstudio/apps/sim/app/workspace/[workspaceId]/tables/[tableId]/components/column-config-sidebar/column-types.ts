import type React from 'react'
import { PlayOutline } from '@sim/emcn/icons'
import type { ColumnDefinition } from '@/lib/table'
import { ALL_COLUMN_TYPES, wouldExceedColumnTypeLimit } from '@/lib/table/column-types'

/**
 * UI-only column type. `'workflow'` is the virtual entry users pick from the
 * "+ New column" dropdown to spawn a workflow group; the resulting columns are
 * stored as scalar types under the hood (none carry `'workflow'`).
 */
export type SidebarColumnType = ColumnDefinition['type'] | 'workflow'

export interface ColumnTypeOption {
  type: SidebarColumnType
  label: string
  icon: React.ComponentType<{ className?: string }>
  maxPerTable?: number
  disabledReason?: string
}

/** Translator scoped to the `tables.columnTypes` namespace. */
export type ColumnTypesTranslate = (key: string, values?: Record<string, string | number>) => string

/**
 * Plain column types (no workflow). Real column types come from the registry —
 * adding one there makes it appear in every picker automatically.
 */
export const PLAIN_COLUMN_TYPE_OPTIONS: ColumnTypeOption[] = ALL_COLUMN_TYPES.map((definition) => ({
  type: definition.id,
  label: definition.label,
  icon: definition.icon,
  maxPerTable: definition.maxPerTable,
}))

/**
 * Every picker entry. `workflow` is appended because it is a UI affordance, not
 * a storable type, so its label is interface copy rather than registry data.
 */
function columnTypeOptions(t: ColumnTypesTranslate): ColumnTypeOption[] {
  return [
    ...PLAIN_COLUMN_TYPE_OPTIONS,
    { type: 'workflow', label: t('workflow'), icon: PlayOutline },
  ]
}

function columnTypeLimitMessage(
  t: ColumnTypesTranslate,
  label: string,
  maxPerTable: number
): string {
  return maxPerTable === 1 ? t('limitOne', { label }) : t('limitMany', { label, max: maxPerTable })
}

/** Picker entries with unavailable cardinality-limited types marked as disabled. */
export function columnTypeOptionsForTable(
  columns: readonly ColumnDefinition[],
  currentColumn: ColumnDefinition | null | undefined,
  t: ColumnTypesTranslate
): ColumnTypeOption[] {
  return columnTypeOptions(t).map((option) => {
    if (option.type === 'workflow') return option
    if (currentColumn?.type === option.type) return option
    if (option.maxPerTable === undefined) return option
    if (!wouldExceedColumnTypeLimit(columns, option.type, 1)) return option
    return {
      ...option,
      disabledReason: columnTypeLimitMessage(t, option.label, option.maxPerTable),
    }
  })
}
