// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

/** Pass-through canonicalization: the SCIM use cases are disabled and never consume it. */
export function toCanonicalUser(body: unknown): unknown {
  return body
}

export function toCanonicalGroup(body: unknown): unknown {
  return body
}
