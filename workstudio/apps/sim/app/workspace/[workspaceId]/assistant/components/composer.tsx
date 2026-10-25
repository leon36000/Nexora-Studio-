'use client'

import { useRef, useState } from 'react'
import { Button, Chip, ChipTextarea, Tooltip } from '@sim/emcn'
import { Mic, Paperclip, Send, Square, X } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { activeMention, completeMention, type MentionableSkill } from '@/lib/nexora/skills-mention'
import { CHAT_ACCEPT_ATTRIBUTE } from '@/lib/uploads/utils/validation'
import { SkillMentionList } from '@/app/workspace/[workspaceId]/assistant/components/skill-mention-list'
import { useDictation } from '@/app/workspace/[workspaceId]/assistant/hooks/use-dictation'

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
  /** Skills of the workspace a message can invoke with `@`. */
  skills?: readonly MentionableSkill[]
}

const MAX_SUGGESTIONS = 5
const NO_SKILLS: readonly MentionableSkill[] = []

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
  skills = NO_SKILLS,
}: ComposerProps) {
  const t = useTranslations('assistant.composer')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [caret, setCaret] = useState(0)
  const [highlight, setHighlight] = useState(0)
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)
  const canSend = !isBusy && value.trim().length > 0

  const mention = skills.length > 0 ? activeMention(value, caret) : null
  const suggestions =
    mention && mention.start !== dismissedAt
      ? skills
          .filter((skill) => skill.name.toLowerCase().startsWith(mention.query.toLowerCase()))
          .slice(0, MAX_SUGGESTIONS)
      : []
  const selected = Math.min(highlight, Math.max(suggestions.length - 1, 0))

  const pickSkill = (name: string) => {
    if (!mention) return
    const completed = completeMention(value, mention, name)
    onChange(completed.text)
    setCaret(completed.caret)
    requestAnimationFrame(() =>
      textareaRef.current?.setSelectionRange(completed.caret, completed.caret)
    )
  }

  const followCaret = (element: HTMLTextAreaElement) => {
    setCaret(element.selectionStart)
    setHighlight(0)
    setDismissedAt(null)
  }

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
      {suggestions.length > 0 && (
        <SkillMentionList
          skills={suggestions}
          highlighted={selected}
          onPick={pickSkill}
          onHighlight={setHighlight}
        />
      )}
      <ChipTextarea
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          followCaret(event.target)
        }}
        onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
        onKeyDown={(event) => {
          if (suggestions.length > 0 && !event.nativeEvent.isComposing) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              const step = event.key === 'ArrowDown' ? 1 : suggestions.length - 1
              setHighlight((selected + step) % suggestions.length)
              return
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault()
              pickSkill(suggestions[selected].name)
              return
            }
            if (event.key === 'Escape' && mention) {
              event.preventDefault()
              setDismissedAt(mention.start)
              return
            }
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
