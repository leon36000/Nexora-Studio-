// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledOperations } from '@/ee/_nexora/disabled'

export const accessRequestOperations = disabledOperations('access_requests', [
  'cancel',
  'create',
  'discover',
  'getSettings',
  'listMine',
  'listOrganization',
  'preview',
  'resolve',
  'updateSettings',
] as const)
