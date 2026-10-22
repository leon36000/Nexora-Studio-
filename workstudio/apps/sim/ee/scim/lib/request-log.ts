// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { ScimConnectionPrincipal } from '@sim/auth/principal'
import type { ScimType } from '@/ee/scim/lib/protocol/errors'

export interface ScimRequestLogEntry {
  principal: ScimConnectionPrincipal
  method: string
  path: string
  status: number
  scimType?: ScimType
  detail?: string
  userAgent: string | null
  durationMs: number
}

export function recordScimRequest(_entry: ScimRequestLogEntry): void {}
