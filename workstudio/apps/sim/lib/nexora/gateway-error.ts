import { getNexoraSiteUrl, nexoraSiteLinks } from '@/lib/nexora/site-links'

export type NexoraGatewayFailure =
  | 'no-owner'
  | 'session-expired'
  | 'site-refused'
  | 'two-factor-required'
  | 'email-not-verified'
  | 'subscription-required'
  | 'site-unavailable'
  | 'bad-answer'

/** The person's next step, in French, with the page of the site that settles it. */
function failureMessage(code: NexoraGatewayFailure): string {
  const links = nexoraSiteLinks(getNexoraSiteUrl(), 'fr')
  switch (code) {
    case 'no-owner':
      return 'Impossible de savoir quel compte Nexora AI facturer pour ce modèle.'
    case 'session-expired':
      return 'Votre connexion à Nexora AI a expiré : déconnectez-vous puis reconnectez-vous à WorkStudio pour utiliser les modèles.'
    case 'site-refused':
      return `Nexora AI refuse l’accès aux modèles pour ce compte : vérifiez votre compte${links ? ` (${links.account})` : ''} ou contactez le support.`
    case 'two-factor-required':
      return 'Nexora AI exige la double authentification pour ce compte : activez-la dans la sécurité de votre compte Nexora AI, puis reconnectez-vous à WorkStudio.'
    case 'email-not-verified':
      return 'Nexora AI n’a pas encore vérifié votre adresse courriel : confirmez-la avec le message reçu, puis reconnectez-vous à WorkStudio.'
    case 'subscription-required':
      return `Un abonnement WorkStudio est requis pour utiliser les modèles. Choisissez une offre dans votre espace Nexora AI.${links ? ` ${links.billing}` : ''}`
    case 'site-unavailable':
      return 'Nexora AI ne répond pas pour le moment : réessayez dans un instant.'
    case 'bad-answer':
      return 'Nexora AI a donné une réponse inattendue : contactez le support.'
  }
}

/**
 * The person's gateway access could not be settled. The request stops there: it never falls back
 * to the instance's own key, which would put the person's tokens on the operator's bill. The
 * message names the cause and carries neither key nor token.
 */
export class NexoraGatewayError extends Error {
  constructor(readonly code: NexoraGatewayFailure) {
    super(failureMessage(code))
    this.name = 'NexoraGatewayError'
  }
}
