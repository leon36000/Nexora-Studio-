import { dollarsToCredits } from '@/lib/billing/credits/conversion'

/**
 * The cost of a run, in credits, as the logs show it. A person billed by the Nexora AI site pays
 * the site's wallet at the gateway's real prices: WorkStudio's own credit estimate would be a
 * second, different figure, so none is shown (their consumption is on the site).
 */
export function logCostCredits(total: unknown, viaSite: boolean): number | null {
  if (viaSite || typeof total !== 'number' || !Number.isFinite(total)) return null
  return dollarsToCredits(total)
}
