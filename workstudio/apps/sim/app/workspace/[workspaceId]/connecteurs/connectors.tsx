'use client'

import { type ReactNode, useMemo } from 'react'
import { Badge, Chip, ChipInput, ChipLink, Skeleton } from '@sim/emcn'
import { HelpCircle, Search } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'
import { docsUrl } from '@/lib/branding/docs-url'
import { catalogCategoryKey } from '@/lib/nexora/connect-categories'
import { SEARCH_DEBOUNCE_MS } from '@/lib/url-state'
import { ConnectorsPageFrame } from '@/app/workspace/[workspaceId]/connecteurs/components/connectors-page-frame'
import { ServiceLogo } from '@/app/workspace/[workspaceId]/connecteurs/components/service-logo'
import {
  connectorsParsers,
  connectorsUrlKeys,
} from '@/app/workspace/[workspaceId]/connecteurs/search-params'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import {
  RESOURCE_LIST_GRID,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import { getConnectorErrorCode, useConnectorCatalog } from '@/hooks/queries/nexora-connectors'
import { useDebounce } from '@/hooks/use-debounce'
import { useDebouncedSearchSetter } from '@/hooks/use-debounced-search-setter'

const SKELETON_CARDS = [0, 1, 2, 3, 4, 5] as const
const NO_FILTERS = { query: '', category: '' } as const

interface ConnectorsProps {
  workspaceId: string
}

/**
 * Nexora edition: the Nexora Connect catalog, searched and filtered by category, the services
 * this workspace has connected first. Each card opens the service's page.
 */
export function Connectors({ workspaceId }: ConnectorsProps) {
  const t = useTranslations('connectors')
  const [{ search, category }, setFilters] = useQueryStates(connectorsParsers, connectorsUrlKeys)
  const setSearch = useDebouncedSearchSetter((value, options) =>
    setFilters({ search: value }, options)
  )
  const query = useDebounce(search.trim(), SEARCH_DEBOUNCE_MS)
  const catalog = useConnectorCatalog(workspaceId, { query, category })
  const unfiltered = useConnectorCatalog(workspaceId, NO_FILTERS)

  const services = useMemo(
    () => catalog.data?.pages.flatMap((page) => page.services) ?? [],
    [catalog.data]
  )
  const categoryLabel = (value: string) => {
    const key = `catalog.categories.${catalogCategoryKey(value)}`
    return t.has(key) ? t(key) : value
  }
  const categories = unfiltered.data?.pages[0]?.categories ?? []

  let body: ReactNode
  if (catalog.isPending) {
    body = (
      <div className={RESOURCE_LIST_GRID}>
        {SKELETON_CARDS.map((card) => (
          <Skeleton key={card} className='h-[52px] w-full rounded-lg' />
        ))}
      </div>
    )
  } else if (!catalog.data) {
    body = (
      <SettingsQueryErrorState
        error={t(`errors.${getConnectorErrorCode(catalog.error)}`)}
        fallback={t('errors.loadFailed')}
        isRetrying={catalog.isFetching}
        onRetry={() => void catalog.refetch()}
      />
    )
  } else if (services.length === 0) {
    body = (
      <SettingsEmptyState variant='inline'>
        {query || category ? t('catalog.empty') : t('catalog.emptyCatalog')}
      </SettingsEmptyState>
    )
  } else {
    body = (
      <div className='flex flex-col gap-4'>
        <div className={RESOURCE_LIST_GRID}>
          {services.map((service) => (
            <SettingsResourceRow
              key={service.service}
              icon={<ServiceLogo name={service.displayName} />}
              title={service.displayName}
              description={t('catalog.actionCount', { count: service.actionCount })}
              badge={
                service.connected ? (
                  <Badge variant='green' size='sm'>
                    {t('catalog.connected')}
                  </Badge>
                ) : undefined
              }
              href={`/workspace/${workspaceId}/connecteurs/${encodeURIComponent(service.service)}`}
              clickLabel={t('catalog.open', { name: service.displayName })}
              navigable
            />
          ))}
        </div>
        {catalog.hasNextPage && (
          <Chip
            variant='border'
            className='self-center'
            disabled={catalog.isFetchingNextPage}
            onClick={() => void catalog.fetchNextPage()}
          >
            {catalog.isFetchingNextPage ? t('catalog.loadingMore') : t('catalog.loadMore')}
          </Chip>
        )}
      </div>
    )
  }

  return (
    <ConnectorsPageFrame
      title={t('catalog.title')}
      actions={
        <ChipLink
          href={docsUrl('/connectors')}
          target='_blank'
          rel='noopener noreferrer'
          leftIcon={HelpCircle}
        >
          {t('catalog.help')}
        </ChipLink>
      }
    >
      <div className='flex flex-col gap-3'>
        <ChipInput
          icon={Search}
          className='w-full'
          placeholder={t('catalog.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {categories.length > 0 && (
          <nav aria-label={t('catalog.categoriesLabel')} className='flex flex-wrap gap-1'>
            <Chip active={category === ''} onClick={() => void setFilters({ category: null })}>
              {t('catalog.allCategories')}
            </Chip>
            {categories.map((value) => (
              <Chip
                key={value}
                active={category === value}
                aria-pressed={category === value}
                onClick={() => void setFilters({ category: category === value ? null : value })}
              >
                {categoryLabel(value)}
              </Chip>
            ))}
          </nav>
        )}
      </div>
      {body}
    </ConnectorsPageFrame>
  )
}
