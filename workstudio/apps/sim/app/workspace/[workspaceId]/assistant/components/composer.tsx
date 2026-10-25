'use client'

import { useRef } from 'react'
import { Button, Chip, ChipTextarea, OverflowText, Tooltip } from '@sim/emcn'
import { Mic, Paperclip, Send, Square, X } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { CHAT_ACCEPT_ATTRIBUTE } from '@/lib/uploads/utils/validation'
import { useDictation } from '@/app/workspace/[workspaceId]/assistant/hooks/use-dictation'
import {
  activeSkillMention,
  completeSkillMention,
  matchingSkills,
} from '@/app/workspace/[workspaceId]/assistant/skill-mention'

/** A file waiting to be sent with the next message. */
export interface DraftFile {
  id: string
  file: File
}

interface ComposerProps {
  value: string
  onChange: (value: string) => void
  files: DraftFile[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (id: string) => void
  onSend: () => void
  onStop: () => void
  /** An answer is arriving: Stop replaces Send. */
  isBusy: boolean
  /** Hidden for members who cannot store files in the workspace. */
  canAttach: boolean
  /** The microphone, offered when the instance has a Transcription model. */
  dictation?: { workspaceId: string; language: string; onText: (text: string) => void }
  /** The workspace's skills, offered when the message starts a `@` mention. */
  skills?: { name: string; description: string }[]
}

interface DictationButtonProps {
  workspaceId: string
  language: string
  onText: (text: string) => void
  disabled: boolean
}

/** The microphone: records, then puts the transcribed words in the message box. */
function DictationButton({ workspaceId, language, onText, disabled }: DictationButtonProps) {
  const t = useTranslations('assistant.composer')
  const tErrors = useTranslations('assistant.voice.dictationErrors')
  const { status, error, start, stop } = useDictation({
    workspaceId,
    language,
    onText,
  })
  const isRecording = status === 'recording'
  const isTranscribing = status === 'transcribing'
  const label = isRecording ? t('dictateStop') : t('dictate')

  return (
    <>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button
            type='button'
            variant={isRecording ? 'primary' : 'quiet'}
            size='icon'
            onClick={() => (isRecording ? stop() : void start())}
            disabled={disabled || isTranscribing}
            aria-label={label}
            aria-pressed={isRecording}
          >
            {isRecording ? <Square className='size-[14px]' /> : <Mic className='size-[14px]' />}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>{label}</Tooltip.Content>
      </Tooltip.Root>
      {(isRecording || isTranscribing) && (
        <span role='status' className='text-[var(--text-muted)] text-caption'>
          {isRecording ? t('dictating') : t('transcribing')}
        </span>
      )}
      {error && (
        <span role='alert' className='text-[var(--text-error)] text-caption'>
          {tErrors(error)}
        </span>
      )}
    </>
  )
}

/** The message box: Enter sends, Shift+Enter starts a new line; files are attached below it. */
export function Composer({
  value,
  onChange,
  files,
  onAddFiles,
  onRemoveFile,
  onSend,
  onStop,
  isBusy,
  canAttach,
  dictation,
  skills,
}: ComposerProps) {
  const t = useTranslations('assistant.composer')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canSend = !isBusy && value.trim().length > 0
  const mention = skills ? activeSkillMention(value) : null
  const offered = mention && skills ? matchingSkills(skills, mention.query) : []

  return (
    <div className='flex flex-col gap-2'>
      {files.length > 0 && (
        <ul className='flex flex-wrap gap-1'>
          {files.map(({ id, file }) => (
            <li
              key={id}
              className='flex items-center gap-1 rounded-md border border-[var(--border)] py-0.5 pr-0.5 pl-2 text-[var(--text-body)] text-caption'
            >
              <Paperclip className='size-[12px] shrink-0 text-[var(--text-icon)]' />
              <span className='break-all'>{file.name}</span>
              <Button
                type='button'
                variant='quiet'
                size='icon'
                onClick={() => onRemoveFile(id)}
                aria-label={t('removeFile', { name: file.name })}
                disabled={isBusy}
              >
                <X className='size-[12px]' />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {offered.length > 0 && (
        <ul
          aria-label={t('skills')}
          className='flex flex-col rounded-lg border border-[var(--border)] p-1'
        >
          {offered.map((skill, index) => (
            <li key={skill.name}>
              <button
                type='button'
                onClick={() => onChange(completeSkillMention(value, skill.name))}
                aria-keyshortcuts={index === 0 ? 'Tab' : undefined}
                className='flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left transition-colors hover-hover:bg-[var(--surface-hover)]'
              >
                <span className='text-[var(--text-body)] text-small'>@{skill.name}</span>
                <span className='min-w-0 flex-1 text-[var(--text-muted)] text-caption'>
                  <OverflowText label={skill.description} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ChipTextarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Tab' && !event.shiftKey && offered.length > 0) {
            event.preventDefault()
            onChange(completeSkillMention(value, offered[0].name))
            return
          }
          if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
          event.preventDefault()
          if (canSend) onSend()
        }}
        aria-label={t('label')}
        placeholder={t('placeholder')}
        rows={3}
        className='max-h-[240px]'
      />
      <div className='flex items-center gap-1'>
        {canAttach && (
          <>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button
                  type='button'
                  variant='quiet'
                  size='icon'
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  aria-label={t('attach')}
                >
                  <Paperclip className='size-[14px]' />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('attach')}</Tooltip.Content>
            </Tooltip.Root>
            <input
              ref={fileInputRef}
              type='file'
              multiple
              accept={CHAT_ACCEPT_ATTRIBUTE}
              className='hidden'
              onChange={(event) => {
                onAddFiles(Array.from(event.target.files ?? []))
                event.target.value = ''
              }}
            />
          </>
        )}
        {dictation && (
          <DictationButton
            workspaceId={dictation.workspaceId}
            language={dictation.language}
            onText={dictation.onText}
            disabled={isBusy}
          />
        )}
        <div className='ml-auto'>
          {isBusy ? (
            <Chip leftIcon={Square} onClick={onStop}>
              {t('stop')}
            </Chip>
          ) : (
            <Chip variant='primary' leftIcon={Send} disabled={!canSend} onClick={onSend}>
              {t('send')}
            </Chip>
          )}
        </div>
      </div>
    </div>
  )
}
