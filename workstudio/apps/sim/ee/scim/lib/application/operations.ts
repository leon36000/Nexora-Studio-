// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledOperations } from '@/ee/_nexora/disabled'

export const scimOperations = disabledOperations('scim', [
  'listUsers',
  'getUser',
  'provisionUser',
  'replaceUser',
  'patchUser',
  'deprovisionUser',
  'listGroups',
  'getGroup',
  'createGroup',
  'replaceGroup',
  'patchGroup',
  'deleteGroup',
  'getConnection',
  'configureConnection',
  'listActivity',
  'reconcileConnection',
  'issueCredential',
  'revokeCredential',
  'listMappings',
  'upsertMapping',
  'deleteMapping',
] as const)
