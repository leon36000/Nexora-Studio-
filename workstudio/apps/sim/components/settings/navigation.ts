import type { ComponentType } from 'react'
import {
  BrainCircuit,
  ChartColumn,
  ClipboardList,
  Connections,
  Credit,
  Database,
  Globe,
  GridOffset,
  HexSimple,
  Integration,
  Key,
  KeySquare,
  ListChecks,
  Lock,
  LogIn,
  Mail,
  Palette,
  PanelLeft,
  Send,
  Server,
  Settings,
  ShieldCheck,
  Shuffle,
  TerminalWindow,
  Trash,
  Upload,
  Users,
  Wrench,
} from '@sim/emcn/icons'
import { type PermissionType, permissionSatisfies } from '@sim/platform-authz/workspace'
import { CodeIcon, McpIcon, SlackIcon } from '@/components/icons'
import type { SettingsHeaderMeta } from '@/components/settings/settings-header'
import type { DeploymentFeatures, DeploymentShape } from '@/lib/api/contracts/workspaces'
import { docsUrl } from '@/lib/branding/docs-url'
import { organizationRoutes } from '@/lib/navigation/paths'
import enSettingsMessages from '@/messages/en/settings.json'

/**
 * English navigation copy, read from the `settings` messages so the catalog and the
 * translated interface share one source. Components render the active locale through
 * each item's {@link SettingsNavigationItem.messageKey}; these English values serve
 * server-side consumers (metadata, Mothership tools) and tests.
 */
const NAV = enSettingsMessages.nav

/** A message plane under `settings.nav` holding `{ label, description }` entries. */
type SettingsNavMessagePlane = 'unified' | 'account' | 'selfhost' | 'workspace' | 'organization'

/**
 * Path (within the `settings` namespace) of an item's `{ label, description }` messages,
 * e.g. `nav.unified.general`. Render with `t(\`${item.messageKey}.label\`)`.
 */
export type SettingsNavMessageKey = `nav.${SettingsNavMessagePlane}.${string}`

/** Sidebar group headings, keyed like the `groups` arrays below. */
export type SettingsNavGroupKey = keyof typeof NAV.groups

function navMessageKey(plane: SettingsNavMessagePlane, id: string): SettingsNavMessageKey {
  return `nav.${plane}.${id}`
}

export type SettingsPlane = 'account' | 'selfhost' | 'workspace'

export type AccountSettingsSection = 'general' | 'billing' | 'api-keys' | 'admin' | 'mothership'

/**
 * Settings a self-hoster needs from the managed service: their profile, what
 * they pay for, and the Chat keys their own deployment authenticates with.
 */
export type SelfHostSettingsSection = 'general' | 'billing' | 'chat-keys'

export type OrganizationSettingsSection =
  | 'knowledge-graphs'
  | 'recently-deleted'
  | 'integrations'
  | 'connected-accounts'
  | 'search-mcp'
  | 'search-slack'
  | 'members'
  | 'billing'
  | 'usage'
  | 'access-control'
  | 'requests'
  | 'audit-logs'
  | 'sso'
  | 'security'
  | 'data-retention'
  | 'data-drains'
  | 'whitelabeling'

export type WorkspaceSettingsSection =
  | 'requests'
  | 'teammates'
  | 'secrets'
  | 'byok'
  | 'sandboxes'
  | 'custom-tools'
  | 'mcp'
  | 'workflow-mcp-servers'
  | 'api-keys'
  | 'inbox'
  | 'recently-deleted'
  | 'forks'
  | 'custom-blocks'

export type SettingsSection =
  | AccountSettingsSection
  | OrganizationSettingsSection
  | SelfHostSettingsSection
  | WorkspaceSettingsSection

export interface SettingsNavigationItem<Section extends string = string> {
  id: Section
  label: string
  description: string
  /** Where the localized `label` / `description` live; see {@link SettingsNavMessageKey}. */
  messageKey: SettingsNavMessageKey
  icon: ComponentType<{ className?: string }>
  group: string
  docsLink?: string
}

export type UnifiedSettingsSection =
  | 'connected-accounts'
  | 'general'
  | 'desktop'
  | 'browser'
  | 'terminal'
  | 'secrets'
  | 'access-control'
  | 'requests'
  | 'custom-blocks'
  | 'audit-logs'
  | 'apikeys'
  | 'byok'
  | 'billing'
  | 'teammates'
  | 'organization'
  | 'usage'
  | 'models'
  | 'connectors'
  | 'email'
  | 'sso'
  | 'whitelabeling'
  | 'forks'
  | 'mcp'
  | 'custom-tools'
  | 'workflow-mcp-servers'
  | 'inbox'
  | 'sandboxes'
  | 'admin'
  | 'security'
  | 'data-retention'
  | 'data-drains'
  | 'mothership'
  | 'recently-deleted'

export type UnifiedNavigationSection = 'account' | 'workspace' | 'organization' | 'platform'

/**
 * A bridge surface the desktop shell must expose for a section to be worth
 * showing. Gated on the surface, never on the user's device toggle — the
 * Browser and Terminal pages are where that toggle is flipped back on.
 */
export type DesktopSettingsSurface = 'settings' | 'browser' | 'terminal'

