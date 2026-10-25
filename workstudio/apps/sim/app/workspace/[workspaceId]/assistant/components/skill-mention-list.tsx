'use client'

import { chipActiveSurfaceClass, chipHoverSurfaceClass, cn, OverflowText } from '@sim/emcn'
import { useTranslations } from 'next-intl'

interface SkillMentionListProps {
  skills: Array<{ id: string; name: string; description: string }>
  highlighted: number
  onPick: (name: string) => void
  onHighlight: (index: number) => void
}

/** The skills matching the `@word` being typed, above the message box. */
export function SkillMentionList({
  skills,
  highlighted,
  onPick,
  onHighlight,
}: SkillMentionListProps) {
  const t = useTranslations('assistant.composer')
  return (
    <div
      role='listbox'
      aria-label={t('skills')}
      className='flex flex-col gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-5)] p-1'
    >
      {skills.map((skill, index) => (
        <div
          key={skill.id}
          role='option'
          aria-selected={index === highlighted}
          className={cn(
            'flex min-h-[28px] cursor-pointer items-center gap-2 rounded-md px-2 text-small',
            index === highlighted ? chipActiveSurfaceClass : chipHoverSurfaceClass
          )}
          onMouseEnter={() => onHighlight(index)}
          onMouseDown={(event) => {
            event.preventDefault()
            onPick(skill.name)
          }}
        >
          <span className='shrink-0 text-[var(--text-body)]'>@{skill.name}</span>
          <OverflowText
            label={skill.description}
            className='text-[var(--text-muted)] text-caption'
          />
        </div>
      ))}
    </div>
  )
}
