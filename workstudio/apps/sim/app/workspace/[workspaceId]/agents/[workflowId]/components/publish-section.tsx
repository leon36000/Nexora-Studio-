'use client'

import { Chip, ChipCopyInput, toast } from '@sim/emcn'
import { Rocket } from '@sim/emcn/icons'
import { createLogger } from '@sim/logger'
import { generateRandomHex } from '@sim/utils/random'
import { useTranslations } from 'next-intl'
import { formatInternalOutputSelector } from '@/lib/workflows/streaming/output-selector'
import { FormField } from '@/app/workspace/[workspaceId]/agents/components/form-field'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { type ChatFormData, useCreateChat, useUpdateChat } from '@/hooks/queries/chats'
import type { ChatDetail } from '@/hooks/queries/deployments'

const logger = createLogger('NexoraAgentPublish')

/** A chat identifier: lowercase letters, digits and hyphens (the deployed chat's own rule). */
function chatIdentifier(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${slug || 'agent'}-${generateRandomHex(6)}`
}

interface PublishSectionProps {
  workflowId: string
  /** The agent block whose answer the public chat shows. */
  agentBlockId: string
  name: string
  description: string
  welcomeMessage: string
  existingChat: ChatDetail | null
  /** Saves pending form changes first, so the published version is what the form shows. */
  ensureSaved: () => Promise<boolean> // i18n-ignore: type signature
  readOnly: boolean
}

/**
 * « Publier »: deploys the agent and creates (or updates) its public chat, through the same
 * chat deployment the editor's deploy modal uses — the chat deploys the workflow when the draft
 * changed since the active version.
 */
export function PublishSection({
  workflowId,
  agentBlockId,
  name,
  description,
  welcomeMessage,
  existingChat,
  ensureSaved,
  readOnly,
}: PublishSectionProps) {
  const t = useTranslations('agents.publish')
  const { mutateAsync: createChat, isPending: isCreating } = useCreateChat()
  const { mutateAsync: updateChat, isPending: isUpdating } = useUpdateChat()
  const isPublishing = isCreating || isUpdating

  const handlePublish = async () => {
    if (!(await ensureSaved())) return
    const selectedOutputBlocks = [formatInternalOutputSelector(agentBlockId, 'content')]
    try {
      if (existingChat) {
        const formData: ChatFormData = {
          identifier: existingChat.identifier,
          title: name,
          description,
          authType: existingChat.authType,
          password: '',
          emails: existingChat.allowedEmails,
          welcomeMessage,
          selectedOutputBlocks,
          includeThinking: existingChat.includeThinking,
          includeToolCalls: existingChat.includeToolCalls,
        }
        await updateChat({
          chatId: existingChat.id,
          workflowId,
          formData,
          imageUrl: existingChat.customizations?.imageUrl,
        })
      } else {
        await createChat({
          workflowId,
          formData: {
            identifier: chatIdentifier(name),
            title: name,
            description,
            authType: 'public',
            password: '',
            emails: [],
            welcomeMessage,
            selectedOutputBlocks,
            includeThinking: false,
            includeToolCalls: false,
          },
        })
      }
      toast.success(t('published'))
    } catch (error) {
      logger.error('Agent publishing failed', { workflowId, error })
      toast.error(t('failed'))
    }
  }

  return (
    <SettingsSection
      label={t('title')}
      action={
        readOnly ? undefined : (
          <Chip
            variant='primary'
            leftIcon={Rocket}
            disabled={isPublishing}
            onClick={() => void handlePublish()}
          >
            {t('publish')}
          </Chip>
        )
      }
    >
      {existingChat ? (
        <FormField label={t('link')} htmlFor='agent-chat-link'>
          <ChipCopyInput id='agent-chat-link' value={existingChat.chatUrl} copyLabel={t('copy')} />
        </FormField>
      ) : (
        <p className='pl-0.5 text-[var(--text-muted)] text-small'>{t('notPublished')}</p>
      )}
    </SettingsSection>
  )
}
