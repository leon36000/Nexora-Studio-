import { parseAsString } from 'nuqs/server'

/**
 * The connectors catalog's URL state: the search term (written debounced by
 * `useDebouncedSearchSetter`) and the selected category, empty for every category.
 */
export const connectorsParsers = {
  search: parseAsString.withDefault(''),
  category: parseAsString.withDefault(''),
} as const

/** Filter/search view-state: clean URLs, no back-stack churn. */
export const connectorsUrlKeys = {
  history: 'replace',
  clearOnDefault: true,
} as const
