/** What the guard found, by entity type (`IBAN_CODE`, `EMAIL_ADDRESS`, `PERSON`…) and number. */
export type FoundPersonalData = Record<string, number>

/** How a type of personal data is named to the person whose request was stopped. */
const ENTITY_LABELS: Record<string, string> = {
  IBAN_CODE: 'IBAN',
  EMAIL_ADDRESS: 'e-mail',
  PHONE_NUMBER: 'téléphone',
  CREDIT_CARD: 'carte bancaire',
  PERSON: 'nom de personne',
  IP_ADDRESS: 'adresse IP',
  FR_NIR: 'numéro de sécurité sociale',
  SECRET: 'clé ou jeton secret',
}

/** `IBAN, e-mail` for the types found, in the order of {@link ENTITY_LABELS}. */
function describeFoundPersonalData(found: FoundPersonalData): string {
  const present = Object.keys(found).filter((entity) => found[entity] > 0)
  const known = Object.keys(ENTITY_LABELS).filter((entity) => present.includes(entity))
  const others = present.filter((entity) => !(entity in ENTITY_LABELS))
  return [...known.map((entity) => ENTITY_LABELS[entity]), ...others].join(', ')
}

/**
 * The workspace's policy forbids sending personal data to a model outside this server, and the
 * request holds some: nothing was sent.
 */
export class PersonalDataRefusedError extends Error {
  readonly status = 403
  readonly code = 'personal_data_not_allowed'

  constructor(readonly found: FoundPersonalData) {
    super(
      `Cette demande contient des données personnelles (${describeFoundPersonalData(found)}) : la politique de cet espace interdit de les envoyer à un modèle hors instance.`
    )
    this.name = 'PersonalDataRefusedError'
  }
}

/**
 * The local personal-data service did not answer (or the policy could not be read) while a
 * policy was in force: the request is not sent unprotected.
 */
export class PersonalDataServiceError extends Error {
  readonly status = 503
  readonly code = 'personal_data_service_unavailable'

  constructor() {
    super(
      'Le service de protection des données personnelles ne répond pas : la demande n’a pas été envoyée au modèle.'
    )
    this.name = 'PersonalDataServiceError'
  }
}

/** A provider the policy cannot mask (not an OpenAI-style chat) was asked to receive protected data. */
export class PersonalDataUnsupportedError extends Error {
  readonly status = 403
  readonly code = 'personal_data_unsupported_provider'

  constructor() {
    super(
      'La politique de cet espace protège les données personnelles, mais ce fournisseur de modèle hors instance ne peut pas les masquer : la demande n’a pas été envoyée.'
    )
    this.name = 'PersonalDataUnsupportedError'
  }
}
