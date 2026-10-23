import { generateId } from '@sim/utils/id'

/** One field of the template's Start block, referenced in prompts as `<start.name>`. */
interface TemplateInput {
  name: string
  description: string
  /** A realistic value, used to run the template once without typing (first launch). */
  example: string
}

/** One Agent step. `name` is ASCII so later steps can reference it as `<name.content>`. */
interface TemplateStep {
  name: string
  system: string
  user: string
}

export interface NexoraTemplate {
  slug: string
  name: string
  description: string
  inputs: TemplateInput[]
  steps: TemplateStep[]
}

const STYLE =
  'Vous écrivez pour une PME française : français professionnel, vouvoiement, phrases courtes, aucune information inventée. Si une donnée manque, signalez-la entre crochets.'

/** Nexora edition: ready-to-run workflows for the everyday work of a French SME. */
export const NEXORA_TEMPLATES: readonly NexoraTemplate[] = [
  {
    slug: 'devis',
    name: 'Devis client',
    description:
      'Rédige un devis structuré (HT, TVA 20 %, TTC) à partir d’une liste de prestations.',
    inputs: [
      {
        name: 'client',
        description: 'Nom et coordonnées du client',
        example: 'Boulangerie Martin, 12 rue des Lilas, 69003 Lyon',
      },
      {
        name: 'prestations',
        description: 'Prestations, quantités et prix unitaires HT',
        example: 'Site vitrine : 1 x 2 400 EUR HT ; Maintenance annuelle : 1 x 360 EUR HT',
      },
    ],
    steps: [
      {
        name: 'Devis',
        system: `${STYLE} Vous préparez des devis clairs et exacts.`,
        user: 'Rédigez un devis pour le client suivant : <start.client>\n\nPrestations : <start.prestations>\n\nPrésentez un tableau (désignation, quantité, prix unitaire HT, total HT), puis le total HT, la TVA à 20 % et le total TTC, la durée de validité (30 jours) et les conditions de paiement (30 jours fin de mois).',
      },
    ],
  },
  {
    slug: 'relance-facture',
    name: 'Relance de facture impayée',
    description: 'Écrit l’e-mail de relance adapté au niveau de relance (1, 2 ou 3).',
    inputs: [
      { name: 'client', description: 'Nom du client', example: 'Garage Durand' },
      { name: 'facture', description: 'Numéro de la facture', example: 'F-2026-104' },
      { name: 'montant', description: 'Montant TTC dû', example: '1 250 EUR TTC' },
      { name: 'echeance', description: 'Date d’échéance dépassée', example: '15/09/2026' },
      {
        name: 'niveau',
        description: 'Niveau de relance : 1 (courtois), 2 (ferme) ou 3 (mise en demeure)',
        example: '2',
      },
    ],
    steps: [
      {
        name: 'Relance',
        system: `${STYLE} Vous rédigez des relances de paiement qui préservent la relation client.`,
        user: 'Rédigez un e-mail de relance (objet + corps) pour le client <start.client> : facture <start.facture> de <start.montant>, échue le <start.echeance>. Niveau de relance : <start.niveau>. Niveau 1 : ton courtois et rappel simple. Niveau 2 : ton ferme, nouveau délai de 8 jours. Niveau 3 : mise en demeure, rappel des pénalités de retard et de l’indemnité forfaitaire de 40 €.',
      },
    ],
  },
  {
    slug: 'support-faq',
    name: 'Réponse support (FAQ)',
    description:
      'Répond à une question client à partir de votre FAQ, ou propose de transmettre à un conseiller.',
    inputs: [
      {
        name: 'question',
        description: 'Question posée par le client',
        example: 'Livrez-vous le samedi ?',
      },
      {
        name: 'faq',
        description: 'Texte de votre FAQ ou de vos conditions',
        example: 'Livraison du lundi au samedi, de 8 h à 18 h. Retours acceptés sous 14 jours.',
      },
    ],
    steps: [
      {
        name: 'Reponse',
        system: `${STYLE} Vous répondez uniquement à partir de la FAQ fournie.`,
        user: 'FAQ :\n<start.faq>\n\nQuestion du client : <start.question>\n\nSi la FAQ contient la réponse, répondez au client en citant l’information utile. Sinon, répondez poliment qu’un conseiller va le recontacter, et ajoutez à la fin la ligne « ESCALADE : oui ».',
      },
    ],
  },
  {
    slug: 'tri-emails',
    name: 'Tri des e-mails entrants',
    description:
      'Classe un e-mail (catégorie, urgence, résumé), puis prépare un brouillon de réponse adapté.',
    inputs: [
      {
        name: 'email',
        description: 'E-mail reçu (expéditeur, objet, corps)',
        example:
          "De : client@exemple.fr\nObjet : Facture en double\nBonjour, j'ai reçu deux fois la facture F-88. Pouvez-vous vérifier ?",
      },
    ],
    steps: [
      {
        name: 'Classification',
        system: `${STYLE} Vous triez le courrier entrant d’une PME.`,
        user: 'Analysez cet e-mail :\n<start.email>\n\nRépondez en JSON avec les clés « categorie » (devis, facturation, support, commercial, administratif, spam ou autre), « urgence » (basse, normale ou haute) et « resume » (une phrase).',
      },
      {
        name: 'Brouillon',
        system: `${STYLE} Vous préparez des réponses que l’équipe relira avant envoi.`,
        user: 'E-mail reçu :\n<start.email>\n\nClassification : <classification.content>\n\nRédigez un brouillon de réponse adapté à la catégorie et à l’urgence. Pour un spam, répondez seulement « Aucune réponse à envoyer ».',
      },
    ],
  },
  {
    slug: 'compte-rendu',
    name: 'Compte rendu de réunion',
    description:
      'Transforme une transcription en compte rendu : décisions, actions, responsables, échéances.',
    inputs: [
      {
        name: 'transcription',
        description: 'Transcription ou notes brutes de la réunion',
        example:
          'Paul : on lance la campagne le 3 novembre. Anne : je prépare le visuel pour vendredi. Paul : budget validé, 2 000 EUR.',
      },
    ],
    steps: [
      {
        name: 'CompteRendu',
        system: `${STYLE} Vous rédigez des comptes rendus de réunion utiles et concis.`,
        user: 'Transcription :\n<start.transcription>\n\nRédigez le compte rendu : participants, points abordés, décisions prises, puis un tableau des actions (action, responsable, échéance). Terminez par les questions restées ouvertes.',
      },
    ],
  },
]

