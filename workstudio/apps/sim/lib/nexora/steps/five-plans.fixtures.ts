import { type CopilotPlan, copilotPlanSchema } from '@/lib/nexora/copilot/plan'

/**
 * The five typical descriptions of the Copilot (`scripts/verification/copilote-cinq.py`) as the plans
 * the model answers, so the Steps view is checked on every shape the Copilot produces: a scheduled
 * run, a branch with both sides filled, a knowledge base, a human validation before a one-sided
 * condition, and an API call read by an agent.
 */
const RAW_PLANS: unknown[] = [
  {
    title: 'Relance des factures impayées',
    description: 'Chaque lundi à 9 h, relance les clients dont la facture est impayée.',
    trigger: { kind: 'planification', frequency: 'semaine', weekday: 'lundi', time: '09:00' },
    steps: [
      {
        kind: 'agent',
        name: 'rediger_relances',
        instructions: 'Vous rédigez des relances de paiement courtoises, en français.',
        message: 'Rédigez un e-mail de relance pour les factures impayées depuis plus de 30 jours.',
      },
      { kind: 'reponse', name: 'resultat', fields: [{ name: 'relances', value: '{{rediger_relances.content}}' }] },
    ],
  },
  {
    title: 'Tri des e-mails urgents',
    trigger: { kind: 'webhook' },
    steps: [
      {
        kind: 'agent',
        name: 'classer',
        instructions: 'Vous classez les e-mails reçus.',
        message: 'Classez cet e-mail : {{declencheur.email}}',
        output: { fields: [{ name: 'categorie', type: 'string' }] },
      },
      {
        kind: 'condition',
        name: 'est_urgent',
        if: { ref: 'classer.categorie', operator: 'egal', value: 'urgent' },
        then: ['alerter'],
        else: ['archiver'],
      },
      {
        kind: 'agent',
        name: 'alerter',
        instructions: 'Vous rédigez une alerte brève.',
        message: 'Rédigez une alerte pour : {{classer.categorie}}',
      },
      {
        kind: 'reponse',
        name: 'archiver',
        fields: [{ name: 'statut', value: 'archivé' }],
      },
      { kind: 'reponse', name: 'conclusion', fields: [{ name: 'categorie', value: '{{classer.categorie}}' }] },
    ],
  },
  {
    title: 'Réponse client via FAQ',
    trigger: { kind: 'chat' },
    steps: [
      {
        kind: 'agent',
        name: 'repondre',
        instructions: 'Vous répondez uniquement à partir de la FAQ.',
        message: '{{declencheur.input}}',
        knowledgeBases: ['FAQ'],
      },
    ],
  },
  {
    title: 'Compte rendu validé avant envoi',
    trigger: { kind: 'manuel', fields: [{ name: 'notes', description: 'Notes de la réunion' }] },
    steps: [
      {
        kind: 'agent',
        name: 'rediger',
        instructions: 'Vous rédigez des comptes rendus concis.',
        message: 'Rédigez le compte rendu de : {{declencheur.notes}}',
      },
      { kind: 'validation_humaine', name: 'valider', message: '{{rediger.content}}' },
      {
        kind: 'condition',
        name: 'approuve',
        if: { ref: 'valider.approuve', operator: 'egal', value: 'true' },
        then: ['envoyer'],
        else: [],
      },
      {
        kind: 'reponse',
        name: 'envoyer',
        fields: [{ name: 'compte_rendu', value: '{{rediger.content}}' }],
      },
    ],
  },
  {
    title: 'Appel d’API puis résumé',
    trigger: { kind: 'manuel', fields: [{ name: 'url', description: 'Adresse de l’API' }] },
    steps: [
      { kind: 'api', name: 'appel', method: 'GET', url: '{{declencheur.url}}' },
      {
        kind: 'agent',
        name: 'resumer',
        instructions: 'Vous résumez des données JSON en une phrase.',
        message: 'Résumez : {{appel.data}}',
      },
      { kind: 'attente', name: 'pause', seconds: 5 },
      { kind: 'reponse', name: 'resultat', fields: [{ name: 'resume', value: '{{resumer.content}}' }] },
    ],
  },
]

export function fivePlans(): CopilotPlan[] {
  return RAW_PLANS.map((raw) => copilotPlanSchema.parse(raw))
}

export const FIVE_PLANS_CONTEXT = {
  model: 'vllm/nexora-default',
  knowledgeBases: [{ id: 'kb-faq', name: 'FAQ' }],
} as const
