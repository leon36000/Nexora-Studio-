'use client'

import { useMemo, useState } from 'react'
import {
  Avatar,
  Badge,
  Banner,
  ChipConfirmModal,
  ChipInput,
  cn,
  OverflowText,
  Search,
  Skeleton,
} from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import type { RosterMember } from '@/hooks/queries/organization'

interface TransferOwnershipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: RosterMember[]
  isLoadingMembers: boolean
  currentUserId: string
  isSubmitting: boolean
  error?: Error | null
  portalError?: string | null
  hasPaidSubscription: boolean
  isOpeningBillingPortal: boolean
  onConfirm: (newOwnerUserId: string) => Promise<void> // i18n-ignore: type annotation, not UI text
  onOpenBillingPortal: () => void
}

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  members,
  isLoadingMembers,
  currentUserId,
  isSubmitting,
  error,
  portalError,
  hasPaidSubscription,
  isOpeningBillingPortal,
  onConfirm,
  onOpenBillingPortal,
}: TransferOwnershipDialogProps) {
  const t = useTranslations('settings.teamManagement.transferOwnership')
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const candidates = useMemo(() => {
    const others = members.filter(
      (m) => m.userId !== currentUserId && m.role !== 'owner' && m.role !== 'external'
    )
    others.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1
      if (a.role !== 'admin' && b.role === 'admin') return 1
      return a.name.localeCompare(b.name)
    })
    if (!search.trim()) return others
    const q = search.trim().toLowerCase()
    return others.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    )
  }, [members, currentUserId, search])

  const hasCandidates = members.some(
    (m) => m.userId !== currentUserId && m.role !== 'owner' && m.role !== 'external'
  )

  const handleClose = (next: boolean) => {
    if (!next) {
      setSearch('')
      setSelectedUserId(null)
    }
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    if (!selectedUserId) return
    await onConfirm(selectedUserId)
  }

  return (
    <ChipConfirmModal
      open={open}
      onOpenChange={handleClose}
      srTitle={t('title')}
      title={t('title')}
      defaultAction='none'
      confirm={{
        label: t('confirm'),
        onClick: handleConfirm,
        pending: isSubmitting,
        pendingLabel: t('transferring'),
        disabled: !selectedUserId || !hasCandidates || isLoadingMembers,
      }}
    >
      <div className='flex flex-col gap-4'>
        {isLoadingMembers ? (
          <div className='space-y-3'>
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-4 w-1/2' />
            <div className='space-y-2 pt-2'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          </div>
        ) : !hasCandidates ? (
          <p className='px-2 text-[var(--text-secondary)] text-sm'>{t('onlyMember')}</p>
        ) : (
          <div className='space-y-3'>
            <p className='px-2 text-[var(--text-secondary)] text-sm'>{t('explanation')}</p>

            {hasPaidSubscription && (
              <Banner
                variant='default'
                className='rounded-md px-3 py-2'
                textClassName='text-[var(--text-primary)]'
                actionLabel={isOpeningBillingPortal ? t('openingPortal') : t('openPortal')}
                actionDisabled={isOpeningBillingPortal}
                onAction={onOpenBillingPortal}
                text={
                  <>
                    <span className='block'>{t('paymentMethodStays')}</span>
                    <span className='block text-[var(--text-secondary)]'>
                      {t('paymentMethodHint')}
                    </span>
                  </>
                }
              />
            )}

            {portalError && <p className='px-2 text-[var(--text-error)] text-sm'>{portalError}</p>}

            <ChipInput
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchMembers')}
            />

            <div className='max-h-[280px] overflow-y-auto rounded-md border border-[var(--border-1)]'>
              {candidates.length === 0 ? (
                <div className='px-3 py-4 text-center text-[var(--text-muted)] text-small'>
                  {t('noMatches', { search })}
                </div>
              ) : (
                <ul className='divide-y divide-[var(--border-1)]'>
                  {candidates.map((m) => {
                    const isSelected = selectedUserId === m.userId
                    return (
                      <li key={m.userId}>
                        <button
                          type='button'
                          aria-pressed={isSelected}
                          onClick={() => setSelectedUserId(m.userId)}
                          className={cn(
                            'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                            isSelected
                              ? 'bg-[var(--surface-active)]'
                              : 'hover-hover:bg-[var(--surface-hover)]'
                          )}
                        >
                          <Avatar size='xs' name={m.name} src={m.image} aria-hidden />
                          <div className='min-w-0 flex-1'>
                            <div className='flex items-center gap-2'>
                              <OverflowText
                                label={m.name}
                                className='text-[var(--text-primary)] text-small'
                              />
                              {m.role === 'admin' && (
                                <Badge variant='gray-secondary' size='sm'>
                                  {t('admin')}
                                </Badge>
                              )}
                            </div>
                            <OverflowText
                              label={m.email}
                              className='block text-[var(--text-muted)] text-caption'
                            />
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className='px-2 text-[var(--text-error)] text-sm'>
            {getErrorMessage(error) || t('failed')}
          </p>
        )}
      </div>
    </ChipConfirmModal>
  )
}
