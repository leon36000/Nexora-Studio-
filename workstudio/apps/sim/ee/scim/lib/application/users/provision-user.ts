// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { z } from 'zod'
import type { scimUserResourceSchema } from '@/lib/api/contracts/scim'
import { disabledUseCase } from '@/ee/_nexora/disabled'
import { scimOperations as ops } from '@/ee/scim/lib/application/operations'

/** The core Users route renders `resource` and points `Location` at `scimUserId`. */
export const provisionScimUser = disabledUseCase<{
  resource: z.output<typeof scimUserResourceSchema>
  scimUserId: string
}>(ops.provisionUser, 'SCIM provisioning')
