/**
 * Upgrade-reason registry.
 *
 * The header shown when a user is routed to the upgrade page after hitting a
 * usage limit, and where that route points. The threshold/limit emails carry
 * their own wording in the `emails` messages (`limitThreshold.reasons`).
 */
import { getNexoraSiteUrl, nexoraSiteLinks } from '@/lib/nexora/site-links'

/** The limit categories that can route a user to the upgrade page. */
export const UPGRADE_REASONS = ['credits', 'storage', 'tables', 'seats'] as const

export type UpgradeReason = (typeof UPGRADE_REASONS)[number]

/** URL query key the upgrade page reads to resolve the reason. */
export const UPGRADE_REASON_PARAM = 'reason' as const

/** Header shown on the upgrade page when no (or an invalid) reason is present. */
export const DEFAULT_UPGRADE_HEADER = 'Plans that scale with you' as const

interface UpgradeReasonCopy {
  /** Upgrade-page `<h1>` header. */
  header: string
}

/** Per-reason copy. Headers follow the "Upgrade to scale ..." pattern. */
export const UPGRADE_REASON_COPY: Record<UpgradeReason, UpgradeReasonCopy> = {
  credits: {
    header: 'Upgrade to scale your usage',
  },
  storage: {
    header: 'Upgrade to scale your storage',
  },
  tables: {
    header: 'Upgrade to scale your tables',
  },
  seats: {
    header: 'Upgrade to scale with your teammates',
  },
}

/** Type guard for a raw query value against the known reasons. */
export function isUpgradeReason(value: string | null | undefined): value is UpgradeReason {
  return value != null && (UPGRADE_REASONS as readonly string[]).includes(value)
}

/**
 * Build a link to the workspace upgrade page, optionally tagged with the reason
 * that sent the user there so the page can swap its header.
 */
export function buildUpgradeHref(workspaceId: string, reason?: UpgradeReason): string {
  const base = `/workspace/${workspaceId}/upgrade`
  return reason ? `${base}?${UPGRADE_REASON_PARAM}=${reason}` : base
}

/**
 * Where a person raises a limit or tops up. Nexora edition: plan, wallet and limits live on the
 * Nexora AI site (the account's billing page); without the site an instance stays on itself.
 */
export function buildHostedUpgradeUrl(_reason?: UpgradeReason): string {
  return nexoraSiteLinks(getNexoraSiteUrl(), 'fr')?.billing ?? '/'
}

/** The billing page for raising a usage limit, see {@link buildHostedUpgradeUrl}. */
export function hostedBillingSettingsUrl(): string {
  return buildHostedUpgradeUrl()
}
