'use client'

import { useMemo, useState } from 'react'
import { Chip, ChipDropdown, ChipInput, ChipTextarea, cn } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { SandboxDependencyIssue } from '@/lib/api/contracts/sandboxes'
import { RowActionsMenu } from '@/app/workspace/[workspaceId]/settings/components/row-actions-menu'
import { ManagedCliSelect } from '@/app/workspace/[workspaceId]/settings/components/sandboxes/components/managed-cli-select'
import {
  DEPENDENCY_PLACEHOLDERS,
  LANGUAGE_OPTIONS,
  type SandboxDraft,
  type SandboxLanguage,
  SYSTEM_PACKAGE_PLACEHOLDER,
} from '@/app/workspace/[workspaceId]/settings/components/sandboxes/utils'
import { SettingsField } from '@/app/workspace/[workspaceId]/settings/components/settings-field'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import type { Sandbox } from '@/hooks/queries/sandboxes'

interface SandboxEditorProps {
  draft: SandboxDraft
  onChange: (draft: SandboxDraft) => void
  /** Server-reported bad dependency lines, addressed to the row the user typed them on. */
  dependencyIssues: SandboxDependencyIssue[]
  /** Server-reported bad system-package lines, addressed to the row the user typed them on. */
  systemPackageIssues: SandboxDependencyIssue[]
  disabled?: boolean
  /** Build status row. Absent for an unsaved sandbox and under the runtime strategy. */
  status?: React.ReactNode
}

