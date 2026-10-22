'use client'

import { useCallback, useMemo, useState } from 'react'
import { ChipConfirmModal, toast } from '@sim/emcn'
import { ArrowLeft, Plus } from '@sim/emcn/icons'
import { getErrorMessage } from '@sim/utils/errors'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryState } from 'nuqs'
import { CodeIcon } from '@/components/icons'
import { canMutateWorkspaceSettingsSection } from '@/components/settings/navigation'
import { saveDiscardActions } from '@/components/settings/save-discard-actions'
import { useSettingsUnsavedGuard } from '@/components/settings/use-settings-unsaved-guard'
import type { SandboxDependencyIssue } from '@/lib/api/contracts/sandboxes'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import {
  SandboxEditor,
  SandboxStatus,
} from '@/app/workspace/[workspaceId]/settings/components/sandboxes/components/sandbox-editor'
import {
  sandboxIdParam,
  sandboxIdUrlKeys,
} from '@/app/workspace/[workspaceId]/settings/components/sandboxes/search-params'
import {
  canRetrySandboxBuild,
  draftFromSandbox,
  emptyDraft,
  extractIssues,
  type SandboxDraft,
  sandboxDeleteConfirmText,
  toSubmittedLines,
} from '@/app/workspace/[workspaceId]/settings/components/sandboxes/utils'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import {
  RESOURCE_LIST_STACK,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import { SettingsUpgradeNotice } from '@/app/workspace/[workspaceId]/settings/components/settings-upgrade-notice'
import { useSettingsSearch } from '@/app/workspace/[workspaceId]/settings/components/use-settings-search'
import {
  type Sandbox,
  useCreateSandbox,
  useDeleteSandbox,
  useSandboxes,
  useUpdateSandbox,
} from '@/hooks/queries/sandboxes'

export function Sandboxes() {
  const t = useTranslations('settings.sandboxes')
  const tShared = useTranslations('settings.shared')
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const [searchTerm, setSearchTerm] = useSettingsSearch()
  const [selectedId, setSelectedId] = useQueryState(sandboxIdParam.key, {
    ...sandboxIdParam.parser,
    ...sandboxIdUrlKeys,
  })

  const { data, isLoading, error } = useSandboxes(workspaceId)
  const createSandbox = useCreateSandbox()
  const updateSandbox = useUpdateSandbox()
  const deleteSandbox = useDeleteSandbox()

  const permissions = useUserPermissionsContext()
  const canAdmin = canMutateWorkspaceSettingsSection('sandboxes', permissions)

  const [draft, setDraft] = useState<SandboxDraft | null>(null)
  const [dependencyIssues, setDependencyIssues] = useState<SandboxDependencyIssue[]>([])
  const [systemPackageIssues, setSystemPackageIssues] = useState<SandboxDependencyIssue[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // The draft belongs to whatever was open when it was typed. Browser Back
  // clears `selectedId` without going through `closeEditor`, so without this the
  // next sandbox opened would render — and save — the previous one's edits.
  const [draftOwnerId, setDraftOwnerId] = useState<string | null>(null)
  if (draftOwnerId !== selectedId) {
    setDraftOwnerId(selectedId)
    if (draft) {
      setDraft(null)
      setDependencyIssues([])
      setSystemPackageIssues([])
    }
    // The confirmation belongs to the sandbox that opened it. Browser Back unmounts
    // the modal without closing it, so leaving this set would re-open it against
    // whichever sandbox is selected next — and delete that one instead.
    setShowDeleteConfirm(false)
    // Creating and having one open are mutually exclusive, and history can land on
    // a sandbox while create mode is still set — Forward after starting a new one.
    // Leaving both on renders an empty "New sandbox" form whose Delete still points
    // at the restored sandbox.
    if (selectedId) setIsCreating(false)
  }

  const sandboxes = data?.sandboxes ?? []
  const strategy = data?.strategy ?? 'prebuilt'
  const entitled = data?.entitled ?? false

  // Derived, never duplicated into state: a stale id from an old link resolves to
  // nothing and simply falls back to the list.
  const selected = selectedId ? (sandboxes.find((s) => s.id === selectedId) ?? null) : null
  const baseline = isCreating ? null : selected
  const original = useMemo(() => (baseline ? draftFromSandbox(baseline) : emptyDraft()), [baseline])
  const current = draft ?? original
  const isEditing = isCreating || Boolean(selected)
  const isDirty =
    isEditing &&
    (isCreating
      ? current.name.trim().length > 0 ||
        current.language !== original.language ||
        current.dependencies.trim().length > 0 ||
        current.systemPackages.trim().length > 0 ||
        current.cliTools.length > 0
      : current.name !== original.name ||
        current.language !== original.language ||
        current.dependencies !== original.dependencies ||
        current.systemPackages !== original.systemPackages ||
        current.cliTools.join(',') !== original.cliTools.join(','))

  const discardDraft = useCallback(() => {
    setDraft(null)
    setDependencyIssues([])
    setSystemPackageIssues([])
  }, [])

  // Called before every early return — a hook after a gate is skipped on gated renders.
  const guard = useSettingsUnsavedGuard({
    isDirty,
    navigationBlocked:
      createSandbox.isPending || updateSandbox.isPending || deleteSandbox.isPending,
    onDiscard: discardDraft,
  })

  const closeEditor = useCallback(() => {
    discardDraft()
    setIsCreating(false)
    // Opening pushed a history entry; closing must not push another.
    void setSelectedId(null, { history: 'replace' })
  }, [discardDraft, setSelectedId])

  const handleSave = useCallback(async () => {
    setDependencyIssues([])
    setSystemPackageIssues([])
    const body = {
      name: current.name.trim(),
      language: current.language,
      dependencies: toSubmittedLines(current.dependencies),
      systemPackages: toSubmittedLines(current.systemPackages),
      cliTools: current.cliTools,
    }
    try {
      if (isCreating) {
        await createSandbox.mutateAsync({ workspaceId, ...body })
      } else if (selected) {
        await updateSandbox.mutateAsync({ workspaceId, sandboxId: selected.id, ...body })
      }
      closeEditor()
    } catch (error) {
      const lineIssues = extractIssues(error)
      if (lineIssues) {
        setDependencyIssues(lineIssues.field === 'dependencies' ? lineIssues.issues : [])
        setSystemPackageIssues(lineIssues.field === 'systemPackages' ? lineIssues.issues : [])
        return
      }
      toast.error(getErrorMessage(error, t('saveFailed')))
    }
  }, [current, isCreating, selected, workspaceId, createSandbox, updateSandbox, closeEditor, t])

  const handleDelete = useCallback(
    async (sandbox: Sandbox) => {
      setShowDeleteConfirm(false)
      try {
        await deleteSandbox.mutateAsync({ workspaceId, sandboxId: sandbox.id })
        if (selectedId === sandbox.id) closeEditor()
      } catch (error) {
        toast.error(getErrorMessage(error, t('deleteFailed')))
      }
    },
    [deleteSandbox, workspaceId, selectedId, closeEditor, t]
  )

  const handleRetry = useCallback(async () => {
    if (
      !selected ||
      !canRetrySandboxBuild({
        canAdmin,
        isDirty,
        saving: createSandbox.isPending || updateSandbox.isPending,
      })
    ) {
      return
    }
    try {
      await updateSandbox.mutateAsync({
        workspaceId,
        sandboxId: selected.id,
        language: selected.language,
        dependencies: selected.dependencies,
        systemPackages: selected.systemPackages,
        cliTools: selected.cliTools,
      })
      toast.success(t('buildQueued'))
    } catch (error) {
      toast.error(getErrorMessage(error, t('retryFailed')))
    }
  }, [
    canAdmin,
    createSandbox.isPending,
    isDirty,
    selected,
    updateSandbox,
    updateSandbox.isPending,
    workspaceId,
    t,
  ])

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return sandboxes
    return sandboxes.filter(
      (sandbox) =>
        sandbox.name.toLowerCase().includes(query) ||
        sandbox.dependencies.some((dependency) => dependency.toLowerCase().includes(query)) ||
        sandbox.systemPackages.some((systemPackage) =>
          systemPackage.toLowerCase().includes(query)
        ) ||
        sandbox.cliTools.some((cliTool) => cliTool.toLowerCase().includes(query))
    )
  }, [sandboxes, searchTerm])

  if (isLoading) {
    return (
      <SettingsPanel>
        <SettingsEmptyState>{t('loading')}</SettingsEmptyState>
      </SettingsPanel>
    )
  }

  if (error && data === undefined) {
    return (
      <SettingsPanel>
        <SettingsEmptyState>{getErrorMessage(error, t('loadFailed'))}</SettingsEmptyState>
      </SettingsPanel>
    )
  }

  if (!entitled) {
    return (
      <SettingsPanel>
        <SettingsUpgradeNotice
          title={t('upgradeTitle')}
          description={t('upgradeDescription')}
          canUpgrade={canAdmin}
        />
      </SettingsPanel>
    )
  }

  if (isEditing) {
    const saving = createSandbox.isPending || updateSandbox.isPending
    const canRetry = canRetrySandboxBuild({ canAdmin, isDirty, saving })
    return (
      <>
        <SettingsPanel
          title={isCreating ? t('newSandbox') : (selected?.name ?? t('sandboxFallbackTitle'))}
          description={t('editorDescription')}
          back={{
            text: t('backLabel'),
            icon: ArrowLeft,
            onSelect: () => guard.guardBack(closeEditor),
          }}
          actions={[
            ...saveDiscardActions({
              dirty: isDirty,
              saving,
              onSave: () => void handleSave(),
              onDiscard: discardDraft,
              saveDisabled: !canAdmin || current.name.trim().length === 0,
              creating: isCreating,
            }),
            ...(selected && canAdmin
              ? [
                  {
                    id: 'delete',
                    text: deleteSandbox.isPending ? tShared('deleting') : tShared('delete'),
                    onSelect: () => setShowDeleteConfirm(true),
                    disabled: deleteSandbox.isPending,
                  },
                ]
              : []),
          ]}
        >
          <SandboxEditor
            draft={current}
            onChange={setDraft}
            dependencyIssues={dependencyIssues}
            systemPackageIssues={systemPackageIssues}
            disabled={!canAdmin || saving}
            status={
              selected ? (
                <SandboxStatus
                  sandbox={selected}
                  strategy={strategy}
                  onRetry={canAdmin ? () => void handleRetry() : undefined}
                  retrying={updateSandbox.isPending}
                  retryDisabled={!canRetry}
                />
              ) : undefined
            }
          />
        </SettingsPanel>

        {selected && (
          <ChipConfirmModal
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            srTitle={t('deleteTitle')}
            title={t('deleteTitle')}
            text={sandboxDeleteConfirmText(selected.name, {
              intro: t('deleteConfirm.intro'),
              consequence: t('deleteConfirm.consequence'),
              irreversible: t('deleteConfirm.irreversible'),
            })}
            confirm={{ label: tShared('delete'), onClick: () => void handleDelete(selected) }}
          />
        )}
      </>
    )
  }

  return (
    <SettingsPanel
      search={{ value: searchTerm, onChange: setSearchTerm, placeholder: t('searchPlaceholder') }}
      actions={
        canAdmin
          ? [
              {
                text: t('newSandbox'),
                icon: Plus,
                variant: 'primary' as const,
                onSelect: () => {
                  setDraft(emptyDraft())
                  setIsCreating(true)
                  // Starting a new one is not editing the open one. Replace rather
                  // than push: this is a mode switch, not a destination.
                  void setSelectedId(null, { history: 'replace' })
                },
              },
            ]
          : []
      }
    >
      {filtered.length === 0 ? (
        <SettingsEmptyState variant={searchTerm ? 'inline' : 'fill'}>
          {searchTerm ? t('noSearchResults') : t('empty')}
        </SettingsEmptyState>
      ) : (
        <div className={RESOURCE_LIST_STACK}>
          {filtered.map((sandbox) => (
            <SettingsResourceRow
              key={sandbox.id}
              icon={<CodeIcon className='text-[var(--text-icon)]' />}
              iconFilled
              title={sandbox.name}
              description={t('rowDescription', {
                language: sandbox.language === 'python' ? 'Python' : 'JavaScript',
                counts: t('counts', {
                  dependencies: sandbox.dependencies.length,
                  systemPackages: sandbox.systemPackages.length,
                  cliTools: sandbox.cliTools.length,
                }),
              })}
              onClick={() => void setSelectedId(sandbox.id)}
              clickLabel={t('openSandbox', { name: sandbox.name })}
              navigable
            />
          ))}
        </div>
      )}
    </SettingsPanel>
  )
}