export interface UnifiedSettingsNavigationItem {
  id: UnifiedSettingsSection
  label: string
  description: string
  /** Where the localized `label` / `description` live; see {@link SettingsNavMessageKey}. */
  messageKey: SettingsNavMessageKey
  icon: ComponentType<{ className?: string }>
  section: UnifiedNavigationSection
  order: number
  hideWhenBillingDisabled?: boolean
  requiresEnterprise?: boolean
  requiresMax?: boolean
  requiresHosted?: boolean
  /**
   * The inverse of {@link UnifiedSettingsNavigationItem.requiresHosted}: the
   * section exists only on a self-hosted deployment and is absent on Sim Cloud,
   * where the same surface is reached from the managed service instead.
   */
  requiresSelfHosted?: boolean
  /** See {@link SelfHostedOverride}; resolved against the deployment shape at filter time. */
  selfHostedOverride?: SelfHostedOverride
  requiresSuperUser?: boolean
  requiresAdminRole?: boolean
  requiresDesktopSurface?: DesktopSettingsSurface
  allowNonOrgAdmin?: boolean
  showWhenLocked?: boolean
  hideForEnterprise?: boolean
  externalUrl?: string
  docsLink?: string
  /**
   * The organization-scoped counterpart of this section. Declaring it marks the
   * section without a workspace projection as acting on the host organization, which
   * routes it through the organization gate (host organization present, org-admin
   * viewer, plan entitlement) in both the sidebar and the section page.
   *
   * This is the single source for {@link ORGANIZATION_PLANE_UNIFIED_SECTIONS} and
   * {@link UNIFIED_TO_ORGANIZATION_SECTION}, so the two cannot drift apart.
   */
  organizationSection?: OrganizationSettingsSection
}

interface UnifiedSettingsProjection
  extends Omit<
    UnifiedSettingsNavigationItem,
    'label' | 'icon' | 'section' | 'docsLink' | 'messageKey'
  > {
  group: UnifiedNavigationSection
}

interface SettingsPlaneSectionMap {
  account: AccountSettingsSection
  selfhost: SelfHostSettingsSection
  workspace: WorkspaceSettingsSection
}

interface SettingsPlaneProjection<Section extends string> {
  id: Section
  group: string
  order: number
  /** Plane-specific label, only when the surface's scope genuinely differs. */
  label?: string
  /** Plane-specific description, only when the surface's scope genuinely differs. */
  description?: string
}

type SettingsPlaneProjections = {
  readonly [Plane in SettingsPlane]?: SettingsPlaneProjection<SettingsPlaneSectionMap[Plane]>
}

export interface SettingsSectionRegistryEntry {
  label: string
  icon: ComponentType<{ className?: string }>
  docsLink?: string
  /** Omit for sections that exist only on a standalone plane. */
  unified?: UnifiedSettingsProjection
  planes?: SettingsPlaneProjections
}

/**
 * How a section unlocks on a self-hosted deployment: `'always'` unconditionally, or
 * when the named enterprise feature resolves on for the deployment. Named rather than
 * read here so the catalog stays a constant and the sidebar and the server gate resolve
 * the same server-provided shape — see {@link isSelfHostedOverrideEnabled}. That is what
 * keeps nav and server agreeing: a section is visible exactly when its API would accept
 * the request.
 */
export type SelfHostedOverride = 'always' | keyof DeploymentFeatures

/**
 * Whether a section's self-hosted override unlocks it on this deployment. Always false
 * on Sim Cloud, where subscription plans decide entitlement instead.
 */
export function isSelfHostedOverrideEnabled(
  override: SelfHostedOverride | undefined,
  deployment: DeploymentShape
): boolean {
  if (override === undefined || deployment.hosted) return false
  return override === 'always' || deployment.features[override] === true
}

type SettingsHrefSearchParams = Pick<URLSearchParams, 'toString'>

