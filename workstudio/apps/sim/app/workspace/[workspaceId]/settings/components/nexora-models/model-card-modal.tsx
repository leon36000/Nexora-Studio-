'use client'

import { useState } from 'react'
import {
  ChipButtonGroup,
  ChipButtonGroupItem,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  toast,
} from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { MAX_CONTEXT_TOKENS, MIN_CONTEXT_TOKENS, MODEL_LOCATIONS } from '@/lib/nexora/model-ids'
import {
  getNexoraModelErrorCode,
  type NexoraModel,
  useUpdateNexoraModelCard,
} from '@/hooks/queries/nexora-models'

interface ModelCardModalProps {
  model: NexoraModel
  onClose: () => void
}

/** `null` for an empty field (unknown), `undefined` for a value out of bounds. */
function parseContext(value: string): number | null | undefined {
  const digits = value.replace(/[\s  .,]/g, '')
  if (!digits) return null
  const parsed = Number(digits)
  return Number.isInteger(parsed) && parsed >= MIN_CONTEXT_TOKENS && parsed <= MAX_CONTEXT_TOKENS
    ? parsed
    : undefined
}

/**
 * What an administrator declares on a model's card: its context length, and — for an
 * OpenAI-compatible service only — where the data it is sent is kept.
 */
export function ModelCardModal({ model, onClose }: ModelCardModalProps) {
  const t = useTranslations('settings.models')
  const tShared = useTranslations('settings.shared')
  const updateCard = useUpdateNexoraModelCard()
  const [location, setLocation] = useState(model.card.location)
  const [context, setContext] = useState(
    model.card.contextTokens === null ? '' : String(model.card.contextTokens)
  )
  const contextTokens = parseContext(context)

  const handleSave = () => {
    if (contextTokens === undefined) return
    updateCard.mutate(
      {
        id: model.id,
        body: {
          contextTokens,
          ...(model.card.locationEditable ? { location } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(t('card.modal.saved', { name: model.name }))
          onClose()
        },
      }
    )
  }

  const title = t('card.modal.title', { name: model.name })

  return (
    <ChipModal
      open
      onOpenChange={(open) => {
        if (!open && !updateCard.isPending) onClose()
      }}
      dismissDisabled={updateCard.isPending}
      srTitle={title}
      size='md'
    >
      <ChipModalHeader
        onClose={onClose}
        closeDisabled={updateCard.isPending}
        closeAriaLabel={tShared('close')}
      >
        {title}
      </ChipModalHeader>
      <ChipModalBody>
        {model.card.locationEditable && (
          <ChipModalField type='custom' title={t('card.modal.location')}>
            <ChipButtonGroup
              value={location}
              onValueChange={(value) => {
                const next = MODEL_LOCATIONS.find((candidate) => candidate === value)
                if (next) setLocation(next)
              }}
            >
              {MODEL_LOCATIONS.map((candidate) => (
                <ChipButtonGroupItem key={candidate} value={candidate}>
                  {t(`card.locations.${candidate}`)}
                </ChipButtonGroupItem>
              ))}
            </ChipButtonGroup>
          </ChipModalField>
        )}
        <ChipModalField
          type='input'
          title={t('card.modal.context')}
          value={context}
          onChange={setContext}
          inputMode='numeric'
          autoComplete='off'
          hint={t('card.modal.contextHint')}
          error={contextTokens === undefined ? t('card.modal.contextHint') : undefined}
        />
        <ChipModalError>
          {updateCard.error ? t(`errors.${getNexoraModelErrorCode(updateCard.error)}`) : null}
        </ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={onClose}
        cancelLabel={tShared('cancel')}
        cancelDisabled={updateCard.isPending}
        primaryAction={{
          label: updateCard.isPending ? t('card.modal.saving') : t('card.modal.save'),
          onClick: handleSave,
          disabled: updateCard.isPending || contextTokens === undefined,
        }}
      />
    </ChipModal>
  )
}
