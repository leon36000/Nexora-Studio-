'use client'

import { useMemo, useState } from 'react'
import {
  Button,
  ChipCombobox,
  ChipConfirmModal,
  ChipInput,
  ChipModal,
  ChipModalBody,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  type ComboboxOption,
  handleKeyboardActivation,
} from '@sim/emcn'
import { Trash } from '@sim/emcn/icons'
import { createLogger } from '@sim/logger'
import { useTranslations } from 'next-intl'
import { getDocumentIcon } from '@/components/icons/document-icons'
import type { TagUsageData } from '@/lib/api/contracts/knowledge'
import {
  KNOWLEDGE_TAG_DISPLAY_NAME_MAX_LENGTH,
  SUPPORTED_FIELD_TYPES,
  TAG_SLOT_CONFIG,
} from '@/lib/knowledge/constants'
import {
  type TagDefinition,
  useKnowledgeBaseTagDefinitions,
} from '@/hooks/kb/use-knowledge-base-tag-definitions'
import {
  useCreateTagDefinition,
  useDeleteTagDefinition,
  useTagUsageQuery,
} from '@/hooks/queries/kb/knowledge'

const logger = createLogger('BaseTagsModal')

interface DocumentListProps {
  documents: Array<{ id: string; name: string; tagValue: string }>
  totalCount: number
}

function DocumentList({ documents, totalCount }: DocumentListProps) {
  const t = useTranslations('knowledge.baseTags')
  const displayLimit = 5
  const hasMore = totalCount > displayLimit

  return (
    <div className='rounded-sm border'>
      <div className='max-h-[160px] overflow-y-auto'>
        {documents.slice(0, displayLimit).map((doc) => {
          const DocumentIcon = getDocumentIcon('', doc.name)
          return (
            <div key={doc.id} className='flex items-center gap-2 border-b p-2 last:border-b-0'>
              <DocumentIcon className='size-4 shrink-0 text-[var(--text-muted)]' />
              <span className='min-w-0 max-w-[120px] truncate text-[var(--text-primary)] text-caption'>
                {doc.name}
              </span>
              {doc.tagValue && (
                <>
                  <div className='mb-[-1.5px] h-[14px] w-[1.25px] shrink-0 rounded-full bg-[var(--border-1)]' />
                  <span className='min-w-0 flex-1 truncate text-[var(--text-muted)] text-caption'>
                    {doc.tagValue}
                  </span>
                </>
              )}
            </div>
          )
        })}
        {hasMore && (
          <div className='p-2 text-[var(--text-muted)] text-caption'>
            {t('moreDocuments', { count: totalCount - displayLimit })}
          </div>
        )}
      </div>
    </div>
  )
}

interface BaseTagsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeBaseId: string
}

