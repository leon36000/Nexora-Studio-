'use client'

import { useState } from 'react'
import { toast } from '@sim/emcn'
import { FileText, Mic, Table } from '@sim/emcn/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  availableCaptureKinds,
  buildCaptureWorkflow,
  buildExtractionWorkflow,
  type CaptureKind,
  EXTRACTION_TABLE_NAMES,
  extractionTableColumns,
} from '@/lib/nexora/capture-templates'
import type { ExtractionTemplateId } from '@/lib/nexora/document-ai/fields'
import type { NexoraModelUsages } from '@/lib/nexora/model-ids'
import { persistImportedWorkflow } from '@/lib/workflows/operations/import-export'
import { ExtractCaptureModal } from '@/app/workspace/[workspaceId]/home/nexora-home/extract-capture-modal'
import { HOME_CARD_GRID, HomeCard } from '@/app/workspace/[workspaceId]/home/nexora-home/home-card'
import { HomeSection } from '@/app/workspace/[workspaceId]/home/nexora-home/home-section'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useCreateTable, useTablesList } from '@/hooks/queries/tables'
import { useCreateWorkflow } from '@/hooks/queries/workflows'
import { useWorkflowDiffStore } from '@/stores/workflow-diff/store'

const CARD_ICON = {
  document: FileText,
  transcription: Mic,
  extraction: Table,
} as const satisfies Record<CaptureKind, typeof FileText>

interface CaptureCardsProps {
  workspaceId: string
  /** `undefined` while the home status loads, `null` when Nexora API does not answer. */
  modelUsages: NexoraModelUsages | null | undefined
  isInstanceAdmin: boolean
}

/**
 * « Capturer »: read a document (OCR), transcribe a recording, or extract the fields of invoices,
 * quotes… into a table, with models of the instance, each card creating a ready-to-run workflow,
 * for members who can edit the workspace. A card shows only when its model usages have a model;
 * with none, admins see where to add one.
 */
export function CaptureCards({ workspaceId, modelUsages, isInstanceAdmin }: CaptureCardsProps) {
  const t = useTranslations('home.nexoraHome.capture')
  const router = useRouter()
  const { canEdit, isLoading: permissionsLoading } = useUserPermissionsContext()
  const { mutateAsync: createWorkflow } = useCreateWorkflow()
  const { mutateAsync: createTable } = useCreateTable(workspaceId)
  const [creating, setCreating] = useState<CaptureKind | null>(null)
  const [extractOpen, setExtractOpen] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const { data: tables } = useTablesList(workspaceId, 'active', { enabled: extractOpen })

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

  const openWorkflow = async (
    content: object,
    kind: CaptureKind,
    name: string,
    description: string
  ): Promise<void> => {
    useWorkflowDiffStore.getState().clearDiff()
    const created = await persistImportedWorkflow({
      content: JSON.stringify(content),
      filename: `${kind}.json`,
      workspaceId,
      nameOverride: name,
      descriptionOverride: description,
      createWorkflow: (params) => createWorkflow({ ...params, deduplicate: true }),
    })
    if (!created) throw new Error('The capture template did not parse')
    router.push(`/workspace/${workspaceId}/w/${created.workflowId}`)
  }

  const handleCreate = async (kind: CaptureKind) => {
    if (kind === 'extraction') {
      setExtractError(null)
      setExtractOpen(true)
      return
    }
    setCreating(kind)
    try {
      await openWorkflow(
        buildCaptureWorkflow(kind),
        kind,
        t(`${kind}.name`),
        t(`${kind}.description`)
      )
    } catch {
      toast.error(t('createFailed'))
      setCreating(null)
    }
  }

  /** The template's table: an existing one that already has its columns, else a new one. */
  const ensureTable = async (
    template: ExtractionTemplateId
  ): Promise<{ id: string; name: string }> => {
    const columns = extractionTableColumns(template)
    const base = EXTRACTION_TABLE_NAMES[template]
    const existing = tables ?? []
    const names = new Set(existing.map((table) => table.name))
    const reusable = existing.find((table) => {
      if (table.name !== base && !table.name.startsWith(`${base}_`)) return false
      const present = new Set(table.schema.columns.map((column) => column.name))
      return columns.every((column) => present.has(column.name))
    })
    if (reusable) return { id: reusable.id, name: reusable.name }
    let name = base
    for (let suffix = 2; names.has(name); suffix++) name = `${base}_${suffix}`
    const result = await createTable({ name, schema: { columns } })
    const id = result?.data?.table?.id
    if (!id) throw new Error('The table was not created')
    return { id, name }
  }

  const handleExtraction = async (template: ExtractionTemplateId, saveToTable: boolean) => {
    setCreating('extraction')
    setExtractError(null)
    let table: { id: string; name: string } | null = null
    if (saveToTable) {
      try {
        table = await ensureTable(template)
      } catch {
        setExtractError(t('extraction.modal.tableFailed'))
        setCreating(null)
        return
      }
    }
    try {
      await openWorkflow(
        buildExtractionWorkflow(template, table?.id ?? null),
        'extraction',
        t(`extraction.names.${template}`),
        table
          ? t('extraction.descriptionWithTable', { table: table.name })
          : t('extraction.description')
      )
    } catch {
      setExtractError(t('createFailed'))
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
      <ExtractCaptureModal
        open={extractOpen}
        onOpenChange={(open) => {
          if (creating !== 'extraction') setExtractOpen(open)
        }}
        onConfirm={handleExtraction}
        isCreating={creating === 'extraction'}
        error={extractError}
      />
    </HomeSection>
  )
}
