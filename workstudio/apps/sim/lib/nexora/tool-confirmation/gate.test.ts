import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gateToolCall } from '@/lib/nexora/tool-confirmation/gate'
import {
  type ConfirmationFrame,
  registerConfirmationSink,
} from '@/lib/nexora/tool-confirmation/sinks'
import { decideConfirmation } from '@/lib/nexora/tool-confirmation/store'

const sendEmail = {
  required: true,
  serverName: 'Nexora Connect',
  toolName: 'execute_action',
  title: 'execute_action',
}
const args = { actionId: 'postmark.send_email', input: { to: 'client@pme.fr', subject: 'Relance' } }
const write = async () => 'write' as const

let frames: ConfirmationFrame[]
let unregister: () => void

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
  frames = []
  unregister = registerConfirmationSink('exec-1', (frame) => frames.push(frame))
})
afterEach(() => {
  unregister()
  vi.useRealTimers()
})

async function answerWhenAsked(decision: 'allow' | 'deny') {
  await vi.advanceTimersByTimeAsync(300)
  const asked = frames.find((frame) => frame.event === 'confirmation')
  if (!asked || asked.event !== 'confirmation') throw new Error('no confirmation frame was sent')
  await decideConfirmation(asked.data.id, asked.data.token, decision)
  await vi.advanceTimersByTimeAsync(600)
}

describe('gateToolCall', () => {
  it('lets an unflagged tool through without asking anyone', async () => {
    const outcome = await gateToolCall({
      spec: { ...sendEmail, required: false },
      args,
      executionId: 'exec-1',
      lookupOperation: write,
    })
    expect(outcome).toEqual({ kind: 'proceed' })
    expect(frames).toEqual([])
  })

  it('asks the person with what the action would do, then proceeds on « Autoriser »', async () => {
    const pending = gateToolCall({
      spec: sendEmail,
      args,
      executionId: 'exec-1',
      lookupOperation: write,
      timeoutMs: 60_000,
    })
    await answerWhenAsked('allow')
    expect(await pending).toEqual({ kind: 'proceed' })
    const asked = frames[0]
    expect(asked).toMatchObject({ event: 'confirmation', data: { title: 'postmark.send_email' } })
    expect(asked.event === 'confirmation' && asked.data.summary).toContain('client@pme.fr')
    expect(frames.at(-1)).toMatchObject({ event: 'confirmation_end', data: { decision: 'allow' } })
  })

  it('refuses on « Refuser »: the tool must not run', async () => {
    const pending = gateToolCall({
      spec: sendEmail,
      args,
      executionId: 'exec-1',
      lookupOperation: write,
      timeoutMs: 60_000,
    })
    await answerWhenAsked('deny')
    expect(await pending).toEqual({ kind: 'denied', reason: 'user' })
    expect(frames.at(-1)).toMatchObject({ event: 'confirmation_end', data: { decision: 'deny' } })
  })

  it('refuses when nobody answers in time', async () => {
    const pending = gateToolCall({
      spec: sendEmail,
      args,
      executionId: 'exec-1',
      lookupOperation: write,
      timeoutMs: 2_000,
    })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(await pending).toEqual({ kind: 'denied', reason: 'timeout' })
    expect(frames.at(-1)).toMatchObject({
      event: 'confirmation_end',
      data: { decision: 'expired' },
    })
  })

  it('refuses when the run is cancelled while waiting', async () => {
    const controller = new AbortController()
    const pending = gateToolCall({
      spec: sendEmail,
      args,
      executionId: 'exec-1',
      lookupOperation: write,
      timeoutMs: 60_000,
      signal: controller.signal,
    })
    await vi.advanceTimersByTimeAsync(300)
    controller.abort()
    await vi.advanceTimersByTimeAsync(600)
    expect(await pending).toEqual({ kind: 'denied', reason: 'timeout' })
  })

  it('defers the action when nobody is connected to this run (schedule, API, editor)', async () => {
    unregister()
    const outcome = await gateToolCall({
      spec: sendEmail,
      args,
      executionId: 'exec-1',
      lookupOperation: write,
    })
    expect(outcome).toMatchObject({ kind: 'deferred', title: 'postmark.send_email' })
    expect(frames).toEqual([])
    unregister = registerConfirmationSink('exec-1', (frame) => frames.push(frame))
  })
})
