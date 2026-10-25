import { isRecordLike } from '@sim/utils/object'
import type { CitationSource } from '@/lib/nexora/citations'
import {
  type ChatStreamDelegationFrame,
  isChatOutputFrame,
} from '@/lib/workflows/streaming/agent-stream-protocol'

/**
 * Nexora edition: what an agent's answer carries besides its text — the files its tools produced
 * (charts, workbooks) and the numbered sources its searches returned — read from the `output`
 * frames of a chat stream (the Assistant and the published chats share this).
 */

export interface ProducedFile {
  name: string
  type: string
  size: number
  /** Same-origin link to download or show the file. */
  url: string
}

export type AgentOutput =
  | { kind: 'files'; files: ProducedFile[] }
  | { kind: 'sources'; sources: CitationSource[] }

/** The path and query of a file link (so it is fetched from this origin), `null` for anything else. */
export function sameOriginPath(link: string): string | null {
  if (!link) return null
  if (link.startsWith('/') && !link.startsWith('//')) return link
  try {
    const url = new URL(link)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? `${url.pathname}${url.search}`
      : null
  } catch {
    return null
  }
}

function readFiles(data: unknown): ProducedFile[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((entry) => {
    if (!isRecordLike(entry) || typeof entry.name !== 'string' || typeof entry.url !== 'string') {
      return []
    }
    const url = sameOriginPath(entry.url)
    if (!url) return []
    return [
      {
        name: entry.name,
        type: typeof entry.type === 'string' ? entry.type : 'application/octet-stream',
        size: typeof entry.size === 'number' ? entry.size : 0,
        url,
      },
    ]
  })
}

function readSources(data: unknown): CitationSource[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((entry) => {
    if (
      !isRecordLike(entry) ||
      typeof entry.index !== 'number' ||
      typeof entry.title !== 'string' ||
      (entry.kind !== 'document' && entry.kind !== 'web')
    ) {
      return []
    }
    const url =
      typeof entry.url === 'string' && sameOriginPath(entry.url) !== null ? entry.url : undefined
    return [
      {
        index: entry.index,
        kind: entry.kind,
        title: entry.title,
        ...(url ? { url } : {}),
        ...(typeof entry.excerpt === 'string' ? { excerpt: entry.excerpt } : {}),
      },
    ]
  })
}

/** What an `output` frame of an agent block adds to the answer, `null` when it adds nothing. */
export function readAgentOutputFrame(frame: unknown): AgentOutput | null {
  if (!isChatOutputFrame(frame)) return null
  if (frame.path === 'files') {
    if (!Array.isArray(frame.data)) return null
    return { kind: 'files', files: readFiles(frame.data) }
  }
  if (frame.path === 'sources') {
    if (!Array.isArray(frame.data)) return null
    return { kind: 'sources', sources: readSources(frame.data) }
  }
  return null
}

/** An agent the answering agent handed a request to (« Agent tarifs répond… »). */
export interface DelegationNote {
  id: string
  agentId: string
  agent: string
  mode: 'reply' | 'transfer'
  status: 'running' | 'done' | 'failed'
  /** Why a delegation did not happen, in French. */
  message?: string
}

export interface AnswerExtras {
  files: ProducedFile[]
  sources: CitationSource[]
  /** Absent on an answer that delegated nothing, and on answers stored before delegation existed. */
  delegations?: DelegationNote[]
}

/** The delegations of an answer after one more `delegation` frame of its stream. */
export function applyDelegationFrame(
  notes: readonly DelegationNote[],
  frame: ChatStreamDelegationFrame
): DelegationNote[] {
  const { data } = frame
  const base = { id: data.id, agentId: data.agentId, agent: data.agent, mode: data.mode }
  if (data.phase === 'start') {
    return [...notes, { ...base, status: 'running' }]
  }
  const ended: DelegationNote = {
    ...base,
    status: data.ok ? 'done' : 'failed',
    ...(data.message ? { message: data.message } : {}),
  }
  return notes.some((note) => note.id === data.id)
    ? notes.map((note) => (note.id === data.id ? ended : note))
    : [...notes, ended]
}

function readDelegations(data: unknown): DelegationNote[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((entry): DelegationNote[] => {
    if (
      !isRecordLike(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.agentId !== 'string' ||
      typeof entry.agent !== 'string' ||
      (entry.mode !== 'reply' && entry.mode !== 'transfer') ||
      (entry.status !== 'running' && entry.status !== 'done' && entry.status !== 'failed')
    ) {
      return []
    }
    return [
      {
        id: entry.id,
        agentId: entry.agentId,
        agent: entry.agent,
        mode: entry.mode,
        // A delegation still running when the answer was stored was cut: it did not finish.
        status: entry.status === 'running' ? 'failed' : entry.status,
        ...(typeof entry.message === 'string' ? { message: entry.message } : {}),
      },
    ]
  })
}

const EXTRAS_MARKER = '<!--nexora-extras:'
const EXTRAS_END = '-->'

/** A marker the model wrote: kept readable but no longer a marker, so it is never read back as extras. */
function withoutMarker(text: string): string {
  return text.replaceAll(EXTRAS_MARKER, `&lt;${EXTRAS_MARKER.slice(1)}`)
}

/**
 * The text of an answer to keep, with its files and sources after it as an HTML comment (which a
 * Markdown view does not show). The Assistant stores answers as text; carrying the extras this way
 * keeps them across a reload without a new column. A marker the model itself wrote in the text is
 * defused first, so only the one added here can be read back (no forged « sources »).
 */
export function withExtras(text: string, extras: AnswerExtras): string {
  const safeText = withoutMarker(text)
  if (extras.files.length === 0 && extras.sources.length === 0 && !extras.delegations?.length) {
    return safeText
  }
  const json = JSON.stringify(extras).replaceAll('-->', '--\\u003e')
  return `${safeText}\n\n${EXTRAS_MARKER}${json}${EXTRAS_END}`
}

/** A stored answer split back into its text and its extras; a damaged marker leaves just the text. */
export function splitExtras(stored: string): { text: string; extras: AnswerExtras } {
  const none: AnswerExtras = { files: [], sources: [] }
  const start = stored.lastIndexOf(EXTRAS_MARKER)
  if (start === -1 || !stored.endsWith(EXTRAS_END)) return { text: stored, extras: none }
  const text = stored.slice(0, start).trimEnd()
  try {
    const parsed: unknown = JSON.parse(
      stored.slice(start + EXTRAS_MARKER.length, stored.length - EXTRAS_END.length)
    )
    if (!isRecordLike(parsed)) return { text, extras: none }
    const delegations = readDelegations(parsed.delegations)
    return {
      text,
      extras: {
        files: readFiles(parsed.files),
        sources: readSources(parsed.sources),
        ...(delegations.length > 0 ? { delegations } : {}),
      },
    }
  } catch {
    return { text, extras: none }
  }
}