export function SandboxEditor({
  draft,
  onChange,
  dependencyIssues,
  systemPackageIssues,
  disabled = false,
  status,
}: SandboxEditorProps) {
  const t = useTranslations('settings.sandboxes')
  const dependencyIssuesByLine = useMemo(() => {
    const byLine = new Map<number, SandboxDependencyIssue>()
    for (const issue of dependencyIssues) {
      if (!byLine.has(issue.line)) byLine.set(issue.line, issue)
    }
    return byLine
  }, [dependencyIssues])

  const systemPackageIssuesByLine = useMemo(() => {
    const byLine = new Map<number, SandboxDependencyIssue>()
    for (const issue of systemPackageIssues) {
      if (!byLine.has(issue.line)) byLine.set(issue.line, issue)
    }
    return byLine
  }, [systemPackageIssues])

  return (
    <div className='flex flex-col gap-7'>
      <SettingsSection label={t('editor.details')}>
        <div className='flex flex-col gap-4'>
          <SettingsField label={t('fields.name')}>
            <ChipInput
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
              placeholder='bigquery-etl'
              disabled={disabled}
              maxLength={64}
              autoComplete='off'
            />
          </SettingsField>
          <SettingsField label={t('fields.language')}>
            <ChipDropdown
              value={draft.language}
              onChange={(language) => onChange({ ...draft, language: language as SandboxLanguage })}
              options={LANGUAGE_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              disabled={disabled}
            />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection label={t('fields.dependencies')}>
        <div className='flex flex-col gap-2'>
          <ChipTextarea
            value={draft.dependencies}
            onChange={(event) => onChange({ ...draft, dependencies: event.target.value })}
            placeholder={DEPENDENCY_PLACEHOLDERS[draft.language]}
            rows={8}
            disabled={disabled}
            error={dependencyIssues.length > 0}
            spellCheck={false}
            autoComplete='off'
          />
          <p className='text-[var(--text-muted)] text-caption'>{t('fields.dependenciesHint')}</p>
          {dependencyIssues.length > 0 && (
            <ul className='flex flex-col gap-1'>
              {[...dependencyIssuesByLine.values()].map((issue) => (
                <li key={issue.line} className='text-[var(--text-error)] text-caption'>
                  {t('lineIssue', { line: issue.line, reason: issue.reason })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsSection>

      <SettingsSection label={t('fields.cliTools')}>
        <ManagedCliSelect
          value={draft.cliTools}
          onChange={(cliTools) => onChange({ ...draft, cliTools })}
          disabled={disabled}
          stayBelow
        />
      </SettingsSection>

      <SettingsSection label={t('fields.systemPackages')}>
        <div className='flex flex-col gap-2'>
          <ChipTextarea
            value={draft.systemPackages}
            onChange={(event) => onChange({ ...draft, systemPackages: event.target.value })}
            placeholder={SYSTEM_PACKAGE_PLACEHOLDER}
            rows={6}
            disabled={disabled}
            error={systemPackageIssues.length > 0}
            spellCheck={false}
            autoComplete='off'
          />
          <p className='text-[var(--text-muted)] text-caption'>{t('fields.systemPackagesHint')}</p>
          {systemPackageIssues.length > 0 && (
            <ul className='flex flex-col gap-1'>
              {[...systemPackageIssuesByLine.values()].map((issue) => (
                <li key={issue.line} className='text-[var(--text-error)] text-caption'>
                  {t('lineIssue', { line: issue.line, reason: issue.reason })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsSection>

      {status && <SettingsSection label={t('editor.status')}>{status}</SettingsSection>}
    </div>
  )
}

interface SandboxStatusProps {
  sandbox: Sandbox
  /** Runtime-strategy deployments have no build to report. */
  strategy: 'prebuilt' | 'runtime'
  onRetry?: () => void
  retrying?: boolean
  retryDisabled?: boolean
}

export function SandboxStatus({
  sandbox,
  strategy,
  onRetry,
  retrying = false,
  retryDisabled = false,
}: SandboxStatusProps) {
  const t = useTranslations('settings.sandboxes')
  const [showLog, setShowLog] = useState(false)

  if (strategy === 'runtime') {
    return <p className='text-[var(--text-muted)] text-caption'>{t('status.runtimeStrategy')}</p>
  }

  const dependencyCount = sandbox.dependencies.length
  const systemPackageCount = sandbox.systemPackages.length
  const cliToolCount = sandbox.cliTools.length

  if (dependencyCount === 0 && systemPackageCount === 0 && cliToolCount === 0) {
    return <p className='text-[var(--text-muted)] text-caption'>{t('status.nothingToBuild')}</p>
  }

  const status = sandbox.buildStatus ?? 'pending'

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <span
          className={cn(
            'text-sm',
            status === 'failed' ? 'text-[var(--text-error)]' : 'text-[var(--text-body)]'
          )}
        >
          {t(`status.${status}`)}
        </span>
        <span className='text-[var(--text-muted)] text-caption'>
          ·{' '}
          {t('counts', {
            dependencies: dependencyCount,
            systemPackages: systemPackageCount,
            cliTools: cliToolCount,
          })}
        </span>
        {status === 'failed' && onRetry && (
          <RowActionsMenu
            label={t('status.buildActionsLabel', { name: sandbox.name })}
            triggerClassName='ml-auto'
            actions={[
              {
                label: retrying ? t('status.retrying') : t('status.retryBuild'),
                onSelect: onRetry,
                disabled: retrying || retryDisabled,
                tooltip: retryDisabled ? t('status.retryBlocked') : undefined,
              },
            ]}
          />
        )}
      </div>

      {status === 'failed' && sandbox.errorMessage && (
        <div className='flex flex-col gap-2'>
          <p className='text-[var(--text-error)] text-caption'>{sandbox.errorMessage}</p>
          {sandbox.errorDetail && (
            <>
              <Chip onClick={() => setShowLog((open) => !open)}>
                {showLog ? t('status.hideLog') : t('status.showLog')}
              </Chip>
              {showLog && (
                <pre className='max-h-64 overflow-auto whitespace-pre-wrap rounded-[8px] bg-[var(--surface-3)] p-3 text-[var(--text-muted)] text-caption'>
                  {sandbox.errorDetail}
                </pre>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
