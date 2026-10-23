import { describe, expect, it } from 'vitest'
import { publishedChatAuthType } from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/chat-access'

describe('publishedChatAuthType', () => {
  it('keeps a password, email or SSO gate set in the editor, whatever the public switch says', () => {
    for (const authType of ['password', 'email', 'sso'] as const) {
      expect(publishedChatAuthType(authType, true)).toBe(authType)
      expect(publishedChatAuthType(authType, false)).toBe(authType)
    }
  })

  it('switches a public or members-only chat, and a new one, between members and the public', () => {
    for (const existing of ['public', 'workspace', undefined] as const) {
      expect(publishedChatAuthType(existing, true)).toBe('public')
      expect(publishedChatAuthType(existing, false)).toBe('workspace')
    }
  })
})
