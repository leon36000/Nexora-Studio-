import { parseAsString, parseAsStringLiteral } from 'nuqs/server'

/**
 * The connectors catalog's URL state: the search term (written debounced by
 * `useDebouncedSearchSetter`) and the selected category, empty for every category.
 */
export const connectorsParsers = {
  search: parseAsString.withDefault(''),
  category: parseAsString.withDefault(''),
  /** `personal`: the member's own connections instead of the workspace's. */
  scope: parseAsStringLiteral(['workspace', 'personal'] as const).withDefault('workspace'),
} as const

/** Filter/search view-state: clean URLs, no back-stack churn. */
export const connectorsUrlKeys = {
  history: 'replace',
  clearOnDefault: true,
} as const
