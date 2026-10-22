// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { ScimConnectionPrincipal } from '@sim/auth/principal'
import type { NextRequest } from 'next/server'
import { ScimError } from '@/ee/scim/lib/protocol/errors'

export type ScimConnectionAuthenticator = (request: NextRequest) => Promise<ScimConnectionPrincipal>

/** Rejects every bearer credential (SCIM disabled). */
export const rejectAllScimCredentials: ScimConnectionAuthenticator = async () => {
  throw new ScimError(401, undefined, 'SCIM is not available')
}
