// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { disabledOperation } from '@/ee/_nexora/disabled'

/**
 * OAuth scopes are the ones the published v2 OpenAPI documents declare for these operations.
 * Fork operation ids follow the core's published v2 contract (`x-sim-operation` in
 * `apps/docs/openapi-v2-workflows.json`, and the core fork route tests): `workspaces.fork.*`.
 */
export const forkOperations = Object.freeze({
  create: disabledOperation('workspaces.fork.create', 'api:write'),
  discover: disabledOperation('workspaces.fork.discover', 'api:read'),
  exclusions: disabledOperation('workspaces.fork.exclusions', 'api:write'),
  mappingsRead: disabledOperation('workspaces.fork.mappings.read', 'api:read'),
  mappingsUpdate: disabledOperation('workspaces.fork.mappings.update', 'api:write'),
  preview: disabledOperation('workspaces.fork.preview', 'api:write'),
  rollback: disabledOperation('workspaces.fork.rollback', 'api:write'),
  sync: disabledOperation('workspaces.fork.sync', 'api:write'),
  syncDefault: disabledOperation('workspaces.fork.sync.default'),
  syncPreview: disabledOperation('workspaces.fork.sync.preview', 'api:write'),
  unlink: disabledOperation('workspaces.fork.unlink', 'api:write'),
})
