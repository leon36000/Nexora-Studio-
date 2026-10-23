'use client'

import { useState } from 'react'
import { toast } from '@sim/emcn'
import { FileText, Mic } from '@sim/emcn/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  availableCaptureKinds,
  buildCaptureWorkflow,
  type CaptureKind,
} from '@/lib/nexora/capture-templates'
import type { NexoraModelUsages } from '@/lib/nexora/model-ids'
import { persistImportedWorkflow } from '@/lib/workflows/operations/import-export'
import { HOME_CARD_GRID, HomeCard } from '@/app/workspace/[workspaceId]/home/nexora-home/home-card'
import { HomeSection } from '@/app/workspace/[workspaceId]/home/nexora-home/home-section'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useCreateWorkflow } from '@/hooks/queries/workflows'
import { useWorkflowDiffStore } from '@/stores/workflow-diff/store'

const CARD_ICON = { document: FileText, transcription: Mic } as const satisfies Record<
  CaptureKind,
  typeof FileText
>

interface CaptureCardsProps {
  workspaceId: string
  /** `undefined` while the home status loads, `null` when Nexora API does not answer. */
  modelUsages: NexoraModelUsages | null | undefined
  isInstanceAdmin: boolean
}

/**
 * « Capturer »: read a document (OCR) or transcribe a recording with a model of the instance, each
 * card creating a ready-to-run two-block workflow, for members who can edit the workspace. A card
 * shows only when its model usage has a model; with neither, admins see where to add one.
 */
export function CaptureCards({ workspaceId, modelUsages, isInstanceAdmin }: CaptureCardsProps) {
  const t = useTranslations('home.nexoraHome.capture')
  const router = useRouter()
  const { canEdit, isLoading: permissionsLoading } = useUserPermissionsContext()
  const { mutateAsync: createWorkflow } = useCreateWorkflow()
  const [creating, setCreating] = useState<CaptureKind | null>(null)

  const canCreate = !permissionsLoading && canEdit
  const kinds = availableCaptureKinds(modelUsages)

  if (!canCreate || modelUsages == null) return null
  if (kinds.length === 0) {
    if (!isInstanceAdmin) return null
    return (
      <HomeSection title={t('label')}>
        <p className='px-0.5 text-[var(--text-muted)] text-small'>
          {t.rich('noModel', {
            link: (chunks) => (
              <Link
                href={`/workspace/${workspaceId}/settings/models`}
                className='text-[var(--text-body)] underline underline-offset-2'
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </HomeSection>
    )
  }

  const handleCreate = async (kind: CaptureKind) => {
    setCreating(kind)
    try {
      useWorkflowDiffStore.getState().clearDiff()
      const created = await persistImportedWorkflow({
        content: JSON.stringify(buildCaptureWorkflow(kind)),
        filename: `${kind}.json`,
        workspaceId,
        nameOverride: t(`${kind}.name`),
        descriptionOverride: t(`${kind}.description`),
        createWorkflow: (params) => createWorkflow({ ...params, deduplicate: true }),
      })
      if (!created) throw new Error('The capture template did not parse')
      router.push(`/workspace/${workspaceId}/w/${created.workflowId}`)
    } catch {
      toast.error(t('createFailed'))
      setCreating(null)
    }
  }

  return (
    <HomeSection title={t('label')}>
      <div className={HOME_CARD_GRID}>
        {kinds.map((kind) => (
          <HomeCard
            key={kind}
            icon={CARD_ICON[kind]}
            label={t(`${kind}.card`)}
            disabled={creating !== null}
            onClick={() => void handleCreate(kind)}
          />
        ))}
      </div>
    </HomeSection>
  )
}
