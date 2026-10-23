import { getEmailTranslator } from '@/components/emails/i18n'
import type { UpgradeReason } from '@/lib/billing/upgrade-reasons'
import { getBrandConfig } from '@/ee/whitelabeling'

/** Email subject type for all supported email templates */
export type EmailSubjectType =
  | 'sign-in'
  | 'email-verification'
  | 'change-email'
  | 'forget-password'
  | 'reset-password'
  | 'existing-account'
  | 'invitation'
  | 'enterprise-owner-invitation'
  | 'batch-invitation'
  | 'workspace-added'
  | 'permission-access-request-created'
  | 'permission-access-request-decided'
  | 'enterprise-subscription'
  | 'usage-threshold'
  | 'free-tier-upgrade'
  | 'payment-failed'
  | 'credit-purchase'
  | 'abandoned-checkout'
  | 'free-tier-exhausted'
  | 'schedule-disabled'
  | 'subprocessor-change'
  | 'onboarding-followup'
  | 'welcome'

const SUBJECT_KEYS: Record<EmailSubjectType, string> = {
  'sign-in': 'signIn',
  'email-verification': 'emailVerification',
  'change-email': 'changeEmail',
  'forget-password': 'resetPassword',
  'reset-password': 'resetPassword',
  'existing-account': 'existingAccount',
  invitation: 'invitation',
  'enterprise-owner-invitation': 'enterpriseOwnerInvitation',
  'batch-invitation': 'batchInvitation',
  'workspace-added': 'workspaceAdded',
  'permission-access-request-created': 'permissionAccessRequestCreated',
  'permission-access-request-decided': 'permissionAccessRequestDecided',
  'enterprise-subscription': 'enterpriseSubscription',
  'usage-threshold': 'usageThreshold',
  'free-tier-upgrade': 'freeTierUpgrade',
  'payment-failed': 'paymentFailed',
  'credit-purchase': 'creditPurchase',
  'abandoned-checkout': 'abandonedCheckout',
  'free-tier-exhausted': 'freeTierExhausted',
  'schedule-disabled': 'scheduleDisabled',
  'subprocessor-change': 'subprocessorChange',
  'onboarding-followup': 'onboardingFollowup',
  welcome: 'welcome',
}

/**
 * Returns the email subject line for a given email type, in the email language.
 * @param type - The type of email being sent
 * @returns The subject line for the email
 */
export function getEmailSubject(type: EmailSubjectType): string {
  const brandName = getBrandConfig().name
  const key = SUBJECT_KEYS[type]
  return key ? getEmailTranslator()(`subjects.${key}`, { brandName }) : brandName
}

/** Subject of a workspace invitation, naming the workspace when there is only one. */
export function getWorkspaceInvitationSubject(workspaceNames: string[]): string {
  const brandName = getBrandConfig().name
  const t = getEmailTranslator()
  return workspaceNames.length === 1
    ? t('subjects.workspaceInvitationSingle', { workspaceName: workspaceNames[0], brandName })
    : t('subjects.workspaceInvitationMultiple', { count: workspaceNames.length, brandName })
}

/**
 * Subject line for a per-category usage-limit email. Shares its wording with
 * the email body so the subject matches what the recipient reads.
 */
export function getLimitEmailSubject(reason: UpgradeReason, kind: 'warning' | 'reached'): string {
  const t = getEmailTranslator()
  const subject = t(
    `limitThreshold.reasons.${reason}.${kind === 'reached' ? 'reachedSubject' : 'warningSubject'}`
  )
  return t('subjects.limit', { subject, brandName: getBrandConfig().name })
}

/** The plan's display name is resolved at send time; it carries tier qualifiers. */
export function getPlanWelcomeSubject(planDisplayName: string): string {
  return getEmailTranslator()('subjects.planWelcome', {
    planName: planDisplayName,
    brandName: getBrandConfig().name,
  })
}

/** Echoes the sender's own subject line so the reply threads correctly. */
export function getRequestConfirmationSubject(userSubject: string, requestType?: string): string {
  const t = getEmailTranslator()
  return requestType
    ? t('subjects.requestConfirmationTyped', { requestType, userSubject })
    : t('subjects.requestConfirmation', { userSubject })
}

/** Names the resource being unlocked rather than the brand — that is what the recipient opened. */
export function getOtpSubject(resourceLabel: string): string {
  return getEmailTranslator()('subjects.otp', { resourceLabel })
}

/** Verification code subject for a password-free shared file. */
export function getSharedFileOtpSubject(): string {
  const t = getEmailTranslator()
  return t('subjects.otp', { resourceLabel: t('subjects.sharedFile') })
}

/**
 * Names the workspace so an external recipient can identify the request, and the
 * inviter when there is one — a workflow-issued invitation has no person to name.
 */
export function getCredentialGroupInvitationSubject(
  inviterName: string | undefined,
  workspaceName: string
): string {
  const t = getEmailTranslator()
  const brandName = getBrandConfig().name
  return inviterName
    ? t('subjects.credentialGroupInvitationFrom', { inviterName, workspaceName, brandName })
    : t('subjects.credentialGroupInvitation', { workspaceName, brandName })
}
