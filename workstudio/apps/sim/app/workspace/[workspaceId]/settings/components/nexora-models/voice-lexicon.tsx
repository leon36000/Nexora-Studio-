'use client'

import { useState } from 'react'
import { Chip, ChipTextarea, toast } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { useNexoraVoiceLexicon, useUpdateNexoraVoiceLexicon } from '@/hooks/queries/nexora-voice'

/** The lexicon as typed: one term per line. */
function toLines(lexicon: readonly string[]): string {
  return lexicon.join('\n')
}

function fromLines(text: string): string[] {
  return text.split(/\r?\n/)
}

interface VoiceLexiconProps {
  lexicon: readonly string[]
}

function VoiceLexiconEditor({ lexicon }: VoiceLexiconProps) {
  const t = useTranslations('settings.models.lexicon')
  const update = useUpdateNexoraVoiceLexicon()
  const saved = toLines(lexicon)
  const [draft, setDraft] = useState(saved)
  const dirty = draft.trim() !== saved.trim()

  const handleSave = () =>
    update.mutate(fromLines(draft), {
      onSuccess: (result) => {
        setDraft(toLines(result.lexicon))
        toast.success(t('saved'))
      },
      onError: () => toast.error(t('failed')),
    })

  return (
    <div className='flex flex-col gap-2'>
      <ChipTextarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label={t('label')}
        placeholder={t('placeholder')}
        rows={5}
      />
      <div className='flex items-center gap-2'>
        <p className='text-[var(--text-muted)] text-caption'>{t('hint')}</p>
        <Chip
          variant='primary'
          className='ml-auto'
          disabled={!dirty || update.isPending}
          onClick={handleSave}
        >
          {update.isPending ? t('saving') : t('save')}
        </Chip>
      </div>
    </div>
  )
}

/**
 * Réglages › Modèles: the names Whisper must spell right (people, products, places), given to
 * every transcription as its initial prompt. One term per line; the server keeps the first 100.
 */
export function VoiceLexicon() {
  const t = useTranslations('settings.models.lexicon')
  const { data } = useNexoraVoiceLexicon()
  if (!data) return null
  return (
    <SettingsSection label={t('title')}>
      <VoiceLexiconEditor key={data.lexicon.join('\n')} lexicon={data.lexicon} />
    </SettingsSection>
  )
}
