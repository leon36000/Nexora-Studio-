import type { ChatAuthType } from '@/lib/api/contracts/chats'

/**
 * Whether who may open the chat was set in the editor (a password, an e-mail list, SSO): the
 * form then shows it read-only and publishing keeps it.
 */
export function isChatAccessSetInEditor(existing: ChatAuthType | undefined): boolean {
  return existing !== undefined && existing !== 'public' && existing !== 'workspace'
}

/** The chat access a publication sets: the form only switches between members and the public. */
export function publishedChatAuthType(
  existing: ChatAuthType | undefined,
  isPublic: boolean
): ChatAuthType {
  if (existing !== undefined && isChatAccessSetInEditor(existing)) return existing
  return isPublic ? 'public' : 'workspace'
}
