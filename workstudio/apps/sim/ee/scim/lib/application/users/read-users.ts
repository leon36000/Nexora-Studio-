// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { z } from 'zod'
import type { scimUserResourceSchema } from '@/lib/api/contracts/scim'
import { disabledUseCase } from '@/ee/_nexora/disabled'
import { scimOperations as ops } from '@/ee/scim/lib/application/operations'

type ScimUserResource = z.output<typeof scimUserResourceSchema>

export const listScimUsers = disabledUseCase<{
  resources: ScimUserResource[]
  totalResults: number
  startIndex: number
}>(ops.listUsers, 'SCIM provisioning')
export const getScimUser = disabledUseCase<ScimUserResource>(ops.getUser, 'SCIM provisioning')
