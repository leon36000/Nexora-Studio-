import { generateId } from '@sim/utils/id'

/** One field of the template's Start block, referenced in prompts as `<start.name>`. */
interface TemplateInput {
  name: string
  description: string
  /** `file` asks for an upload (a recording, a document); text by default. */
  type?: 'string' | 'file'
  /** A realistic value, used to run the template once without typing (first launch); empty for a file. */
  example: string
}

/** One Agent step. `name` is ASCII so later steps can reference it as `<name.content>`. */
interface AgentStep {
  kind?: undefined
  name: string
  system: string
  user: string
}

/** Speech-to-Text with the Nexora model, telling the speakers apart: `<name.transcriptBySpeaker>`. */
interface TranscriptionStep {
  kind: 'transcription'
  name: string
  /** The Start field holding the recording. */
  recording: string
}

/** A person reads what the step shows and approves (or not) before the workflow goes on. */
interface ApprovalStep {
  kind: 'approval'
  name: string
  shows: { name: string; value: string }[]
}

/** An e-mail by SMTP; the server (host, port, account, sender) is left for the person to fill in. */
interface EmailStep {
  kind: 'email'
  name: string
  to: string
  subject: string
  body: string
}

/** Lets the workflow go on only when `approved` (a reference such as `<validation.approuve>`) is true. */
interface GateStep {
  kind: 'gate'
  name: string
  approved: string
}

type TemplateStep = AgentStep | TranscriptionStep | ApprovalStep | GateStep | EmailStep

export interface NexoraTemplate {
  slug: string
  name: string
  description: string
  inputs: TemplateInput[]
  steps: TemplateStep[]
}

const STYLE =
  'Vous écrivez pour une PME française : français professionnel, vouvoiement, phrases courtes, aucune information inventée. Si une donnée manque, signalez-la entre crochets.'

/** The workspace folder that holds the SME templates (created with every new workspace). */
export const NEXORA_TEMPLATES_FOLDER = 'Modèles PME'

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
      'Enregistrement de la réunion → transcription par intervenant → compte rendu → validation → e-mail.',
    inputs: [
      {
        name: 'enregistrement',
        description: 'Enregistrement audio de la réunion (une heure au plus)',
        type: 'file',
        example: '',
      },
      {
        name: 'participants',
        description: 'Participants, avec leur fonction (facultatif)',
        example: 'Marie (cheffe de projet), Paul (commercial), Claire (comptable)',
      },
      {
        name: 'destinataire',
        description: 'Adresse e-mail à laquelle envoyer le compte rendu',
        example: 'equipe@exemple.fr',
      },
    ],
    steps: [
      { kind: 'transcription', name: 'Transcription', recording: 'enregistrement' },
      {
        name: 'CompteRendu',
        system: `${STYLE} Vous rédigez des comptes rendus de réunion utiles et concis.`,
        user: 'Participants indiqués : <start.participants>\n\nTranscription par intervenant (« Intervenant 1 », « Intervenant 2 »… désignent des voix, pas des noms) :\n<transcription.transcriptBySpeaker>\n\nRédigez le compte rendu : participants (rapprochez les noms cités des intervenants quand le texte le permet), points abordés, décisions prises, puis un tableau des actions (action, responsable, échéance). Terminez par les questions restées ouvertes.',
      },
      {
        kind: 'approval',
        name: 'Validation',
        shows: [{ name: 'compteRendu', value: '<compterendu.content>' }],
      },
      { kind: 'gate', name: 'Approbation', approved: '<validation.approuve>' },
      {
        kind: 'email',
        name: 'Email',
        to: '<start.destinataire>',
        subject: 'Compte rendu de réunion',
        body: '<compterendu.content>',
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
  type: string
  name: string
  position: { x: number; y: number }
  enabled: boolean
  subBlocks: Record<string, { id: string; type: string; value: unknown }>
  outputs: Record<string, never>
  data?: { canonicalModes: Record<string, 'basic' | 'advanced'> }
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

function sub(id: string, type: string, value: unknown) {
  return [id, { id, type, value }] as const
}

function subBlocksOf(...entries: ReturnType<typeof sub>[]): TemplateBlock['subBlocks'] {
  return Object.fromEntries(entries)
}

function formField(name: string, type: string, description: string, required = false) {
  return {
    id: generateId(),
    name,
    type,
    value: '',
    description,
    collapsed: false,
    ...(required ? { required: true } : {}),
  }
}

/** The block a step becomes, without its id and position. */
function stepBlock(
  step: TemplateStep,
  model: string,
  blockId: string
): Pick<TemplateBlock, 'type' | 'subBlocks' | 'data'> {
  switch (step.kind) {
    case 'transcription':
      return {
        type: 'stt_v2',
        subBlocks: subBlocksOf(
          sub('provider', 'dropdown', 'nexora'),
          sub('audioFileReference', 'short-input', `<start.${step.recording}>`),
          sub('language', 'dropdown', 'fr'),
          sub('diarization', 'switch', true)
        ),
        data: { canonicalModes: { audioFile: 'advanced' } },
      }
    case 'approval':
      return {
        type: 'human_in_the_loop_v2',
        subBlocks: subBlocksOf(
          sub(
            'builderData',
            'response-format',
            step.shows.map((shown) => ({
              id: generateId(),
              name: shown.name,
              type: 'string',
              value: shown.value,
              collapsed: false,
            }))
          ),
          sub('notification', 'tool-input', []),
          sub('inputFormat', 'input-format', [
            formField('approuve', 'boolean', 'Approuvez-vous ?', true),
            formField('commentaire', 'string', 'Commentaire'),
          ])
        ),
      }
    case 'gate':
      return {
        type: 'condition',
        subBlocks: subBlocksOf(
          sub(
            'conditions',
            'condition-input',
            JSON.stringify([
              {
                id: `${blockId}-if`,
                title: 'if',
                value: `String(${step.approved} ?? '').trim().toLowerCase() === "true"`,
              },
              { id: `${blockId}-else`, title: 'else', value: '' },
            ])
          )
        ),
      }
    case 'email':
      return {
        type: 'smtp',
        subBlocks: subBlocksOf(
          sub('smtpHost', 'short-input', ''),
          sub('smtpPort', 'short-input', '587'),
          sub('smtpUsername', 'short-input', ''),
          sub('smtpPassword', 'short-input', ''),
          sub('from', 'short-input', ''),
          sub('to', 'short-input', step.to),
          sub('subject', 'short-input', step.subject),
          sub('body', 'long-input', step.body),
          sub('contentType', 'dropdown', 'text')
        ),
      }
    default:
      return {
        type: 'agent',
        subBlocks: subBlocksOf(
          sub('messages', 'messages-input', [
            { role: 'system', content: step.system },
            { role: 'user', content: step.user },
          ]),
          sub('model', 'combobox', model)
        ),
      }
  }
}

/** Workflow state (Start → one block per step) in the shape the workflow importer reads. */
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
            type: input.type === 'file' ? 'file[]' : 'string',
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
  let previousHandle = 'source'
  template.steps.forEach((step, index) => {
    const id = generateId()
    blocks[id] = {
      id,
      name: step.name,
      position: { x: 420 * (index + 1), y: 0 },
      enabled: true,
      outputs: {},
      ...stepBlock(step, model, id),
    }
    edges.push({
      id: generateId(),
      source: previousId,
      target: id,
      sourceHandle: previousHandle,
      targetHandle: 'target',
    })
    previousId = id
    previousHandle = step.kind === 'gate' ? `condition-${id}-if` : 'source'
  })
  return { blocks, edges, loops: {}, parallels: {} }
}
