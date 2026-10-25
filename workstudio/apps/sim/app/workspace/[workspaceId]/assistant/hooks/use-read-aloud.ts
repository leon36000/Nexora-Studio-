'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createLogger } from '@sim/logger'
import { chunkForSpeech, speechText } from '@/lib/nexora/voice/speech-text'
import {
  speakPiece,
  VoiceError,
  type VoiceErrorCode,
} from '@/app/workspace/[workspaceId]/assistant/voice-client'

const logger = createLogger('NexoraReadAloud')

interface Reading {
  /** The message being read. */
  key: string
  /** `loading` until the first audio arrives, then `playing`. */
  phase: 'loading' | 'playing'
}

/** Plays one piece of audio to its end, or until `signal` aborts; both resolve. */
function play(audio: Blob, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(audio)
    const element = new Audio(url)
    const finish = () => {
      signal.removeEventListener('abort', onAbort)
      URL.revokeObjectURL(url)
    }
    const onAbort = () => {
      element.pause()
      finish()
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
    element.onended = () => {
      finish()
      resolve()
    }
    element.onerror = () => {
      finish()
      reject(new VoiceError('failed'))
    }
    element.play().catch(() => {
      finish()
      reject(new VoiceError('failed'))
    })
  })
}

/**
 * « Lire à voix haute »: reads an answer with the instance's Speech synthesis model, a few
 * sentences at a time so the first words come quickly. One answer at a time: starting another one,
 * clicking the same button again or leaving the page stops the first.
 */
export function useReadAloud(workspaceId: string) {
  const [reading, setReading] = useState<Reading | null>(null)
  const [error, setError] = useState<VoiceErrorCode | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const readingKeyRef = useRef<string | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    readingKeyRef.current = null
    setReading(null)
  }, [])

  const toggle = useCallback(
    async (key: string, markdown: string) => {
      const wasReadingThis = readingKeyRef.current === key
      stop()
      setError(null)
      if (wasReadingThis) return
      const pieces = chunkForSpeech(speechText(markdown))
      if (pieces.length === 0) {
        setError('empty')
        return
      }
      const controller = new AbortController()
      abortRef.current = controller
      readingKeyRef.current = key
      setReading({ key, phase: 'loading' })
      try {
        const fetchPiece = (index: number) =>
          speakPiece({ workspaceId, text: pieces[index], signal: controller.signal })
        let current = fetchPiece(0)
        for (let index = 0; index < pieces.length; index++) {
          const audio = await current
          if (controller.signal.aborted) return
          // The next piece is fetched while this one plays.
          const next = index + 1 < pieces.length ? fetchPiece(index + 1) : null
          next?.catch(() => undefined)
          setReading({ key, phase: 'playing' })
          await play(audio, controller.signal)
          if (controller.signal.aborted || !next) return
          current = next
        }
      } catch (cause) {
        if (controller.signal.aborted) return
        if (!(cause instanceof VoiceError)) logger.error('Reading aloud failed', { cause })
        setError(cause instanceof VoiceError ? cause.code : 'failed')
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
          readingKeyRef.current = null
          setReading(null)
        }
      }
    },
    [stop, workspaceId]
  )

  useEffect(() => stop, [stop])

  return { reading, error, toggle }
}
