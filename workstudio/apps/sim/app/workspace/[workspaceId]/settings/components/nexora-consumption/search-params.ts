import { parseAsStringLiteral } from 'nuqs/server'
import { CONSUMPTION_PERIODS } from '@/lib/api/contracts/nexora-consumption'

/** Réglages › Consommation: the period shown, in days (`?period=7`); 30 by default. */
export const consumptionPeriodParam = {
  key: 'period',
  parser: parseAsStringLiteral(CONSUMPTION_PERIODS).withDefault('30'),
} as const

/** Period changes: clean URLs, no back-stack churn. */
export const consumptionPeriodUrlKeys = {
  history: 'replace',
  clearOnDefault: true,
} as const
