'use client'

import { Component, type ErrorInfo, memo, type ReactNode } from 'react'
import { cn } from '@sim/emcn'
import { Loader } from '@sim/emcn/icons'
import { createLogger } from '@sim/logger'
import { useTranslations } from 'next-intl'
import { getFileExtension } from '@/lib/uploads/utils/file'

const logger = createLogger('FilePreview')

interface UnsupportedPreviewProps {
  name: string
  reason?: string
}

/**
 * Terminal fallback for a file this app cannot render — either the format has no
 * viewer at all, or a viewer that was expected to work failed (e.g. a HEIC whose
 * server-side derivative could not be produced).
 */
export const UnsupportedPreview = memo(function UnsupportedPreview({
  name,
  reason,
}: UnsupportedPreviewProps) {
  const t = useTranslations('files.preview')
  const ext = getFileExtension(name)

  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-[8px]'>
      <p className='text-[14px] text-[var(--text-primary)]'>
        {reason
          ? t('notAvailable')
          : ext
            ? t('notAvailableForExt', { ext })
            : t('notAvailableForFile')}
      </p>
      <p className='text-[var(--text-muted)] text-small'>{reason ?? t('downloadHint')}</p>
    </div>
  )
})

/** What a preview failed to render, named in the fallback (`files.preview.kinds`). */
type PreviewKind =
  | 'csv'
  | 'document'
  | 'file'
  | 'pdf'
  | 'presentation'
  | 'spreadsheet'
  | 'audio'
  | 'video'

/** Why a preview failed: a raw message, or one of the known failures translated at render. */
type PreviewFailure = { message: string } | { known: 'docNotReady' | 'unexpected' }

interface PreviewErrorProps {
  kind: PreviewKind
  error: PreviewFailure
}

export function PreviewError({ kind, error }: PreviewErrorProps) {
  const t = useTranslations('files.preview')
  const message =
    'message' in error
      ? error.message
      : error.known === 'docNotReady'
        ? t('docNotReady')
        : t('unexpectedError')
  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-[8px]'>
      <p className='text-[14px] text-[var(--text-primary)]'>
        {t('failed', { label: t(`kinds.${kind}`) })}
      </p>
      <p className='text-[var(--text-muted)] text-small'>{message}</p>
    </div>
  )
}

interface PreviewErrorBoundaryProps {
  /** Format shown in the fallback. */
  kind: PreviewKind
  children: ReactNode
}

interface PreviewErrorBoundaryState {
  hasError: boolean
  error?: Error
}

/**
 * Error boundary for preview renderers. Catches render-time crashes (including
 * a preview module whose dynamic import rejected) and degrades to the standard
 * PreviewError fallback instead of unwinding to the route-level error boundary
 * and replacing the whole workspace view.
 *
 * Callers must `key` this boundary by the identity of the rendered content
 * (e.g. file id + data version) — the error state resets only via remount, so
 * keying the child alone would leave a tripped boundary stuck on the fallback.
 */
export class PreviewErrorBoundary extends Component<
  PreviewErrorBoundaryProps,
  PreviewErrorBoundaryState
> {
  public state: PreviewErrorBoundaryState = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): PreviewErrorBoundaryState {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Preview crashed', {
      label: this.props.kind,
      error: error.message,
      componentStack: errorInfo.componentStack,
    })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <PreviewError
          kind={this.props.kind}
          error={
            this.state.error?.message
              ? { message: this.state.error.message }
              : { known: 'unexpected' }
          }
        />
      )
    }

    return this.props.children
  }
}

export function resolvePreviewError(
  fetchError: Error | null,
  renderError: string | null
): PreviewFailure | null {
  // A doc whose compiled artifact never appeared (the binary query exhausted its
  // "still generating" polls) — usually a source that failed to compile or a
  // legacy file with no artifact. Give a clear, actionable message instead of a
  // generic fetch error.
  if (fetchError?.name === 'DocNotReadyError') return { known: 'docNotReady' }
  if (fetchError) return fetchError.message ? { message: fetchError.message } : null
  return renderError ? { message: renderError } : null
}

/** Canonical content-area loading spinner, matching the rest of the app. */
const PREVIEW_LOADING_SPINNER = (
  <Loader className='size-[20px] text-[var(--text-secondary)]' animate />
)

/**
 * Canonical loading overlay for previews that render into a `--surface-1`
 * canvas. Absolutely covers the canvas (with `z-10` so it paints above
 * in-flow render targets) with a centered spinner until the preview is ready.
 */
export const PREVIEW_LOADING_OVERLAY = (
  <div className='absolute inset-0 z-10 flex items-center justify-center bg-[var(--surface-1)]'>
    {PREVIEW_LOADING_SPINNER}
  </div>
)

interface PreviewLoadingFrameProps {
  /** Layout/sizing-only classes for the in-flow frame (e.g. `h-full`, `flex-1`). */
  className?: string
  /** Background token matching the loaded sibling's canvas. Defaults to `--bg`. */
  tone?: 'bg' | 'surface'
}

/**
 * Canonical in-flow loading frame with a centered spinner, shown while a
 * preview is fetching or rendering. The `tone` must match the background of
 * the loaded state it is standing in for, so mount completion does not flash
 * a different token.
 */
export function PreviewLoadingFrame({ className, tone = 'bg' }: PreviewLoadingFrameProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        tone === 'surface' ? 'bg-[var(--surface-1)]' : 'bg-[var(--bg)]',
        className
      )}
    >
      {PREVIEW_LOADING_SPINNER}
    </div>
  )
}
