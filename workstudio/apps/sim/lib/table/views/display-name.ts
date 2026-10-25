import { SEEDED_TABLE_VIEW_NAMES } from '@/lib/table/constants'

/**
 * The name a view shows. The starter view is stored under the name it was seeded with (« Default »
 * or « Par défaut », by the language of the request that created the table); while it still has
 * that name it reads `defaultLabel`, in the viewer's language. A name the member chose, and any
 * other view, show as stored. The stored name never changes, so nothing that refers to a view by
 * its name or id is affected.
 */
export function viewDisplayName(
  view: { name: string; isDefault: boolean },
  defaultLabel: string
): string {
  return view.isDefault && SEEDED_TABLE_VIEW_NAMES.includes(view.name) ? defaultLabel : view.name
}
