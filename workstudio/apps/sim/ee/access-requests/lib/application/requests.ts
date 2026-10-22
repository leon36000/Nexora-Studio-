// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledUseCase } from '@/ee/_nexora/disabled'
import { accessRequestOperations as ops } from '@/ee/access-requests/lib/application/operations'

const F = 'Access requests'
export const cancelAccessRequest = disabledUseCase(ops.cancel, F)
export const createAccessRequest = disabledUseCase(ops.create, F)
export const discoverAccessRequests = disabledUseCase(ops.discover, F)
export const getAccessRequestSettings = disabledUseCase(ops.getSettings, F)
export const listMyAccessRequests = disabledUseCase(ops.listMine, F)
export const listOrganizationAccessRequests = disabledUseCase(ops.listOrganization, F)
export const updateAccessRequestSettings = disabledUseCase(ops.updateSettings, F)

export const workspaceAccessRequestUseCases = Object.freeze({
  cancel: disabledUseCase(ops.cancel, F),
  create: disabledUseCase(ops.create, F),
  discover: disabledUseCase(ops.discover, F),
  listMine: disabledUseCase(ops.listMine, F),
})
