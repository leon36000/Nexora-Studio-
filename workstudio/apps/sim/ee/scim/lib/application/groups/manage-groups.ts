// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { z } from 'zod'
import type { scimGroupResourceSchema } from '@/lib/api/contracts/scim'
import { disabledUseCase } from '@/ee/_nexora/disabled'
import { scimOperations as ops } from '@/ee/scim/lib/application/operations'

const F = 'SCIM provisioning'

type ScimGroupResource = z.output<typeof scimGroupResourceSchema>

export const listScimGroups = disabledUseCase<{
  resources: ScimGroupResource[]
  totalResults: number
  startIndex: number
}>(ops.listGroups, F)
export const getScimGroup = disabledUseCase<ScimGroupResource>(ops.getGroup, F)
/** The core Groups route renders `resource` and points `Location` at `groupId`. */
export const createScimGroup = disabledUseCase<{ resource: ScimGroupResource; groupId: string }>(
  ops.createGroup,
  F
)
export const replaceScimGroup = disabledUseCase<{ resource: ScimGroupResource }>(
  ops.replaceGroup,
  F
)
export const patchScimGroup = disabledUseCase(ops.patchGroup, F)
export const deleteScimGroup = disabledUseCase(ops.deleteGroup, F)
