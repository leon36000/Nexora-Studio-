import { parseAsString, parseAsStringLiteral } from 'nuqs/server'

/** Scope shown by the BYOK settings page. */
export const byokScopeParam = {
  key: 'scope',
  parser: parseAsStringLiteral(['workspace', 'organization'] as const).withDefault('workspace'),
} as const

/** Scope view-state: clean URLs, no back-stack churn. */
export const byokScopeUrlKeys = {
  history: 'replace',
  clearOnDefault: true,
} as const

/**
 * Co-located, typed URL query-param definitions for the settings section pages.
 * The client hook consumes this typed param definition as the single source of
 * truth.
 *
 * `mcpServerId` deep-links the MCP settings tab to a specific server so the row
 * can be focused/opened from a shared link.
 */
export const mcpServerIdParam = {
  key: 'mcpServerId',
  parser: parseAsString,
} as const

/** Opening a server is a destination → push to history; clear on close. */
export const mcpServerIdUrlKeys = {
  history: 'push',
  clearOnDefault: true,
} as const

/**
 * `server-tab` is the active tab (Details / Workflows) inside the deep-linked
 * workflow MCP server detail view, so a shared `mcpServerId` link can land on
 * either tab.
 */
export const serverTabParam = {
  key: 'server-tab',
  parser: parseAsStringLiteral(['details', 'workflows'] as const).withDefault('details'),
} as const

/** Tab view-state: clean URLs, no back-stack churn. */
export const serverTabUrlKeys = {
  history: 'replace',
  clearOnDefault: true,
} as const

/** Active view inside a credential-group detail page. */
export const credentialGroupTabParam = {
  key: 'credential-group-tab',
  parser: parseAsStringLiteral(['details', 'people', 'access'] as const).withDefault('details'),
} as const

/** Tab view-state: clean URLs, no back-stack churn. */
export const credentialGroupTabUrlKeys = {
  history: 'replace',
  clearOnDefault: true,
} as const

/**
 * `custom-tool-id` deep-links the Custom Tools settings tab to a specific
 * tool's detail sub-view. The "create new" flow stays in local state — only
 * existing entities are deep-linkable.
 */
export const customToolIdParam = {
  key: 'custom-tool-id',
  parser: parseAsString,
} as const

/** Opening a tool's detail is a destination → push to history; clear on close. */
export const customToolIdUrlKeys = {
  history: 'push',
  clearOnDefault: true,
} as const
