/**
 * Plans `qwen2.5:7b` (CPU, pc6, 23/10/2026) wrote for the five descriptions of the J7 acceptance
 * criteria, as it answered them in JSON mode with the Copilot's prompt; long texts are shortened.
 * Each one failed validation or compilation before the normalization rules that fix it.
 */

/** « Chaque lundi à 9 h, un agent rédige une relance… » : a schedule read as `{{declencheur.email}}`. */
export const SCHEDULE_READING_TRIGGER = {
  title: 'Relance des factures impayées',
  trigger: { kind: 'planification', frequency: 'semaine', weekday: 'lundi', time: '09:00' },
  steps: [
    {
      kind: 'agent',
      name: 'relance_facture',
      instructions: "Vous gérez les relances de factures d'une PME.",
      message: 'Rédigez une relance pour la facture impayée : {{declencheur.email}}',
      services: ['gmail'],
      output: { fields: [{ name: 'relance', type: 'string' }] },
    },
    {
      kind: 'reponse',
      name: 'envoyer_relance',
      fields: [
        { name: 'email', value: '{{declencheur.email}}' },
        { name: 'contenu', value: '{{relance_facture.relance}}' },
      ],
    },
  ],
}

/** « Quand un e-mail arrive par webhook, une condition… » : branch steps written inside the lists. */
export const STEPS_INSIDE_BRANCHES = {
  title: 'Gestion des e-mails urgents et non-urgents',
  trigger: { kind: 'webhook' },
  steps: [
    {
      kind: 'agent',
      name: 'tri_email',
      instructions: 'Vous classez les e-mails reçus par une PME selon leur urgence.',
      message: 'Classez cet e-mail (urgence : haute ou normale) : {{declencheur.email}}',
      output: { fields: [{ name: 'urgence', type: 'string' }] },
    },
    {
      kind: 'condition',
      name: 'est_urgent',
      if: { ref: 'tri_email.urgence', operator: 'egal', value: 'haute' },
      then: [
        {
          kind: 'agent',
          name: 'alerte_urgent',
          instructions: "Vous prévenez l'équipe des demandes urgentes.",
          message: 'Rédigez une alerte courte pour cet e-mail urgent : {{declencheur.email}}',
        },
      ],
      else: [
        {
          kind: 'agent',
          name: 'accusé_reception',
          instructions: 'Vous rédigez un accusé de réception.',
          message: 'Rédigez un accusé de réception pour cet e-mail : {{declencheur.email}}',
        },
      ],
    },
  ],
}

/**
 * « Répondre à la question d'un client… FAQ clients » : fields on a chat trigger, steps inside the
 * branches, and a step read by its kind (`{{validation_humaine.submission.response}}`). The form
 * holds no `response`, which would always be empty: that read is refused, and costs the retry.
 */
export const CHAT_FIELDS_AND_KIND_REFERENCE = {
  title: 'Réponse client via FAQ',
  trigger: {
    kind: 'chat',
    fields: [{ name: 'message_client', description: 'Message reçu du client' }],
  },
  steps: [
    {
      kind: 'agent',
      name: 'recherche_faq',
      instructions: 'Rechercher la réponse dans la base de connaissances FAQ clients.',
      message: '{{declencheur.message_client}}',
      knowledgeBases: ['FAQ clients'],
      output: { fields: [{ name: 'reponse_faq', type: 'string' }] },
    },
    {
      kind: 'condition',
      name: 'reponse_trouvee',
      if: { ref: 'recherche_faq.reponse_faq', operator: 'non_vide', value: '' },
      then: [
        {
          kind: 'reponse',
          name: 'envoyer_reponse',
          fields: [{ name: 'reponse', value: '{{recherche_faq.reponse_faq}}' }],
        },
      ],
      else: [
        {
          kind: 'agent',
          name: 'demander_confirmation',
          instructions: "Demander confirmation à l'agent pour une réponse personnalisée.",
          message: 'Aucune réponse trouvée dans la FAQ : {{declencheur.message_client}}',
          output: { fields: [{ name: 'confirmation', type: 'boolean' }] },
        },
        {
          kind: 'validation_humaine',
          name: 'confirmation_reponse_personnalisee',
          message: 'Confirmez-vous la réponse personnalisée ?',
        },
        {
          kind: 'reponse',
          name: 'envoyer_reponse_personnalisee',
          fields: [
            {
              name: 'reponse',
              value: 'Réponse personnalisée : {{validation_humaine.submission.response}}',
            },
          ],
        },
      ],
    },
  ],
}

