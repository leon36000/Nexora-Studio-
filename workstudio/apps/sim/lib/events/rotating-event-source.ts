export type EventSourceOpenReason = 'initial' | 'reconnect' | 'rotation'

interface RotatingEventSourceOptions {
  url: string
  events: Record<string, (event: Event) => void>
  onOpen?: (reason: EventSourceOpenReason) => void
  onError?: () => void
}

export interface RotatingEventSourceConnection {
  close(): void
}

/** How long after a `beforeunload` the page is considered to have stayed (the navigation was cancelled). */
const RESUME_AFTER_CANCELLED_UNLOAD_MS = 2000

interface SourceState {
  opened: boolean
  erroredBeforeOpen: boolean
}

/**
 * Maintains one live EventSource and performs make-before-break rotation when
 * the server emits `rotate`. The old source remains open until its replacement
 * connects, so planned lifetime bounds do not create an event-delivery gap.
 */
export function createRotatingEventSource(
  options: RotatingEventSourceOptions
): RotatingEventSourceConnection {
  const sources = new Set<EventSource>()
  const states = new WeakMap<EventSource, SourceState>()
  let current: EventSource | null = null
  let replacement: EventSource | null = null
  let closed = false

  const openSource = (isReplacement: boolean, resumed = false): EventSource => {
    const source = new EventSource(options.url)
    const state: SourceState = { opened: false, erroredBeforeOpen: resumed }
    states.set(source, state)
    sources.add(source)

    for (const [eventName, listener] of Object.entries(options.events)) {
      source.addEventListener(eventName, listener)
    }

    source.addEventListener('rotate', () => {
      if (closed || source !== current || replacement) return
      try {
        replacement = openSource(true)
      } catch {
        replacement = null
        options.onError?.()
      }
    })

    source.onopen = () => {
      if (closed) {
        source.close()
        sources.delete(source)
        return
      }

      if (isReplacement) {
        if (source !== replacement) {
          source.close()
          sources.delete(source)
          return
        }

        const previous = current
        const seamless = previous?.readyState === EventSource.OPEN
        current = source
        replacement = null
        if (previous && previous !== source) {
          previous.close()
          sources.delete(previous)
        }
        state.opened = true
        state.erroredBeforeOpen = false
        options.onOpen?.(seamless ? 'rotation' : 'reconnect')
        return
      }

      const reason: EventSourceOpenReason =
        state.opened || state.erroredBeforeOpen ? 'reconnect' : 'initial'
      state.opened = true
      state.erroredBeforeOpen = false
      options.onOpen?.(reason)
    }

    source.onerror = () => {
      if (closed || !sources.has(source)) return
      if (!state.opened) state.erroredBeforeOpen = true
      options.onError?.()
    }

    return source
  }

  current = openSource(false)

  let resumeTimer: ReturnType<typeof setTimeout> | null = null

  const closeSources = () => {
    for (const source of sources) source.close()
    sources.clear()
    current = null
    replacement = null
  }

  /**
   * Leaving the page with a stream still connected makes Firefox write « The connection to … was
   * interrupted while the page was loading » to the console (the site's own console, on every reload
   * or navigation), because it cuts the connection before `pagehide`. So the sources are closed as the
   * navigation starts (`beforeunload`). A cancelled navigation (an « unsaved changes » prompt) leaves the
   * page alive: the stream comes back shortly after, reported as a reconnection so that listeners
   * refresh what they missed. A page entering the back/forward cache (`persisted`) keeps its streams.
   */
  const onBeforeUnload = () => {
    if (closed || resumeTimer) return
    closeSources()
    resumeTimer = setTimeout(() => {
      resumeTimer = null
      if (!closed) current = openSource(false, true)
    }, RESUME_AFTER_CANCELLED_UNLOAD_MS)
  }
  const onPageHide = (event: Event) => {
    if ((event as PageTransitionEvent).persisted) return
    connection.close()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide)
  }

  const connection: RotatingEventSourceConnection = {
    close() {
      if (closed) return
      closed = true
      if (resumeTimer) clearTimeout(resumeTimer)
      resumeTimer = null
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', onBeforeUnload)
        window.removeEventListener('pagehide', onPageHide)
      }
      closeSources()
    },
  }
  return connection
}
