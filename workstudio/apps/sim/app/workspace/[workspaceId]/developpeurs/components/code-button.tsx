'use client'

import { useState } from 'react'
import {
  Chip,
  ChipLink,
  ChipModal,
  ChipModalBody,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  Tooltip,
} from '@sim/emcn'
import { Code } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { CodeSamples } from '@/app/workspace/[workspaceId]/developpeurs/components/code-samples'

interface CodeButtonProps {
  workspaceId: string
  /** The model id the samples call: a model name or `agent:<name>`. */
  model: string
  /** Another id for the same model, e.g. `agent:<workflow id>`, which survives a rename. */
  alternateModel?: string
  instructions?: string
  /** Shown above the samples when the call cannot work yet (an unpublished agent). */
  notice?: string
}

/** « Code »: how to call this model or agent from a program, in the OpenAI format. */
export function CodeButton({
  workspaceId,
  model,
  alternateModel,
  instructions,
  notice,
}: CodeButtonProps) {
  const t = useTranslations('developers.code')
  const [open, setOpen] = useState(false)

  return (
    <>
      <Chip leftIcon={Code} onClick={() => setOpen(true)}>
        {t('button')}
      </Chip>
      <ChipModal open={open} onOpenChange={setOpen} srTitle={t('title')} size='lg'>
        <ChipModalHeader onClose={() => setOpen(false)}>{t('title')}</ChipModalHeader>
        <ChipModalBody>
          {notice && (
            <ChipModalField type='custom' title={t('notice')}>
              <p className='text-[var(--text-error)] text-small'>{notice}</p>
            </ChipModalField>
          )}
          <ChipModalField
            type='custom'
            title={t('model', { model })}
            titleActions={
              alternateModel ? (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <span className='font-mono text-[var(--text-muted)] text-caption'>
                      {alternateModel}
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('alternate')}</Tooltip.Content>
                </Tooltip.Root>
              ) : undefined
            }
          >
            <CodeSamples model={model} instructions={instructions} />
          </ChipModalField>
          <ChipModalField type='custom' title={t('keyTitle')}>
            <div className='flex flex-wrap items-center gap-1'>
              <ChipLink href={`/workspace/${workspaceId}/settings/api-keys`}>
                {t('createKey')}
              </ChipLink>
              <ChipLink href={`/workspace/${workspaceId}/developpeurs`}>{t('developers')}</ChipLink>
            </div>
          </ChipModalField>
        </ChipModalBody>
        <ChipModalFooter
          hideCancel
          primaryAction={{ label: t('close'), onClick: () => setOpen(false) }}
        />
      </ChipModal>
    </>
  )
}
