'use client'

import { createContext, type ReactNode, type Ref, useContext } from 'react'
import {
  getSettingsSectionMeta,
  type SettingsNavMessageKey,
  type SettingsPlane,
} from '@/components/settings/navigation'
import {
  type SettingsAction,
  type SettingsBackAction,
  type SettingsHeaderSearch,
  useSettingsHeader,
} from '@/components/settings/settings-header'
import { useSettingsNavCopy } from '@/components/settings/use-settings-nav-copy'

interface SettingsSectionContextValue {
  plane?: SettingsPlane
  section: string
  meta?: {
    label: string
    description: string
    docsLink?: string
    /** Localizes `label` / `description`; absent for metadata that is already final copy. */
    messageKey?: SettingsNavMessageKey
  }
}

const SettingsSectionContext = createContext<SettingsSectionContextValue | null>(null)

interface SettingsSectionProviderProps extends SettingsSectionContextValue {
  children: ReactNode
}

export function SettingsSectionProvider({
  plane,
  section,
  meta,
  children,
}: SettingsSectionProviderProps) {
  return (
    <SettingsSectionContext.Provider value={{ plane, section, meta }}>
      {children}
    </SettingsSectionContext.Provider>
  )
}

interface SettingsPanelBaseProps {
  children?: ReactNode
  actions?: SettingsAction[]
  search?: SettingsHeaderSearch
  docsLink?: string
  scrollContainerRef?: Ref<HTMLDivElement>
}

type SettingsPanelProps = SettingsPanelBaseProps &
  (
    | {
        back: SettingsBackAction
        title?: string
        description?: string
      }
    | {
        back?: undefined
        title?: never
        description?: never
      }
  )

export function SettingsPanel({
  children,
  actions,
  back,
  search,
  title,
  description,
  docsLink,
  scrollContainerRef,
}: SettingsPanelProps) {
  const context = useContext(SettingsSectionContext)
  const navCopy = useSettingsNavCopy()
  const meta =
    context?.meta ??
    (context?.plane ? getSettingsSectionMeta(context.plane, context.section) : null)
  const metaLabel = meta?.messageKey ? navCopy.label({ messageKey: meta.messageKey }) : meta?.label
  const metaDescription = meta?.messageKey
    ? navCopy.description({ messageKey: meta.messageKey, description: meta.description })
    : meta?.description

  useSettingsHeader({
    title: title ?? metaLabel,
    description: title !== undefined ? description : (description ?? metaDescription),
    docsLink: docsLink ?? meta?.docsLink,
    back,
    actions,
    search,
    scrollContainerRef,
  })

  return <>{children}</>
}
