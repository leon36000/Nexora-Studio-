'use client'

import { useRef } from 'react'
import { Button, Chip, ChipTextarea, Tooltip } from '@sim/emcn'
import { Paperclip, Send, Square, X } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { CHAT_ACCEPT_ATTRIBUTE } from '@/lib/uploads/utils/validation'

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
}: ComposerProps) {
  const t = useTranslations('assistant.composer')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canSend = !isBusy && value.trim().length > 0

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
      <ChipTextarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
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
