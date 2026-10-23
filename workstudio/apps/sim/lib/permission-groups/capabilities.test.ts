import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_IDS,
  CAPABILITY_RULES,
  capabilityRefusal,
} from '@/lib/permission-groups/capabilities'
import {
  DEFAULT_PERMISSION_GROUP_CONFIG,
  type PermissionGroupConfig,
} from '@/lib/permission-groups/fields'
import enErrors from '@/messages/en/errors.json'
import frErrors from '@/messages/fr/errors.json'

function configWith(overrides: Partial<PermissionGroupConfig>): PermissionGroupConfig {
  return { ...DEFAULT_PERMISSION_GROUP_CONFIG, ...overrides }
}

describe('knowledge capability rules', () => {
  const create = CAPABILITY_RULES['knowledge.create']
  const upload = CAPABILITY_RULES['knowledge.upload']
  const connectors = CAPABILITY_RULES['knowledge.connectors']
  const exportRule = CAPABILITY_RULES['knowledge.export']

  it('withholds creation and upload from their own keys', () => {
    expect(create.deniedBy(configWith({ disableKnowledgeBaseCreation: true }))).toBe(true)
    expect(upload.deniedBy(configWith({ disableKnowledgeBaseFileUpload: true }))).toBe(true)
  })

  it('subsumes the module-wide key, since an operation declares only one capability', () => {
    const hidden = configWith({ hideKnowledgeBaseTab: true })
    expect(create.deniedBy(hidden)).toBe(true)
    expect(upload.deniedBy(hidden)).toBe(true)
  })

  it('reads the connector allow-list as a named set, with null meaning unrestricted', () => {
    expect(connectors.deniedBy(DEFAULT_PERMISSION_GROUP_CONFIG, 'confluence')).toBe(false)

    const narrowed = configWith({ allowedKnowledgeConnectors: ['google_drive'] })
    expect(connectors.deniedBy(narrowed, 'google_drive')).toBe(false)
    expect(connectors.deniedBy(narrowed, 'confluence')).toBe(true)
  })

  it('withholds every connector when the allow-list is emptied rather than cleared', () => {
    const emptied = configWith({ allowedKnowledgeConnectors: [] })
    expect(connectors.deniedBy(emptied, 'google_drive')).toBe(true)
  })

  it('withholds export when the module is hidden', () => {
    expect(exportRule.deniedBy(configWith({ hideKnowledgeBaseTab: true }))).toBe(true)
  })
})

describe('capability refusal', () => {
  it('is worded in the instance language, French by default', () => {
    expect(capabilityRefusal('workflows.edit')).toBe(
      'Non autorisé par le groupe d’accès de votre organisation : modification des workflows.'
    )
  })

  it('names every capability in French, and in English with its original subject', () => {
    const missing = CAPABILITY_IDS.filter((id) => {
      const key = id.replaceAll('.', '_')
      const fr = frErrors.capabilities[key as keyof typeof frErrors.capabilities]
      const en = enErrors.capabilities[key as keyof typeof enErrors.capabilities]
      return !fr || en !== CAPABILITY_RULES[id].describe
    })
    expect(missing).toEqual([])
  })
})
