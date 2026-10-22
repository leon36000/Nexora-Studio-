'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  Info,
} from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import {
  useOrganizationMemberUsageLimit,
  useUpdateOrganizationMemberUsageLimit,
} from '@/hooks/queries/organization'

export interface ManageCreditsTarget {
  userId: string
  name: string
  /**
   * Optional: only ever read as a fallback when `name` is blank. Callers that
   * already resolved a display name — the usage panel resolves name-or-email
   * server-side — have nothing to add here.
   */
  email?: string
}

interface ManageCreditsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  member: ManageCreditsTarget | null
}

/**
 * Modal for viewing a member's credits used in the organization's workspaces and
 * setting their per-member credit limit. "Credits used" is a read-only chip;
 * "Credit limit" is editable (blank = no limit). Hosted-only feature — surfaced
 * only from the Organization tab, which already requires hosted + Team plan.
 */
export function ManageCreditsModal({
  open,
  onOpenChange,
  organizationId,
  member,
}: ManageCreditsModalProps) {
  const t = useTranslations('settings.manageCredits')
  const tShared = useTranslations('settings.shared')
  const userId = member?.userId
  const { data, isLoading } = useOrganizationMemberUsageLimit(organizationId, userId, open)
  const updateLimit = useUpdateOrganizationMemberUsageLimit()

  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Seed the draft from server data only until the admin starts typing, so a
  // background refetch (window focus, post-save invalidation) can't clobber an
  // in-progress edit. Reset when the modal closes.
  const hasEditedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      hasEditedRef.current = false
      return
    }
    if (data && !hasEditedRef.current) {
      setDraft(data.creditLimit === null ? '' : String(data.creditLimit))
      setError(null)
    }
  }, [open, data])

  const trimmed = draft.trim()
  const parsedLimit = trimmed === '' ? null : Number(trimmed)
  const isValid =
    trimmed === '' || (parsedLimit !== null && Number.isInteger(parsedLimit) && parsedLimit >= 0)
  const currentLimit = data?.creditLimit ?? null
  const isDirty = parsedLimit !== currentLimit
  const isSaving = updateLimit.isPending

  const creditsUsed = data ? data.creditsUsed.toLocaleString() : '—'
  const creditsUsedTitle = data
    ? data.billingInterval === 'year'
      ? t('creditsUsedThisYear')
      : t('creditsUsedThisMonth')
    : t('creditsUsed')

  const handleSave = () => {
    if (!userId) return
    if (!isValid) {
      setError(t('invalidLimit'))
      return
    }
    setError(null)
    updateLimit.mutate(
      { orgId: organizationId, userId, creditLimit: parsedLimit },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => setError(getErrorMessage(err, t('updateFailed'))),
      }
    )
  }

  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={t('title')}>
      <ChipModalHeader onClose={() => onOpenChange(false)}>
        {member ? t('titleForMember', { name: member.name || member.email || '' }) : t('title')}
      </ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='copy'
          title={creditsUsedTitle}
          value={isLoading ? t('loading') : creditsUsed}
          copyLabel={t('copyCreditsUsed')}
        />
        {/*
          Text with a numeric input mode, not `inputType='number'` — the same choice
          the retry settings field documents. The native stepper is all the number
          type buys, and it paints browser chrome inside a flat chip surface. It also
          reports `''` for anything the browser considers invalid, so a typo arrived
          here indistinguishable from a cleared field and saved as "no limit"; as text
          it reaches the `Number.isInteger` check below and is refused.
        */}
        <ChipModalField
          type='input'
          inputMode='numeric'
          title={
            <span className='inline-flex items-center gap-1.5'>
              {t('creditLimit')}
              <Info side='top'>{t('creditLimitInfo')}</Info>
            </span>
          }
          value={draft}
          onChange={(value) => {
            hasEditedRef.current = true
            setDraft(value)
          }}
          placeholder={t('noLimit')}
          hint={t('noLimitHint')}
          disabled={isLoading || isSaving}
        />
        <ChipModalError>{error}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => onOpenChange(false)}
        cancelDisabled={isSaving}
        primaryAction={{
          label: isSaving ? t('saving') : tShared('save'),
          onClick: handleSave,
          disabled: !isValid || !isDirty || isSaving || isLoading,
        }}
      />
    </ChipModal>
  )
}
