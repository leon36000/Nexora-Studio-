/**
 * Single source of truth for lock vocabulary shared by the Table Security modal
 * and the lock toasts (the on-open announcement and blocked actions). Kept out of
 * `lib/table/mutation-locks.ts` — that module is server-tainted (importing it
 * from a client component pulls `next/headers` into the browser bundle).
 *
 * The modal speaks Allow/Deny, so this copy does too: a set lock reads as its
 * action being "disabled", never as a separate "locked" state. The wording lives
 * in the `tables.locks` messages; this module only decides which message applies.
 */

import type { TableLockKind, TableLocks } from '@/lib/table/types'

/** Translator scoped to the `tables.locks` namespace. */
export type LockTranslate = (key: string, values?: Record<string, string | number>) => string

export interface LockField {
  /** The `TableLocks` flag this row controls. */
  key: keyof TableLocks
  /** Also names the row's messages: `tables.locks.fields.<kind>.{noun,label,hint}`. */
  kind: TableLockKind
}

export const LOCK_FIELDS: LockField[] = [
  { key: 'insertLocked', kind: 'insert' },
  { key: 'updateLocked', kind: 'update' },
  { key: 'deleteLocked', kind: 'delete' },
  { key: 'schemaLocked', kind: 'schema' },
]

/**
 * Tooltip for a control a denied action disables. One sentence per lock kind so
 * the grid chrome (New row, New column, the column menu, the expanded editor's
 * Save) all name the same Table Security row.
 */
export function lockTooltip(t: LockTranslate, kind: TableLockKind): string {
  return t(`tooltips.${kind}`)
}

/** The denied actions' kinds, in display order. Empty when everything is allowed. */
export function lockedKinds(locks: TableLocks): TableLockKind[] {
  return LOCK_FIELDS.filter((f) => locks[f.key]).map((f) => f.kind)
}

/**
 * Why a locked-table notice was raised. `'status'` is the informational case
 * (the announcement shown once when a restricted table is opened); the rest are
 * actions the user just tried and couldn't do.
 */
export type BlockedTableAction = 'add-row' | 'add-column' | 'delete-column' | 'edit-cell' | 'status'

/**
 * Copy for the action the user attempted, in the modal's vocabulary: each
 * notice names the Table Security row that denies it, so the reader knows which
 * setting an admin has to flip.
 */
export function describeBlockedAction(
  action: BlockedTableAction,
  locks: TableLocks,
  t: LockTranslate
): { title: string; text: string } {
  switch (action) {
    case 'add-row':
      return { title: t('blocked.insertTitle'), text: t('blocked.insertText') }
    case 'add-column':
      return { title: t('blocked.schemaTitle'), text: t('blocked.schemaText') }
    case 'delete-column':
      // Reachable with Changing Table Schema on Allow but Deleting Rows on Deny —
      // removing a column clears its value from every row, so it needs both.
      return locks.schemaLocked
        ? { title: t('blocked.schemaTitle'), text: t('blocked.schemaText') }
        : { title: t('blocked.deleteTitle'), text: t('blocked.deleteColumnText') }
    case 'edit-cell':
      return { title: t('blocked.updateTitle'), text: t('blocked.updateText') }
    case 'status': {
      const nouns = lockedKinds(locks).map((kind) => t(`fields.${kind}.noun`))
      return {
        title: t('title'),
        text:
          nouns.length > 0
            ? t('blocked.statusDenied', { actions: nouns.join(', ') })
            : t('blocked.statusAllAllowed'),
      }
    }
  }
}
