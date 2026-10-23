'use client'

import { useState } from 'react'

interface ServiceLogoProps {
  name: string
  iconUrl: string | null
}

/**
 * A service's icon from the Nexora Connect catalog, or its initial when it has none (or it
 * fails to load). Never a favicon service: no third-party call is made on the catalog's behalf.
 */
export function ServiceLogo({ name, iconUrl }: ServiceLogoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (iconUrl && failedUrl !== iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=''
        loading='lazy'
        referrerPolicy='no-referrer'
        onError={() => setFailedUrl(iconUrl)}
      />
    )
  }
  return (
    <span aria-hidden className='font-medium text-[var(--text-icon)] text-sm'>
      {Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '?'}
    </span>
  )
}
