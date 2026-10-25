/**
 * @vitest-environment node
 */
import { describe, expect, it, type Mock, vi } from 'vitest'
import { NexoraDocumentAiError } from '@/lib/nexora/document-ai/client'
import {
  formatSpeakerTranscript,
  MEETING_MAX_SECONDS,
  type MeetingSteps,
  speakerLabel,
  transcribeMeeting,
} from '@/lib/nexora/voice/meeting'

const segment = (speaker: string, text: string, start = 0) => ({
  speaker,
  text,
  start,
  end: start + 1,
})

describe('speakerLabel', () => {
  it('names a speaker the way people say it', () => {
    expect(speakerLabel('speaker_1')).toBe('Intervenant 1')
    expect(speakerLabel('speaker_12')).toBe('Intervenant 12')
  })

  it('keeps a name the service gave that is not a numbered speaker', () => {
    expect(speakerLabel('Marie')).toBe('Marie')
  })
})

describe('formatSpeakerTranscript', () => {
  it('writes one line per turn of speech, merging consecutive segments of the same speaker', () => {
    const text = formatSpeakerTranscript([
      segment('speaker_1', 'Bonjour à tous.'),
      segment('speaker_1', 'Commençons.'),
      segment('speaker_2', 'Bonjour Marie.'),
      segment('speaker_1', 'Le budget ?'),
    ])
    expect(text).toBe(
      'Intervenant 1 : Bonjour à tous. Commençons.\nIntervenant 2 : Bonjour Marie.\nIntervenant 1 : Le budget ?'
    )
  })

  it('is empty without segments', () => {
    expect(formatSpeakerTranscript([])).toBe('')
  })
})

describe('transcribeMeeting', () => {
  const input = {
    audio: Buffer.from('reunion'),
    mimeType: 'audio/mpeg',
    fileName: 'reunion.mp3',
    language: 'fr',
    prompt: 'Vocabulaire : Nexora.',
    numSpeakers: 2,
  }
  const diarized = {
    text: 'Bonjour Salut',
    segments: [segment('speaker_1', 'Bonjour'), segment('speaker_2', 'Salut', 3)],
  }

  type Steps = { [K in keyof MeetingSteps]: Mock<MeetingSteps[K]> }

  function steps(overrides: Partial<Steps> = {}): Steps {
    return {
      measure: vi.fn<MeetingSteps['measure']>(async () => 600),
      prepare: vi.fn<MeetingSteps['prepare']>(async (audio) => audio),
      diarized: vi.fn<MeetingSteps['diarized']>(async () => diarized),
      plain: vi.fn<MeetingSteps['plain']>(async () => 'Bonjour Salut'),
      ...overrides,
    }
  }

  it('sends the whole recording in one request and returns the speakers', async () => {
    const run = steps()

    const result = await transcribeMeeting(input, run)

    expect(run.diarized).toHaveBeenCalledTimes(1)
    expect(run.diarized.mock.calls[0][0]).toMatchObject({
      prompt: 'Vocabulaire : Nexora.',
      numSpeakers: 2,
    })
    expect(result).toMatchObject({
      transcript: 'Bonjour Salut',
      speakers: 2,
      duration: 600,
      transcriptBySpeaker: 'Intervenant 1 : Bonjour\nIntervenant 2 : Salut',
    })
    expect(result.segments).toHaveLength(2)
    expect(result.warning).toBeUndefined()
  })

  it('counts one speaker for a monologue, never a second one', async () => {
    const run = steps({
      diarized: vi.fn<MeetingSteps['diarized']>(async () => ({
        text: 'Je dicte.',
        segments: [segment('speaker_1', 'Je dicte.')],
      })),
    })
    expect((await transcribeMeeting(input, run)).speakers).toBe(1)
  })

  it('refuses before any work a meeting longer than an hour, naming the limit', async () => {
    const run = steps({
      measure: vi.fn<MeetingSteps['measure']>(async () => MEETING_MAX_SECONDS + 60),
    })

    await expect(transcribeMeeting(input, run)).rejects.toMatchObject({
      code: 'too-long',
      message: expect.stringContaining('60 min'),
    })
    expect(run.diarized).not.toHaveBeenCalled()
    expect(run.plain).not.toHaveBeenCalled()
  })

  it('accepts a meeting of exactly an hour', async () => {
    const run = steps({ measure: vi.fn<MeetingSteps['measure']>(async () => MEETING_MAX_SECONDS) })
    await expect(transcribeMeeting(input, run)).resolves.toMatchObject({ speakers: 2 })
  })

  it('sends a recording of unknown length only when it is small', async () => {
    const small = steps({ measure: vi.fn<MeetingSteps['measure']>(async () => null) })
    await expect(transcribeMeeting(input, small)).resolves.toMatchObject({ speakers: 2 })

    const big = steps({ measure: vi.fn<MeetingSteps['measure']>(async () => null) })
    await expect(
      transcribeMeeting({ ...input, audio: Buffer.alloc(26 * 1024 * 1024) }, big)
    ).rejects.toMatchObject({ code: 'too-long' })
    expect(big.diarized).not.toHaveBeenCalled()
  })

  it('falls back on the plain text, with a warning, when the instance cannot tell the speakers', async () => {
    const run = steps({
      diarized: vi.fn<MeetingSteps['diarized']>(async () => {
        throw new NexoraDocumentAiError('diarization-unavailable', 'no service')
      }),
    })

    const result = await transcribeMeeting(input, run)

    expect(result).toMatchObject({
      transcript: 'Bonjour Salut',
      transcriptBySpeaker: 'Bonjour Salut',
      speakers: 0,
      segments: [],
    })
    expect(result.warning).toMatch(/intervenants/i)
  })

  it('does not hide any other failure behind that fallback', async () => {
    const run = steps({
      diarized: vi.fn<MeetingSteps['diarized']>(async () => {
        throw new NexoraDocumentAiError('unavailable', 'Nexora API did not answer')
      }),
    })
    await expect(transcribeMeeting(input, run)).rejects.toMatchObject({ code: 'unavailable' })
    expect(run.plain).not.toHaveBeenCalled()
  })

  it('sends the prepared recording, not the original', async () => {
    const run = steps({
      prepare: vi.fn<MeetingSteps['prepare']>(async (audio) => ({
        ...audio,
        fileName: 'prepared.mp3',
      })),
    })
    await transcribeMeeting(input, run)
    expect(run.diarized.mock.calls[0][0]).toMatchObject({ fileName: 'prepared.mp3' })
  })
})
