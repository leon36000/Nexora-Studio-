// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { createScimRouteBuilder } from '@/lib/api/server/routes/scim-route'
import { rejectAllScimCredentials } from '@/ee/scim/lib/authenticate'
import { recordScimRequest } from '@/ee/scim/lib/request-log'

/** Uses the core (Apache) SCIM route builder with a reject-all authenticator. */
export const defineScimRoute = createScimRouteBuilder({
  authenticate: rejectAllScimCredentials,
  recordRequest: recordScimRequest,
})
