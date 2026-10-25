/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSpeak } = vi.hoisted(() => ({ mockSpeak: vi.fn() }))

vi.mock('@/app/workspace/[workspaceId]/assistant/voice-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/workspace/[workspaceId]/assistant/voice-client')>()),
  speakPiece: mockSpeak,
}))

import { useReadAloud } from '@/app/workspace/[workspaceId]/assistant/hooks/use-read-aloud'
import { VoiceError } from '@/app/workspace/[workspaceId]/assistant/voice-client'

/** An audio element that plays until the test ends it, like a real one plays until its end. */
class FakeAudio {
  static all: FakeAudio[] = []
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  paused = false
  constructor(readonly src: string) {
    FakeAudio.all.push(this)
  }
  play() {
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
  end() {
    this.onended?.()
  }
}

function mount() {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const container = document.createElement('div')
  const root = createRoot(container)
  let latest!: ReturnType<typeof useReadAloud>
  function Probe() {
    latest = useReadAloud('ws-1')
    return null
  }
  act(() => root.render(<Probe />))
  return { hook: () => latest, unmount: () => act(() => root.unmount()) }
}

const flush = () => act(async () => {})

describe('useReadAloud', () => {
  beforeEach(() => {
    FakeAudio.all = []
    vi.stubGlobal('Audio', FakeAudio)
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:audio', revokeObjectURL: vi.fn() })
    mockSpeak.mockImplementation(async () => new Blob([new Uint8Array(8)], { type: 'audio/wav' }))
  })

  it('reads the answer without its Markdown symbols and plays it', async () => {
    const { hook } = mount()

    await act(async () => void hook().toggle('m1', '## Résumé\n\nLe budget est **validé**.'))
    await flush()

    expect(mockSpeak).toHaveBeenCalledTimes(1)
    expect(mockSpeak.mock.calls[0][0]).toMatchObject({
      workspaceId: 'ws-1',
      text: 'Résumé. Le budget est validé.',
    })
    expect(hook().reading).toEqual({ key: 'm1', phase: 'playing' })
    expect(FakeAudio.all).toHaveLength(1)

    await act(async () => FakeAudio.all[0].end())
    await flush()
    expect(hook().reading).toBeNull()
  })

  it('clicking the same answer again stops it', async () => {
    const { hook } = mount()
    await act(async () => void hook().toggle('m1', 'Bonjour à tous.'))
    await flush()

    await act(async () => void hook().toggle('m1', 'Bonjour à tous.'))

    expect(FakeAudio.all[0].paused).toBe(true)
    expect(hook().reading).toBeNull()
  })

  it('starting another answer stops the one being read: never two voices at once', async () => {
    const { hook } = mount()
    await act(async () => void hook().toggle('m1', 'Première réponse.'))
    await flush()

    await act(async () => void hook().toggle('m2', 'Seconde réponse.'))
    await flush()

    expect(FakeAudio.all[0].paused).toBe(true)
    expect(FakeAudio.all[1].paused).toBe(false)
    expect(hook().reading?.key).toBe('m2')
  })

  it('reads a long answer piece by piece, in order', async () => {
    const { hook } = mount()
    const sentence = 'Cette phrase fait un peu plus de cinquante caractères au total. '
    await act(async () => void hook().toggle('m1', sentence.repeat(40)))
    await flush()

    expect(mockSpeak.mock.calls.length).toBeGreaterThanOrEqual(1)
    await act(async () => FakeAudio.all[0].end())
    await flush()
    expect(FakeAudio.all).toHaveLength(2)
    expect(mockSpeak.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(mockSpeak.mock.calls.every(([call]) => call.text.length <= 1200)).toBe(true)
  })

  it('says so when an answer has nothing to read, without calling the voice', async () => {
    const { hook } = mount()

    await act(async () => void hook().toggle('m1', '```\ncode\n```'))

    expect(hook().error).toBe('empty')
    expect(mockSpeak).not.toHaveBeenCalled()
  })

  it('reports why the voice cannot speak, and stops reading', async () => {
    mockSpeak.mockRejectedValueOnce(new VoiceError('no-model'))
    const { hook } = mount()

    await act(async () => void hook().toggle('m1', 'Bonjour.'))
    await flush()

    expect(hook().error).toBe('no-model')
    expect(hook().reading).toBeNull()
  })

  it('stops the voice when the page is left', async () => {
    const { hook, unmount } = mount()
    await act(async () => void hook().toggle('m1', 'Bonjour.'))
    await flush()

    unmount()

    expect(FakeAudio.all[0].paused).toBe(true)
  })
})
