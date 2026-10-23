import { Section, Text } from '@react-email/components'
import { baseStyles } from '@/components/emails/_styles'
import { EmailButton, EmailLayout } from '@/components/emails/components'
import { formatEmailNumber, getEmailTranslator } from '@/components/emails/i18n'
import type { ScheduleDisableReason } from '@/lib/workflows/schedules/disable-reasons'
import { getBrandConfig } from '@/ee/whitelabeling'

interface ScheduleDisabledEmailProps {
  recipientName?: string
  /** Workflow name. Absent when the source row could not be read. */
  resourceName?: string
  reason: ScheduleDisableReason
  /** Consecutive failures at disable time. Rendered only for `consecutive_failures`. */
  failedCount?: number
  /** Deep link to the workflow. Absent when the workspace is unknown. */
  manageLink?: string
}

/**
 * Sent when the platform turns a schedule off on its own — either after repeated
 * failures or on a terminal error that cannot resolve itself. The reason is fixed
 * copy per {@link ScheduleDisableReason}, never the underlying error string, which
 * can carry credentials or customer data.
 */
export function ScheduleDisabledEmail({
  recipientName,
  resourceName,
  reason,
  failedCount,
  manageLink,
}: ScheduleDisabledEmailProps) {
  const brand = getBrandConfig()
  const t = getEmailTranslator()
  const reasonCopy =
    reason === 'consecutive_failures' && failedCount
      ? t('scheduleDisabled.failedTimes', { count: formatEmailNumber(failedCount) })
      : t(`scheduleDisabled.reasons.${reason}`)

  return (
    <EmailLayout
      preview={
        resourceName
          ? t('scheduleDisabled.preview', { brandName: brand.name, resource: resourceName })
          : t('scheduleDisabled.previewUnnamed', { brandName: brand.name })
      }
      showUnsubscribe={true}
    >
      <Text style={baseStyles.greeting}>
        {recipientName ? t('common.hiName', { name: recipientName }) : t('common.hi')}
      </Text>

      <Text style={baseStyles.paragraph}>
        {resourceName
          ? t('scheduleDisabled.body', { brandName: brand.name, resource: resourceName })
          : t('scheduleDisabled.bodyUnnamed', { brandName: brand.name })}
      </Text>

      <Section style={baseStyles.infoBox}>
        <Text style={baseStyles.infoBoxTitle}>{t('scheduleDisabled.reasonTitle')}</Text>
        <Text style={baseStyles.infoBoxList}>{reasonCopy}</Text>
      </Section>

      {manageLink ? (
        <EmailButton href={manageLink}>{t('scheduleDisabled.openWorkflow')}</EmailButton>
      ) : null}

      <div style={baseStyles.divider} />

      <Text style={baseStyles.footnote}>{t('scheduleDisabled.footnote')}</Text>
    </EmailLayout>
  )
}

export default ScheduleDisabledEmail
