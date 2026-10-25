'use client'

import { type ReactNode, useMemo, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSearchInput,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@sim/emcn'
import { useTranslations } from 'next-intl'
import {
  type CatalogEntry,
  STEP_CATALOG,
  STEP_CATEGORIES,
  type StepCategory,
} from '@/lib/nexora/steps/catalog'
import { BlockTile } from '@/blocks/block-tile'

interface StepPickerProps {
  /** The control that opens the picker. */
  children: ReactNode
  /** A condition cannot be offered where only plain steps fit (inside a branch). */
  allowCondition: boolean
  onPick: (entry: CatalogEntry) => void
  onOpenToolbar: () => void
}

function normalized(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** The catalog of business steps, by category, with a search; « Plus de blocs » leads to the canvas toolbar. */
export function StepPicker({ children, allowCondition, onPick, onOpenToolbar }: StepPickerProps) {
  const t = useTranslations('steps')
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const wanted = normalized(query.trim())
    const matching = STEP_CATALOG.filter((entry) => {
      if (!allowCondition && entry.blockType === 'condition') return false
      if (!wanted) return true
      const text = `${t(`catalog.${entry.id}.label`)} ${t(`catalog.${entry.id}.description`)}`
      return normalized(text).includes(wanted)
    })
    return STEP_CATEGORIES.map((category: StepCategory) => ({
      category,
      entries: matching.filter((entry) => entry.category === category),
    })).filter((group) => group.entries.length > 0)
  }, [query, allowCondition, t])

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery('')}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align='start'
        side='bottom'
        sideOffset={6}
        className='max-h-[420px] w-[320px]'
      >
        <DropdownMenuSearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('picker.search')}
          aria-label={t('picker.search')}
        />
        {groups.length === 0 && (
          <div className='px-2 py-3 text-[var(--text-muted)] text-small'>{t('picker.empty')}</div>
        )}
        {groups.map((group) => (
          <div key={group.category}>
            <DropdownMenuLabel>{t(`categories.${group.category}`)}</DropdownMenuLabel>
            {group.entries.map((entry) => (
              <DropdownMenuItem
                key={entry.id}
                title={t(`catalog.${entry.id}.description`)}
                onSelect={() => onPick(entry)}
              >
                <BlockTile blockType={entry.blockType} size='md' />
                {t(`catalog.${entry.id}.label`)}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpenToolbar}>{t('picker.moreBlocks')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
