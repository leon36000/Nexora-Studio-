import { chipContentLabelClass, chipVariants, cn } from '@sim/emcn'
import { useTranslations } from 'next-intl'

export function ResumeExecutionUnavailable() {
  const t = useTranslations('interfaces.resume.unavailable')

  return (
    <div className='flex flex-1 items-center justify-center p-6'>
      <div className='max-w-[400px] text-center'>
        <h1 className='mb-2 text-[var(--text-primary)] text-xl'>{t('title')}</h1>
        <p className='mb-6 text-[var(--text-secondary)] text-sm'>{t('description')}</p>
        <a href='/' className={chipVariants({ variant: 'border' })}>
          <span className={cn(chipContentLabelClass, 'flex-1')}>{t('returnHome')}</span>
        </a>
      </div>
    </div>
  )
}
