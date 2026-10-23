import { Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout } from '@/components/emails/components'
import { getEmailTranslator } from '@/components/emails/i18n'
import { getBrandConfig } from '@/ee/whitelabeling'

interface PermissionAccessRequestEmailProps {
  kind: 'created' | 'decided'
  requestLink: string
}

/** Request details stay behind authenticated review, including in forwarded messages. */
export function PermissionAccessRequestEmail({
  kind,
  requestLink,
}: PermissionAccessRequestEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const needsReview = kind === 'created'
  const brandName = brand.name

  return (
    <EmailLayout
      preview={
        needsReview
          ? t('permissionAccessRequest.previewCreated', { brandName })
          : t('permissionAccessRequest.previewDecided', { brandName })
      }
      showUnsubscribe={false}
    >
      <Text style={baseStyles.greeting}>{t('common.hi')}</Text>
      <Text style={baseStyles.paragraph}>
        {needsReview
          ? t('permissionAccessRequest.bodyCreated', { brandName })
          : t('permissionAccessRequest.bodyDecided', { brandName })}
      </Text>
      <EmailButton href={requestLink}>
        {needsReview ? t('permissionAccessRequest.review') : t('permissionAccessRequest.view')}
      </EmailButton>
    </EmailLayout>
  )
}
