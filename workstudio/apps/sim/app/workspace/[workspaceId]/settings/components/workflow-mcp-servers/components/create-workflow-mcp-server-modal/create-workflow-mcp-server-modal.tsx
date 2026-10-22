'use client'

import { useCallback, useState } from 'react'
import {
  ChipButtonGroup,
  ChipButtonGroupItem,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  ChipSelect,
  type ComboboxOption,
} from '@sim/emcn'
import { createLogger } from '@sim/logger'
import { useTranslations } from 'next-intl'
import { useCreateWorkflowMcpServer } from '@/hooks/queries/workflow-mcp-servers'

const logger = createLogger('CreateWorkflowMcpServerModal')

const INITIAL_FORM_DATA: { name: string; description: string; isPublic: boolean } = {
  name: '',
  description: '',
  isPublic: false,
}

interface CreateWorkflowMcpServerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  workflowOptions?: ComboboxOption[]
}

export function CreateWorkflowMcpServerModal({
  open,
  onOpenChange,
  workspaceId,
  workflowOptions,
}: CreateWorkflowMcpServerModalProps) {
  const t = useTranslations('settings.workflowMcpServers')
  const createServerMutation = useCreateWorkflowMcpServer()

  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA })
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<string[]>([])

  const isFormValid = formData.name.trim().length > 0

  const [prevOpen, setPrevOpen] = useState(false)
  if (open && !prevOpen) {
    setFormData({ ...INITIAL_FORM_DATA })
    setSelectedWorkflowIds([])
  }
  if (open !== prevOpen) {
    setPrevOpen(open)
  }

  const handleCreateServer = useCallback(async () => {
    if (!formData.name.trim()) return

    try {
      await createServerMutation.mutateAsync({
        workspaceId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isPublic: formData.isPublic,
        workflowIds: selectedWorkflowIds.length > 0 ? selectedWorkflowIds : undefined,
      })
      onOpenChange(false)
    } catch (err) {
      logger.error('Failed to create server:', err)
    }
  }, [formData, selectedWorkflowIds, workspaceId, onOpenChange, createServerMutation.mutateAsync])

  const showWorkflows = workflowOptions !== undefined

  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={t('create.title')}>
      <ChipModalHeader onClose={() => onOpenChange(false)}>{t('create.title')}</ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='input'
          title={t('common.serverName')}
          value={formData.name}
          onChange={(value) => setFormData({ ...formData, name: value })}
          required
          placeholder={t('common.serverNamePlaceholder')}
        />
        <ChipModalField
          type='textarea'
          title={t('common.description')}
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          placeholder={t('common.descriptionPlaceholder')}
        />
        {showWorkflows && (
          <ChipModalField type='custom' title={t('create.workflows')}>
            <ChipSelect
              options={workflowOptions ?? []}
              multiSelect
              multiSelectValues={selectedWorkflowIds}
              onMultiSelectChange={setSelectedWorkflowIds}
              placeholder={t('create.selectPlaceholder')}
              searchable
              searchPlaceholder={t('common.searchWorkflows')}
              disabled={createServerMutation.isPending}
              fullWidth
              dropdownWidth='trigger'
              align='start'
              displayLabel={
                selectedWorkflowIds.length > 0
                  ? t('create.selectedCount', { count: selectedWorkflowIds.length })
                  : undefined
              }
            />
          </ChipModalField>
        )}
        <ChipModalField type='custom' title={t('common.access')}>
          <div className='flex items-center gap-3'>
            <ChipButtonGroup
              value={formData.isPublic ? 'public' : 'private'}
              onValueChange={(value) => setFormData({ ...formData, isPublic: value === 'public' })}
            >
              <ChipButtonGroupItem value='private'>{t('common.private')}</ChipButtonGroupItem>
              <ChipButtonGroupItem value='public'>{t('common.public')}</ChipButtonGroupItem>
            </ChipButtonGroup>
            {formData.isPublic && (
              <span className='text-[var(--text-muted)] text-caption'>{t('create.noAuth')}</span>
            )}
          </div>
        </ChipModalField>
        <ChipModalError>{createServerMutation.error?.message}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => onOpenChange(false)}
        primaryAction={{
          label: createServerMutation.isPending ? t('common.adding') : t('create.submit'),
          onClick: handleCreateServer,
          disabled: !isFormValid || createServerMutation.isPending,
        }}
      />
    </ChipModal>
  )
}
