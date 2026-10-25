'use client'

import { type ReactNode, useState } from 'react'
import {
  Button,
  Chip,
  ChipConfirmModal,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  OverflowText,
} from '@sim/emcn'
import { Loader, MoreHorizontal, Pencil, Plus, Trash } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import {
  useDeleteAssistantConversation,
  useRenameAssistantConversation,
} from '@/hooks/queries/nexora-assistant'

interface ConversationSummary {
  id: string
  title: string
}

interface ConversationListProps {
  conversations: ConversationSummary[]
  isLoading: boolean
  isError: boolean
  selectedId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDeleted: (id: string) => void
  /** The Assistant's other surfaces (projects, tasks, workflows), under « Nouvelle conversation ». */
  tools?: ReactNode
}

/** The member's own conversations, most recently active first, with « Nouvelle conversation ». */
export function ConversationList({
  conversations,
  isLoading,
  isError,
  selectedId,
  onSelect,
  onNew,
  onDeleted,
  tools,
}: ConversationListProps) {
  const t = useTranslations('assistant.conversations')
  const [renaming, setRenaming] = useState<ConversationSummary | null>(null)
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null)

  return (
    <aside className='flex min-h-0 flex-col border-[var(--border)] max-md:max-h-[40%] max-md:border-b md:w-[260px] md:shrink-0 md:border-r'>
      <div className='flex flex-col gap-3 px-3 pt-4 pb-2'>
        <h2 className='px-1 text-[var(--text-muted)] text-small'>{t('label')}</h2>
        <Chip leftIcon={Plus} onClick={onNew} className='w-full justify-start'>
          {t('new')}
        </Chip>
        {tools}
      </div>
      <nav className='min-h-0 flex-1 overflow-y-auto px-3 pb-3' aria-label={t('label')}>
        {isLoading ? (
          <Loader className='mx-1 my-2 size-[14px] text-[var(--text-muted)]' animate />
        ) : isError ? (
          <p className='px-1 py-2 text-[var(--text-error)] text-caption'>{t('loadFailed')}</p>
        ) : conversations.length === 0 ? (
          <p className='px-1 py-2 text-[var(--text-muted)] text-caption'>{t('empty')}</p>
        ) : (
          <ul className='flex flex-col gap-0.5'>
            {conversations.map((conversation) => (
              <li
                key={conversation.id}
                className={cn(
                  'group flex items-center gap-1 rounded-md pr-1 transition-colors hover-hover:bg-[var(--surface-hover)]',
                  conversation.id === selectedId && 'bg-[var(--surface-active)]'
                )}
              >
                <button
                  type='button'
                  onClick={() => onSelect(conversation.id)}
                  aria-current={conversation.id === selectedId ? 'page' : undefined}
                  className='flex min-w-0 flex-1 items-center px-2 py-1.5 text-left focus-visible:outline-none'
                >
                  <OverflowText
                    label={conversation.title}
                    focusTarget='nearest-interactive'
                    className='text-[var(--text-body)] text-small'
                  />
                </button>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type='button'
                      variant='quiet'
                      size='icon'
                      aria-label={t('actions', { title: conversation.title })}
                      className='shrink-0 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100'
                    >
                      <MoreHorizontal className='size-[14px]' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' side='bottom' sideOffset={4}>
                    <DropdownMenuItem onSelect={() => setRenaming(conversation)}>
                      <Pencil />
                      {t('rename')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setDeleting(conversation)}>
                      <Trash />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </nav>
      <RenameConversationModal conversation={renaming} onClose={() => setRenaming(null)} />
      <DeleteConversationModal
        conversation={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={onDeleted}
      />
    </aside>
  )
}

interface RenameConversationModalProps {
  conversation: ConversationSummary | null
  onClose: () => void
}

function RenameConversationModal({ conversation, onClose }: RenameConversationModalProps) {
  const t = useTranslations('assistant.conversations')
  const { mutate: rename, isPending, isError, reset } = useRenameAssistantConversation()
  const [title, setTitle] = useState('')
  const [prevConversation, setPrevConversation] = useState<ConversationSummary | null>(null)
  if (prevConversation !== conversation) {
    setPrevConversation(conversation)
    if (conversation) setTitle(conversation.title)
  }

  const close = () => {
    if (isPending) return
    reset()
    onClose()
  }

  const submit = () => {
    if (!conversation || !title.trim() || isPending) return
    rename({ conversationId: conversation.id, title: title.trim() }, { onSuccess: close })
  }

  return (
    <ChipModal
      open={conversation !== null}
      onOpenChange={(open) => !open && close()}
      srTitle={t('renameTitle')}
      size='sm'
    >
      <ChipModalHeader onClose={close}>{t('renameTitle')}</ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='input'
          title={t('titleField')}
          value={title}
          onChange={setTitle}
          onSubmit={submit}
          maxLength={200}
          required
          disabled={isPending}
        />
        <ChipModalError>{isError ? t('renameFailed') : null}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        cancelLabel={t('cancel')}
        onCancel={close}
        primaryAction={{
          label: t('save'),
          onClick: submit,
          disabled: !title.trim() || isPending,
        }}
      />
    </ChipModal>
  )
}

interface DeleteConversationModalProps {
  conversation: ConversationSummary | null
  onClose: () => void
  onDeleted: (id: string) => void
}

function DeleteConversationModal({
  conversation,
  onClose,
  onDeleted,
}: DeleteConversationModalProps) {
  const t = useTranslations('assistant.conversations')
  const { mutate: remove, isPending, isError, reset } = useDeleteAssistantConversation()

  const close = () => {
    if (isPending) return
    reset()
    onClose()
  }

  return (
    <ChipConfirmModal
      open={conversation !== null}
      onOpenChange={(open) => !open && close()}
      title={t('deleteTitle')}
      text={
        isError
          ? [{ text: t('deleteFailed'), error: true }]
          : t('deleteText', { title: conversation?.title ?? '' })
      }
      dismissLabel={t('cancel')}
      confirm={{
        label: t('delete'),
        pending: isPending,
        disabled: isPending,
        onClick: () => {
          if (!conversation) return
          remove(conversation.id, {
            onSuccess: () => {
              onDeleted(conversation.id)
              reset()
              onClose()
            },
          })
        },
      }}
    />
  )
}
