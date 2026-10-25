import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { Cron } from 'croner'
import type { CampaignRecord, ScheduleRecord } from '@/lib/nexora/evaluations/repository'

const logger = createLogger('NexoraEvaluationSchedules')

/** The first time after `after` the expression fires in the time zone, `null` if it never does. */
export function nextRunAfter(cron: string, timezone: string, after: Date): Date | null {
  try {
    return new Cron(cron, { timezone }).nextRun(after)
  } catch {
    return null
  }
}

function knownTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/** The reason a timetable cannot be used, in French, or `null` when it can. */
export function validateSchedule(cron: string, timezone: string): string | null {
  if (!knownTimezone(timezone)) return `Le fuseau horaire « ${timezone} » est inconnu.`
  try {
    if (!new Cron(cron, { timezone }).nextRun()) {
      return 'Cette expression ne tombe sur aucune date à venir.'
    }
    return null
  } catch {
    return 'L’expression de planification est invalide (cinq champs : minute heure jour mois jour-de-semaine).'
  }
}

export interface ScheduleDeps {
  /** Takes the due schedules and moves each to the time `nextRun` gives (see the repository). */
  claim: (
    now: Date,
    nextRun: (schedule: ScheduleRecord) => Date | null
  ) => Promise<ScheduleRecord[]>
  launch: (schedule: ScheduleRecord) => Promise<CampaignRecord>
  /** A schedule that could not start: leaves a failed campaign and its alert. */
  onLaunchFailed: (schedule: ScheduleRecord, reason: string) => Promise<void>
  setLastCampaign: (scheduleId: string, campaignId: string) => Promise<void>
}

/**
 * Starts the campaigns of the schedules whose time has come. A schedule due several times over
 * (the server was down) starts once: its next time is computed from `now`.
 */
export async function runDueSchedules(
  now: Date,
  deps: ScheduleDeps
): Promise<{ started: string[]; failed: string[] }> {
  const due = await deps.claim(now, (schedule) =>
    nextRunAfter(schedule.cron, schedule.timezone, now)
  )
  const started: string[] = []
  const failed: string[] = []
  for (const schedule of due) {
    try {
      const campaign = await deps.launch(schedule)
      await deps.setLastCampaign(schedule.id, campaign.id)
      started.push(campaign.id)
    } catch (error) {
      const reason = getErrorMessage(error, 'Échec du lancement.')
      logger.error('Scheduled evaluation could not start', { scheduleId: schedule.id, reason })
      failed.push(schedule.id)
      await deps.onLaunchFailed(schedule, reason).catch(() => undefined)
    }
  }
  return { started, failed }
}
