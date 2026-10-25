'use client'

import { type ReactNode, useState } from 'react'
import { Badge, ChipConfirmModal, Skeleton, toast } from '@sim/emcn'
import { Plus } from '@sim/emcn/icons'
import { truncate } from '@sim/utils/string'
import { useFormatter, useTranslations } from 'next-intl'
import { AddModelModal } from '@/app/workspace/[workspaceId]/settings/components/nexora-models/add-model-modal'
import { ModelCardModal } from '@/app/workspace/[workspaceId]/settings/components/nexora-models/model-card-modal'
import { VoiceLexicon } from '@/app/workspace/[workspaceId]/settings/components/nexora-models/voice-lexicon'
import { RowActionsMenu } from '@/app/workspace/[workspaceId]/settings/components/row-actions-menu'
import {
  SettingsEmptyState,
  SettingsQueryErrorState,
} from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import {
  RESOURCE_LIST_STACK,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import {
  getNexoraModelErrorCode,
  type NexoraModel,
  useNexoraModels,
  useRemoveNexoraModel,
  useSetDefaultNexoraModel,
  useTestNexoraModel,
} from '@/hooks/queries/nexora-models'

const SKELETON_ROWS = [0, 1, 2] as const
const TEST_REPLY_MAX_LENGTH = 160
const BADGE_ROW = 'flex flex-wrap items-center justify-end gap-1'

/**
 * Réglages › Modèles: the models Nexora API serves to every block, each for one usage (chat,
 * vision/OCR, transcription). Instance admins add one (a local Ollama model, Mistral AI, or any
 * OpenAI-compatible service), test it, make a chat model the default behind `nexora-default`, or
 * remove it.
 */
export function NexoraModels() {
  const t = useTranslations('settings.models')
  const tShared = useTranslations('settings.shared')
  const format = useFormatter()
  const { data, error, isLoading, isFetching, refetch } = useNexoraModels()
  const setDefaultModel = useSetDefaultNexoraModel()
  const removeModel = useRemoveNexoraModel()
  const testModel = useTestNexoraModel()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<NexoraModel | null>(null)
  const [cardTarget, setCardTarget] = useState<NexoraModel | null>(null)

  const describeError = (cause: unknown) => t(`errors.${getNexoraModelErrorCode(cause)}`)

  const describeSource = (model: NexoraModel) =>
    [
      t(`usages.${model.usage}`),
      t(`sources.${model.source}`),
      model.providerModel,
      model.providerUrl,
    ]
      .filter(Boolean)
      .join(' · ')

  const handleTest = (model: NexoraModel) => {
    testModel.mutate(model.id, {
      onSuccess: ({ latencyMs, reply, truncated }) => {
        const seconds = format.number(latencyMs / 1000, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
        if (truncated) {
          toast.success(t('test.truncated', { name: model.name, seconds }))
          return
        }
        toast.success(
          t('test.success', {
            name: model.name,
            seconds,
            reply: truncate(reply.trim(), TEST_REPLY_MAX_LENGTH, '…'),
          })
        )
      },
      onError: (cause) => {
        toast.error(t('test.failed', { name: model.name }), { description: describeError(cause) })
      },
    })
  }

  const handleSetDefault = (model: NexoraModel) => {
    setDefaultModel.mutate(model.id, {
      onSuccess: () => toast.success(t('defaultChanged', { name: model.name })),
      onError: (cause) => toast.error(describeError(cause)),
    })
  }

  const handleRemove = () => {
    if (!removeTarget) return
    const model = removeTarget
    removeModel.mutate(model.id, {
      onSuccess: ({ removedLocalModel }) => {
        setRemoveTarget(null)
        toast.success(
          removedLocalModel
            ? t('removedLocal', { name: model.name })
            : t('removed', { name: model.name })
        )
      },
      onError: (cause) => {
        setRemoveTarget(null)
        toast.error(describeError(cause))
      },
    })
  }

  const describeCard = (model: NexoraModel) => {
    const { card } = model
    return (
      <span className={BADGE_ROW}>
        {model.isDefault && (
          <Badge variant='gray-secondary' size='sm'>
            {t('defaultBadge')}
          </Badge>
        )}
        {card.reasoning && (
          <Badge variant='purple' size='sm'>
            {t('card.reasoning')}
          </Badge>
        )}
        {card.tools && (
          <Badge variant='blue-secondary' size='sm'>
            {t('card.tools')}
          </Badge>
        )}
        {card.vision && (
          <Badge variant='teal' size='sm'>
            {t('card.vision')}
          </Badge>
        )}
        {card.contextTokens !== null && (
          <Badge variant='gray-secondary' size='sm'>
            {t('card.context', {
              tokens: format.number(card.contextTokens, { notation: 'compact' }),
            })}
          </Badge>
        )}
        <Badge
          variant={
            card.location === 'external' ? 'amber' : card.location === 'eu' ? 'blue' : 'green'
          }
          size='sm'
        >
          {t(`card.locations.${card.location}`)}
        </Badge>
      </span>
    )
  }

  const errorCode = error ? getNexoraModelErrorCode(error) : null

  let body: ReactNode
  if (isLoading) {
    body = (
      <div className={RESOURCE_LIST_STACK}>
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className='h-[52px] w-full rounded-lg' />
        ))}
      </div>
    )
  } else if (!data) {
    body =
      errorCode === 'forbidden' ? (
        <SettingsEmptyState>{t('errors.forbidden')}</SettingsEmptyState>
      ) : (
        <SettingsQueryErrorState
          error={describeError(error)}
          fallback={t('errors.unknown')}
          isRetrying={isFetching}
          onRetry={() => void refetch()}
        />
      )
  } else {
    body = (
      <div className='flex flex-col gap-4'>
        <p className='text-[var(--text-muted)] text-small'>{t('intro')}</p>
        {data.models.length === 0 ? (
          <SettingsEmptyState variant='inline'>{t('empty')}</SettingsEmptyState>
        ) : (
          <div className={RESOURCE_LIST_STACK}>
            {data.models.map((model) => {
              const isTesting = testModel.isPending && testModel.variables === model.id
              return (
                <SettingsResourceRow
                  key={model.id}
                  title={model.name}
                  description={describeSource(model)}
                  badge={
                    isTesting ? (
                      <span className='whitespace-nowrap text-[var(--text-muted)] text-caption'>
                        {t('testing')}
                      </span>
                    ) : (
                      describeCard(model)
                    )
                  }
                  trailing={
                    <RowActionsMenu
                      label={t('rowActions', { name: model.name })}
                      actions={[
                        {
                          label: t('actions.test'),
                          disabled: isTesting,
                          onSelect: () => handleTest(model),
                        },
                        {
                          label: t('actions.editCard'),
                          onSelect: () => setCardTarget(model),
                        },
                        // Only a chat model can answer nexora-default.
                        ...(model.isDefault || model.usage !== 'chat'
                          ? []
                          : [
                              {
                                label: t('actions.makeDefault'),
                                disabled: setDefaultModel.isPending,
                                onSelect: () => handleSetDefault(model),
                              },
                            ]),
                        {
                          label: t('actions.remove'),
                          destructive: true,
                          disabled: model.isDefault,
                          tooltip: model.isDefault ? t('actions.removeDefaultTooltip') : undefined,
                          onSelect: () => setRemoveTarget(model),
                        },
                      ]}
                    />
                  }
                />
              )
            })}
          </div>
        )}
        <VoiceLexicon />
      </div>
    )
  }

  return (
    <>
      <SettingsPanel
        actions={
          data
            ? [
                {
                  text: t('add'),
                  icon: Plus,
                  variant: 'primary',
                  onSelect: () => setIsAddOpen(true),
                },
              ]
            : []
        }
      >
        {body}
      </SettingsPanel>

      {data && (
        <AddModelModal
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          catalog={data.catalog}
          localModels={data.localModels}
          ollamaAvailable={data.ollamaAvailable}
        />
      )}

      {cardTarget && (
        <ModelCardModal
          key={cardTarget.id}
          model={cardTarget}
          onClose={() => setCardTarget(null)}
        />
      )}

      <ChipConfirmModal
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !removeModel.isPending) setRemoveTarget(null)
        }}
        title={t('removeDialog.title')}
        srTitle={t('removeDialog.title')}
        text={[
          t('removeDialog.textBefore'),
          { text: removeTarget?.name ?? '', bold: true },
          t('removeDialog.textAfter'),
          removeTarget?.source === 'ollama' && t('removeDialog.localFiles'),
        ]}
        dismissLabel={tShared('cancel')}
        confirm={{
          label: tShared('remove'),
          onClick: handleRemove,
          pending: removeModel.isPending,
          pendingLabel: t('removing'),
        }}
      />
    </>
  )
}
