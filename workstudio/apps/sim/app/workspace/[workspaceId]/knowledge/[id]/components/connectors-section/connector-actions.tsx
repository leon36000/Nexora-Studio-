'use client'

import { Fragment, type Ref, useId } from 'react'
import {
  Checkbox,
  Chip,
  ChipConfirmModal,
  ChipModalError,
  ChipModalField,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '@sim/emcn'
import { MoreHorizontal } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { orderHeaderActions, type SettingsAction } from '@/components/settings/settings-header'
import type { ConnectorActionState } from '@/app/workspace/[workspaceId]/knowledge/[id]/components/connectors-section/use-connector-actions'

interface ConnectorActionsProps {
  state: ConnectorActionState
  triggerRef?: Ref<HTMLButtonElement>
  history?: {
    expanded: boolean
    contentId: string
    onToggle: () => void
  }
}

export function ConnectorActions({ state, triggerRef, history }: ConnectorActionsProps) {
  const t = useTranslations('knowledge.connectors')
  if (!state.canEdit && !history) return null
  const actions = orderHeaderActions([
    ...state.actions,
    ...(history
      ? [
          {
            id: 'history',
            text: history.expanded ? t('hideHistory') : t('syncHistory'),
            onSelect: history.onToggle,
          },
        ]
      : []),
  ])
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Chip ref={triggerRef} aria-label={t('actionsLabel')} leftIcon={MoreHorizontal} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {actions.map(({ action }, index) => (
          <Fragment key={action.id}>
            {action.id === 'delete' && index > 0 && <DropdownMenuSeparator />}
            <ConnectorActionMenuItem
              action={action}
              history={action.id === 'history' ? history : undefined}
            />
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ConnectorActionMenuItemProps {
  action: SettingsAction
  history?: ConnectorActionsProps['history']
}

function ConnectorActionMenuItem({ action, history }: ConnectorActionMenuItemProps) {
  const item = (
    <DropdownMenuItem
      onSelect={action.onSelect}
      disabled={action.disabled}
      aria-label={
        action.disabled && action.tooltip ? `${action.text} — ${action.tooltip}` : action.text
      }
      aria-expanded={history?.expanded}
      aria-controls={history?.contentId}
    >
      {action.text}
    </DropdownMenuItem>
  )
  return action.tooltip ? (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className='block'>{item}</span>
      </Tooltip.Trigger>
      <Tooltip.Content>{action.tooltip}</Tooltip.Content>
    </Tooltip.Root>
  ) : (
    item
  )
}

interface ConnectorActionFeedbackProps {
  state: ConnectorActionState
}

export function ConnectorActionFeedback({ state }: ConnectorActionFeedbackProps) {
  const deleteDocumentsId = useId()
  const t = useTranslations('knowledge.connectors.remove')
  if (!state.canEdit) return null
  const { removal } = state
  return (
    <>
      {state.error && (
        <p role='alert' className='py-4 text-center text-[var(--text-error)] text-sm'>
          {state.error.message}
        </p>
      )}
      <ChipConfirmModal
        open={removal.open}
        onOpenChange={removal.onOpenChange}
        title={t('title')}
        text={removal.requiresDocumentDeletion ? t('textWithDocuments') : t('text')}
        confirm={{
          label: t('confirm'),
          pending: removal.pending,
          disabled: removal.disabled,
          pendingLabel: t('pending'),
          onClick: removal.onConfirm,
        }}
      >
        {!removal.requiresDocumentDeletion && (
          <ChipModalField type='custom' title={t('documents')}>
            <div className='flex items-center gap-2'>
              <Checkbox
                id={deleteDocumentsId}
                checked={removal.deleteDocuments}
                disabled={removal.pending}
                onCheckedChange={(checked) => removal.setDeleteDocuments(checked === true)}
              />
              <label htmlFor={deleteDocumentsId}>{t('alsoDeleteDocuments')}</label>
            </div>
          </ChipModalField>
        )}
        <ChipModalError>{removal.error?.message}</ChipModalError>
      </ChipConfirmModal>
    </>
  )
}
