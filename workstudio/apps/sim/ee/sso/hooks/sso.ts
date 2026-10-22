// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import { nexoraKey } from '@/ee/_nexora/disabled'

export const ssoKeys = {
  all: nexoraKey('sso'),
  providerList: (organizationId?: string) => nexoraKey('sso', 'providers', organizationId ?? null),
}

interface SsoProviderSummary {
  id?: string
  providerId?: string
  userId?: string
  organizationId?: string | null
  domain?: string
}

/** SSO is disabled: the provider list is always empty and never loading. */
export function useSSOProviders(_options?: { enabled?: boolean; organizationId?: string }) {
  return {
    data: { providers: [] as SsoProviderSummary[] } as
      | { providers: SsoProviderSummary[] }
      | undefined,
    isLoading: false,
    isFetching: false,
    isSuccess: true,
    error: null as Error | null,
    refetch: async () => undefined,
  }
}
