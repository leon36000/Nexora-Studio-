// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { SCIM_LIST_RESPONSE_SCHEMA } from '@/ee/scim/lib/protocol/constants'

export interface ScimAttributeProjection {
  attributes?: string[]
  excludedAttributes?: string[]
}

function split(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function parseAttributeProjection(query: unknown): ScimAttributeProjection {
  const q = (query ?? {}) as Record<string, unknown>
  return { attributes: split(q.attributes), excludedAttributes: split(q.excludedAttributes) }
}

/** RFC 7644 section 3.4.2 ListResponse envelope, shaped as the core SCIM contracts declare it. */
interface ScimListResponse<T> {
  schemas: [typeof SCIM_LIST_RESPONSE_SCHEMA]
  totalResults: number
  startIndex: number
  itemsPerPage: number
  Resources: T[]
}

export function toListResponse<T>(
  resources: readonly T[],
  totalResults: number,
  startIndex: number
): ScimListResponse<T> {
  return {
    schemas: [SCIM_LIST_RESPONSE_SCHEMA],
    totalResults,
    startIndex,
    itemsPerPage: resources.length,
    Resources: [...resources],
  }
}
