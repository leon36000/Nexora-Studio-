import { Text } from '@react-email/components'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { baseStyles } from '@/components/emails/_styles'
import { EmailLayout, EmailStrong } from '@/components/emails/components'
import { EMAIL_LOCALE, getEmailTranslator } from '@/components/emails/i18n'

interface HelpConfirmationEmailProps {
  type?: 'bug' | 'feedback' | 'feature_request' | 'other'
  attachmentCount?: number
  submittedDate?: Date
}

const REQUEST_TYPES = new Set(['bug', 'feedback', 'feature_request', 'other'])

function formatSubmittedDate(date: Date): string {
  return EMAIL_LOCALE === 'fr'
    ? format(date, 'd MMMM yyyy', { locale: fr })
    : format(date, 'MMMM do, yyyy')
}

export function HelpConfirmationEmail({
  type = 'other',
  attachmentCount = 0,
  submittedDate = new Date(),
}: HelpConfirmationEmailProps) {
  const t = getEmailTranslator()
  const typeLabel = t(`helpConfirmation.types.${REQUEST_TYPES.has(type) ? type : 'default'}`)
  const lowerTypeLabel = typeLabel.toLowerCase()

  return (
    <EmailLayout
      preview={t('helpConfirmation.preview', { type: lowerTypeLabel })}
      showUnsubscribe={false}
    >
      <Text style={baseStyles.greeting}>{t('common.hello')}</Text>
      <Text style={baseStyles.paragraph}>
        {t.rich('helpConfirmation.body', {
          type: lowerTypeLabel,
          strong: (chunks) => <EmailStrong>{chunks}</EmailStrong>,
        })}
      </Text>

      {attachmentCount > 0 && (
        <Text style={baseStyles.paragraph}>
          {t('helpConfirmation.attachments', { count: attachmentCount })}
        </Text>
      )}

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>
        {t('helpConfirmation.submitted', { date: formatSubmittedDate(submittedDate) })}
      </Text>
    </EmailLayout>
  )
}

export default HelpConfirmationEmail
