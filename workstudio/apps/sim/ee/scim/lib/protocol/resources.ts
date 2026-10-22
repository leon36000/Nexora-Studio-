// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { SCIM_LIST_RESPONSE_SCHEMA } from '@/ee/scim/lib/protocol/constants'

export interface ScimAttributeProjection {
  attributes?: string[]
  excludedAttributes?: string[]
}

function split(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  return value.split(',').map((part) => part.trim()).filter(Boolean)
}

export function parseAttributeProjection(query: unknown): ScimAttributeProjection {
  const q = (query ?? {}) as Record<string, unknown>
  return { attributes: split(q.attributes), excludedAttributes: split(q.excludedAttributes) }
}

export function toListResponse(resources: readonly unknown[], totalResults: number, startIndex: number): any {
  return {
    schemas: [SCIM_LIST_RESPONSE_SCHEMA],
    totalResults,
    startIndex,
    itemsPerPage: resources.length,
    Resources: [...resources],
  }
}
