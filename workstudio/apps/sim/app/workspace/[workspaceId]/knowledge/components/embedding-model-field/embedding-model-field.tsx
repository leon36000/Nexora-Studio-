'use client'

import { useState } from 'react'
import {
  Button,
  ChipModal,
  ChipModalBody,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  ChipSelect,
} from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { isApiClientError } from '@/lib/api/client/errors'
import { isSameEmbeddingModel } from '@/lib/knowledge/reindex/model-name'
import {
  embeddingModelLabel,
  ReindexProgress,
} from '@/app/workspace/[workspaceId]/knowledge/components/embedding-model-field/reindex-progress'
import {
  useKnowledgeEmbeddingModels,
  useKnowledgeReindex,
  useStartKnowledgeReindex,
} from '@/hooks/queries/kb/reindex'

interface EmbeddingModelFieldProps {
  knowledgeBaseId: string
  /** Writers of the workspace may change the model; readers only see it. */
  canEdit: boolean
}

/**
 * The base's embedding model, as a field of its settings. Choosing another model of the
 * instance's Ollama asks for confirmation (« Réindexer N documents »), then shows the reindex
 * progress; the base keeps answering searches from its current index until the switch.
 */
export function EmbeddingModelField({ knowledgeBaseId, canEdit }: EmbeddingModelFieldProps) {
  const t = useTranslations('knowledge.reindex')
  const { data: view } = useKnowledgeReindex(knowledgeBaseId)
  const reindex = view?.reindex ?? null
  const running = reindex?.status === 'running' && !reindex.stalled
  const { data: models = [], isLoading: isLoadingModels } = useKnowledgeEmbeddingModels(
    knowledgeBaseId,
    { enabled: canEdit && !running }
  )
  const startReindex = useStartKnowledgeReindex()
  const [selected, setSelected] = useState<string | null>(null)

  const choices = view
    ? models.filter((model) => !isSameEmbeddingModel(model.id, view.embeddingModel))
    : []
  const chosen = running ? undefined : choices.find((model) => model.id === selected)

  const startError = startReindex.error
    ? isApiClientError(startReindex.error) && startReindex.error.status === 409
      ? t('startErrors.conflict')
      : isApiClientError(startReindex.error) && startReindex.error.status === 400
        ? t('startErrors.invalid')
        : t('startErrors.failed')
    : null

  const handleConfirm = () => {
    if (!chosen) return
    startReindex.mutate(
      { knowledgeBaseId, model: chosen.id },
      { onSuccess: () => setSelected(null) }
    )
  }

  return (
    <ChipModalField type='custom' title={t('title')} hint={canEdit ? t('hint') : undefined}>
      <div className='flex flex-col gap-2'>
        {view && (
          <p className='text-[var(--text-secondary)] text-caption'>
            {t('current', {
              model: embeddingModelLabel(view.embeddingModel),
              dimensions: view.embeddingDimension,
            })}
          </p>
        )}
        {reindex && <ReindexProgress reindex={reindex} />}
        {canEdit &&
          !running &&
          (choices.length > 0 ? (
            <ChipSelect
              fullWidth
              dropdownWidth='trigger'
              aria-label={t('choose')}
              placeholder={t('choose')}
              value={chosen?.id}
              onChange={setSelected}
              options={choices.map((model) => ({
                value: model.id,
                label: t('modelOption', { name: model.name, dimensions: model.dimensions }),
              }))}
            />
          ) : (
            <p className='text-[var(--text-tertiary)] text-caption'>
              {isLoadingModels ? t('loadingModels') : t('noModels')}
            </p>
          ))}
        {chosen && view && (
          <div className='flex flex-col gap-2 rounded-md border border-[var(--border-1)] px-3 py-2'>
            <p className='text-[var(--text-secondary)] text-caption'>
              {t('confirmText', { chunks: view.chunkCount, model: chosen.name })}
            </p>
            <p className='text-[var(--text-tertiary)] text-caption'>{t('confirmWarning')}</p>
            <div className='flex justify-end gap-2'>
              <Button
                variant='ghost'
                size='md'
                disabled={startReindex.isPending}
                onClick={() => setSelected(null)}
              >
                {t('cancel')}
              </Button>
              <Button
                variant='primary'
                size='md'
                disabled={startReindex.isPending}
                onClick={handleConfirm}
              >
                {startReindex.isPending
                  ? t('starting')
                  : t('confirm', { count: view.documentCount })}
              </Button>
            </div>
          </div>
        )}
        {startError && <p className='text-[var(--text-error)] text-caption'>{startError}</p>}
      </div>
    </ChipModalField>
  )
}

interface EmbeddingModelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeBaseId: string
  canEdit: boolean
}

/** The embedding model field on its own, opened from the knowledge base page. */
export function EmbeddingModelModal({
  open,
  onOpenChange,
  knowledgeBaseId,
  canEdit,
}: EmbeddingModelModalProps) {
  const t = useTranslations('knowledge.reindex')
  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={t('title')}>
      <ChipModalHeader onClose={() => onOpenChange(false)}>{t('title')}</ChipModalHeader>
      <ChipModalBody>
        <EmbeddingModelField knowledgeBaseId={knowledgeBaseId} canEdit={canEdit} />
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => onOpenChange(false)}
        cancelLabel={t('close')}
        defaultAction='dismiss'
      />
    </ChipModal>
  )
}
