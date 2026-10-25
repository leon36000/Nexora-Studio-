'use client'

import { useState } from 'react'
import { Chip, ChipLink, OverflowText } from '@sim/emcn'
import { FileText, HelpCircle, Loader, Plus } from '@sim/emcn/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { docsUrl } from '@/lib/branding/docs-url'
import { CreatePromptModal } from '@/app/workspace/[workspaceId]/prompts/components/create-prompt-modal'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useNexoraPrompts } from '@/hooks/queries/nexora-prompts'

interface PromptListProps {
  workspaceId: string
}

/** Nexora edition: the workspace's versioned prompts, with where each label points. */
export function PromptList({ workspaceId }: PromptListProps) {
  const t = useTranslations('agents.prompts')
  const router = useRouter()
  const { canEdit } = useUserPermissionsContext()
  const { data: prompts, isLoading, isError } = useNexoraPrompts(workspaceId)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[64rem] flex-col gap-6 py-10'>
        <header className='flex items-center justify-between gap-4'>
          <h1 className='font-medium text-[var(--text-body)] text-lg'>{t('title')}</h1>
          <div className='flex shrink-0 items-center gap-1'>
            <ChipLink
              href={docsUrl('/prompts')}
              target='_blank'
              rel='noopener noreferrer'
              leftIcon={HelpCircle}
            >
              {t('help')}
            </ChipLink>
            {canEdit && (
              <Chip variant='primary' leftIcon={Plus} onClick={() => setIsCreating(true)}>
                {t('newPrompt')}
              </Chip>
            )}
          </div>
        </header>
        {isLoading ? (
          <Loader className='size-[16px] text-[var(--text-muted)]' animate />
        ) : isError ? (
          <p className='text-[var(--text-error)] text-small'>{t('loadFailed')}</p>
        ) : !prompts?.length ? (
          <p className='text-[var(--text-muted)] text-small'>{t('empty')}</p>
        ) : (
          <ul className='flex flex-col divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]'>
            {prompts.map((prompt) => (
              <li key={prompt.id}>
                <Link
                  href={`/workspace/${workspaceId}/prompts/${prompt.id}`}
                  className='flex items-center gap-3 px-4 py-3 transition-colors hover-hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none'
                >
                  <FileText className='size-[16px] shrink-0 text-[var(--text-icon)]' />
                  <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                    <OverflowText
                      label={prompt.name}
                      focusTarget='nearest-interactive'
                      className='text-[var(--text-body)] text-sm'
                    />
                    {prompt.description && (
                      <OverflowText
                        label={prompt.description}
                        focusTarget='nearest-interactive'
                        className='text-[var(--text-muted)] text-caption'
                      />
                    )}
                  </div>
                  <span className='shrink-0 text-[var(--text-muted)] text-caption'>
                    {t('labelsSummary', {
                      production: prompt.labels.production ?? '—',
                      test: prompt.labels.test ?? '—',
                      latest: prompt.latestVersion,
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <CreatePromptModal
        workspaceId={workspaceId}
        open={isCreating}
        onOpenChange={setIsCreating}
        onCreated={(promptId) => router.push(`/workspace/${workspaceId}/prompts/${promptId}`)}
      />
    </div>
  )
}
