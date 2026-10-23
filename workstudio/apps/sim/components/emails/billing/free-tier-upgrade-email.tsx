import { Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { ProFeaturesBox } from '@/components/emails/billing/pro-features-box'
import { EmailButton, EmailLayout, EmailStrong } from '@/components/emails/components'
import { formatEmailNumber, getEmailTranslator } from '@/components/emails/i18n'
import { dollarsToCredits } from '@/lib/billing/credits/conversion'
import { getBrandConfig } from '@/ee/whitelabeling'

interface FreeTierUpgradeEmailProps {
  userName?: string
  percentUsed: number
  currentUsage: number
  limit: number
  upgradeLink: string
}

export function FreeTierUpgradeEmail({
  userName,
  percentUsed,
  currentUsage,
  limit,
  upgradeLink,
}: FreeTierUpgradeEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const percent = String(percentUsed)

  return (
    <EmailLayout
      preview={t('freeTierUpgrade.preview', { brandName: brand.name, percent })}
      showUnsubscribe={true}
    >
      <Text style={baseStyles.greeting}>
        {userName ? t('common.hiName', { name: userName }) : t('common.hi')}
      </Text>

      <Text style={baseStyles.paragraph}>
        {t.rich('freeTierUpgrade.body', {
          used: formatEmailNumber(dollarsToCredits(currentUsage)),
          limit: formatEmailNumber(dollarsToCredits(limit)),
          percent,
          strong: (chunks) => <EmailStrong>{chunks}</EmailStrong>,
        })}
      </Text>

      <ProFeaturesBox />

      <EmailButton href={upgradeLink}>{t('common.upgradeToPro')}</EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('common.oneTimeAt80')}</Text>
    </EmailLayout>
  )
}

export default FreeTierUpgradeEmail
