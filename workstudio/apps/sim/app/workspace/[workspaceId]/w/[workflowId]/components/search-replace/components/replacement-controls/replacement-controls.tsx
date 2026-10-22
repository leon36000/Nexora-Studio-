'use client'

import { Button, Combobox, Input } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { WorkflowSearchReplacementOption } from '@/lib/workflows/search-replace/types'

interface ReplacementControlsProps {
  replacement: string
  compatibleResourceOptions: WorkflowSearchReplacementOption[]
  usesResourceReplacement: boolean
  eligibleCount: number
  disabled?: boolean
  isApplying?: boolean
  canReplaceActive: boolean
  canReplaceAll: boolean
  onReplacementChange: (replacement: string) => void
  onReplaceActive: () => void
  onReplaceAll: () => void
}

export function ReplacementControls({
  replacement,
  compatibleResourceOptions,
  usesResourceReplacement,
  eligibleCount,
  disabled,
  isApplying,
  canReplaceActive,
  canReplaceAll,
  onReplacementChange,
  onReplaceActive,
  onReplaceAll,
}: ReplacementControlsProps) {
  const t = useTranslations('editor.searchReplace.controls')
  return (
    <div className='space-y-2'>
      {usesResourceReplacement ? (
        <Combobox
          options={compatibleResourceOptions.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
          value={replacement}
          onChange={onReplacementChange}
          placeholder={t('chooseReplacement')}
          searchable
          searchPlaceholder={t('searchResources')}
          emptyMessage={t('noValidReplacements')}
          disabled={disabled || compatibleResourceOptions.length === 0}
        />
      ) : (
        <Input
          value={replacement}
          placeholder={t('replacePlaceholder')}
          disabled={disabled}
          onChange={(event) => onReplacementChange(event.target.value)}
        />
      )}

      <div className='flex items-center justify-between gap-2 max-md:flex-wrap'>
        <span className='text-[var(--text-muted)] text-xs'>
          {t('replaceableMatches', { count: eligibleCount })}
        </span>
        <div className='flex shrink-0 gap-1.5 max-md:ml-auto'>
          <Button
            className='h-8 text-xs max-md:pointer-coarse:min-h-11'
            variant='default'
            disabled={disabled || isApplying || !canReplaceActive}
            onClick={onReplaceActive}
          >
            {t('replace')}
          </Button>
          <Button
            className='h-8 text-xs max-md:pointer-coarse:min-h-11'
            variant='active'
            disabled={disabled || isApplying || !canReplaceAll}
            onClick={onReplaceAll}
          >
            {isApplying ? t('replacing') : t('replaceAll')}
          </Button>
        </div>
      </div>
    </div>
  )
}
