// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import { createContext, type ReactNode, useContext, useMemo } from 'react'
import type { BrandConfig, OrganizationWhitelabelSettings } from '@/lib/branding/types'
import { getBrandConfig, mergeOrgBrandConfig } from '@/ee/whitelabeling'

const BrandContext = createContext<BrandConfig | null>(null)

interface BrandingProviderProps {
  children?: ReactNode
  hostOrganizationId?: string | null
  viewerIsHostOrganizationMember?: boolean
  initialOrgSettings?: OrganizationWhitelabelSettings | null
}

export function BrandingProvider({ children, initialOrgSettings }: BrandingProviderProps) {
  const brand = useMemo(
    () => mergeOrgBrandConfig(initialOrgSettings ?? null, getBrandConfig()),
    [initialOrgSettings]
  )
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export function useOrgBrandConfig(): BrandConfig {
  return useContext(BrandContext) ?? getBrandConfig()
}
