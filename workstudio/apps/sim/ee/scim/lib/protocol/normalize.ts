// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

/** Accepts the string spellings some identity providers send for booleans. */
export function normalizeScimBoolean(value: unknown): unknown {
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase()
    if (lowered === 'true') return true
    if (lowered === 'false') return false
  }
  return value
}

/** Unwraps a one-element array (e.g. `[true]`) into its element. */
export function unwrapSingleElement(value: unknown): unknown {
  return Array.isArray(value) && value.length === 1 ? value[0] : value
}

/** Drops empty or non-URN schema markers before checking the declared core schema. */
export function stripProviderSchemaMarkers(schemas: readonly string[]): string[] {
  return schemas.map((schema) => schema.trim()).filter((schema) => schema.startsWith('urn:'))
}

/** Renames top-level attributes case-insensitively to their canonical spelling. */
export function canonicalizeAttributeNames(body: unknown, attributes: readonly string[]): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body
  const canonical = new Map(attributes.map((name) => [name.toLowerCase(), name]))
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    out[canonical.get(key.toLowerCase()) ?? key] = value
  }
  return out
}
