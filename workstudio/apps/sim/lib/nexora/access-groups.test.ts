import { describe, expect, it } from 'vitest'
import {
  ACCESS_GROUP_CAPABILITIES,
  ACCESS_GROUP_TEMPLATES,
  templateConfig,
} from '@/lib/nexora/access-groups'
import { PERMISSION_GROUP_FIELDS } from '@/lib/permission-groups/fields'

describe('access group templates', () => {
  it('only withhold what the server refuses, never a merely hidden button', () => {
    for (const template of ACCESS_GROUP_TEMPLATES) {
      for (const key of template.withheld) {
        const field = PERMISSION_GROUP_FIELDS[key]
        expect(field.kind, `${template.id}: ${key}`).toBe('boolean-restriction')
        expect(['capability', 'executor'], `${template.id}: ${key}`).toContain(field.enforcement)
      }
    }
  })

  it('keeps read-only members from building, deploying and exposing workflows', () => {
    const readOnly = templateConfig('read-only')
    for (const key of [
      'hideCopilot',
      'hideDeployApi',
      'hideDeployMcp',
      'hideDeployChatbot',
      'disablePublicApi',
      'disableWebhookTriggers',
      'disableKnowledgeBaseCreation',
      'disableTableCreation',
      'hideSecretsTab',
      'disableInvitations',
    ] as const) {
      expect(readOnly[key], key).toBe(true)
    }
  })

  it('lets read-only members still run workflows that call tools and connectors', () => {
    const readOnly = templateConfig('read-only')
    expect(readOnly.disableMcpTools).toBe(false)
    expect(readOnly.disableCustomTools).toBe(false)
    expect(readOnly.hideKnowledgeBaseTab).toBe(false)
  })

  it('sets every capability explicitly, so applying a template resets an edited group', () => {
    const admins = templateConfig('admins')
    expect(Object.keys(admins).sort()).toEqual(
      ACCESS_GROUP_CAPABILITIES.map((capability) => capability.key).sort()
    )
    expect(Object.values(admins).every((withheld) => withheld === false)).toBe(true)
  })
})
