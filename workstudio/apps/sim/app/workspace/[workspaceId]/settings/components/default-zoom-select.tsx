'use client'

import {
  DESKTOP_ZOOM_PERCENTS,
  type DesktopZoomPercent,
  isDesktopZoomPercent,
} from '@sim/desktop-bridge'
import { ChipSelect } from '@sim/emcn'
import { useTranslations } from 'next-intl'

interface DefaultZoomSelectProps {
  value: DesktopZoomPercent
  onChange: (value: DesktopZoomPercent) => void
  disabled?: boolean
  ariaLabel?: string
}

/** Shared default-zoom selector for desktop-owned resource settings. */
export function DefaultZoomSelect({
  value,
  onChange,
  disabled,
  ariaLabel,
}: DefaultZoomSelectProps) {
  const t = useTranslations('settings.zoom')
  return (
    <div className='w-[240px] max-w-[55%] shrink-0 md:max-w-none'>
      <ChipSelect
        aria-label={ariaLabel ?? t('defaultZoom')}
        align='start'
        fullWidth
        dropdownWidth='trigger'
        value={String(value)}
        onChange={(next) => {
          const zoom = Number.parseInt(next, 10)
          if (isDesktopZoomPercent(zoom)) onChange(zoom)
        }}
        disabled={disabled}
        options={DESKTOP_ZOOM_PERCENTS.map((zoom) => ({
          label: t('percent', { zoom }),
          value: String(zoom),
        }))}
      />
    </div>
  )
}
