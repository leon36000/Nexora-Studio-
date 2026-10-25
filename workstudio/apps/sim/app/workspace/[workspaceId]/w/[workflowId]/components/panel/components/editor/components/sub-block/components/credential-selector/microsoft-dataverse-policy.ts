import {
  classifyMicrosoftDataverseCredentialEnvironment,
  getMicrosoftDataverseRequiredScope,
  MICROSOFT_DATAVERSE_PROVIDER_ID,
  type MicrosoftDataverseCredentialEnvironmentState,
  normalizeMicrosoftDataverseEnvironmentUrl,
} from '@/lib/oauth/microsoft-dataverse'

interface ResolveMicrosoftDataverseCredentialPolicyParams {
  dependsOn: readonly string[]
  environmentUrl: unknown
  hasSelectedCredential: boolean
  providerId: string
  selectedCredentialScopes?: readonly string[]
}

type MicrosoftDataverseActionLabelKey = 'updateAccess' | 'connectMatchingAccount'

type MicrosoftDataverseMessageKey =
  | 'additionalPermissionsRequired'
  | 'invalidEnvironment'
  | 'credentialNotConnectedToEnvironment'

export interface MicrosoftDataverseCredentialPolicy {
  /** English action label; the UI renders `actionLabelKey` through next-intl. */
  actionLabel: string
  actionLabelKey: MicrosoftDataverseActionLabelKey
  applies: boolean
  bindingState: MicrosoftDataverseCredentialEnvironmentState | null
  environmentUrl?: string
  hasInvalidEnvironment: boolean
  messageKey: MicrosoftDataverseMessageKey
  requiredScopes: string[]
  requiresSeparateCredential: boolean
}

const DEFAULT_POLICY: MicrosoftDataverseCredentialPolicy = {
  actionLabel: 'Update access', // i18n-ignore: not displayed, the UI renders actionLabelKey
  actionLabelKey: 'updateAccess',
  applies: false,
  bindingState: null,
  hasInvalidEnvironment: false,
  messageKey: 'additionalPermissionsRequired',
  requiredScopes: [],
  requiresSeparateCredential: false,
}

export function resolveMicrosoftDataverseCredentialPolicy({
  dependsOn,
  environmentUrl,
  hasSelectedCredential,
  providerId,
  selectedCredentialScopes,
}: ResolveMicrosoftDataverseCredentialPolicyParams): MicrosoftDataverseCredentialPolicy {
  const applies =
    providerId === MICROSOFT_DATAVERSE_PROVIDER_ID && dependsOn.includes('environmentUrl')
  if (!applies) return DEFAULT_POLICY

  let normalizedEnvironmentUrl: string
  try {
    normalizedEnvironmentUrl = normalizeMicrosoftDataverseEnvironmentUrl(environmentUrl)
  } catch {
    return {
      ...DEFAULT_POLICY,
      applies: true,
      bindingState: hasSelectedCredential ? 'invalid' : null,
      hasInvalidEnvironment: true,
      messageKey: 'invalidEnvironment',
    }
  }

  const requiredScopes = [getMicrosoftDataverseRequiredScope(normalizedEnvironmentUrl)]
  const bindingState = hasSelectedCredential
    ? classifyMicrosoftDataverseCredentialEnvironment(
        selectedCredentialScopes,
        normalizedEnvironmentUrl
      )
    : null
  const requiresSeparateCredential =
    bindingState === 'unbound' || bindingState === 'different' || bindingState === 'invalid'

  return {
    actionLabel: requiresSeparateCredential ? 'Connect matching account' : 'Update access',
    actionLabelKey: requiresSeparateCredential ? 'connectMatchingAccount' : 'updateAccess',
    applies: true,
    bindingState,
    environmentUrl: normalizedEnvironmentUrl,
    hasInvalidEnvironment: false,
    messageKey: requiresSeparateCredential
      ? 'credentialNotConnectedToEnvironment'
      : 'additionalPermissionsRequired',
    requiredScopes,
    requiresSeparateCredential,
  }
}
