'use client'

import { useState } from 'react'
import { Chip, ChipConfirmModal, toast } from '@sim/emcn'
import { ArrowLeft } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { useLocale, useTranslations } from 'next-intl'
import { summarizeOAuthAccess } from '@/lib/auth/oauth-provider'
import { RowActionsMenu } from '@/app/workspace/[workspaceId]/settings/components/row-actions-menu'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import {
  RESOURCE_LIST_STACK,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import { useSettingsSearch } from '@/app/workspace/[workspaceId]/settings/components/use-settings-search'
import { useAuthorizedApps, useRevokeAuthorizedApp } from '@/hooks/queries/oauth-provider'

interface AuthorizedAppsProps {
  onBack: () => void
}

/**
 * The apps this account has authorized through Sim's OAuth provider. Revoking
 * one withdraws its consent and kills every token it holds, so the next
 * request it makes fails and the next sign-in asks again.
 */
export function AuthorizedApps({ onBack }: AuthorizedAppsProps) {
  const t = useTranslations('settings.authorizedApps')
  const locale = useLocale()
  const [searchTerm, setSearchTerm] = useSettingsSearch()
  const apps = useAuthorizedApps(searchTerm.trim())
  const revoke = useRevokeAuthorizedApp()
  const [pendingRevokeClientId, setPendingRevokeClientId] = useState<string | null>(null)

  const list = apps.data?.pages.flatMap((page) => page.apps) ?? []
  const pendingRevoke = list.find((app) => app.clientId === pendingRevokeClientId) ?? null

  const confirmRevoke = () => {
    if (!pendingRevokeClientId) return
    const appName = pendingRevoke?.name ?? t('appFallback')
    revoke.mutate(pendingRevokeClientId, {
      onSuccess: () => toast.success(t('revokedToast', { name: appName })),
      onError: (error) => toast.error(getErrorMessage(error, t('revokeError'))),
      /** Keep the modal open so its pending state remains visible through the mutation. */
      onSettled: () => setPendingRevokeClientId(null),
    })
  }

  return (
    <>
      <SettingsPanel
        back={{
          text: t('back'),
          icon: ArrowLeft,
          onSelect: () => {
            setSearchTerm('')
            onBack()
          },
        }}
        title={t('title')}
        description={t('description')}
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: t('searchPlaceholder'),
        }}
      >
        {apps.isError && apps.data === undefined ? (
          <SettingsQueryErrorState
            error={apps.error}
            fallback={t('loadError')}
            isRetrying={apps.isFetching}
            onRetry={() => apps.refetch()}
          />
        ) : apps.isPending ? (
          <SettingsEmptyState>{t('loading')}</SettingsEmptyState>
        ) : list.length === 0 ? (
          <SettingsEmptyState>
            {searchTerm.trim() ? t('noResults', { term: searchTerm }) : t('empty')}
          </SettingsEmptyState>
        ) : (
          <div className={RESOURCE_LIST_STACK}>
            {list.map((app) => (
              <SettingsResourceRow
                key={app.clientId}
                title={app.name}
                description={summarizeOAuthAccess(app.scopes)}
                badge={
                  <span className='whitespace-nowrap text-[var(--text-muted)] text-caption'>
                    {t('authorizedOn', {
                      date: new Date(app.authorizedAt).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }),
                    })}
                  </span>
                }
                trailing={
                  <RowActionsMenu
                    label={t('actionsLabel')}
                    actions={[
                      {
                        label: t('revoke'),
                        destructive: true,
                        onSelect: () => setPendingRevokeClientId(app.clientId),
                      },
                    ]}
                  />
                }
              />
            ))}
            {apps.isError && (
              <SettingsQueryErrorState
                error={apps.error}
                fallback={t('loadError')}
                isRetrying={apps.isFetching}
                onRetry={() => (apps.isFetchNextPageError ? apps.fetchNextPage() : apps.refetch())}
                variant='inline'
              />
            )}
            {apps.hasNextPage && !apps.isError && (
              <Chip fullWidth disabled={apps.isFetching} onClick={() => apps.fetchNextPage()}>
                {apps.isFetchingNextPage ? t('loadingMore') : t('loadMore')}
              </Chip>
            )}
          </div>
        )}
      </SettingsPanel>

      <ChipConfirmModal
        open={pendingRevokeClientId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevokeClientId(null)
        }}
        srTitle={t('revokeTitle')}
        title={t('revokeTitle')}
        text={[
          t('revokeConfirm.before'),
          { text: pendingRevoke?.name ?? t('revokeConfirm.thisApp'), bold: true },
          ' ',
          { text: t('revokeConfirm.consequence'), error: true },
          t('revokeConfirm.after'),
        ]}
        confirm={{
          label: t('revoke'),
          onClick: confirmRevoke,
          pending: revoke.isPending,
          pendingLabel: t('revoking'),
        }}
      />
    </>
  )
}
