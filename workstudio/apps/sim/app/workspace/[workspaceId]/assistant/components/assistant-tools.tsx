'use client'

import { Chip, ChipLink } from '@sim/emcn'
import { Calendar, Folder, Link, Play, Settings } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'

interface AssistantToolsProps {
  workspaceId: string
  /** Writers also manage the published workflows. */
  canWrite: boolean
  onOpenProjects: () => void
  onOpenTasks: () => void
  onOpenLauncher: () => void
  onOpenPublished: () => void
}

/** The Assistant's extra surfaces, under « Nouvelle conversation »: projects, tasks, workflows, accounts. */
export function AssistantTools({
  workspaceId,
  canWrite,
  onOpenProjects,
  onOpenTasks,
  onOpenLauncher,
  onOpenPublished,
}: AssistantToolsProps) {
  const t = useTranslations('assistant.tools')
  return (
    <nav aria-label={t('label')} className='flex flex-col gap-1'>
      <Chip leftIcon={Folder} onClick={onOpenProjects} className='w-full justify-start'>
        {t('projects')}
      </Chip>
      <Chip leftIcon={Calendar} onClick={onOpenTasks} className='w-full justify-start'>
        {t('tasks')}
      </Chip>
      <Chip leftIcon={Play} onClick={onOpenLauncher} className='w-full justify-start'>
        {t('launch')}
      </Chip>
      {canWrite && (
        <Chip leftIcon={Settings} onClick={onOpenPublished} className='w-full justify-start'>
          {t('manage')}
        </Chip>
      )}
      <ChipLink
        href={`/workspace/${workspaceId}/connecteurs?scope=personal`}
        leftIcon={Link}
        className='w-full justify-start'
      >
        {t('connections')}
      </ChipLink>
    </nav>
  )
}
