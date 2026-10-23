'use client'

import { useTranslations } from 'next-intl'
import { nexoraProviderUsage } from '@/lib/nexora/models'
import { useNexoraModelUsages } from '@/hooks/queries/nexora-home'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'

interface NexoraUsageNoticeProps {
  blockId: string
}

/**
 * Under a block's « Nexora model » field: says when the instance has no model of the usage the
 * Nexora provider needs (Vision / OCR or Transcription), so a run would fail, and where an
 * administrator adds one. Silent while that is unknown.
 */
export function NexoraUsageNotice({ blockId }: NexoraUsageNoticeProps) {
  const t = useTranslations('editor.subBlock.nexoraUsageNotice')
  const blockType = useWorkflowStore((state) => state.blocks[blockId]?.type)
  const usage = blockType ? nexoraProviderUsage(blockType) : null
  const { data: usages } = useNexoraModelUsages({ enabled: usage !== null })

  if (!usage || !usages || usages[usage]) return null
  return (
    <p role='status' className='pl-0.5 text-[var(--text-error)] text-caption'>
      {t(usage)}
    </p>
  )
}
