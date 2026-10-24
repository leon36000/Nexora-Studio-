import { OrchestrationError } from '@/lib/core/orchestration/types'
import { type GatewayError, gatewayErrors } from '@/lib/nexora/developer-api/errors'
import { createModelAccessGate, type ModelGateConfig } from '@/lib/permission-groups/model-access'

/**
 * Access groups (Réglages › Groupes d'accès) restrict models by their WorkStudio id: a Nexora API
 * model `name` is `vllm/<name>` there, as the chat blocks list it (`listedModelIds`).
 */
function workstudioModelId(name: string): string {
  return `vllm/${name.trim().toLowerCase()}`
}

function isRestricted(config: ModelGateConfig | null | undefined): boolean {
  return Boolean(config?.deniedModels?.length) || (config?.allowedModelProviders ?? null) !== null
}

/**
 * Whether the access group lets the Nexora API model `name` through: the name itself and the
 * router it designates (an alias of a denied model is denied too).
 */
function gateAllows(
  config: ModelGateConfig | null | undefined,
  name: string,
  resolveRouter: (name: string) => string | null
): boolean {
  if (!isRestricted(config)) return true
  const gate = createModelAccessGate(config)
  const router = resolveRouter(name)
  return [name, ...(router ? [router] : [])].every((entry) => gate(workstudioModelId(entry)))
}

/**
 * What a key's models would give its creator beyond their access group: `'all'` for an
 * all-models key (`allowedModels: null`) while the group restricts models, otherwise the listed
 * models it denies (empty when the key stays within the group).
 */
export function keyModelsOutsideGate(
  config: ModelGateConfig | null | undefined,
  allowedModels: readonly string[] | null,
  resolveRouter: (name: string) => string | null
): string[] | 'all' {
  if (!isRestricted(config)) return []
  if (allowedModels === null) return 'all'
  return allowedModels.filter((name) => !gateAllows(config, name, resolveRouter))
}

/** Why the access group governing a key refuses `model` on this call (403), or `null`. */
export function keyModelRefusal(
  config: ModelGateConfig | null | undefined,
  model: string,
  resolveRouter: (name: string) => string | null
): GatewayError | null {
  return gateAllows(config, model, resolveRouter)
    ? null
    : gatewayErrors.modelNotAllowedByGroup(model.trim())
}

/**
 * Refuses (403) a key that would give its creator models beyond their access group: an
 * all-models key while the group restricts models, or listed models the group denies.
 */
export function assertKeyModelsWithinGroup(
  config: ModelGateConfig | null | undefined,
  allowedModels: readonly string[] | null,
  resolveRouter: (name: string) => string | null
): void {
  const outside = keyModelsOutsideGate(config, allowedModels, resolveRouter)
  if (outside === 'all') {
    throw new OrchestrationError(
      'forbidden',
      'Votre groupe d’accès limite les modèles que vous pouvez utiliser : choisissez les modèles de la clé (« Tous les modèles » n’est pas disponible).'
    )
  }
  if (outside.length > 0) {
    throw new OrchestrationError(
      'forbidden',
      `Votre groupe d’accès ne vous autorise pas ces modèles : ${outside.join(', ')}.`
    )
  }
}
