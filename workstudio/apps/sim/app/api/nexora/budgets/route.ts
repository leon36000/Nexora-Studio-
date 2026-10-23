import {
  getNexoraBudgetsContract,
  updateNexoraBudgetsContract,
} from '@/lib/api/contracts/nexora-consumption'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  readNexoraBudgets,
  updateNexoraBudgets,
} from '@/lib/nexora/consumption/application/use-cases'
import {
  instanceOrganizationInput,
  requireInstanceAdmin,
} from '@/app/api/nexora/consumption/surface'

export const dynamic = 'force-dynamic'

const rateLimit = internalRateLimits.none({
  reason: 'Instance-admin settings, read and saved by hand from the settings page',
})

/** Réglages › Consommation: monthly token budgets of the instance and its workspaces. */
export const GET = defineInternalJsonRoute({
  contract: getNexoraBudgetsContract,
  operation: readNexoraBudgets.operation,
  auth: internalSessionAuth,
  rateLimit,
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: () => instanceOrganizationInput(),
  useCase: readNexoraBudgets,
})

export const PUT = defineInternalJsonRoute({
  contract: updateNexoraBudgetsContract,
  operation: updateNexoraBudgets.operation,
  auth: internalSessionAuth,
  rateLimit,
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: async ({ body }) => ({ ...(await instanceOrganizationInput()), change: body }),
  useCase: updateNexoraBudgets,
})
