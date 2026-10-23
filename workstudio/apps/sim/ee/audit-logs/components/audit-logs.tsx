// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import { useState } from 'react'
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@sim/emcn'
import { Download } from '@sim/emcn/icons'
import { useFormatter, useTranslations } from 'next-intl'
import { SettingsPanel } from '@/components/settings/settings-panel'
import { describeAuditEntry } from '@/lib/nexora/audit-labels'
import { useAuditLogs } from '@/hooks/queries/audit-logs'
import { useDebounce } from '@/hooks/use-debounce'

interface AuditLogsProps {
  organizationId: string
}

const SEARCH_DEBOUNCE_MS = 300

/** Organization audit trail: who did what, on which resource, and when. */
export function AuditLogs({ organizationId }: AuditLogsProps) {
  const t = useTranslations('governance.auditLogs')
  const format = useFormatter()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS)
  const { data, error, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useAuditLogs({
    organizationId,
    search: debouncedSearch.trim(),
  })
  const entries = data?.pages.flatMap((page) => page.data) ?? []

  const handleExport = () => {
    const query = new URLSearchParams({ organizationId })
    if (debouncedSearch.trim()) query.set('search', debouncedSearch.trim())
    window.open(`/api/audit-logs/export?${query.toString()}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <SettingsPanel
      search={{ value: search, onChange: setSearch, placeholder: t('searchPlaceholder') }}
      actions={[{ id: 'export', text: t('export'), icon: Download, onSelect: handleExport }]}
    >
      {isLoading ? (
        <p className='px-2 py-6 text-[var(--text-muted)] text-small'>{t('loading')}</p>
      ) : error ? (
        <p className='px-2 py-6 text-[var(--text-error)] text-small'>{t('loadFailed')}</p>
      ) : entries.length === 0 ? (
        <p className='px-2 py-6 text-[var(--text-muted)] text-small'>{t('empty')}</p>
      ) : (
        <div className='flex flex-col gap-3'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.date')}</TableHead>
                <TableHead>{t('columns.actor')}</TableHead>
                <TableHead>{t('columns.action')}</TableHead>
                <TableHead>{t('columns.resource')}</TableHead>
                <TableHead>{t('columns.description')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className='whitespace-nowrap'>
                    {format.dateTime(new Date(entry.createdAt), {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell>{entry.actorName || entry.actorEmail || t('system')}</TableCell>
                  <TableCell title={entry.action}>{describeAuditEntry(entry, t).label}</TableCell>
                  <TableCell>
                    {t.has(`resourceTypes.${entry.resourceType}`)
                      ? t(`resourceTypes.${entry.resourceType}`)
                      : entry.resourceType}
                  </TableCell>
                  <TableCell className='text-[var(--text-muted)]'>
                    {describeAuditEntry(entry, t).detail}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hasNextPage && (
            <div className='flex justify-center'>
              <Button
                variant='ghost'
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? t('loadingMore') : t('loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </SettingsPanel>
  )
}
