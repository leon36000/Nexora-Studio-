'use client'

import { useState } from 'react'
import {
  Chip,
  ChipLink,
  cn,
  scrollFadeAttributes,
  scrollFadeClass,
  useScrollEdges,
} from '@sim/emcn'
import { Loader } from '@sim/emcn/icons'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { welcomeTemplates } from '@/lib/nexora/welcome-templates'
import {
  outputText,
  quoteFailureKind,
  runFailureReason,
} from '@/app/workspace/[workspaceId]/home/nexora-home/onboarding-state'
import { useTemplateWorkflows } from '@/app/workspace/[workspaceId]/home/nexora-home/use-template-workflows'
import { useRunWorkflowOnce } from '@/hooks/queries/nexora-home'

/** Loaded on demand: the result is shown only after the run. */
const MarkdownRenderer = dynamic(
  () => import('@/app/(interfaces)/chat/components/message/components/markdown-renderer')
)

interface WelcomePanelProps {
  workspaceId: string
  /** The person's own default model is known; without one the run cannot answer. */
  hasModel: boolean
  /** « Plus tard », or « Terminer » once the first result is in: the panel does not come back. */
  onClose: () => void
}

/**
 * Nexora edition, first launch of a person (not the instance's administrator, who has the
 * five-step panel): pick an SME template, run it once with its example values, read the result.
 * Two steps, no form to fill in.
 */
export function WelcomePanel({ workspaceId, hasModel, onClose }: WelcomePanelProps) {
  const t = useTranslations('home.nexoraHome.welcome')
  const templates = welcomeTemplates()
  const { templates: workflows, isLoading } = useTemplateWorkflows(workspaceId)
  const runWorkflow = useRunWorkflowOnce()
  const [slug, setSlug] = useState<string | null>(null)
  const [resultElement, setResultElement] = useState<HTMLDivElement | null>(null)
  const resultEdges = useScrollEdges(resultElement)

  const offered = templates.filter((template) =>
    workflows.some((workflow) => workflow.name === template.name)
  )
  if (isLoading || offered.length === 0) return null

  const selected = offered.find((template) => template.slug === slug) ?? offered[0]
  const workflow = workflows.find((candidate) => candidate.name === selected.name)

  const handlePick = (next: string) => {
    if (runWorkflow.isPending) return
    runWorkflow.reset()
    setSlug(next)
  }

  const handleRun = () => {
    if (!workflow) return
    runWorkflow.mutate({
      workflowId: workflow.id,
      input: Object.fromEntries(selected.inputs.map((field) => [field.name, field.example])),
    })
  }

  const result = runWorkflow.data
  const text = result?.success ? outputText(result.output) : ''
  let error: string | null = null
  if (runWorkflow.error) error = t(`errors.${quoteFailureKind(runWorkflow.error)}`)
  else if (result && !result.success) error = runFailureReason(result) ?? t('errors.generic')
  else if (result && !text) error = t('empty')

  return (
    <section
      aria-labelledby='welcome-title'
      className='flex flex-col rounded-lg border border-[var(--border)] px-4 pt-3 pb-4'
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-col gap-0.5'>
          <h2 id='welcome-title' className='font-medium text-[var(--text-body)] text-sm'>
            {t('title')}
          </h2>
          <p className='text-[var(--text-muted)] text-small'>{t('subtitle')}</p>
        </div>
        <Chip onClick={onClose}>{text ? t('done') : t('later')}</Chip>
      </div>

      <ol className='mt-3 flex flex-col gap-4'>
        <li className='flex flex-col gap-2'>
          <span className='text-[var(--text-body)] text-sm'>{t('pick')}</span>
          <div role='group' aria-label={t('pick')} className='flex flex-wrap gap-2'>
            {offered.map((template) => (
              <Chip
                key={template.slug}
                variant={template.slug === selected.slug ? 'primary' : 'border'}
                aria-pressed={template.slug === selected.slug}
                disabled={runWorkflow.isPending}
                onClick={() => handlePick(template.slug)}
              >
                {template.name}
              </Chip>
            ))}
          </div>
          <p className='text-[var(--text-muted)] text-caption'>{selected.description}</p>
        </li>
        <li className='flex flex-col gap-2'>
          <span className='text-[var(--text-body)] text-sm'>{t('run')}</span>
          <div className='flex flex-wrap items-center gap-2'>
            <Chip
              variant='border'
              disabled={!workflow || !hasModel || runWorkflow.isPending}
              rightAdornment={
                runWorkflow.isPending ? (
                  <Loader animate className='size-[14px] text-[var(--text-icon)]' />
                ) : undefined
              }
              onClick={handleRun}
            >
              {runWorkflow.isPending ? t('running') : t('runAction')}
            </Chip>
            {workflow && (
              <ChipLink href={`/workspace/${workspaceId}/w/${workflow.id}`}>
                {t('openWorkflow')}
              </ChipLink>
            )}
          </div>
          {!hasModel && <p className='text-[var(--text-muted)] text-caption'>{t('noModel')}</p>}
          <div aria-live='polite'>
            {error && (
              <p role='alert' className='text-[var(--text-error)] text-caption'>
                {error}
              </p>
            )}
          </div>
          {text && (
            <div
              ref={setResultElement}
              className={cn(
                'max-h-[320px] overflow-y-auto rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--text-body)] text-small',
                scrollFadeClass
              )}
              {...scrollFadeAttributes(resultEdges)}
            >
              <MarkdownRenderer content={text} />
            </div>
          )}
        </li>
      </ol>
    </section>
  )
}
