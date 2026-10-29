import { toStringOrNull } from '@sim/utils/coerce'
import { isRecordLike, toRecord } from '@sim/utils/object'
import type { NexoraSiteLinks } from '@/lib/nexora/site-links'

/** Why the site's model gateway refused or could not answer a call. */
export type GatewayRefusal =
  | 'insufficient-funds'
  | 'account-blocked'
  | 'key-cap'
  | 'key-rejected'
  | 'rate-limited'
  | 'model-not-found'
  | 'unavailable'

interface GatewayFailure {
  /** HTTP status of the gateway's answer. */
  status: number | null | undefined
  /** `error.code` of its OpenAI-format body. */
  code?: string | null
}

/**
 * Which refusal an answer of the gateway is, `null` when it is not one WorkStudio explains in its
 * own words (a request the gateway judged invalid, or a privacy refusal that already names its
 * rule). The statuses and codes are those of the site's `server/gateway/errors.ts`.
 */
export function classifyGatewayRefusal({ status, code }: GatewayFailure): GatewayRefusal | null {
  if (status === 402) {
    if (code === 'account_blocked') return 'account-blocked'
    if (code === 'api_key_spend_cap_reached') return 'key-cap'
    return 'insufficient-funds'
  }
  if (status === 401) return 'key-rejected'
  if (status === 404 && code === 'model_not_found') return 'model-not-found'
  if (status === 429) return 'rate-limited'
  if (status === 502 || status === 503 || status === 504) return 'unavailable'
  return null
}

function withLink(sentence: string, link: string | undefined): string {
  return link ? `${sentence} ${link}` : sentence
}

/** The refusal in French for the person, with the page of the site that settles it. */
export function gatewayRefusalMessage(
  refusal: GatewayRefusal,
  links: NexoraSiteLinks | null
): string {
  switch (refusal) {
    case 'insufficient-funds':
      return withLink(
        'Le solde de votre portefeuille Nexora AI est insuffisant pour cette demande : rechargez-le pour continuer.',
        links?.billing
      )
    case 'account-blocked':
      return withLink(
        'Votre compte Nexora AI est bloqué (solde négatif) : rechargez votre portefeuille pour reprendre.',
        links?.billing
      )
    case 'key-cap':
      return withLink(
        'Le plafond de dépense de votre clé d’accès aux modèles est atteint : relevez-le ou rechargez votre portefeuille.',
        links?.account
      )
    case 'key-rejected':
      return 'Votre clé d’accès aux modèles Nexora AI n’est plus valide (révoquée ou expirée) : déconnectez-vous puis reconnectez-vous à WorkStudio pour en obtenir une nouvelle.'
    case 'rate-limited':
      return 'Trop de demandes en peu de temps : réessayez dans un instant.'
    case 'model-not-found':
      return 'Ce modèle n’est pas disponible avec votre compte Nexora AI : choisissez-en un autre dans la liste des modèles.'
    case 'unavailable':
      return 'Les modèles Nexora AI ne répondent pas pour le moment : réessayez dans un instant.'
  }
}

/** The French explanation of a failed gateway call, `null` when the gateway's own words should stand. */
export function describeGatewayFailure(
  failure: GatewayFailure,
  links: NexoraSiteLinks | null
): { refusal: GatewayRefusal; message: string } | null {
  const refusal = classifyGatewayRefusal(failure)
  return refusal ? { refusal, message: gatewayRefusalMessage(refusal, links) } : null
}

/** The status and `error.code` of an error thrown by the OpenAI client, whatever else it carries. */
export function gatewayFailureOf(error: unknown): {
  status: number | undefined
  code: string | null
} {
  const record = isRecordLike(error) ? error : {}
  return {
    status: typeof record.status === 'number' ? record.status : undefined,
    code: toStringOrNull(toRecord(record.error).code),
  }
}
