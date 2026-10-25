import {
  getTraceSettingsContract,
  updateTraceSettingsContract,
} from '@/lib/api/contracts/nexora-traces'
import {
  defineInternalJsonRoute,
  internalOrchestrationErrorPolicy,
  internalRateLimits,
  internalSessionAuth,
} from '@/lib/api/server/routes'
import {
  readTraceSettingsUseCase,
  updateTraceSettings,
} from '@/lib/nexora/traces/application/use-cases'
import {
  instanceOrganizationInput,
  requireInstanceAdmin,
} from '@/app/api/nexora/consumption/surface'

export const dynamic = 'force-dynamic'

const present = (overview: Awaited<ReturnType<typeof readTraceSettingsUseCase.execute>>) => overview

/** Trace settings (capture, retention, masking, OTLP export). Header values never leave the server. */
export const GET = defineInternalJsonRoute({
  contract: getTraceSettingsContract,
  operation: readTraceSettingsUseCase.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.none({ reason: 'Instance-admin settings read' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: () => instanceOrganizationInput(),
  useCase: readTraceSettingsUseCase,
  present,
})

export const PUT = defineInternalJsonRoute({
  contract: updateTraceSettingsContract,
  operation: updateTraceSettings.operation,
  auth: internalSessionAuth,
  rateLimit: internalRateLimits.user({ bucketName: 'nexora.traces.settings' }),
  errorPolicy: internalOrchestrationErrorPolicy,
  beforeParse: requireInstanceAdmin,
  mapInput: async ({ body }) => ({ ...(await instanceOrganizationInput()), change: body }),
  useCase: updateTraceSettings,
  present,
})
