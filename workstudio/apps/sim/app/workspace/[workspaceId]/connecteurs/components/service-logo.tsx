interface ServiceLogoProps {
  name: string
}

/**
 * A service's initial. Nexora makes no third-party call by default, so provider icons hosted on
 * the providers' own sites are not loaded from the browser.
 */
export function ServiceLogo({ name }: ServiceLogoProps) {
  return (
    <span aria-hidden className='font-medium text-[var(--text-icon)] text-sm'>
      {Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '?'}
    </span>
  )
}
