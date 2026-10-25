/**
 * Failure modes of sending a question before the agent is asked: a conversation created for it
 * must not be left empty when the question is never stored (save failure, unreadable file,
 * « Arrêter » while files are read); an existing conversation is never deleted; only a file's
 * name, type and size are stored. Regenerating needs the question's files, or says they are gone.
 */
import { describe, expect, it, vi } from 'vitest'
import type { AssistantMessage } from '@/lib/api/contracts/nexora-assistant'
import {
  filesForRegeneration,
  sendQuestion,
} from '@/app/workspace/[workspaceId]/assistant/send-question'

const pdf = new File(['%PDF'], 'contrat.pdf', { type: 'application/pdf' })

const storedQuestion: AssistantMessage = {
  id: 'question-1',
  conversationId: 'conversation-new',
  role: 'user',
  content: 'Résumez ce contrat',
  files: [{ name: 'contrat.pdf', type: 'application/pdf', size: 4 }],
  usage: null,
  interrupted: false,
  card: null,
  createdAt: '2026-10-23T10:00:00.000Z',
}

function deps(overrides: Partial<Parameters<typeof sendQuestion>[0]> = {}) {
  return {
    conversationId: null,
    files: [pdf],
    signal: new AbortController().signal,
    createConversation: vi.fn(async () => 'conversation-new'),
    deleteConversation: vi.fn(async () => undefined),
    appendQuestion: vi.fn(async () => storedQuestion),
    readFile: vi.fn(async (file: File) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      data: 'data:application/pdf;base64,JVBERg==',
    })),
    onConversationCreated: vi.fn(),
    onConversationDiscarded: vi.fn(),
    ...overrides,
  }
}

describe('sendQuestion', () => {
  it('stores only the name, type and size of each file and sends the file to the agent', async () => {
    const input = deps()

    const outcome = await sendQuestion(input)

    expect(input.appendQuestion).toHaveBeenCalledWith('conversation-new', [
      { name: 'contrat.pdf', type: 'application/pdf', size: 4 },
    ])
    expect(outcome).toMatchObject({ status: 'sent', conversationId: 'conversation-new' })
    expect(outcome.status === 'sent' && outcome.chatFiles[0].data).toContain('base64')
  })

  it('deletes the conversation it created when the question cannot be saved', async () => {
    const input = deps({ appendQuestion: vi.fn(async () => Promise.reject(new Error('500'))) })

    const outcome = await sendQuestion(input)

    expect(outcome).toMatchObject({ status: 'failed', notice: { kind: 'save-failed' } })
    expect(input.deleteConversation).toHaveBeenCalledWith('conversation-new')
    expect(input.onConversationDiscarded).toHaveBeenCalled()
  })

  it('deletes the conversation it created when a file cannot be read', async () => {
    const input = deps({ readFile: vi.fn(async () => Promise.reject(new Error('read'))) })

    const outcome = await sendQuestion(input)

    expect(outcome).toMatchObject({
      status: 'failed',
      notice: { kind: 'upload-failed', name: 'contrat.pdf' },
    })
    expect(input.appendQuestion).not.toHaveBeenCalled()
    expect(input.deleteConversation).toHaveBeenCalledWith('conversation-new')
  })

  it('stops before saving when « Arrêter » is pressed while files are read', async () => {
    const stop = new AbortController()
    const input = deps({
      signal: stop.signal,
      readFile: vi.fn(async (file: File) => {
        stop.abort()
        return { name: file.name, type: file.type, size: file.size, data: '' }
      }),
    })

    const outcome = await sendQuestion(input)

    expect(outcome).toEqual({ status: 'stopped' })
    expect(input.appendQuestion).not.toHaveBeenCalled()
    expect(input.deleteConversation).toHaveBeenCalledWith('conversation-new')
  })

  it('never deletes a conversation that already existed', async () => {
    const input = deps({
      conversationId: 'conversation-old',
      appendQuestion: vi.fn(async () => Promise.reject(new Error('500'))),
    })

    const outcome = await sendQuestion(input)

    expect(outcome).toMatchObject({ status: 'failed' })
    expect(input.createConversation).not.toHaveBeenCalled()
    expect(input.deleteConversation).not.toHaveBeenCalled()
  })
})

describe('filesForRegeneration', () => {
  const sent = { questionId: 'question-1', files: [] }

  it('sends the files again when the question was sent from this page', () => {
    expect(filesForRegeneration(storedQuestion, sent)).toEqual({ files: [] })
  })

  it('needs no file for a question without attachments', () => {
    expect(filesForRegeneration({ ...storedQuestion, files: [] }, null)).toEqual({
      files: undefined,
    })
  })

  it('reports the files as gone after a reload instead of asking without them', () => {
    expect(filesForRegeneration(storedQuestion, null)).toBeNull()
    expect(filesForRegeneration(storedQuestion, { questionId: 'other', files: [] })).toBeNull()
  })
})
