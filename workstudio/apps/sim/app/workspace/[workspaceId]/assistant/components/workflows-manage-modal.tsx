'use client'

import {
  Badge,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalFooter,
  ChipModalHeader,
  OverflowText,
  Skeleton,
  Switch,
} from '@sim/emcn'
import { useTranslations } from 'next-intl'
import {
  usePublishableAssistantWorkflows,
  useSetAssistantWorkflowPublished,
} from '@/hooks/queries/nexora-assistant-extended'

interface WorkflowsManageModalProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** « Gérer les workflows publiés » (writers): which workflows members can launch from the Assistant. */
export function WorkflowsManageModal({
  workspaceId,
  open,
  onOpenChange,
}: WorkflowsManageModalProps) {
  const t = useTranslations('assistant.workflows')
  const workflows = usePublishableAssistantWorkflows(workspaceId, open)
  const setPublished = useSetAssistantWorkflowPublished()

  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={t('manageTitle')} size='md'>
      <ChipModalHeader onClose={() => onOpenChange(false)}>{t('manageTitle')}</ChipModalHeader>
      <ChipModalBody>
        <p className='px-2 text-[var(--text-muted)] text-caption'>{t('deployNote')}</p>
        {workflows.isPending ? (
          <Skeleton className='h-[52px] w-full rounded-lg' />
        ) : workflows.isError ? (
          <p className='px-2 text-[var(--text-error)] text-small'>{t('loadFailed')}</p>
        ) : workflows.data.length === 0 ? (
          <p className='px-2 text-[var(--text-muted)] text-small'>{t('manageEmpty')}</p>
        ) : (
          <ul className='flex flex-col gap-0.5 px-2'>
            {workflows.data.map((workflow) => (
              <li
                key={workflow.workflowId}
                className='flex items-center justify-between gap-3 rounded-md px-2 py-1.5'
              >
                <OverflowText
                  label={workflow.name}
                  className='text-[var(--text-body)] text-small'
                />
                <div className='flex shrink-0 items-center gap-2'>
                  {!workflow.isDeployed && (
                    <Badge variant='gray' size='sm'>
                      {t('notDeployed')}
                    </Badge>
                  )}
                  <Switch
                    checked={workflow.published}
                    disabled={setPublished.isPending}
                    aria-label={t('publishLabel', { name: workflow.name })}
                    onCheckedChange={(published) =>
                      setPublished.mutate({
                        workspaceId,
                        workflowId: workflow.workflowId,
                        published,
                      })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <ChipModalError>{setPublished.isError ? t('saveFailed') : null}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        cancelLabel={t('close')}
        onCancel={() => onOpenChange(false)}
        defaultAction='none'
      />
    </ChipModal>
  )
}
