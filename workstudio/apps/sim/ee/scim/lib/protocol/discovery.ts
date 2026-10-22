// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import {
  SCIM_ENTERPRISE_USER_SCHEMA,
  SCIM_GROUP_SCHEMA,
  SCIM_USER_SCHEMA,
} from '@/ee/scim/lib/protocol/constants'

/** Unreachable while isScimDeploymentEnabled() is false; kept RFC-shaped for completeness. */
export function resourceTypes(baseUrl: string): Array<{ id: string; [key: string]: unknown }> {
  return [
    {
      id: 'User',
      name: 'User',
      endpoint: '/Users',
      schema: SCIM_USER_SCHEMA,
      meta: { location: `${baseUrl}/ResourceTypes/User` },
    },
    {
      id: 'Group',
      name: 'Group',
      endpoint: '/Groups',
      schema: SCIM_GROUP_SCHEMA,
      meta: { location: `${baseUrl}/ResourceTypes/Group` },
    },
  ]
}

export function schemaDefinitions(baseUrl: string): Array<{ id: string; [key: string]: unknown }> {
  return [SCIM_USER_SCHEMA, SCIM_GROUP_SCHEMA, SCIM_ENTERPRISE_USER_SCHEMA].map((id) => ({
    id,
    attributes: [],
    meta: { location: `${baseUrl}/Schemas/${id}` },
  }))
}

export function serviceProviderConfig(_baseUrl: string): Record<string, unknown> {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    patch: { supported: false },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: false, maxResults: 0 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [],
  }
}
