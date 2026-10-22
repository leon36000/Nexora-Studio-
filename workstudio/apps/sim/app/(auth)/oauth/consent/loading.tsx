import { Loader } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { AuthHeader } from '@/app/(auth)/components'

export function OAuthConsentLoading() {
  const t = useTranslations('auth.oauthConsent')
  return (
    <div role='status' className='space-y-6'>
      <AuthHeader title={t('loadingTitle')} description={t('loadingDescription')} />
      <div className='flex justify-center'>
        <Loader aria-hidden='true' className='size-5' animate />
      </div>
    </div>
  )
}

export default function OAuthConsentRouteLoading() {
  return <OAuthConsentLoading />
}