export function BaseTagsModal({ open, onOpenChange, knowledgeBaseId }: BaseTagsModalProps) {
  const t = useTranslations('knowledge.baseTags')
  const tFieldTypes = useTranslations('knowledge.fieldTypes')
  const fieldTypeLabel = (type: string) => (tFieldTypes.has(type) ? tFieldTypes(type) : type)
  const { tagDefinitions: kbTagDefinitions } = useKnowledgeBaseTagDefinitions(knowledgeBaseId)

  const createTagMutation = useCreateTagDefinition()
  const deleteTagMutation = useDeleteTagDefinition()

  const [deleteTagDialogOpen, setDeleteTagDialogOpen] = useState(false)
  const [selectedTag, setSelectedTag] = useState<TagDefinition | null>(null)
  const [viewDocumentsDialogOpen, setViewDocumentsDialogOpen] = useState(false)
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const [createTagForm, setCreateTagForm] = useState({
    displayName: '',
    fieldType: 'text',
  })

  const { data: tagUsageData = [], refetch: refetchTagUsage } = useTagUsageQuery(knowledgeBaseId, {
    enabled: open,
  })

  const getTagUsage = (tagSlot: string): TagUsageData => {
    return (
      tagUsageData.find((usage) => usage.tagSlot === tagSlot) || {
        tagName: '',
        tagSlot,
        documentCount: 0,
        documents: [],
      }
    )
  }

  const handleDeleteTagClick = async (tag: TagDefinition) => {
    setSelectedTag(tag)
    await refetchTagUsage()
    setDeleteTagDialogOpen(true)
  }

  const handleViewDocuments = async (tag: TagDefinition) => {
    setSelectedTag(tag)
    await refetchTagUsage()
    setViewDocumentsDialogOpen(true)
  }

  const openTagCreator = () => {
    setCreateTagForm({
      displayName: '',
      fieldType: 'text',
    })
    setIsCreatingTag(true)
  }

  const cancelCreatingTag = () => {
    setCreateTagForm({
      displayName: '',
      fieldType: 'text',
    })
    setIsCreatingTag(false)
  }

  const hasTagNameConflict = (name: string) => {
    if (!name.trim()) return false
    return kbTagDefinitions.some(
      (tag) => tag.displayName.toLowerCase() === name.trim().toLowerCase()
    )
  }

  const tagNameConflict =
    isCreatingTag && !createTagMutation.isPending && hasTagNameConflict(createTagForm.displayName)

  const canSaveTag = () => {
    return (
      createTagForm.displayName.trim().length > 0 && !hasTagNameConflict(createTagForm.displayName)
    )
  }

  const getSlotUsageByFieldType = (fieldType: string): { used: number; max: number } => {
    const config = TAG_SLOT_CONFIG[fieldType as keyof typeof TAG_SLOT_CONFIG]
    if (!config) return { used: 0, max: 0 }
    const used = kbTagDefinitions.filter((def) => def.fieldType === fieldType).length
    return { used, max: config.maxSlots }
  }

  const hasAvailableSlots = (fieldType: string): boolean => {
    const { used, max } = getSlotUsageByFieldType(fieldType)
    return used < max
  }

  const fieldTypeOptions: ComboboxOption[] = useMemo(() => {
    return SUPPORTED_FIELD_TYPES.reduce<ComboboxOption[]>((acc, type) => {
      const { used, max } = getSlotUsageByFieldType(type)
      if (used < max) {
        acc.push({
          value: type,
          label: t('fieldTypeOption', { type: fieldTypeLabel(type), used, max }),
        })
      }
      return acc
    }, [])
  }, [kbTagDefinitions, t])

  const saveTagDefinition = async () => {
    if (!canSaveTag()) return

    try {
      if (!hasAvailableSlots(createTagForm.fieldType)) {
        throw new Error(`No available slots for ${createTagForm.fieldType} type`)
      }

      await createTagMutation.mutateAsync({
        knowledgeBaseId,
        displayName: createTagForm.displayName.trim(),
        fieldType: createTagForm.fieldType,
      })

      setCreateTagForm({
        displayName: '',
        fieldType: 'text',
      })
      setIsCreatingTag(false)
    } catch (error) {
      logger.error('Error creating tag definition:', error)
    }
  }

  const closeDeleteTagDialog = () => {
    setDeleteTagDialogOpen(false)
    setSelectedTag(null)
  }

  const confirmDeleteTag = async () => {
    if (!selectedTag) return

    try {
      await deleteTagMutation.mutateAsync({
        knowledgeBaseId,
        tagDefinitionId: selectedTag.id,
      })

      closeDeleteTagDialog()
    } catch (error) {
      logger.error('Error deleting tag definition:', error)
    }
  }

  const selectedTagUsage = selectedTag ? getTagUsage(selectedTag.tagSlot) : null

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setIsCreatingTag(false)
      setCreateTagForm({
        displayName: '',
        fieldType: 'text',
      })
    }
    onOpenChange(openState)
  }

  return (
    <>
      <ChipModal open={open} onOpenChange={handleClose} srTitle={t('title')} size='sm'>
        <ChipModalHeader onClose={() => handleClose(false)}>
          <div className='flex items-center justify-between'>
            <span>{t('title')}</span>
          </div>
        </ChipModalHeader>

        <ChipModalBody>
          <ChipModalField
            type='custom'
            submitOnEnter={false}
            title={
              <>
                {t('heading')}{' '}
                <span className='pl-1.5 text-[var(--text-tertiary)]'>
                  {t('definedCount', { count: kbTagDefinitions.length })}
                </span>
              </>
            }
          >
            <div className='flex flex-col gap-2'>
              {kbTagDefinitions.length === 0 && !isCreatingTag && (
                <div className='rounded-md border p-4 text-center'>
                  <p className='text-[var(--text-tertiary)] text-caption'>{t('empty')}</p>
                </div>
              )}

              {kbTagDefinitions.map((tag) => {
                const usage = getTagUsage(tag.tagSlot)
                return (
                  <div
                    key={tag.id}
                    role='button'
                    tabIndex={0}
                    className='flex cursor-pointer items-center gap-2 rounded-sm border p-2 hover-hover:bg-[var(--surface-2)]'
                    onClick={() => handleViewDocuments(tag)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return
                      handleKeyboardActivation(event, () => handleViewDocuments(tag))
                    }}
                  >
                    <span className='min-w-0 truncate text-[var(--text-primary)] text-caption'>
                      {tag.displayName}
                    </span>
                    <span className='rounded-[3px] bg-[var(--surface-3)] px-1.5 py-0.5 text-[var(--text-muted)] text-micro'>
                      {fieldTypeLabel(tag.fieldType)}
                    </span>
                    <div className='mb-[-1.5px] h-[14px] w-[1.25px] shrink-0 rounded-full bg-[var(--border-1)]' />
                    <span className='min-w-0 flex-1 text-[var(--text-muted)] text-caption'>
                      {t('documentCount', { count: usage.documentCount })}
                    </span>
                    <div className='flex shrink-0 items-center gap-1'>
                      <Button
                        aria-label={t('deleteTag')}
                        variant='ghost'
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTagClick(tag)
                        }}
                        className='size-4 p-0 text-[var(--text-muted)] hover-hover:text-[var(--text-error)]'
                      >
                        <Trash className='size-3' />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {!isCreatingTag && (
                <Button
                  variant='default'
                  onClick={openTagCreator}
                  disabled={!SUPPORTED_FIELD_TYPES.some((type) => hasAvailableSlots(type))}
                  className='w-full'
                >
                  {t('addTag')}
                </Button>
              )}

              {isCreatingTag && (
                <div className='space-y-2 rounded-md border p-3'>
                  <ChipModalField
                    type='custom'
                    title={t('tagName')}
                    flush
                    error={tagNameConflict ? t('nameConflict') : undefined}
                  >
                    <ChipInput
                      value={createTagForm.displayName}
                      onChange={(e) =>
                        setCreateTagForm({ ...createTagForm, displayName: e.target.value })
                      }
                      placeholder={t('tagNamePlaceholder')}
                      maxLength={KNOWLEDGE_TAG_DISPLAY_NAME_MAX_LENGTH}
                      error={Boolean(tagNameConflict)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canSaveTag()) {
                          e.preventDefault()
                          saveTagDefinition()
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          cancelCreatingTag()
                        }
                      }}
                    />
                  </ChipModalField>

                  <ChipModalField
                    type='custom'
                    title={t('type')}
                    flush
                    error={!hasAvailableSlots(createTagForm.fieldType) ? t('noSlots') : undefined}
                  >
                    <ChipCombobox
                      options={fieldTypeOptions}
                      value={createTagForm.fieldType}
                      onChange={(value) => setCreateTagForm({ ...createTagForm, fieldType: value })}
                      placeholder={t('selectType')}
                    />
                  </ChipModalField>

                  <div className='flex gap-2'>
                    <Button variant='default' onClick={cancelCreatingTag} className='flex-1'>
                      {t('cancel')}
                    </Button>
                    <Button
                      variant='primary'
                      onClick={saveTagDefinition}
                      className='flex-1'
                      disabled={
                        !canSaveTag() ||
                        createTagMutation.isPending ||
                        !hasAvailableSlots(createTagForm.fieldType)
                      }
                    >
                      {createTagMutation.isPending ? t('creating') : t('createTag')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ChipModalField>
        </ChipModalBody>

        <ChipModalFooter
          cancelLabel={t('cancel')}
          onCancel={() => handleClose(false)}
          defaultAction='none'
          primaryAction={{ label: t('close'), onClick: () => handleClose(false) }}
        />
      </ChipModal>

      <ChipConfirmModal
        open={deleteTagDialogOpen}
        onOpenChange={(openState) => {
          if (openState) {
            setDeleteTagDialogOpen(true)
          } else {
            closeDeleteTagDialog()
          }
        }}
        srTitle={t('deleteTag')}
        title={t('deleteTag')}
        text={[
          t('deletePrefix'),
          { text: selectedTag?.displayName ?? t('selectedFallback'), bold: true },
          t('deleteSuffix'),
          {
            text: t('deleteWarning', { count: selectedTagUsage?.documentCount || 0 }),
            error: true,
          },
          t('cannotBeUndone'),
        ]}
        confirm={{
          label: t('deleteTag'),
          onClick: confirmDeleteTag,
          pending: deleteTagMutation.isPending,
          pendingLabel: t('deleting'),
        }}
      >
        {selectedTagUsage && selectedTagUsage.documentCount > 0 && (
          <ChipModalField type='custom' title={t('affectedDocuments')}>
            <DocumentList
              documents={selectedTagUsage.documents}
              totalCount={selectedTagUsage.documentCount}
            />
          </ChipModalField>
        )}
      </ChipConfirmModal>

      <ChipModal
        open={viewDocumentsDialogOpen}
        onOpenChange={setViewDocumentsDialogOpen}
        srTitle={t('documentsUsing', { name: selectedTag?.displayName ?? '' })}
        size='sm'
      >
        <ChipModalHeader onClose={() => setViewDocumentsDialogOpen(false)}>
          {t('documentsUsing', { name: selectedTag?.displayName ?? '' })}
        </ChipModalHeader>
        <ChipModalBody>
          <div className='flex flex-col gap-2 px-2'>
            <p className='text-[var(--text-secondary)]'>
              {t('usageSummary', { count: selectedTagUsage?.documentCount || 0 })}
            </p>

            {selectedTagUsage?.documentCount === 0 ? (
              <div className='rounded-md border p-4 text-center'>
                <p className='text-[var(--text-secondary)]'>{t('unused')}</p>
              </div>
            ) : (
              <DocumentList
                documents={selectedTagUsage?.documents || []}
                totalCount={selectedTagUsage?.documentCount || 0}
              />
            )}
          </div>
        </ChipModalBody>
        <ChipModalFooter
          cancelLabel={t('cancel')}
          onCancel={() => setViewDocumentsDialogOpen(false)}
          primaryAction={{ label: t('close'), onClick: () => setViewDocumentsDialogOpen(false) }}
        />
      </ChipModal>
    </>
  )
}
