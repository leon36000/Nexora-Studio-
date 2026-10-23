// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

'use client'

import { type ReactNode, useState } from 'react'
import { Badge, Skeleton } from '@sim/emcn'
import { Plus } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { useQueryState } from 'nuqs'
import {
  accessGroupIdParam,
  accessGroupIdUrlKeys,
} from '@/app/workspace/[workspaceId]/settings/[section]/search-params'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import {
  RESOURCE_LIST_STACK,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import { AccessGroupDetail } from '@/ee/access-control/components/access-group-detail'
import { CreateAccessGroupModal } from '@/ee/access-control/components/create-access-group-modal'
import {
  type PermissionGroup,
  usePermissionGroups,
} from '@/ee/access-control/hooks/permission-groups'

const SKELETON_ROWS = [0, 1, 2] as const

interface Props {
  organizationId: string
  isOrganizationAdmin: boolean
  requestsHref: string
}

/**
 * Réglages › Groupes d'accès (Nexora edition): groups of members and what they may do, over the
 * core permission-group engine, which refuses withheld actions on the server. A group targets
 * chosen workspaces, or every workspace as the organization's default group.
 */
export function AccessControl({ organizationId, isOrganizationAdmin }: Props) {
  const t = useTranslations('settings.accessGroups')
  const { data, error, isLoading, isFetching, refetch } = usePermissionGroups(organizationId)
  const [selectedId, setSelectedId] = useQueryState(accessGroupIdParam.key, {
    ...accessGroupIdParam.parser,
    ...accessGroupIdUrlKeys,
  })
  const [createOpen, setCreateOpen] = useState(false)

  if (!isOrganizationAdmin) {
    return (
      <SettingsPanel>
        <SettingsEmptyState>{t('adminsOnly')}</SettingsEmptyState>
      </SettingsPanel>
    )
  }

  const selected = selectedId ? data?.find((group) => group.id === selectedId) : undefined
  if (selected) {
    return (
      <AccessGroupDetail
        key={`${selected.id}:${selected.updatedAt}`}
        organizationId={organizationId}
        group={selected}
        onClose={() => void setSelectedId(null, { history: 'replace' })}
      />
    )
  }

  const describe = (group: PermissionGroup) => {
    const scope = group.isDefault
      ? t('list.allWorkspaces')
      : t('list.workspaces', { count: group.workspaces.length })
    const members = group.isDefault
      ? t('list.everyoneElse')
      : group.memberCount === 0
        ? t('list.everyoneInWorkspaces')
        : t('list.members', { count: group.memberCount })
    return `${scope} · ${members}`
  }

  let body: ReactNode
  if (isLoading) {
    body = (
      <div className={RESOURCE_LIST_STACK}>
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className='h-[52px] w-full rounded-lg' />
        ))}
      </div>
    )
  } else if (!data) {
    body = (
      <SettingsQueryErrorState
        error={error}
        fallback={t('loadError')}
        isRetrying={isFetching}
        onRetry={() => void refetch()}
      />
    )
  } else if (data.length === 0) {
    body = <SettingsEmptyState>{t('list.empty')}</SettingsEmptyState>
  } else {
    body = (
      <div className={RESOURCE_LIST_STACK}>
        {data.map((group) => (
          <SettingsResourceRow
            key={group.id}
            title={group.name}
            description={describe(group)}
            badge={
              group.isDefault ? (
                <Badge variant='gray-secondary' size='sm'>
                  {t('list.defaultBadge')}
                </Badge>
              ) : undefined
            }
            onClick={() => void setSelectedId(group.id)}
            clickLabel={t('list.open', { name: group.name })}
            navigable
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <SettingsPanel
        actions={
          data
            ? [
                {
                  text: t('list.create'),
                  icon: Plus,
                  variant: 'primary',
                  onSelect: () => setCreateOpen(true),
                },
              ]
            : []
        }
      >
        {body}
      </SettingsPanel>
      <CreateAccessGroupModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={organizationId}
        hasDefaultGroup={Boolean(data?.some((group) => group.isDefault))}
        onCreated={(groupId) => void setSelectedId(groupId)}
      />
    </>
  )
}
