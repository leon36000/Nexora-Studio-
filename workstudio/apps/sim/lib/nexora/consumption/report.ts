import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { omit } from '@sim/utils/object'
import { fetchConsumptionByModel, type ModelConsumption } from '@/lib/nexora/consumption/by-model'
import { readWorkspaceConsumption } from '@/lib/nexora/consumption/by-workspace'
import {
  CAR_EMISSION_FACTOR,
  carKilometres,
  type EstimatedFootprint,
  withEstimatedFootprint,
} from '@/lib/nexora/consumption/co2'
import { monthWindow, periodDays, periodWindow } from '@/lib/nexora/consumption/period'
import { NexoraUsageUnavailableError } from '@/lib/nexora/usage'

const logger = createLogger('NexoraConsumptionReport')

type ReportedFootprint = EstimatedFootprint & { estimate: true }

function reportedFootprint(footprint: EstimatedFootprint | null): ReportedFootprint | null {
  return footprint ? { ...footprint, estimate: true } : null
}

async function measuredByModel(start: Date, end: Date): Promise<ModelConsumption[] | null> {
  try {
    return await fetchConsumptionByModel({ start, end })
  } catch (error) {
    if (!(error instanceof NexoraUsageUnavailableError)) throw error
    logger.warn('Nexora API consumption unavailable; showing WorkStudio figures only', {
      error: getErrorMessage(error),
    })
    return null
  }
}

/**
 * The instance's consumption over the last `days` local days: Nexora API's exact figures per
 * model (`null` when it cannot be read, never partial), WorkStudio's runs and tokens per day,
 * workspace and person, each with a footprint estimated pro rata of its tokens per model.
 */
export async function buildConsumptionReport({
  days,
  timeZone,
  now = new Date(),
}: {
  days: number
  timeZone: string
  now?: Date
}) {
  const { start, end } = periodWindow(now, days, timeZone)
  const [models, local] = await Promise.all([
    measuredByModel(start, end),
    readWorkspaceConsumption({ start, end, timeZone }),
  ])

  const measured = models
    ? models.reduce(
        (sum, model) => ({
          requests: sum.requests + model.requests,
          totalTokens: sum.totalTokens + model.totalTokens,
          kWh: sum.kWh + model.kWh,
          kgCO2eq: sum.kgCO2eq + model.kgCO2eq,
        }),
        { requests: 0, totalTokens: 0, kWh: 0, kgCO2eq: 0 }
      )
    : null

  const dayTotals = new Map(local.days.map((day) => [day.date, day]))
  return {
    period: { days, start: start.toISOString(), end: end.toISOString(), timeZone },
    nexoraApiAvailable: models !== null,
    measured: measured ? { ...measured, carKm: carKilometres(measured.kgCO2eq) } : null,
    workstudio: local.totals,
    carEmissionFactor: { ...CAR_EMISSION_FACTOR },
    days: periodDays(now, days, timeZone).map((date) => ({
      date,
      executions: dayTotals.get(date)?.executions ?? 0,
      totalTokens: dayTotals.get(date)?.totalTokens ?? 0,
    })),
    models,
    workspaces: withEstimatedFootprint(local.workspaces, models).map((row) => ({
      ...omit(row, ['tokensByModel', 'footprint']),
      footprint: reportedFootprint(row.footprint),
    })),
    users: withEstimatedFootprint(local.users, models).map((row) => ({
      ...omit(row, ['tokensByModel', 'footprint']),
      footprint: reportedFootprint(row.footprint),
    })),
  }
}

/** Tokens used since the 1st of the current budget month, for the instance and per workspace. */
export async function readMonthToDateUsage({
  timeZone,
  now = new Date(),
}: {
  timeZone: string
  now?: Date
}) {
  const month = monthWindow(now, timeZone)
  const local = await readWorkspaceConsumption({ start: month.start, end: month.end, timeZone })
  const workspaces: Record<string, number> = {}
  for (const row of local.workspaces) {
    if (row.workspaceId) workspaces[row.workspaceId] = row.totalTokens
  }
  return { month: month.month, instance: local.totals.totalTokens, workspaces }
}
