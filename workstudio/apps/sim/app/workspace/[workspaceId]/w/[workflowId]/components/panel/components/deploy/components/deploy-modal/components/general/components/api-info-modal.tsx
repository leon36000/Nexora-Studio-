'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  ChipButtonGroup,
  ChipButtonGroupItem,
  ChipConfirmModal,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  Input,
  Label,
} from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import { getMeaningfulWorkflowDescription } from '@/lib/mcp/workflow-tool-schema'
import { normalizeInputFormatValue } from '@/lib/workflows/input-format'
import { isInputDefinitionTrigger } from '@/lib/workflows/triggers/input-definition-triggers'
import type { InputFormatField } from '@/lib/workflows/types'
import { useWorkflowScope } from '@/app/workspace/[workspaceId]/providers/workflow-scope-provider'
import { useDeploymentInfo, useUpdatePublicApi } from '@/hooks/queries/deployments'
import { useUpdateWorkflow, useWorkflowMap } from '@/hooks/queries/workflows'
import { usePermissionConfig } from '@/hooks/use-permission-config'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'
import { EMPTY_SUBBLOCK_VALUES, useSubBlockStore } from '@/stores/workflows/subblock/store'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'

type NormalizedField = InputFormatField & { name: string }

interface ApiInfoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string
}

