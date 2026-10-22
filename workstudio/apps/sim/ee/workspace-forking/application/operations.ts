// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledOperations } from '@/ee/_nexora/disabled'

export const forkOperations = disabledOperations('workspace_fork', [
  'create',
  'discover',
  'exclusions',
  'mappingsRead',
  'mappingsUpdate',
  'preview',
  'rollback',
  'sync',
  'syncDefault',
  'syncPreview',
  'unlink',
] as const)
