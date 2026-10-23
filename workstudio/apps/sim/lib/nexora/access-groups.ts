import {
  PERMISSION_GROUP_FIELDS,
  type PermissionGroupCapabilityScope,
} from '@/lib/permission-groups/fields'

/**
 * Nexora edition: the vocabulary of Réglages › Groupes d'accès over the permission-group engine.
 * Every boolean restriction of the engine is shown as something the group *can* do (checked =
 * allowed), grouped by theme; the three templates are starting points an administrator edits.
 */
type Fields = typeof PERMISSION_GROUP_FIELDS

export type AccessCapabilityKey = {
  [K in keyof Fields]: Fields[K]['kind'] extends 'boolean-restriction' ? K : never
}[keyof Fields]

/** Display order of the themes; a theme the engine adds later lands in `other`. */
export const ACCESS_CAPABILITY_CATEGORIES = [
  'workflows',
  'deployment',
  'tools',
  'knowledge',
  'tables',
  'files',
  'modules',
  'credentials',
  'collaboration',
  'logs',
  'other',
] as const

type AccessCapabilityCategory = (typeof ACCESS_CAPABILITY_CATEGORIES)[number]

const CATEGORY_BY_ENGINE_LABEL: Record<string, AccessCapabilityCategory> = {
  Workflows: 'workflows',
  Deployment: 'deployment',
  Tools: 'tools',
  'Knowledge Base': 'knowledge',
  Tables: 'tables',
  Files: 'files',
  Modules: 'modules',
  'Credentials & Access': 'credentials',
  Collaboration: 'collaboration',
  Logs: 'logs',
}

export interface AccessCapability {
  key: AccessCapabilityKey
  category: AccessCapabilityCategory
  /** `organization`: read from the default group only, whatever group shows it. */
  scope: PermissionGroupCapabilityScope
}

function isCapabilityKey(key: string): key is AccessCapabilityKey {
  return PERMISSION_GROUP_FIELDS[key as keyof Fields]?.kind === 'boolean-restriction'
}

export const ACCESS_GROUP_CAPABILITIES: readonly AccessCapability[] = Object.keys(
  PERMISSION_GROUP_FIELDS
)
  .filter(isCapabilityKey)
  .map((key) => {
    const { feature } = PERMISSION_GROUP_FIELDS[key]
    return {
      key,
      category: CATEGORY_BY_ENGINE_LABEL[feature.category] ?? 'other',
      scope: feature.scope,
    }
  })

export type AccessGroupTemplateId = 'read-only' | 'creators' | 'admins'

interface AccessGroupTemplate {
  id: AccessGroupTemplateId
  /** The capabilities the template withholds; every other one is allowed. */
  withheld: readonly AccessCapabilityKey[]
}

/**
 * « Lecture seule »: consult and run, never build, edit, deploy, expose or administer. Tools and
 * connectors stay usable, otherwise the workflows these members run would fail.
 * « Créateurs »: build and deploy inside the organization, no public exposure or new workspace.
 * « Administrateurs »: everything.
 */
export const ACCESS_GROUP_TEMPLATES: readonly AccessGroupTemplate[] = [
  {
    id: 'read-only',
    withheld: [
      'disableWorkflowEditing',
      'hideCopilot',
      'hideDeployApi',
      'hideDeployMcp',
      'hideDeployChatbot',
      'disablePublicApi',
      'disableWebhookTriggers',
      'disableKnowledgeBaseCreation',
      'disableKnowledgeBaseFileUpload',
      'disableTableCreation',
      'disablePublicFileSharing',
      'hideSecretsTab',
      'hideApiKeysTab',
      'hideIntegrationsTab',
      'disablePersonalApiKeys',
      'disablePersonalCredentials',
      'disableCliAccess',
      'disableOAuthAppAccess',
      'disableInvitations',
      'disableWorkspaceCreation',
      'disableToolAutoApproval',
      'hideSandboxesTab',
    ],
  },
  {
    id: 'creators',
    withheld: [
      'disablePublicFileSharing',
      'disableCliAccess',
      'disableOAuthAppAccess',
      'disableInvitations',
      'disableWorkspaceCreation',
    ],
  },
  { id: 'admins', withheld: [] },
]

/** The template as a config: every capability set explicitly (`true` = withheld). */
export function templateConfig(id: AccessGroupTemplateId): Record<AccessCapabilityKey, boolean> {
  const withheld = new Set(ACCESS_GROUP_TEMPLATES.find((template) => template.id === id)?.withheld)
  return Object.fromEntries(
    ACCESS_GROUP_CAPABILITIES.map(({ key }) => [key, withheld.has(key)])
  ) as Record<AccessCapabilityKey, boolean>
}
