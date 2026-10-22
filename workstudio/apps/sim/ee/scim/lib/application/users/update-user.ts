// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import type { z } from 'zod'
import type { scimUserResourceSchema } from '@/lib/api/contracts/scim'
import { disabledUseCase } from '@/ee/_nexora/disabled'
import { scimOperations as ops } from '@/ee/scim/lib/application/operations'

/** The core User route renders the updated `resource` for both PUT and PATCH. */
type ScimUserUpdate = { resource: z.output<typeof scimUserResourceSchema> }

export const replaceScimUser = disabledUseCase<ScimUserUpdate>(ops.replaceUser, 'SCIM provisioning')
export const patchScimUser = disabledUseCase<ScimUserUpdate>(ops.patchUser, 'SCIM provisioning')