function withSettingsSearchParams(
  pathname: string,
  searchParams?: SettingsHrefSearchParams
): string {
  const query = searchParams?.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function getAccountSettingsHref(
  section: AccountSettingsSection,
  searchParams?: SettingsHrefSearchParams
): string {
  return withSettingsSearchParams(`/account/settings/${section}`, searchParams)
}

export function getSelfHostSettingsHref(
  section: SelfHostSettingsSection,
  searchParams?: SettingsHrefSearchParams
): string {
  return withSettingsSearchParams(`/selfhost/settings/${section}`, searchParams)
}

export function getWorkspaceSettingsHref(
  workspaceId: string,
  section: WorkspaceSettingsSection,
  searchParams?: SettingsHrefSearchParams
): string {
  return withSettingsSearchParams(`/workspace/${workspaceId}/settings/${section}`, searchParams)
}

export const ACCOUNT_SETTINGS_PATH_ALIASES = {
  apikeys: 'api-keys',
} as const satisfies Readonly<Record<string, AccountSettingsSection>>

export const WORKSPACE_SETTINGS_PATH_ALIASES = {
  apikeys: 'api-keys',
} as const satisfies Readonly<Record<string, WorkspaceSettingsSection>>

interface ParseSettingsPathSectionOptions<
  Section extends string,
  DefaultSection extends Section | null,
> {
  path: string | null | undefined
  items: readonly SettingsNavigationItem<Section>[]
  defaultSection: DefaultSection
  aliases?: Readonly<Partial<Record<string, Section>>>
}

/**
 * Resolves the first segment after `settings`, or a route-provided section
 * segment, against a typed settings catalog.
 */
export function parseSettingsPathSection<
  Section extends string,
  const DefaultSection extends Section | null,
>({
  path,
  items,
  defaultSection,
  aliases,
}: ParseSettingsPathSectionOptions<Section, DefaultSection>): Section | DefaultSection {
  if (!path) return defaultSection

  const pathname = path.split(/[?#]/, 1)[0]
  const segments = pathname.split('/').filter(Boolean)
  const settingsIndex = segments.lastIndexOf('settings')
  let pathSection: string | undefined
  if (settingsIndex === -1) {
    pathSection = segments.length === 1 ? segments[0] : undefined
  } else {
    pathSection = segments[settingsIndex + 1]
  }
  if (!pathSection) return defaultSection

  const normalized = aliases?.[pathSection] ?? pathSection
  return items.find((item) => item.id === normalized)?.id ?? defaultSection
}

export const ACCOUNT_SETTINGS_GROUPS = [
  { key: 'account', title: NAV.groups.account },
  { key: 'developer', title: NAV.groups.developer },
  { key: 'platform', title: NAV.groups.platform },
] as const

/** Planes with their own standalone shell; the workspace plane renders inside the editor. */
export type StandaloneSettingsPlane = Exclude<SettingsPlane, 'workspace'> | 'organization'

/**
 * Per-plane sidebar chrome. Self-host is reached from outside the app (the CLI
 * wizard, the README), so it leads with the brand mark rather than a Back link
 * into a workspace the visitor may not even be using.
 */
export const SETTINGS_PLANE_CHROME: Record<
  StandaloneSettingsPlane,
  { label: string; showWordmark: boolean }
> = {
  account: { label: NAV.planes.account, showWordmark: false },
  selfhost: { label: NAV.planes.selfhost, showWordmark: true },
  organization: { label: NAV.planes.organization, showWordmark: false },
}

export const SELFHOST_SETTINGS_GROUPS = [
  { key: 'account', title: NAV.groups.account },
  { key: 'developer', title: NAV.groups.developer },
] as const

export const SETTINGS_SECTION_REGISTRY: readonly SettingsSectionRegistryEntry[] = [
  {
    label: NAV.unified.general.label,
    icon: Settings,
    unified: {
      id: 'general',
      description: NAV.unified.general.description,
      group: 'account',
      order: 0,
    },
    planes: {
      account: { id: 'general', group: 'account', order: 0 },
      selfhost: { id: 'general', group: 'account', order: 0 },
    },
  },
  {
    label: NAV.unified.desktop.label,
    icon: PanelLeft,
    unified: {
      id: 'desktop',
      description: NAV.unified.desktop.description,
      group: 'account',
      order: 2,
      requiresDesktopSurface: 'settings',
    },
  },
  {
    label: NAV.unified.browser.label,
    icon: Globe,
    unified: {
      id: 'browser',
      description: NAV.unified.browser.description,
      group: 'account',
      order: 3,
      requiresDesktopSurface: 'browser',
    },
  },
  {
    label: NAV.unified.terminal.label,
    icon: TerminalWindow,
    unified: {
      id: 'terminal',
      description: NAV.unified.terminal.description,
      group: 'account',
      order: 4,
      requiresDesktopSurface: 'terminal',
    },
  },
  {
    label: NAV.unified.requests.label,
    icon: ListChecks,
    unified: {
      id: 'requests',
      description: NAV.unified.requests.description,
      group: 'workspace',
      order: 12,
      organizationSection: 'requests',
    },
    planes: {
      workspace: { id: 'requests', group: 'workspace', order: 12 },
    },
  },
  {
    label: NAV.unified['access-control'].label,
    icon: ShieldCheck,
    docsLink: docsUrl('/platform/enterprise/access-control'),
    unified: {
      id: 'access-control',
      description: NAV.unified['access-control'].description,
      group: 'organization',
      order: 4,
      requiresHosted: true,
      requiresEnterprise: true,
      selfHostedOverride: 'accessControl',
      organizationSection: 'access-control',
    },
  },
  {
    label: NAV.unified['audit-logs'].label,
    icon: ClipboardList,
    docsLink: docsUrl('/platform/enterprise/audit-logs'),
    unified: {
      id: 'audit-logs',
      description: NAV.unified['audit-logs'].description,
      group: 'organization',
      order: 5,
      requiresHosted: true,
      requiresEnterprise: true,
      selfHostedOverride: 'auditLogs',
      organizationSection: 'audit-logs',
    },
  },
  {
    label: NAV.unified.forks.label,
    icon: Shuffle,
    docsLink: docsUrl('/platform/enterprise/forks'),
    unified: {
      id: 'forks',
      description: NAV.unified.forks.description,
      group: 'workspace',
      order: 3,
    },
    planes: {
      workspace: { id: 'forks', group: 'enterprise', order: 10 },
    },
  },
  {
    label: NAV.unified.billing.label,
    icon: Credit,
    unified: {
      id: 'billing',
      description: NAV.unified.billing.description,
      group: 'account',
      order: 1,
      hideWhenBillingDisabled: true,
      organizationSection: 'billing',
    },
    planes: {
      account: {
        id: 'billing',
        description: NAV.account.billing.description,
        group: 'account',
        order: 1,
      },
      selfhost: {
        id: 'billing',
        description: NAV.selfhost.billing.description,
        group: 'account',
        order: 1,
      },
    },
  },
  {
    label: NAV.unified.teammates.label,
    icon: Users,
    unified: {
      id: 'teammates',
      description: NAV.unified.teammates.description,
      group: 'workspace',
      order: 0,
    },
    planes: {
      workspace: { id: 'teammates', group: 'workspace', order: 0 },
    },
  },
  {
    label: NAV.unified.organization.label,
    icon: Users,
    unified: {
      id: 'organization',
      description: NAV.unified.organization.description,
      group: 'organization',
      order: 0,
      organizationSection: 'members',
    },
  },
  {
    label: NAV.unified.usage.label,
    icon: ChartColumn,
    unified: {
      id: 'usage',
      description: NAV.unified.usage.description,
      group: 'organization',
      order: 1,
      /**
       * Do not add `hideWhenBillingDisabled`: the sidebar applies it before
       * `selfHostedOverride`, which would hide usage monitoring on self-hosted
       * deployments with billing disabled. Hosted deployments require the plan;
       * self-hosted deployments require the feature flag.
       */
      requiresHosted: true,
      requiresEnterprise: true,
      selfHostedOverride: 'usageMonitoring',
      organizationSection: 'usage',
    },
  },
  {
    label: NAV.unified.models.label,
    icon: BrainCircuit,
    docsLink: docsUrl('/models'),
    unified: {
      id: 'models',
      description: NAV.unified.models.description,
      group: 'organization',
      order: 2,
      requiresHosted: true,
      requiresEnterprise: true,
      selfHostedOverride: 'always',
    },
  },
  {
    label: NAV.unified.connectors.label,
    icon: Connections,
    docsLink: docsUrl('/connectors'),
    unified: {
      id: 'connectors',
      description: NAV.unified.connectors.description,
      group: 'organization',
      order: 3,
      requiresHosted: true,
      requiresEnterprise: true,
      selfHostedOverride: 'always',
    },
  },
  {
    label: NAV.unified.secrets.label,
    icon: Key,
    unified: {
      id: 'secrets',
      description: NAV.unified.secrets.description,
      group: 'workspace',
      order: 1,
    },
    planes: {
      workspace: { id: 'secrets', group: 'workspace', order: 1 },
    },
  },
  {
    label: NAV.unified['connected-accounts'].label,
    icon: GridOffset,
    unified: {
      id: 'connected-accounts',
      description: NAV.unified['connected-accounts'].description,
      group: 'organization',
      order: 1,
      organizationSection: 'connected-accounts',
    },
  },
  {
    label: NAV.unified['custom-tools'].label,
    icon: Wrench,
    unified: {
      id: 'custom-tools',
      description: NAV.unified['custom-tools'].description,
      group: 'workspace',
      order: 3,
    },
    planes: {
      workspace: { id: 'custom-tools', group: 'tools', order: 4 },
    },
  },
  {
    label: NAV.unified.mcp.label,
    icon: McpIcon,
    unified: {
      id: 'mcp',
      description: NAV.unified.mcp.description,
      group: 'workspace',
      order: 2,
    },
    planes: {
      workspace: { id: 'mcp', group: 'tools', order: 5 },
    },
  },
  {
    label: NAV.unified.apikeys.label,
    icon: TerminalWindow,
    unified: {
      id: 'apikeys',
      description: NAV.unified.apikeys.description,
      group: 'workspace',
      order: 7,
    },
    planes: {
      account: {
        id: 'api-keys',
        description: NAV.account['api-keys'].description,
        group: 'developer',
        order: 2,
      },
      workspace: {
        id: 'api-keys',
        description: NAV.workspace['api-keys'].description,
        group: 'system',
        order: 7,
      },
    },
  },
  {
    label: NAV.unified['workflow-mcp-servers'].label,
    icon: Server,
    unified: {
      id: 'workflow-mcp-servers',
      description: NAV.unified['workflow-mcp-servers'].description,
      group: 'workspace',
      order: 6,
    },
    planes: {
      workspace: { id: 'workflow-mcp-servers', group: 'tools', order: 6 },
    },
  },
  {
    label: NAV.unified.byok.label,
    icon: KeySquare,
    unified: {
      id: 'byok',
      description: NAV.unified.byok.description,
      group: 'workspace',
      order: 4,
      requiresHosted: true,
    },
    planes: {
      workspace: { id: 'byok', group: 'workspace', order: 2 },
    },
  },
  {
    label: NAV.unified.sandboxes.label,
    icon: CodeIcon,
    docsLink: docsUrl('/workflows/blocks/function'),
    unified: {
      id: 'sandboxes',
      description: NAV.unified.sandboxes.description,
      group: 'workspace',
      order: 8,
      requiresMax: true,
      selfHostedOverride: 'sandboxes',
      showWhenLocked: true,
    },
    planes: {
      workspace: { id: 'sandboxes', group: 'workspace', order: 3 },
    },
  },
  {
    label: NAV.selfhost['chat-keys'].label,
    icon: HexSimple,
    planes: {
      selfhost: {
        id: 'chat-keys',
        description: NAV.selfhost['chat-keys'].description,
        group: 'developer',
        order: 2,
      },
    },
  },
  {
    label: NAV.unified.inbox.label,
    icon: Send,
    unified: {
      id: 'inbox',
      description: NAV.unified.inbox.description,
      group: 'workspace',
      order: 5,
      requiresMax: true,
      requiresHosted: true,
      selfHostedOverride: 'inbox',
      showWhenLocked: true,
    },
    planes: {
      workspace: { id: 'inbox', group: 'system', order: 8 },
    },
  },
  {
    label: NAV.unified['recently-deleted'].label,
    icon: Trash,
    unified: {
      id: 'recently-deleted',
      description: NAV.unified['recently-deleted'].description,
      group: 'workspace',
      order: 10,
    },
    planes: {
      workspace: { id: 'recently-deleted', group: 'system', order: 9 },
    },
  },
  {
    label: NAV.unified.sso.label,
    icon: LogIn,
    docsLink: docsUrl('/platform/enterprise/sso'),
    unified: {
      id: 'sso',
      description: NAV.unified.sso.description,
      group: 'organization',
      order: 7,
      requiresHosted: true,
      requiresEnterprise: true,
      selfHostedOverride: 'sso',
      organizationSection: 'sso',
    },
  },
  {
    label: NAV.unified.security.label,
    icon: Lock,
    docsLink: docsUrl('/platform/enterprise/security'),
    unified: {
      id: 'security',
      description: NAV.unified.security.description,
      group: 'organization',
      order: 8,
      requiresHosted: true,
      requiresEnterprise: true,
      selfHostedOverride: 'always',
      organizationSection: 'security',
    },
  },
  {
    label: NAV.unified.email.label,
    icon: Mail,
    unified: {
      id: 'email',
      description: NAV.unified.email.description,
      group: 'organization',
      order: 8,
      requiresHosted: true,
      requiresEnterprise: true,
      selfHostedOverride: 'always',
    },
  },
  {
    label: NAV.unified['data-retention'].label,
    icon: Database,
    docsLink: docsUrl('/platform/enterprise/data-retention'),
    unified: {
      id: 'data-retention',
      description: NAV.unified['data-retention'].description,
      group: 'organization',
      order: 9,
      requiresHosted: true,
      requiresEnterprise: true,
      selfHostedOverride: 'dataRetention',
      organizationSection: 'data-retention',
    },
  },
  {
    label: NAV.unified['data-drains'].label,
    icon: Upload,
    docsLink: docsUrl('/platform/enterprise/data-drains'),
    unified: {
      id: 'data-drains',
      description: NAV.unified['data-drains'].description,
      group: 'organization',
      order: 10,
      requiresHosted: true,
      requiresEnterprise: true,
      selfHostedOverride: 'dataDrains',
      organizationSection: 'data-drains',
    },
  },
  {
    label: NAV.unified.whitelabeling.label,
    icon: Palette,
    docsLink: docsUrl('/platform/enterprise/whitelabeling'),
    unified: {
      id: 'whitelabeling',
      description: NAV.unified.whitelabeling.description,
      group: 'organization',
      order: 6,
      requiresHosted: true,
      requiresEnterprise: true,
      selfHostedOverride: 'whitelabeling',
      organizationSection: 'whitelabeling',
    },
  },
  {
    label: NAV.unified['custom-blocks'].label,
    icon: HexSimple,
    docsLink: docsUrl('/platform/enterprise/custom-blocks'),
    unified: {
      id: 'custom-blocks',
      description: NAV.unified['custom-blocks'].description,
      group: 'workspace',
      order: 2,
      requiresHosted: true,
      requiresEnterprise: true,
      allowNonOrgAdmin: true,
      selfHostedOverride: 'customBlocks',
    },
    planes: {
      workspace: { id: 'custom-blocks', group: 'enterprise', order: 11 },
    },
  },
  {
    label: NAV.unified.admin.label,
    icon: Lock,
    unified: {
      id: 'admin',
      description: NAV.unified.admin.description,
      group: 'platform',
      order: 0,
      requiresAdminRole: true,
    },
    planes: {
      account: { id: 'admin', group: 'platform', order: 4 },
    },
  },
  {
    label: NAV.unified.mothership.label,
    icon: Server,
    unified: {
      id: 'mothership',
      description: NAV.unified.mothership.description,
      group: 'platform',
      order: 1,
      requiresAdminRole: true,
    },
    planes: {
      account: { id: 'mothership', group: 'platform', order: 5 },
    },
  },
]

/**
 * Every unified section this build can render, including ones the current deployment
 * does not offer. Deployment filtering (`requiresHosted`, `requiresSelfHosted`, billing)
 * belongs to the sidebar and the section gate, which read the server-resolved shape.
 * Keeping an unavailable section in the catalog is what lets the route treat it as a
 * known segment and redirect to General rather than answer 404.
 */
export function buildUnifiedSettingsCatalog(): UnifiedSettingsNavigationItem[] {
  return SETTINGS_SECTION_REGISTRY.flatMap(({ label, icon, docsLink, unified }) => {
    if (!unified) return []
    const { group, ...item } = unified
    return [
      {
        ...item,
        label,
        messageKey: navMessageKey('unified', item.id),
        icon,
        section: group,
        ...(docsLink ? { docsLink } : {}),
      },
    ]
  })
}

function buildPlaneSettingsItems<Plane extends SettingsPlane>(
  plane: Plane
): SettingsNavigationItem<SettingsPlaneSectionMap[Plane]>[] {
  return SETTINGS_SECTION_REGISTRY.flatMap((entry) => {
    const projection = entry.planes?.[plane]
    return projection ? [{ entry, projection }] : []
  })
    .sort((left, right) => left.projection.order - right.projection.order)
    .map(({ entry, projection }) => {
      // A plane-only section carries no unified projection to inherit from, so
      // its own description is the only source — missing one is a registry bug.
      const description = projection.description ?? entry.unified?.description
      if (!description) {
        throw new Error(`Settings section "${projection.id}" is missing a description`)
      }
      // A plane-specific label or description has its own messages; otherwise the
      // plane shows the unified copy.
      const ownsCopy = !entry.unified || projection.label || projection.description
      return {
        id: projection.id,
        label: projection.label ?? entry.label,
        description,
        messageKey: ownsCopy
          ? navMessageKey(plane, projection.id)
          : navMessageKey('unified', entry.unified?.id ?? projection.id),
        icon: entry.icon,
        group: projection.group,
        ...(entry.docsLink ? { docsLink: entry.docsLink } : {}),
      }
    })
}

export const ACCOUNT_SETTINGS_ITEMS: SettingsNavigationItem<AccountSettingsSection>[] =
  buildPlaneSettingsItems('account')

export const SELFHOST_SETTINGS_ITEMS: SettingsNavigationItem<SelfHostSettingsSection>[] =
  buildPlaneSettingsItems('selfhost')

export const WORKSPACE_SETTINGS_ITEMS: SettingsNavigationItem<WorkspaceSettingsSection>[] =
  buildPlaneSettingsItems('workspace')

/**
 * Unified sections that resolve to organization-plane settings. The workspace
 * settings section page routes these through the organization gate (host
 * organization present + org-admin viewer), so workspace-plane navigation must
 * apply the same requirement before surfacing them.
 */
export const ORGANIZATION_PLANE_UNIFIED_SECTIONS: ReadonlySet<UnifiedSettingsSection> = new Set(
  SETTINGS_SECTION_REGISTRY.flatMap((entry) =>
    entry.unified?.organizationSection && !entry.planes?.workspace ? [entry.unified.id] : []
  )
)

export const ORGANIZATION_SETTINGS_GROUPS = [
  { key: 'account', title: NAV.groups.account },
  { key: 'organization', title: NAV.groups.organization },
  { key: 'governance', title: NAV.groups.governance },
  { key: 'sim-search', title: NAV.groups['sim-search'] },
  { key: 'platform', title: NAV.groups.platform },
] as const

type OrganizationSettingsGroup = (typeof ORGANIZATION_SETTINGS_GROUPS)[number]['key']

/**
 * Every organization section under its sidebar group, in sidebar order. The
 * organization's Subscription sits under Account exactly where the workspace
 * plane keeps it; then what the organization is, how it is governed, and Sim
 * Search. A section added to the union without a row here fails to compile.
 */
const ORGANIZATION_SECTION_GROUPS: Record<OrganizationSettingsSection, OrganizationSettingsGroup> =
  {
    billing: 'account',
    'knowledge-graphs': 'account',
    members: 'organization',
    'connected-accounts': 'organization',
    usage: 'organization',
    whitelabeling: 'organization',
    'recently-deleted': 'organization',
    requests: 'organization',
    'audit-logs': 'governance',
    'access-control': 'governance',
    sso: 'governance',
    security: 'governance',
    'data-retention': 'governance',
    'data-drains': 'governance',
    integrations: 'sim-search',
    'search-mcp': 'sim-search',
    'search-slack': 'sim-search',
  }

export const ORGANIZATION_SETTINGS_ITEMS: SettingsNavigationItem<OrganizationSettingsSection>[] = (
  Object.keys(ORGANIZATION_SECTION_GROUPS) as OrganizationSettingsSection[]
).map((id) => {
  const group = ORGANIZATION_SECTION_GROUPS[id]
  if (id === 'knowledge-graphs') {
    return {
      id,
      label: NAV.organization['knowledge-graphs'].label,
      description: NAV.organization['knowledge-graphs'].description,
      messageKey: navMessageKey('organization', id),
      icon: Database,
      group,
    }
  }
  if (id === 'recently-deleted') {
    return {
      id,
      label: NAV.organization['recently-deleted'].label,
      description: NAV.organization['recently-deleted'].description,
      messageKey: navMessageKey('organization', id),
      icon: Trash,
      group,
    }
  }
  if (id === 'connected-accounts') {
    return {
      id,
      label: NAV.unified['connected-accounts'].label,
      description: NAV.unified['connected-accounts'].description,
      messageKey: navMessageKey('unified', 'connected-accounts'),
      icon: GridOffset,
      group,
    }
  }
  if (id === 'integrations') {
    return {
      id,
      label: NAV.organization.integrations.label,
      description: '',
      messageKey: navMessageKey('organization', id),
      icon: Integration,
      group,
    }
  }
  if (id === 'search-mcp') {
    return {
      id,
      label: NAV.organization['search-mcp'].label,
      description: NAV.organization['search-mcp'].description,
      messageKey: navMessageKey('organization', id),
      docsLink: docsUrl('/search/mcp'),
      icon: Server,
      group,
    }
  }
  if (id === 'search-slack') {
    return {
      id,
      label: NAV.organization['search-slack'].label,
      description: NAV.organization['search-slack'].description,
      messageKey: navMessageKey('organization', id),
      icon: SlackIcon,
      group,
    }
  }
  const item = buildUnifiedSettingsCatalog().find((entry) => entry.organizationSection === id)
  if (!item) throw new Error(`Organization settings section "${id}" has no registry entry`)
  return { ...item, id, group }
})

export function getOrganizationSettingsHref(
  organizationId: string,
  section: OrganizationSettingsSection,
  searchParams?: SettingsHrefSearchParams
): string {
  return withSettingsSearchParams(
    organizationRoutes(organizationId).settingsSection(section),
    searchParams
  )
}

/**
 * Unified section id to the organization-scoped section it acts on, for the gates
 * that take an {@link OrganizationSettingsSection} (`canOpenOrganizationSettingsSection`,
 * `isOrganizationSettingsSectionAvailable`).
 *
 * Derived from the registry rather than hand-listed: a section added to one and
 * forgotten in the other used to mean the page applied *no* organization gate at
 * all, since an unmapped section reads as "not organization-scoped".
 */
export const UNIFIED_TO_ORGANIZATION_SECTION: Readonly<
  Partial<Record<UnifiedSettingsSection, OrganizationSettingsSection>>
> = Object.fromEntries(
  SETTINGS_SECTION_REGISTRY.flatMap((entry) =>
    entry.unified?.organizationSection && !entry.planes?.workspace
      ? [[entry.unified.id, entry.unified.organizationSection] as const]
      : []
  )
)

export const UNIFIED_TO_WORKSPACE_SECTION: Readonly<
  Partial<Record<UnifiedSettingsSection, WorkspaceSettingsSection>>
> = Object.fromEntries(
  SETTINGS_SECTION_REGISTRY.flatMap((entry) => {
    const unifiedSection = entry.unified?.id
    const workspaceSection = entry.planes?.workspace?.id
    return unifiedSection && workspaceSection ? [[unifiedSection, workspaceSection] as const] : []
  })
)

export type OrganizationSectionAccess = 'unavailable' | 'view' | 'manage'

interface ResolveOrganizationSectionAccessOptions {
  section: OrganizationSettingsSection
  isTargetOrganizationMember: boolean
  isTargetOrganizationAdmin: boolean
}

export function resolveOrganizationSectionAccess({
  section,
  isTargetOrganizationMember,
  isTargetOrganizationAdmin,
}: ResolveOrganizationSectionAccessOptions): OrganizationSectionAccess {
  if (!isTargetOrganizationMember) return 'unavailable'
  if (section === 'search-mcp' || section === 'recently-deleted' || section === 'knowledge-graphs')
    return 'view'
  if (section === 'members' || section === 'requests')
    return isTargetOrganizationAdmin ? 'manage' : 'view'
  return isTargetOrganizationAdmin ? 'manage' : 'unavailable'
}

export interface OrganizationSettingsFeatures {
  billingEnabled: boolean
  hasEnterprisePlan: boolean
  /**
   * Whether the organization's permission-group regime is in force, which outlives the plan gate
   * through a failing payment — see `isOrganizationGovernanceActive`. Only Access Control reads
   * it, because only that section edits something that keeps applying while the gate is closed.
   */
  governanceActive: boolean
  hosted: boolean
  selfHosted: Partial<Record<OrganizationSettingsSection, boolean>>
}

export function getOrganizationSettingsFeatures(
  hasEnterprisePlan: boolean,
  deployment: DeploymentShape,
  /** Defaults to the plan gate, so a caller with no reason to distinguish the two keeps its behavior. */
  governanceActive: boolean = hasEnterprisePlan
): OrganizationSettingsFeatures {
  const { features } = deployment
  return {
    billingEnabled: deployment.billingEnabled,
    hasEnterprisePlan,
    governanceActive,
    hosted: deployment.hosted,
    selfHosted: {
      'connected-accounts': true,
      'access-control': features.accessControl,
      'audit-logs': features.auditLogs,
      sso: features.sso,
      security: true,
      'data-retention': features.dataRetention,
      'data-drains': features.dataDrains,
      usage: features.usageMonitoring,
      whitelabeling: features.whitelabeling,
    },
  }
}

/**
 * Applies deployment and target-organization plan gates without consulting the
 * viewer's active organization.
 */
export function isOrganizationSettingsSectionAvailable(
  section: OrganizationSettingsSection,
  features: OrganizationSettingsFeatures
): boolean {
  if (
    section === 'members' ||
    section === 'search-mcp' ||
    section === 'knowledge-graphs' ||
    section === 'recently-deleted' ||
    section === 'requests'
  )
    return true
  if (section === 'billing') return features.billingEnabled
  /* Sim Search itself is enterprise on the hosted product; self-hosted gates it by flag, not by section. */
  if (section === 'integrations' || section === 'search-slack')
    return !features.hosted || features.hasEnterprisePlan
  /**
   * Access Control follows governance rather than the plan gate: its restrictions keep applying
   * through a failing payment, so hiding the page that edits them would leave an organization
   * governed by rules it cannot see or loosen until the invoice clears.
   */
  if (section === 'access-control' && features.hosted) return features.governanceActive
  if (features.hosted) return features.hasEnterprisePlan
  return features.selfHosted[section] ?? false
}

export interface WorkspacePermissionConfig {
  hideSecretsTab?: boolean
  hideApiKeysTab?: boolean
  hideInboxTab?: boolean
  disableMcpTools?: boolean
  disableCustomTools?: boolean
  hideSandboxesTab?: boolean
}

export const WORKSPACE_PERMISSION_CONFIG_KEYS: Partial<
  Record<WorkspaceSettingsSection, keyof WorkspacePermissionConfig>
> = {
  secrets: 'hideSecretsTab',
  'api-keys': 'hideApiKeysTab',
  inbox: 'hideInboxTab',
  mcp: 'disableMcpTools',
  'custom-tools': 'disableCustomTools',
  sandboxes: 'hideSandboxesTab',
}

export function workspaceSectionUsesPermissionConfig(section: WorkspaceSettingsSection): boolean {
  return WORKSPACE_PERMISSION_CONFIG_KEYS[section] !== undefined
}

export function getSettingsPermissionConfigKey(section: UnifiedSettingsSection) {
  const workspaceSection = UNIFIED_TO_WORKSPACE_SECTION[section]
  return workspaceSection ? WORKSPACE_PERMISSION_CONFIG_KEYS[workspaceSection] : undefined
}

export interface WorkspaceSettingsEntitlements {
  customBlocks: boolean
  forks: boolean
  inbox: boolean
  sandboxes: boolean
}

/**
 * Sections that stay visible without their entitlement, rendering a locked
 * upgrade prompt instead of disappearing from the nav. Keyed by the entitlement
 * that unlocks them, so adding a gated section is one entry rather than another
 * hardcoded id check in {@link resolveWorkspaceNavigation}.
 */
const LOCKABLE_WORKSPACE_SECTIONS: Partial<
  Record<WorkspaceSettingsSection, keyof WorkspaceSettingsEntitlements>
> = {
  inbox: 'inbox',
  sandboxes: 'sandboxes',
}

interface ResolveWorkspaceNavigationOptions {
  permission: PermissionType
  permissionConfig: WorkspacePermissionConfig
  entitlements: WorkspaceSettingsEntitlements
  /** Resolves the catalog's deployment gates the same way the sidebar does. */
  deployment: DeploymentShape
}

/**
 * Unified projection of each workspace-plane section, so the route gate reads the
 * deployment requirements (`requiresHosted`, `requiresSelfHosted`, `selfHostedOverride`)
 * from the same catalog entry the sidebar filters on. Nav and server then agree: a
 * section is reachable exactly when it is listed.
 */
const WORKSPACE_UNIFIED_PROJECTIONS: Readonly<
  Partial<Record<WorkspaceSettingsSection, UnifiedSettingsProjection>>
> = Object.fromEntries(
  SETTINGS_SECTION_REGISTRY.flatMap((entry) => {
    const workspaceSection = entry.planes?.workspace?.id
    return workspaceSection && entry.unified ? [[workspaceSection, entry.unified] as const] : []
  })
)

/**
 * Whether the deployment itself offers a workspace section, before viewer permission
 * and plan entitlement are considered. Mirrors the sidebar's deployment pass.
 */
function isWorkspaceSectionOfferedByDeployment(
  section: WorkspaceSettingsSection,
  deployment: DeploymentShape
): boolean {
  const unified = WORKSPACE_UNIFIED_PROJECTIONS[section]
  if (!unified) return true
  if (unified.requiresSelfHosted && deployment.hosted) return false
  if (unified.requiresHosted && !deployment.hosted) {
    return isSelfHostedOverrideEnabled(unified.selfHostedOverride, deployment)
  }
  return true
}

export interface ResolvedWorkspaceNavigationItem
  extends SettingsNavigationItem<WorkspaceSettingsSection> {
  canMutate: boolean
  locked: boolean
}

const WORKSPACE_MUTATION_PERMISSION: Record<WorkspaceSettingsSection, PermissionType> = {
  requests: 'read',
  teammates: 'admin',
  secrets: 'write',
  byok: 'admin',
  sandboxes: 'admin',
  'custom-tools': 'write',
  mcp: 'write',
  'workflow-mcp-servers': 'write',
  'api-keys': 'admin',
  inbox: 'admin',
  'recently-deleted': 'write',
  forks: 'admin',
  'custom-blocks': 'admin',
}

export interface WorkspaceMutationCapabilities {
  canAdmin: boolean
  canEdit: boolean
}

export function canMutateWorkspaceSettingsSection(
  section: WorkspaceSettingsSection,
  capabilities: WorkspaceMutationCapabilities
): boolean {
  const permission = WORKSPACE_MUTATION_PERMISSION[section]
  if (permission === 'read') return true
  return permission === 'admin' ? capabilities.canAdmin : capabilities.canEdit
}

export function resolveWorkspaceNavigation({
  permission,
  permissionConfig,
  entitlements,
  deployment,
}: ResolveWorkspaceNavigationOptions): ResolvedWorkspaceNavigationItem[] {
  return WORKSPACE_SETTINGS_ITEMS.flatMap((item) => {
    if (!isWorkspaceSectionOfferedByDeployment(item.id, deployment)) return []
    const permissionConfigKey = WORKSPACE_PERMISSION_CONFIG_KEYS[item.id]
    if (permissionConfigKey && permissionConfig[permissionConfigKey]) return []
    if (item.id === 'forks' && (permission !== 'admin' || !entitlements.forks)) return []
    if (item.id === 'custom-blocks' && !entitlements.customBlocks) return []

    const lockedBy = LOCKABLE_WORKSPACE_SECTIONS[item.id]
    const locked = lockedBy !== undefined && !entitlements[lockedBy]
    const canMutate =
      !locked &&
      canMutateWorkspaceSettingsSection(item.id, {
        canEdit: permissionSatisfies(permission, 'write'),
        canAdmin: permissionSatisfies(permission, 'admin'),
      })

    return [{ ...item, canMutate, locked }]
  })
}

/**
 * Adapts a navigation entry to the header shell's static identity.
 *
 * The catalog calls it `label` because it names a sidebar row; the shell calls it `title`
 * because it renders a heading. One adapter keeps every plane's shell fed from the catalog
 * instead of each one restating the mapping.
 */
export function toSettingsHeaderMeta(
  item: Pick<SettingsNavigationItem, 'label' | 'description' | 'docsLink'> &
    Partial<Pick<SettingsNavigationItem, 'messageKey'>>
): SettingsHeaderMeta {
  return {
    title: item.label,
    description: item.description,
    docsLink: item.docsLink,
    ...(item.messageKey ? { messageKey: item.messageKey } : {}),
  }
}

export function getSettingsSectionMeta(
  plane: SettingsPlane,
  section: string
): Pick<SettingsNavigationItem, 'label' | 'description' | 'docsLink' | 'messageKey'> | null {
  const catalog =
    plane === 'account'
      ? ACCOUNT_SETTINGS_ITEMS
      : plane === 'selfhost'
        ? SELFHOST_SETTINGS_ITEMS
        : WORKSPACE_SETTINGS_ITEMS
  const item = catalog.find((candidate) => candidate.id === section)
  return item
    ? {
        label: item.label,
        description: item.description,
        docsLink: item.docsLink,
        messageKey: item.messageKey,
      }
    : null
}