/** The Nexora API model templates start with: `NEXORA_DEFAULT_MODEL`, else `nexora-default`. */
export function resolveTemplateModel(configured: string | undefined): string {
  const model = configured?.trim() || 'nexora-default'
  return model.startsWith('vllm/') ? model : `vllm/${model}`
}

interface TemplateBlock {
  id: string
  type: 'start_trigger' | 'agent'
  name: string
  position: { x: number; y: number }
  enabled: boolean
  subBlocks: Record<string, { id: string; type: string; value: unknown }>
  outputs: Record<string, never>
}

type TemplateWorkflowState = {
  blocks: Record<string, TemplateBlock>
  edges: {
    id: string
    source: string
    target: string
    sourceHandle: string
    targetHandle: string
  }[]
  loops: Record<string, never>
  parallels: Record<string, never>
}

/** Workflow state (Start → Agent → …) in the shape the workflow importer reads. */
export function buildTemplateWorkflow(
  template: NexoraTemplate,
  model: string
): TemplateWorkflowState {
  const startId = generateId()
  const blocks: Record<string, TemplateBlock> = {
    [startId]: {
      id: startId,
      type: 'start_trigger',
      name: 'Start',
      position: { x: 0, y: 0 },
      enabled: true,
      subBlocks: {
        inputFormat: {
          id: 'inputFormat',
          type: 'input-format',
          value: template.inputs.map((input) => ({
            id: generateId(),
            name: input.name,
            type: 'string',
            value: '',
            description: input.description,
            collapsed: false,
          })),
        },
      },
      outputs: {},
    },
  }
  const edges: TemplateWorkflowState['edges'] = []
  let previousId = startId
  template.steps.forEach((step, index) => {
    const id = generateId()
    blocks[id] = {
      id,
      type: 'agent',
      name: step.name,
      position: { x: 420 * (index + 1), y: 0 },
      enabled: true,
      subBlocks: {
        messages: {
          id: 'messages',
          type: 'messages-input',
          value: [
            { role: 'system', content: step.system },
            { role: 'user', content: step.user },
          ],
        },
        model: { id: 'model', type: 'combobox', value: model },
      },
      outputs: {},
    }
    edges.push({
      id: generateId(),
      source: previousId,
      target: id,
      sourceHandle: 'source',
      targetHandle: 'target',
    })
    previousId = id
  })
  return { blocks, edges, loops: {}, parallels: {} }
}