export function ApiInfoModal({ open, onOpenChange, workflowId }: ApiInfoModalProps) {
  const t = useTranslations('editor.deploy.apiInfo')
  const { workspaceId } = useWorkflowScope()
  const blocks = useWorkflowStore((state) => state.blocks)
  const setValue = useSubBlockStore((state) => state.setValue)
  const subBlockValues = useSubBlockStore(
    (state) => (workflowId ? state.workflowValues[workflowId] : undefined) ?? EMPTY_SUBBLOCK_VALUES
  )

  const { data: workflows = {} } = useWorkflowMap(workspaceId)
  const workflowMetadata = workflowId ? workflows[workflowId] : undefined
  const updateWorkflowMutation = useUpdateWorkflow()

  const { data: deploymentData } = useDeploymentInfo(workflowId, { enabled: open })
  const updatePublicApiMutation = useUpdatePublicApi()
  const { isPublicApiDisabled } = usePermissionConfig()

  const [description, setDescription] = useState('')
  const [paramDescriptions, setParamDescriptions] = useState<Record<string, string>>({})
  const [accessMode, setAccessMode] = useState<'api_key' | 'public'>('api_key')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showUnsavedChangesAlert, setShowUnsavedChangesAlert] = useState(false)

  const initialDescriptionRef = useRef('')
  const initialParamDescriptionsRef = useRef<Record<string, string>>({})
  const initialAccessModeRef = useRef<'api_key' | 'public'>('api_key')

  const starterBlockId = useMemo(() => {
    for (const [blockId, block] of Object.entries(blocks)) {
      if (!block || typeof block !== 'object') continue
      const blockType = (block as { type?: string }).type
      if (blockType && isInputDefinitionTrigger(blockType)) {
        return blockId
      }
    }
    return null
  }, [blocks])

  const inputFormat = useMemo((): NormalizedField[] => {
    if (!starterBlockId) return []

    const storeValue = subBlockValues[starterBlockId]?.inputFormat
    const normalized = normalizeInputFormatValue(storeValue) as NormalizedField[]
    if (normalized.length > 0) return normalized

    const startBlock = blocks[starterBlockId]
    const blockValue = startBlock?.subBlocks?.inputFormat?.value
    return normalizeInputFormatValue(blockValue) as NormalizedField[]
  }, [starterBlockId, subBlockValues, blocks])

  const accessModeInitializedRef = useRef(false)

  useEffect(() => {
    if (open) {
      const initialDescription =
        getMeaningfulWorkflowDescription(workflowMetadata?.description, workflowMetadata?.name) ??
        ''
      setDescription(initialDescription)
      initialDescriptionRef.current = initialDescription

      const descriptions: Record<string, string> = {}
      for (const field of inputFormat) {
        if (field.description) {
          descriptions[field.name] = field.description
        }
      }
      setParamDescriptions(descriptions)
      initialParamDescriptionsRef.current = { ...descriptions }

      setSaveError(null)
      accessModeInitializedRef.current = false
    }
  }, [open, workflowMetadata, inputFormat])

  useEffect(() => {
    if (open && deploymentData && !accessModeInitializedRef.current) {
      const initialAccess = deploymentData.isPublicApi ? 'public' : 'api_key'
      setAccessMode(initialAccess)
      initialAccessModeRef.current = initialAccess
      accessModeInitializedRef.current = true
    }
  }, [open, deploymentData])

  const hasChanges = useMemo(() => {
    if (description.trim() !== initialDescriptionRef.current.trim()) return true
    if (accessMode !== initialAccessModeRef.current) return true

    for (const field of inputFormat) {
      const currentValue = (paramDescriptions[field.name] || '').trim()
      const initialValue = (initialParamDescriptionsRef.current[field.name] || '').trim()
      if (currentValue !== initialValue) return true
    }

    return false
  }, [description, paramDescriptions, inputFormat, accessMode])

  const handleParamDescriptionChange = (fieldName: string, value: string) => {
    setParamDescriptions((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleCloseAttempt = () => {
    if (hasChanges && !isSaving) {
      setShowUnsavedChangesAlert(true)
    } else {
      onOpenChange(false)
    }
  }

  const handleDiscardChanges = () => {
    setShowUnsavedChangesAlert(false)
    setDescription(initialDescriptionRef.current)
    setParamDescriptions({ ...initialParamDescriptionsRef.current })
    setAccessMode(initialAccessModeRef.current)
    onOpenChange(false)
  }

  const handleSave = async () => {
    if (!workflowId) return

    const activeWorkflowId = useWorkflowRegistry.getState().activeWorkflowId
    if (activeWorkflowId !== workflowId) {
      return
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      if (accessMode !== initialAccessModeRef.current) {
        await updatePublicApiMutation.mutateAsync({
          workflowId,
          isPublicApi: accessMode === 'public',
        })
      }

      if (description.trim() !== (workflowMetadata?.description || '')) {
        await updateWorkflowMutation.mutateAsync({
          workspaceId,
          workflowId,
          metadata: { description: description.trim() },
        })
      }

      if (starterBlockId) {
        const updatedValue = inputFormat.map((field) => ({
          ...field,
          description: paramDescriptions[field.name]?.trim() || undefined,
        }))
        setValue(starterBlockId, 'inputFormat', updatedValue)
      }

      onOpenChange(false)
    } catch (err: unknown) {
      const message = getErrorMessage(err, t('saveFailed'))
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <ChipModal
        open={open}
        onOpenChange={(openState) => !openState && handleCloseAttempt()}
        srTitle={t('title')}
      >
        <ChipModalHeader onClose={() => onOpenChange(false)}>{t('title')}</ChipModalHeader>
        <ChipModalBody>
          <ChipModalField
            type='textarea'
            title={t('description')}
            value={description}
            onChange={setDescription}
            placeholder={t('descriptionPlaceholder')}
            minHeight={80}
          />

          {!isPublicApiDisabled && (
            <ChipModalField type='custom' title={t('access')}>
              <ChipButtonGroup
                value={accessMode}
                onValueChange={(val) => setAccessMode(val as 'api_key' | 'public')}
              >
                <ChipButtonGroupItem value='api_key'>{t('apiKey')}</ChipButtonGroupItem>
                <ChipButtonGroupItem value='public'>{t('public')}</ChipButtonGroupItem>
              </ChipButtonGroup>
              <p className='mt-1 text-[var(--text-secondary)] text-caption'>
                {accessMode === 'public' ? t('publicHint') : t('apiKeyHint')}
              </p>
            </ChipModalField>
          )}

          {inputFormat.length > 0 && (
            <ChipModalField type='custom' title={t('parameters', { count: inputFormat.length })}>
              <div className='flex flex-col gap-2'>
                {inputFormat.map((field) => (
                  <div
                    key={field.name}
                    className='overflow-hidden rounded-sm border border-[var(--border-1)]'
                  >
                    <div className='flex items-center justify-between bg-[var(--surface-4)] px-2.5 py-[5px]'>
                      <div className='flex min-w-0 flex-1 items-center gap-2'>
                        <span className='block truncate text-[var(--text-tertiary)] text-sm'>
                          {field.name}
                        </span>
                        <Badge variant='type' size='sm'>
                          {field.type || 'string'}
                        </Badge>
                      </div>
                    </div>
                    <div className='rounded-b-[4px] border-[var(--border-1)] border-t bg-[var(--surface-2)] px-2.5 pt-1.5 pb-2.5'>
                      <div className='flex flex-col gap-1.5'>
                        <Label className='text-small'>{t('description')}</Label>
                        <Input
                          value={paramDescriptions[field.name] || ''}
                          onChange={(e) => handleParamDescriptionChange(field.name, e.target.value)}
                          placeholder={t('parameterPlaceholder', { name: field.name })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ChipModalField>
          )}

          <ChipModalError>{saveError}</ChipModalError>
        </ChipModalBody>
        <ChipModalFooter
          onCancel={handleCloseAttempt}
          cancelDisabled={isSaving}
          primaryAction={{
            label: t('save'),
            onClick: handleSave,
            disabled: !hasChanges || isSaving,
          }}
        />
      </ChipModal>

      <ChipConfirmModal
        open={showUnsavedChangesAlert}
        onOpenChange={setShowUnsavedChangesAlert}
        srTitle={t('unsaved.title')}
        title={t('unsaved.title')}
        text={t('unsaved.text')}
        dismissLabel={t('unsaved.keepEditing')}
        confirm={{
          label: t('unsaved.discard'),
          onClick: handleDiscardChanges,
        }}
      />
    </>
  )
}
