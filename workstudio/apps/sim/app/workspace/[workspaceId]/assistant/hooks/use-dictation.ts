'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createLogger } from '@sim/logger'
import {
  dictateRecording,
  VoiceError,
  type VoiceErrorCode,
} from '@/app/workspace/[workspaceId]/assistant/voice-client'

const logger = createLogger('NexoraDictation')

/** A dictation is a message, not a meeting: past five minutes the recording stops by itself. */
const MAX_DICTATION_MS = 5 * 60 * 1000
const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

type DictationStatus = 'idle' | 'recording' | 'transcribing'
/** The microphone refused or missing, or what the server said. */
export type DictationError = VoiceErrorCode | 'denied' | 'unsupported'

interface UseDictationProps {
  workspaceId: string
  /** The page's language, given to Whisper (`fr`, `en`). */
  language: string
  /** The words that were said, once transcribed; the caller puts them in the message box. */
  onText: (text: string) => void
}

function recorderMimeType(): string | undefined {
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported?.(type))
}

/**
 * The message box's microphone: records in the browser, sends the recording to the instance's own
 * Transcription model and hands the text back. Nothing leaves the instance, and a recording that
 * is empty, refused or too long never touches the message being typed.
 */
export function useDictation({ workspaceId, language, onText }: UseDictationProps) {
  const [status, setStatus] = useState<DictationStatus>('idle')
  const [error, setError] = useState<DictationError | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const onTextRef = useRef(onText)
  const configRef = useRef({ workspaceId, language })

  useEffect(() => {
    onTextRef.current = onText
    configRef.current = { workspaceId, language }
  }, [onText, workspaceId, language])

  const release = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
  }, [])

  const start = useCallback(async () => {
    if (recorderRef.current || abortRef.current) return
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('unsupported')
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('denied')
      return
    }
    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream, { mimeType: recorderMimeType() })
    streamRef.current = stream
    recorderRef.current = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.onstop = () => {
      const type = recorder.mimeType || 'audio/webm'
      release()
      const controller = new AbortController()
      abortRef.current = controller
      setStatus('transcribing')
      const { workspaceId: workspace, language: lang } = configRef.current
      dictateRecording({
        workspaceId: workspace,
        recording: new Blob(chunks, { type }),
        language: lang,
        signal: controller.signal,
      })
        .then((text) => onTextRef.current(text))
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return
          if (!(cause instanceof VoiceError)) logger.error('Dictation failed', { cause })
          setError(cause instanceof VoiceError ? cause.code : 'failed')
        })
        .finally(() => {
          if (abortRef.current === controller) abortRef.current = null
          if (!controller.signal.aborted) setStatus('idle')
        })
    }
    recorder.start()
    setStatus('recording')
    timerRef.current = setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), MAX_DICTATION_MS)
  }, [release])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }, [])

  const dismissError = useCallback(() => setError(null), [])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      const recorder = recorderRef.current
      if (recorder) {
        recorder.onstop = null
        if (recorder.state !== 'inactive') recorder.stop()
      }
      release()
    },
    [release]
  )

  return { status, error, start, stop, dismissError }
}
