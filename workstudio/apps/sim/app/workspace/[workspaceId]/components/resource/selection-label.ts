import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Names a multi-row selection for a confirmation prompt: one row reads as itself, several read
 * as a count. Shared so the wording stays identical across every resource list — the phrasing
 * appears in destructive confirms, where an inconsistency reads as a different action.
 */
export function selectionLabel(count: number, firstName: string | undefined): string {
  if (count === 1) return firstName ?? 'selected item'
  return `${count} selected items`
}

export function selectionActionLabel(
  action: string,
  selectedCount: number,
  singleItemLabel = action
): string {
  if (selectedCount <= 1) return singleItemLabel
  return countedSelectionActionLabel(action, selectedCount)
}

function countedSelectionActionLabel(action: string, count: number): string {
  return `${action} ${count} ${count === 1 ? 'item' : 'items'}`
}

interface SelectionToggleActionLabelOptions {
  selectedCount: number
  enabledCount: number
  disabledCount: number
  isSelectedItemEnabled: boolean
  hasExactAffectedCount?: boolean
}

export function selectionToggleActionLabel({
  selectedCount,
  enabledCount,
  disabledCount,
  isSelectedItemEnabled,
  hasExactAffectedCount = true,
}: SelectionToggleActionLabelOptions): string {
  if (selectedCount <= 1) return isSelectedItemEnabled ? 'Disable' : 'Enable'
  const action = disabledCount > 0 ? 'Enable' : 'Disable'
  if (!hasExactAffectedCount) return `${action} selected items`
  return countedSelectionActionLabel(action, disabledCount > 0 ? disabledCount : enabledCount)
}

/**
 * Translated counterparts of the helpers above, for client components. `action` and
 * `singleItemLabel` are already-translated verbs ("Delete", "Supprimer").
 */
export function useSelectionLabels() {
  const t = useTranslations('shell.selection')
  return useMemo(() => {
    const counted = (action: string, count: number) => t('countedAction', { action, count })
    return {
      selectionLabel: (count: number, firstName: string | undefined): string =>
        count === 1 ? (firstName ?? t('selectedItem')) : t('selectedItems', { count }),
      selectionActionLabel: (
        action: string,
        selectedCount: number,
        singleItemLabel = action
      ): string => (selectedCount <= 1 ? singleItemLabel : counted(action, selectedCount)),
      selectionToggleActionLabel: ({
        selectedCount,
        enabledCount,
        disabledCount,
        isSelectedItemEnabled,
        hasExactAffectedCount = true,
      }: SelectionToggleActionLabelOptions): string => {
        if (selectedCount <= 1) return isSelectedItemEnabled ? t('disable') : t('enable')
        const action = disabledCount > 0 ? t('enable') : t('disable')
        if (!hasExactAffectedCount) return t('actionSelectedItems', { action })
        return counted(action, disabledCount > 0 ? disabledCount : enabledCount)
      },
    }
  }, [t])
}
