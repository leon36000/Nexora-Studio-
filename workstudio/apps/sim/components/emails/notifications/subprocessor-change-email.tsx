import { Link, Section, Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout, EmailStrong } from '@/components/emails/components'
import { EMAIL_DATE_LOCALE, EMAIL_LOCALE, getEmailTranslator } from '@/components/emails/i18n'
import { getBrandConfig } from '@/ee/whitelabeling'

/** How a sub-processor's role on the list is changing. */
export type SubprocessorChangeType = 'added' | 'replaced' | 'removed'

/**
 * Dates in a notice period have to be unambiguous, so the month is spelled out
 * rather than left to the recipient's locale ordering of a numeric date. The
 * zone is pinned because the notice window is contractual — the rendered day
 * must not shift with the server the send happens to run on.
 */
const NOTICE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
}

function formatNoticeDate(date: Date): string {
  return date.toLocaleDateString(EMAIL_DATE_LOCALE[EMAIL_LOCALE], NOTICE_DATE_FORMAT)
}

export interface SubprocessorChange {
  /** Legal entity name of the sub-processor. */
  name: string
  /** What it is used for, in plain language. */
  purpose: string
  /** Categories of customer personal data it will process. */
  dataCategories: string
  /** Primary processing location, e.g. `United States`. */
  location: string
  changeType: SubprocessorChangeType
}

interface SubprocessorChangeEmailProps {
  recipientName?: string
  /** The sub-processors being added, replaced, or removed in this notice. */
  changes: SubprocessorChange[]
  /** When the change takes effect. Sent at least 30 days ahead of this date. */
  effectiveDate: Date
  /** Last day an objection can be raised. Falls on or before {@link effectiveDate}. */
  objectionDeadline: Date
  /** Where an objection is sent. */
  objectionEmail: string
  /** The public sub-processor list, which reflects the change once it is live. */
  subprocessorListUrl: string
  /** Where the recipient manages whether they receive these notices. */
  subscriptionUrl?: string
}

/**
 * Advance notice to subscribed customers that the sub-processors handling their
 * personal data are changing, with the window and address for objecting.
 */
export function SubprocessorChangeEmail({
  recipientName,
  changes,
  effectiveDate,
  objectionDeadline,
  objectionEmail,
  subprocessorListUrl,
  subscriptionUrl,
}: SubprocessorChangeEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const effectiveDateLabel = formatNoticeDate(effectiveDate)
  const strong = (chunks: React.ReactNode) => <EmailStrong>{chunks}</EmailStrong>

  return (
    <EmailLayout
      preview={t('subprocessorChange.preview', {
        brandName: brand.name,
        date: effectiveDateLabel,
      })}
      showUnsubscribe={false}
    >
      <Text style={baseStyles.greeting}>
        {recipientName ? t('common.hiName', { name: recipientName }) : t('common.hi')}
      </Text>

      <Text style={baseStyles.paragraph}>
        {t.rich('subprocessorChange.intro', {
          brandName: brand.name,
          date: effectiveDateLabel,
          strong,
        })}
      </Text>

      {changes.map((change) => (
        <Section key={change.name} style={baseStyles.infoBox}>
          <Text style={baseStyles.infoBoxTitle}>
            {change.name} — {t(`subprocessorChange.changeTypes.${change.changeType}`)}
          </Text>
          <Text style={baseStyles.infoBoxList}>
            {t('subprocessorChange.purpose', { value: change.purpose })}
            <br />
            {t('subprocessorChange.dataProcessed', { value: change.dataCategories })}
            <br />
            {t('subprocessorChange.location', { value: change.location })}
            <br />
            {t('subprocessorChange.effective', { date: effectiveDateLabel })}
          </Text>
        </Section>
      ))}

      <Text style={baseStyles.paragraph}>
        {t.rich('subprocessorChange.objection', {
          email: objectionEmail,
          deadline: formatNoticeDate(objectionDeadline),
          strong,
          link: (chunks) => (
            <Link href={`mailto:${objectionEmail}`} style={baseStyles.link}>
              {chunks}
            </Link>
          ),
        })}
      </Text>

      <Text style={baseStyles.paragraph}>{t('subprocessorChange.noAction')}</Text>

      <EmailButton href={subprocessorListUrl}>{t('subprocessorChange.button')}</EmailButton>

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>
        {t('subprocessorChange.footnote')}
        {subscriptionUrl ? (
          <>
            {' '}
            {t.rich('subprocessorChange.manage', {
              link: (chunks) => (
                <Link href={subscriptionUrl} style={baseStyles.footerLink}>
                  {chunks}
                </Link>
              ),
            })}
          </>
        ) : null}
      </Text>
    </EmailLayout>
  )
}

export default SubprocessorChangeEmail
