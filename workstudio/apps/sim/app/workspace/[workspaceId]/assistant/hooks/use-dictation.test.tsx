/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDictate } = vi.hoisted(() => ({ mockDictate: vi.fn() }))

vi.mock('@/app/workspace/[workspaceId]/assistant/voice-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/workspace/[workspaceId]/assistant/voice-client')>()),
  dictateRecording: mockDictate,
}))

import { useDictation } from '@/app/workspace/[workspaceId]/assistant/hooks/use-dictation'
import { VoiceError } from '@/app/workspace/[workspaceId]/assistant/voice-client'

/** A MediaRecorder that records one chunk of the size the test sets, as soon as it stops. */
class FakeRecorder {
  static chunkBytes = 4096
  static instances: FakeRecorder[] = []
  mimeType = 'audio/webm'
  state: 'inactive' | 'recording' = 'inactive'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  constructor(readonly stream: MediaStream) {
    FakeRecorder.instances.push(this)
  }
  static isTypeSupported() {
    return true
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob([new Uint8Array(FakeRecorder.chunkBytes)]) })
    this.onstop?.()
  }
}

function fakeStream() {
  const track = { stop: vi.fn() }
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, track }
}

function mount(onText: (text: string) => void) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const container = document.createElement('div')
  const root = createRoot(container)
  let latest!: ReturnType<typeof useDictation>
  function Probe() {
    latest = useDictation({ workspaceId: 'ws-1', language: 'fr', onText })
    return null
  }
  act(() => root.render(<Probe />))
  return { hook: () => latest, unmount: () => act(() => root.unmount()) }
}

describe('useDictation', () => {
  let track: { stop: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    FakeRecorder.instances = []
    FakeRecorder.chunkBytes = 4096
    vi.stubGlobal('MediaRecorder', FakeRecorder)
    const made = fakeStream()
    track = made.track
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => made.stream) },
    })
    mockDictate.mockResolvedValue('Bonjour Marie.')
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'mediaDevices')
  })

  it('records, transcribes and hands the text back, then releases the microphone', async () => {
    const onText = vi.fn()
    const { hook } = mount(onText)

    await act(async () => hook().start())
    expect(hook().status).toBe('recording')
    await act(async () => hook().stop())

    expect(onText).toHaveBeenCalledWith('Bonjour Marie.')
    expect(mockDictate).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-1', language: 'fr' })
    )
    expect(hook().status).toBe('idle')
    expect(hook().error).toBeNull()
    expect(track.stop).toHaveBeenCalled()
  })

  it('says so when the microphone is refused, and records nothing', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => Promise.reject(new Error('NotAllowedError'))) },
    })
    const onText = vi.fn()
    const { hook } = mount(onText)

    await act(async () => hook().start())

    expect(hook().error).toBe('denied')
    expect(hook().status).toBe('idle')
    expect(FakeRecorder.instances).toHaveLength(0)
  })

  it('says so when the browser has no microphone API (an address that is not secure)', async () => {
    Reflect.deleteProperty(navigator, 'mediaDevices')
    const { hook } = mount(vi.fn())

    await act(async () => hook().start())

    expect(hook().error).toBe('unsupported')
  })

  it('leaves the message alone when nothing was said or the server refuses', async () => {
    const onText = vi.fn()
    const { hook } = mount(onText)

    mockDictate.mockRejectedValueOnce(new VoiceError('empty'))
    await act(async () => hook().start())
    await act(async () => hook().stop())
    expect(hook().error).toBe('empty')

    mockDictate.mockRejectedValueOnce(new VoiceError('no-model'))
    await act(async () => hook().start())
    await act(async () => hook().stop())
    expect(hook().error).toBe('no-model')

    expect(onText).not.toHaveBeenCalled()
    expect(hook().status).toBe('idle')
  })

  it('clears the previous error when a new dictation starts', async () => {
    const { hook } = mount(vi.fn())
    mockDictate.mockRejectedValueOnce(new VoiceError('unavailable'))
    await act(async () => hook().start())
    await act(async () => hook().stop())
    expect(hook().error).toBe('unavailable')

    await act(async () => hook().start())

    expect(hook().error).toBeNull()
  })

  it('stops listening and sends nothing when the page is left during a recording', async () => {
    const onText = vi.fn()
    const { hook, unmount } = mount(onText)
    await act(async () => hook().start())

    unmount()

    expect(track.stop).toHaveBeenCalled()
    expect(mockDictate).not.toHaveBeenCalled()
    expect(onText).not.toHaveBeenCalled()
  })
})
