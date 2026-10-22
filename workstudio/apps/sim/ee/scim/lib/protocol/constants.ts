// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { TokenBucketConfig } from '@/lib/core/rate-limiter/storage/adapter'

/** URNs and media type defined by RFC 7643 / RFC 7644. */
export const SCIM_MEDIA_TYPE = 'application/scim+json'
export const SCIM_ACCEPTED_MEDIA_TYPES = [SCIM_MEDIA_TYPE, 'application/json'] as const
export const SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User'
export const SCIM_GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group'
export const SCIM_ENTERPRISE_USER_SCHEMA = 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'
export const SCIM_LIST_RESPONSE_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse'
export const SCIM_PATCH_OP_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp'
export const SCIM_ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error'

export const SCIM_MAX_BODY_BYTES = 1024 * 1024
export const SCIM_MAX_GROUP_MEMBERS = 1000
export const SCIM_MAX_PATCH_OPERATIONS = 100
export const SCIM_RATE_LIMIT: TokenBucketConfig = {
  maxTokens: 600,
  refillRate: 10,
  refillIntervalMs: 1000,
}