/**
 * « À partir de notes de réunion… validation humaine… » : an output declared on the human
 * validation and branched on, and the branch step written inside the list.
 */
export const VALIDATION_WITH_DECLARED_OUTPUT = {
  title: "Création et validation d'un compte-rendu",
  trigger: {
    kind: 'manuel',
    fields: [{ name: 'notes_reunion', description: 'Notes de la réunion à transformer' }],
  },
  steps: [
    {
      kind: 'agent',
      name: 'rédiger_compte_rendu',
      instructions: 'Vous rédigez un compte-rendu basé sur les notes de réunion fournies.',
      message: '{{declencheur.notes_reunion}}',
      output: { fields: [{ name: 'compte_rendu', type: 'string' }] },
    },
    {
      kind: 'validation_humaine',
      name: 'valider_compte_rendu',
      message: 'Veuillez valider le compte-rendu suivant : {{rédiger_compte_rendu.compte_rendu}}',
      output: { fields: [{ name: 'validation', type: 'boolean' }] },
    },
    {
      kind: 'condition',
      name: 'valider_ou_non',
      if: { ref: 'valider_compte_rendu.validation', operator: 'egal', value: true },
      then: [
        {
          kind: 'reponse',
          name: 'envoyer_compte_rendu',
          fields: [{ name: 'compte_rendu_valide', value: '{{rédiger_compte_rendu.compte_rendu}}' }],
        },
      ],
      else: [],
    },
  ],
}

/** « Chaque lundi à 9 h… » again: earlier steps read through the trigger (`{{declencheur.step.field}}`). */
export const STEPS_READ_THROUGH_TRIGGER = {
  title: 'Relance des factures impayées',
  trigger: { kind: 'planification', frequency: 'semaine', weekday: 'lundi', time: '09:00' },
  steps: [
    {
      kind: 'agent',
      name: 'recherche_factures_impaye',
      instructions: "Vous gérez les relances de factures d'une PME.",
      message: 'Trouvez les factures impayées depuis plus de 30 jours.',
    },
    {
      kind: 'agent',
      name: 'recherche_resultat',
      instructions: 'Vous gérez la recherche des factures impayées d’une PME.',
      message: '{{declencheur.recherche_factures_impaye}}',
      output: { fields: [{ name: 'facture_impaye', type: 'string' }] },
    },
    {
      kind: 'agent',
      name: 'relerce',
      instructions: "Vous gérez les relances de factures d'une PME.",
      message:
        'Rédigez une relance pour la facture {{declencheur.recherche_resultat.facture_impaye}} :',
      output: { fields: [{ name: 'relance', type: 'string' }] },
    },
    {
      kind: 'agent',
      name: 'envoi_relance',
      instructions: "Vous gérez l'envoi de relances par e-mail d'une PME.",
      message: '{{declencheur.relerce.relance}}',
      services: ['gmail'],
    },
  ],
}

/** « Répondre à la question d'un client… » again: a field read from an agent without `output`. */
export const AGENT_FIELD_WITHOUT_OUTPUT = {
  title: 'Réponse au client via FAQ',
  trigger: { kind: 'chat' },
  steps: [
    {
      kind: 'agent',
      name: 'recherche_faq',
      instructions: "Vous recherchez la réponse à une question d'un client dans la FAQ clients.",
      message: '{{declencheur.input}}',
      knowledgeBases: ['FAQ clients'],
    },
    {
      kind: 'condition',
      name: 'trouve_reponse',
      if: { ref: 'recherche_faq.resultat', operator: 'non_vide' },
      then: ['envoie_reponse'],
      else: ['pas_de_reponse'],
    },
    {
      kind: 'agent',
      name: 'envoie_reponse',
      instructions: 'Vous envoyez la réponse trouvée au client.',
      message: 'Voici la réponse à votre question : {{recherche_faq.resultat}}',
    },
    {
      kind: 'agent',
      name: 'pas_de_reponse',
      instructions: "Vous informez le client que sa question n'a pas été trouvée dans les FAQ.",
      message: "Je n'ai pas trouvé de réponse à votre question. Pourriez-vous préciser ?",
    },
  ],
}
