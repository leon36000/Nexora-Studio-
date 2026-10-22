import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import ResetPasswordPage from '@/app/(auth)/reset-password/reset-password-content'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.resetPassword')
  return { title: t('metaTitle') }
}

export const dynamic = 'force-dynamic'

export default ResetPasswordPage
