// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { constantUseCase, disabledUseCase } from '@/ee/_nexora/disabled'
import { accessRequestOperations as ops } from '@/ee/access-requests/lib/application/operations'

const F = 'Access requests'

/**
 * Discovery answers rather than refuses: the core contract documents that it "returns an empty
 * list while requests are disabled", and the workspace access boundary (and its server prefetch)
 * read `enabled: false` to show the restriction without offering a request.
 */
const discoverDisabled = constantUseCase(ops.discover, () => ({
  enabled: false,
  organizationId: null,
  entries: [],
  total: 0,
  hasMore: false,
}))

export const cancelAccessRequest = disabledUseCase(ops.cancel, F)
export const createAccessRequest = disabledUseCase(ops.create, F)
export const discoverAccessRequests = discoverDisabled
export const getAccessRequestSettings = disabledUseCase(ops.getSettings, F)
export const listMyAccessRequests = disabledUseCase(ops.listMine, F)
export const listOrganizationAccessRequests = disabledUseCase(ops.listOrganization, F)
export const updateAccessRequestSettings = disabledUseCase(ops.updateSettings, F)

export const workspaceAccessRequestUseCases = Object.freeze({
  cancel: disabledUseCase(ops.cancel, F),
  create: disabledUseCase(ops.create, F),
  discover: discoverDisabled,
  listMine: disabledUseCase(ops.listMine, F),
})
