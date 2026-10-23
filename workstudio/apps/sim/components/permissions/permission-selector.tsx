'use client'

import React from 'react'
import { ChipButtonGroup, ChipButtonGroupItem, cn } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { PermissionType } from '@/lib/workspaces/permissions/utils'

export type { PermissionType }

type SelectorSize = 'default' | 'compact'

interface PermissionSelectorProps {
  value: PermissionType
  onChange: (value: PermissionType) => void
  disabled?: boolean
  className?: string
  size?: SelectorSize
}

export const PermissionSelector = React.memo<PermissionSelectorProps>(
  ({ value, onChange, disabled = false, className, size = 'default' }) => {
    const t = useTranslations('settings.permissions.selector')
    const itemClass = size === 'compact' ? 'min-w-[38px]' : undefined
    return (
      <ChipButtonGroup
        size={size}
        value={value}
        onValueChange={(val) => onChange(val as PermissionType)}
        disabled={disabled}
        className={cn(disabled && 'cursor-not-allowed', className)}
      >
        <ChipButtonGroupItem value='read' className={itemClass} title={t('readTitle')}>
          {t('read')}
        </ChipButtonGroupItem>
        <ChipButtonGroupItem value='write' className={itemClass} title={t('writeTitle')}>
          {t('write')}
        </ChipButtonGroupItem>
        <ChipButtonGroupItem value='admin' className={itemClass} title={t('adminTitle')}>
          {t('admin')}
        </ChipButtonGroupItem>
      </ChipButtonGroup>
    )
  }
)
PermissionSelector.displayName = 'PermissionSelector'

export type OrgRole = 'admin' | 'member'

interface OrgRoleSelectorProps {
  value: OrgRole
  onChange: (value: OrgRole) => void
  disabled?: boolean
  className?: string
  size?: SelectorSize
}

export const OrgRoleSelector = React.memo<OrgRoleSelectorProps>(
  ({ value, onChange, disabled = false, className, size = 'compact' }) => {
    const t = useTranslations('settings.permissions.selector')
    const itemClass = size === 'compact' ? 'min-w-[58px]' : undefined
    return (
      <ChipButtonGroup
        size={size}
        value={value}
        onValueChange={(val) => onChange(val as OrgRole)}
        disabled={disabled}
        className={cn(disabled && 'cursor-not-allowed', className)}
      >
        <ChipButtonGroupItem value='member' className={itemClass} title={t('memberTitle')}>
          {t('member')}
        </ChipButtonGroupItem>
        <ChipButtonGroupItem value='admin' className={itemClass} title={t('orgAdminTitle')}>
          {t('admin')}
        </ChipButtonGroupItem>
      </ChipButtonGroup>
    )
  }
)
OrgRoleSelector.displayName = 'OrgRoleSelector'
