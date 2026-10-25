'use client'

import { Badge, Button, OverflowText, Switch, Tooltip } from '@sim/emcn'
import { X } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'

export interface SelectedItem {
  key: string
  label: string
  /** The referenced tool or base no longer exists in the workspace. */
  missing: boolean
  /** Tools that can act: whether the person is asked before each use (« Demander avant d'agir »). */
  confirm?: boolean
}

interface SelectedListProps {
  items: SelectedItem[]
  onRemove: (key: string) => void
  onConfirmChange?: (key: string, confirm: boolean) => void
  disabled?: boolean
}

/** What a picker field holds, one removable row each; a reference that disappeared is marked. */
export function SelectedList({ items, onRemove, onConfirmChange, disabled }: SelectedListProps) {
  const t = useTranslations('agents.editor.tools')
  if (items.length === 0) return null

  return (
    <ul className='flex flex-col gap-1'>
      {items.map((item) => (
        <li
          key={item.key}
          className='flex min-h-[30px] items-center gap-2 rounded-lg border border-[var(--border)] pr-1 pl-2.5'
        >
          <OverflowText label={item.label} className='flex-1 text-[var(--text-body)] text-small' />
          {item.missing && (
            <Badge variant='amber' size='sm'>
              {t('missing')}
            </Badge>
          )}
          {item.confirm !== undefined && onConfirmChange && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className='flex items-center'>
                  <Switch
                    checked={item.confirm}
                    disabled={disabled}
                    onCheckedChange={(checked) => onConfirmChange(item.key, checked)}
                    aria-label={t('confirm', { name: item.label })}
                  />
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('confirmHint')}</Tooltip.Content>
            </Tooltip.Root>
          )}
          {!disabled && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button
                  type='button'
                  variant='quiet'
                  size='icon'
                  onClick={() => onRemove(item.key)}
                  aria-label={t('remove', { name: item.label })}
                >
                  <X className='size-[13px]' />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('remove', { name: item.label })}</Tooltip.Content>
            </Tooltip.Root>
          )}
        </li>
      ))}
    </ul>
  )
}
