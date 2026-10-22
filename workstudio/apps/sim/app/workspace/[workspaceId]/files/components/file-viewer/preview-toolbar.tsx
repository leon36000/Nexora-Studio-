import { Chip, cn } from '@sim/emcn'
import { ChevronLeft, ChevronRight, RefreshCw, ZoomIn, ZoomOut } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'

interface PreviewNavigationControls {
  current: number
  total: number
  /** What one navigation step moves by, named in the buttons' accessible labels. */
  unit: 'page' | 'slide'
  onPrevious: () => void
  onNext: () => void
  canPrevious?: boolean
  canNext?: boolean
}

interface PreviewZoomControls {
  label: string
  onZoomOut: () => void
  onZoomIn: () => void
  canZoomOut?: boolean
  canZoomIn?: boolean
  onReset?: () => void
}

interface PreviewToolbarProps {
  navigation?: PreviewNavigationControls
  zoom?: PreviewZoomControls
  className?: string
}

export function PreviewToolbar({ navigation, zoom, className }: PreviewToolbarProps) {
  return (
    <div
      className={cn(
        'flex h-[41px] shrink-0 items-center justify-between border-[var(--border)] border-b bg-[var(--surface-1)] px-2 max-md:h-auto max-md:min-h-[45px] max-md:flex-wrap max-md:gap-x-2',
        className
      )}
    >
      <div className='flex items-center gap-1'>
        {navigation && <PreviewNavigationControls {...navigation} />}
      </div>
      <div className='flex items-center gap-1 max-md:ml-auto'>
        {zoom && <PreviewZoomControls {...zoom} />}
      </div>
    </div>
  )
}

function PreviewNavigationControls({
  current,
  total,
  unit,
  onPrevious,
  onNext,
  canPrevious = current > 1,
  canNext = current < total,
}: PreviewNavigationControls) {
  const t = useTranslations('files.preview.toolbar')
  return (
    <>
      <Chip
        leftIcon={ChevronLeft}
        onClick={onPrevious}
        disabled={!canPrevious}
        aria-label={unit === 'page' ? t('previousPage') : t('previousSlide')}
      />
      <span className='min-w-[4.5rem] text-center text-[var(--text-body)] text-sm'>
        {total > 0 ? `${current} / ${total}` : '0 / 0'}
      </span>
      <Chip
        leftIcon={ChevronRight}
        onClick={onNext}
        disabled={!canNext}
        aria-label={unit === 'page' ? t('nextPage') : t('nextSlide')}
      />
    </>
  )
}

function PreviewZoomControls({
  label,
  onZoomOut,
  onZoomIn,
  canZoomOut = true,
  canZoomIn = true,
  onReset,
}: PreviewZoomControls) {
  const t = useTranslations('files.preview.toolbar')
  return (
    <>
      {onReset && (
        <Chip leftIcon={RefreshCw} mobileIconOnly onClick={onReset} aria-label={t('resetZoom')}>
          {t('reset')}
        </Chip>
      )}
      <Chip
        leftIcon={ZoomOut}
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label={t('zoomOut')}
      />
      <span className='min-w-[3.25rem] text-center text-[var(--text-body)] text-sm'>{label}</span>
      <Chip leftIcon={ZoomIn} onClick={onZoomIn} disabled={!canZoomIn} aria-label={t('zoomIn')} />
    </>
  )
}
