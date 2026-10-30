'use client'

import { createContext, type ReactNode, useContext } from 'react'

export interface WorkspaceFeatureFlags {
  dashboards: boolean
  'workflow-tests': boolean
  changelog: boolean
  'mothership-model-selector': boolean
  'mothership-plan-mode': boolean
  'mothership-computer-use'?: boolean
  'mothership-memory-spaces'?: boolean
  projects?: boolean
  /** Nexora edition: the deployment offers only the models Nexora API serves. */
  'nexora-only-models'?: boolean
}

const FeatureFlagsContext = createContext<WorkspaceFeatureFlags | null>(null)

interface FeatureFlagsProviderProps {
  children: ReactNode
  flags: WorkspaceFeatureFlags
}

/** Makes server-resolved runtime flags available to workspace client surfaces. */
export function FeatureFlagsProvider({ children, flags }: FeatureFlagsProviderProps) {
  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>
}

/** Reads one server-resolved runtime flag without exposing AppConfig to the browser. */
export function useFeatureFlag(name: keyof WorkspaceFeatureFlags): boolean {
  const flags = useContext(FeatureFlagsContext)
  if (!flags) throw new Error('useFeatureFlag must be used within FeatureFlagsProvider')
  return flags[name] ?? false
}

/** Like {@link useFeatureFlag}, but `false` outside a provider (surfaces that mount without the workspace layout). */
export function useOptionalFeatureFlag(name: keyof WorkspaceFeatureFlags): boolean {
  return useContext(FeatureFlagsContext)?.[name] ?? false
}
