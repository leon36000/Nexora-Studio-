import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import type { NewAlert } from '@/lib/nexora/evaluations/repository'
import { type SummaryItem, summarizeItems } from '@/lib/nexora/evaluations/stats'
import type { EvalTarget } from '@/lib/nexora/evaluations/types'

const logger = createLogger('NexoraEvaluationAlerts')

/** The campaign fields the alerts depend on. */
export interface AlertedCampaign {
  id: string
  workspaceId: string
  name: string
  targets: readonly EvalTarget[]
  /** Share of passed items (0 to 1) under which a target raises an alert, `null` for no alert. */
  alertThreshold: number | null
  createdBy: string | null
  scheduleId: string | null
}

type EndStatus = 'completed' | 'interrupted' | 'failed'

/**
 * The alerts a finished campaign raises. A completed campaign raises one per target whose pass
 * rate is under the threshold (errors count against it: a campaign that mostly fails to run is
 * not green) and one « failed » per target that produced nothing. A campaign that stopped before
 * the end (budget, error) raises one for the whole campaign. Without a threshold, none.
 */
export function alertsFor(
  campaign: AlertedCampaign,
  itemsByTarget: ReadonlyMap<string, readonly SummaryItem[]>,
  status: EndStatus
): NewAlert[] {
  const threshold = campaign.alertThreshold
  if (threshold === null) return []
  const base = { workspaceId: campaign.workspaceId, campaignId: campaign.id, threshold }
  if (status !== 'completed') {
    return [{ ...base, targetKey: '*', targetLabel: campaign.name, kind: 'failed', passRate: null }]
  }
  const alerts: NewAlert[] = []
  for (const target of campaign.targets) {
    const { passRate } = summarizeItems(itemsByTarget.get(target.key) ?? [])
    const common = { ...base, targetKey: target.key, targetLabel: target.label, passRate }
    if (passRate === null) alerts.push({ ...common, kind: 'failed' })
    else if (passRate < threshold) alerts.push({ ...common, kind: 'below_threshold' })
  }
  return alerts
}

const percent = (value: number) => `${Math.round(value * 100)} %`

/** The e-mail that tells the instance administrators and the campaign's author about alerts. */
export function alertEmail(
  campaign: Pick<AlertedCampaign, 'name'>,
  alerts: readonly NewAlert[]
): { subject: string; text: string } {
  const lines = alerts.map((alert) => {
    if (alert.kind === 'failed') {
      return alert.targetKey === '*'
        ? '- la campagne s’est arrêtée avant la fin (budget mensuel atteint ou erreur)'
        : `- ${alert.targetLabel} : aucun résultat exploitable`
    }
    return `- ${alert.targetLabel} : ${percent(alert.passRate ?? 0)} de réussite, sous le seuil de ${percent(alert.threshold ?? 0)}`
  })
  return {
    subject: `Nexora WorkStudio : alerte d’évaluation — ${campaign.name}`,
    text: `Bonjour,\n\nNexora WorkStudio : la campagne d’évaluation « ${campaign.name} » demande votre attention.\n\n${lines.join('\n')}\n\nOuvrez la page Évaluations de l’espace pour lire le détail ligne à ligne et acquitter l’alerte.\n`,
  }
}

export interface AlertDeps {
  /** Items of each target of the campaign, with what statistics read. */
  loadSeries: (campaignId: string) => Promise<Map<string, SummaryItem[]>>
  insertAlerts: (alerts: readonly NewAlert[]) => Promise<NewAlert[]>
  recipients: (campaign: AlertedCampaign) => Promise<string[]>
  hasEmailService: () => boolean
  sendEmail: (message: { to: string[]; subject: string; text: string }) => Promise<unknown>
}

/**
 * Records the alerts of a finished campaign (the banner of the Evaluations page) and e-mails the
 * ones recorded just now when an e-mail service is configured, like the budgets alerts. A failing
 * e-mail never loses the alert. Returns the alerts raised.
 */
export async function raiseCampaignAlerts(
  campaign: AlertedCampaign,
  status: EndStatus,
  deps: AlertDeps
): Promise<NewAlert[]> {
  if (campaign.alertThreshold === null) return []
  const series = status === 'completed' ? await deps.loadSeries(campaign.id) : new Map()
  const raised = await deps.insertAlerts(alertsFor(campaign, series, status))
  if (raised.length === 0 || !deps.hasEmailService()) return raised
  try {
    const to = await deps.recipients(campaign)
    if (to.length > 0) await deps.sendEmail({ to, ...alertEmail(campaign, raised) })
  } catch (error) {
    logger.error('Failed to e-mail an evaluation alert', { error: getErrorMessage(error) })
  }
  return raised
}
