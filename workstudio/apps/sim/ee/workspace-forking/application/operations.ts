// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledOperation } from '@/ee/_nexora/disabled'

/**
 * Fork operation ids follow the core's published v2 contract (`x-sim-operation` in
 * `apps/docs/openapi-v2-workflows.json`, and the core fork route tests): `workspaces.fork.*`.
 */
export const forkOperations = Object.freeze({
  create: disabledOperation('workspaces.fork.create'),
  discover: disabledOperation('workspaces.fork.discover'),
  exclusions: disabledOperation('workspaces.fork.exclusions'),
  mappingsRead: disabledOperation('workspaces.fork.mappings.read'),
  mappingsUpdate: disabledOperation('workspaces.fork.mappings.update'),
  preview: disabledOperation('workspaces.fork.preview'),
  rollback: disabledOperation('workspaces.fork.rollback'),
  sync: disabledOperation('workspaces.fork.sync'),
  syncDefault: disabledOperation('workspaces.fork.sync.default'),
  syncPreview: disabledOperation('workspaces.fork.sync.preview'),
  unlink: disabledOperation('workspaces.fork.unlink'),
})
