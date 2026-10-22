'use client'

import { Component, type ErrorInfo, type ReactNode, useId } from 'react'
import { ChipModal, ChipModalBody, ChipModalHeader, Loader, toast } from '@sim/emcn'
import { createLogger } from '@sim/logger'
import { useTranslations } from 'next-intl'

const logger = createLogger('ExecutionSnapshotBoundary')

interface SnapshotBoundaryProps {
  children: ReactNode
  isOpen: boolean
  onLoadError: () => void
}

interface SnapshotBoundaryInnerProps extends SnapshotBoundaryProps {
  loadErrorMessage: string
}

interface SnapshotBoundaryState {
  hasError: boolean
}

const reportedErrors = new WeakSet<Error>()

interface SnapshotModalFallbackProps {
  isOpen: boolean
  onClose: () => void
}

export function SnapshotModalFallback({ isOpen, onClose }: SnapshotModalFallbackProps) {
  const t = useTranslations('logs.snapshot')
  const descriptionId = useId()

  return (
    <ChipModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      srTitle={t('title')}
      aria-describedby={descriptionId}
      size='full'
      className='h-[90vh] [&>div]:h-full'
    >
      <ChipModalHeader onClose={onClose}>{t('title')}</ChipModalHeader>
      <ChipModalBody fullBleed className='items-center justify-center'>
        <p id={descriptionId} className='sr-only'>
          {t('loadingDescription')}
        </p>
        <div className='flex items-center gap-2 text-[var(--text-secondary)]'>
          <Loader className='size-[16px]' animate />
          <span className='text-small'>{t('loading')}</span>
        </div>
      </ChipModalBody>
    </ChipModal>
  )
}

/**
 * Error boundary for the lazily loaded execution snapshot.
 *
 * `Suspense` handles the pending state of the lazy import but not its
 * rejection — a failed chunk load (deploy skew, offline) would otherwise
 * unwind to the route-level boundary and replace the whole logs page with an
 * error view over an optional modal. Mirrors `PreviewErrorBoundary` in the
 * file viewer: contain, log, degrade. The snapshot is an overlay, so the
 * degraded state renders nothing. Closed snapshots are mounted to pre-warm
 * their chunk and data, so a background failure is logged without interrupting
 * the user. If the user actually opens a failed snapshot, the caller closes
 * the modal state and a toast explains why it did not open.
 *
 * Callers must remount this boundary when the snapshot identity changes and
 * when a pre-warmed snapshot is explicitly opened. Error boundaries reset only
 * via remount; without both transitions, a failed pre-warm would leave the
 * later open action stuck in the already-tripped state.
 */
export function SnapshotBoundary(props: SnapshotBoundaryProps) {
  const t = useTranslations('logs.snapshot')
  return <SnapshotBoundaryInner {...props} loadErrorMessage={t('loadFailed')} />
}

class SnapshotBoundaryInner extends Component<SnapshotBoundaryInnerProps, SnapshotBoundaryState> {
  public state: SnapshotBoundaryState = { hasError: false }

  public static getDerivedStateFromError(): SnapshotBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!reportedErrors.has(error)) {
      reportedErrors.add(error)
      logger.error('Execution snapshot failed to load', {
        error: error.message,
        componentStack: errorInfo.componentStack,
      })
    }

    if (this.props.isOpen) {
      toast.error(this.props.loadErrorMessage)
      this.props.onLoadError()
    }
  }

  public render() {
    return this.state.hasError ? null : this.props.children
  }
}
