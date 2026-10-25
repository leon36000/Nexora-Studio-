import { generateId } from '@sim/utils/id'
import { STEPS_MARKER } from '@/lib/nexora/steps/mode'

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
  {
    slug: 'offre-emploi',
    name: 'Offre d’emploi',
    description:
      'Rédige une annonce claire et attractive à partir du poste, des missions et du profil.',
    inputs: [
      { name: 'poste', description: 'Intitulé du poste', example: 'Chargé(e) de clientèle' },
      {
        name: 'missions',
        description: 'Missions principales',
        example: 'Suivre le portefeuille clients, préparer les devis, relancer les impayés',
      },
      {
        name: 'profil',
        description: 'Profil recherché et conditions (contrat, lieu, salaire)',
        example: 'Bac+2 commerce, 2 ans d’expérience ; CDI à Lyon ; 32 000 EUR brut par an',
      },
    ],
    steps: [
      {
        name: 'Annonce',
        system: `${STYLE} Vous rédigez des offres d’emploi honnêtes, sans discrimination.`,
        user: 'Rédigez une offre d’emploi pour le poste « <start.poste> ».\n\nMissions : <start.missions>\n\nProfil et conditions : <start.profil>\n\nStructure : présentation de l’entreprise (une phrase à compléter entre crochets), missions, profil recherché, conditions, comment candidater. Aucun critère d’âge, de sexe ou d’origine.',
      },
    ],
  },
  {
    slug: 'fiche-produit',
    name: 'Fiche produit',
    description:
      'Transforme des caractéristiques techniques en fiche produit prête pour votre site.',
    inputs: [
      { name: 'produit', description: 'Nom du produit', example: 'Panier garni du terroir' },
      {
        name: 'caracteristiques',
        description: 'Caractéristiques, composition, prix',
        example: 'Confiture de figues, miel de lavande, terrine de canard ; 3,2 kg ; 49 EUR TTC',
      },
    ],
    steps: [
      {
        name: 'Fiche',
        system: `${STYLE} Vous écrivez des fiches produit claires pour un site de vente en ligne.`,
        user: 'Rédigez la fiche du produit « <start.produit> » à partir de : <start.caracteristiques>\n\nFournissez un titre, une description de 80 mots, cinq points forts en liste, puis une méta-description de 150 caractères au plus. N’inventez aucune caractéristique.',
      },
    ],
  },
  {
    slug: 'reseaux-sociaux',
    name: 'Publication réseaux sociaux',
    description:
      'Propose trois publications (LinkedIn, Facebook, Instagram) à partir d’une actualité.',
    inputs: [
      {
        name: 'actualite',
        description: 'Ce que vous voulez annoncer',
        example: 'Nous ouvrons un second atelier à Villeurbanne le 4 novembre',
      },
      { name: 'ton', description: 'Ton souhaité', example: 'chaleureux et professionnel' },
    ],
    steps: [
      {
        name: 'Publications',
        system: `${STYLE} Vous animez les réseaux sociaux d’une petite entreprise.`,
        user: 'Actualité : <start.actualite>\n\nTon : <start.ton>\n\nÉcrivez trois publications adaptées à LinkedIn (professionnelle, 600 caractères au plus), Facebook (conviviale) et Instagram (courte, avec cinq mots-clés). Terminez chacune par un appel à l’action.',
      },
    ],
  },
  {
    slug: 'reclamation',
    name: 'Réponse à une réclamation',
    description:
      'Prépare une réponse empathique à une réclamation, avec une proposition de geste commercial.',
    inputs: [
      {
        name: 'reclamation',
        description: 'Texte de la réclamation du client',
        example: 'Ma commande est arrivée avec trois jours de retard et un article était abîmé.',
      },
      {
        name: 'marge',
        description: 'Ce que vous pouvez proposer (remise, remplacement, remboursement)',
        example: 'Remplacement de l’article et 10 % de remise sur la prochaine commande',
      },
    ],
    steps: [
      {
        name: 'Reponse',
        system: `${STYLE} Vous traitez les réclamations avec empathie, sans reconnaître de faute juridique.`,
        user: 'Réclamation du client :\n<start.reclamation>\n\nGestes possibles : <start.marge>\n\nRédigez la réponse (objet + corps) : remerciez le client de son retour, reformulez le problème, présentez vos excuses, proposez le geste adapté et indiquez la suite concrète.',
      },
    ],
  },
  {
    slug: 'newsletter',
    name: 'Newsletter mensuelle',
    description: 'Compose la newsletter du mois à partir de vos informations brutes.',
    inputs: [
      {
        name: 'infos',
        description: 'Actualités, nouveautés, événements du mois',
        example:
          'Nouvelle gamme bio ; salon de Lyon le 12 ; horaires d’hiver à partir du 1er novembre',
      },
      { name: 'cible', description: 'À qui s’adresse la lettre', example: 'clients particuliers' },
    ],
    steps: [
      {
        name: 'Newsletter',
        system: `${STYLE} Vous rédigez des newsletters courtes et agréables à lire.`,
        user: 'Informations du mois : <start.infos>\n\nLecteurs : <start.cible>\n\nÉcrivez la newsletter : trois objets d’e-mail au choix, une introduction chaleureuse, une rubrique par information, puis un mot de la fin avec un appel à l’action.',
      },
    ],
  },
  {
    slug: 'relance-devis',
    name: 'Relance de devis sans réponse',
    description: 'Rédige une relance commerciale aimable pour un devis resté sans réponse.',
    inputs: [
      { name: 'client', description: 'Nom du client', example: 'Cabinet Lefèvre' },
      {
        name: 'devis',
        description: 'Référence et objet du devis',
        example: 'D-2026-041, refonte du site',
      },
      { name: 'envoi', description: 'Date d’envoi du devis', example: '02/10/2026' },
    ],
    steps: [
      {
        name: 'Relance',
        system: `${STYLE} Vous relancez les prospects sans les brusquer.`,
        user: 'Rédigez un e-mail (objet + corps) pour relancer <start.client> au sujet du devis <start.devis>, envoyé le <start.envoi>. Proposez un échange de 15 minutes, rappelez la durée de validité de 30 jours et laissez une porte de sortie polie.',
      },
    ],
  },
  {
    slug: 'rapport-hebdo',
    name: 'Rapport d’activité hebdomadaire',
    description: 'Met en forme vos notes de la semaine en rapport clair pour la direction.',
    inputs: [
      {
        name: 'notes',
        description: 'Vos notes en vrac de la semaine',
        example:
          '3 devis envoyés, 1 signé (4 200 EUR) ; retard fournisseur sur la commande 88 ; recrutement : 2 entretiens',
      },
    ],
    steps: [
      {
        name: 'Rapport',
        system: `${STYLE} Vous rédigez des rapports d’activité synthétiques.`,
        user: 'Notes de la semaine :\n<start.notes>\n\nPrésentez : réalisations, chiffres clés, difficultés rencontrées, décisions à prendre, priorités de la semaine suivante. Une phrase par point, aucun chiffre inventé.',
      },
    ],
  },
  {
    slug: 'traduction',
    name: 'Traduction professionnelle',
    description:
      'Traduit un texte en conservant le ton professionnel, puis signale les points délicats.',
    inputs: [
      {
        name: 'texte',
        description: 'Texte à traduire',
        example: 'Merci pour votre commande. Elle sera expédiée sous 48 heures ouvrées.',
      },
      { name: 'langue', description: 'Langue cible', example: 'anglais' },
    ],
    steps: [
      {
        name: 'Traduction',
        system: `${STYLE} Vous êtes traducteur professionnel.`,
        user: 'Traduisez en <start.langue> le texte suivant, en gardant le ton et la mise en forme :\n<start.texte>\n\nAjoutez ensuite, sous le titre « Points d’attention », les expressions dont la traduction est délicate.',
      },
    ],
  },
  {
    slug: 'resume-contrat',
    name: 'Résumé d’un contrat',
    description:
      'Résume un contrat et signale les clauses à faire relire (ne remplace pas un avocat).',
    inputs: [
      {
        name: 'contrat',
        description: 'Texte du contrat',
        example:
          'Article 4 : le contrat est reconduit tacitement pour un an, sauf dénonciation trois mois avant l’échéance. Article 7 : pénalité de 15 % du montant annuel en cas de résiliation anticipée.',
      },
    ],
    steps: [
      {
        name: 'Resume',
        system: `${STYLE} Vous aidez à comprendre un contrat. Vous ne donnez jamais de conseil juridique : vous résumez et vous signalez.`,
        user: 'Contrat :\n<start.contrat>\n\nDonnez : un résumé en dix lignes, les dates et délais, les montants, puis la liste des clauses à faire relire par un juriste (reconduction tacite, pénalités, résiliation, responsabilité). Terminez par : « Ce résumé ne remplace pas l’avis d’un juriste. »',
      },
    ],
  },
  {
    slug: 'controle-facture',
    name: 'Contrôle d’une facture fournisseur',
    description:
      'Extrait les données d’une facture, puis vérifie les calculs et les mentions obligatoires.',
    inputs: [
      {
        name: 'facture',
        description: 'Texte de la facture',
        example:
          'Facture F-9921 du 12/10/2026, Papeterie Dubois, SIRET 123 456 789 00012. Ramettes : 10 x 4,50 EUR HT = 45,00 EUR HT. TVA 20 % : 9,00 EUR. Total TTC : 54,00 EUR.',
      },
    ],
    steps: [
      {
        name: 'Extraction',
        system: `${STYLE} Vous lisez des factures avec rigueur.`,
        user: 'Extrayez de cette facture, en JSON, les clés « fournisseur », « numero », « date », « total_ht », « tva », « total_ttc » et « siret » (null si absent) :\n<start.facture>',
      },
      {
        name: 'Controle',
        system: `${STYLE} Vous contrôlez des factures fournisseur avant paiement.`,
        user: 'Données extraites : <extraction.content>\n\nTexte d’origine :\n<start.facture>\n\nVérifiez : total HT + TVA = total TTC, taux de TVA plausible, SIRET présent, numéro et date présents. Concluez par « À PAYER » ou « À VÉRIFIER », avec la liste des anomalies.',
      },
    ],
  },
  {
    slug: 'accueil-salarie',
    name: 'Accueil d’un nouveau salarié',
    description: 'Prépare l’e-mail d’accueil et la liste des choses à faire avant le premier jour.',
    inputs: [
      { name: 'prenom', description: 'Prénom du salarié', example: 'Camille' },
      {
        name: 'poste',
        description: 'Poste et service',
        example: 'Assistante comptable, service finance',
      },
      {
        name: 'arrivee',
        description: 'Date et lieu d’arrivée',
        example: 'lundi 2 novembre à 9 h, 12 rue des Lilas, Lyon',
      },
    ],
    steps: [
      {
        name: 'Accueil',
        system: `${STYLE} Vous préparez l’arrivée de nouveaux collègues.`,
        user: 'Préparez pour <start.prenom> (<start.poste>), qui arrive le <start.arrivee> : un e-mail d’accueil chaleureux, puis une liste de préparation en deux parties : « À préparer par l’entreprise » (poste de travail, accès, badge, contrat) et « À apporter par le salarié ».',
      },
    ],
  },
  {
    slug: 'avis-client',
    name: 'Réponse à un avis client',
    description: 'Répond à un avis en ligne, positif ou négatif, avec le bon ton.',
    inputs: [
      {
        name: 'avis',
        description: 'Texte de l’avis',
        example: 'Très bon accueil mais deux heures d’attente pour récupérer ma commande. Dommage.',
      },
      { name: 'note', description: 'Note donnée (sur 5)', example: '3' },
    ],
    steps: [
      {
        name: 'Reponse',
        system: `${STYLE} Vous répondez aux avis publics au nom de l’entreprise : ton posé, jamais défensif.`,
        user: 'Avis (<start.note> sur 5) :\n<start.avis>\n\nRédigez une réponse publique de 60 mots au plus : remerciez, répondez au point soulevé, annoncez une action concrète si l’avis est critique, et n’indiquez aucune donnée personnelle.',
      },
    ],
  },
  {
    slug: 'ordre-du-jour',
    name: 'Ordre du jour de réunion',
    description: 'Construit un ordre du jour chronométré à partir des sujets à traiter.',
    inputs: [
      {
        name: 'sujets',
        description: 'Sujets à aborder',
        example: 'Budget 2027 ; recrutement ; choix du nouveau logiciel de caisse',
      },
      { name: 'duree', description: 'Durée totale', example: '1 h 30' },
    ],
    steps: [
      {
        name: 'Ordre',
        system: `${STYLE} Vous organisez des réunions efficaces.`,
        user: 'Sujets : <start.sujets>\n\nDurée disponible : <start.duree>\n\nProposez un ordre du jour chronométré (ordre logique, temps par sujet, qui présente, décision attendue) et une phrase d’ouverture de la réunion.',
      },
    ],
  },
  {
    slug: 'reponse-validee',
    name: 'Réponse client validée avant envoi',
    description: 'Rédige la réponse à un client, la soumet à validation, puis l’envoie par e-mail.',
    inputs: [
      {
        name: 'message',
        description: 'Message reçu du client',
        example: 'Pouvez-vous me confirmer la date de livraison de ma commande 5521 ?',
      },
      {
        name: 'destinataire',
        description: 'Adresse e-mail du client',
        example: 'client@exemple.fr',
      },
    ],
    steps: [
      {
        name: 'Brouillon',
        system: `${STYLE} Vous préparez des réponses que l’équipe relira avant envoi.`,
        user: 'Message du client :\n<start.message>\n\nRédigez la réponse (sans objet ni signature) ; si une information manque, signalez-la entre crochets.',
      },
      {
        kind: 'approval',
        name: 'Validation',
        shows: [{ name: 'reponse', value: '<brouillon.content>' }],
      },
      { kind: 'gate', name: 'Approbation', approved: '<validation.approuve>' },
      {
        kind: 'email',
        name: 'Email',
        to: '<start.destinataire>',
        subject: 'Réponse à votre message',
        body: '<brouillon.content>',
      },
    ],
  },
  {
    slug: 'cr-entretien',
    name: 'Compte rendu d’entretien',
    description:
      'Met en forme les notes d’un entretien (client, candidat ou annuel) en compte rendu.',
    inputs: [
      {
        name: 'notes',
        description: 'Notes prises pendant l’entretien',
        example:
          'Client satisfait du service, demande un tarif dégressif au-delà de 20 commandes, veut une visite en décembre.',
      },
      { name: 'type', description: 'Type d’entretien', example: 'entretien client' },
    ],
    steps: [
      {
        name: 'CompteRenduEntretien',
        system: `${STYLE} Vous rédigez des comptes rendus d’entretien factuels.`,
        user: 'Type d’entretien : <start.type>\n\nNotes :\n<start.notes>\n\nRédigez : contexte, points abordés, engagements pris de part et d’autre (qui, quoi, quand), prochaines étapes. Distinguez les faits des impressions.',
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

/**
 * What a Start field holds in the template: its example, so a first test needs no typing. An
 * address stays empty, because a run may send a real e-mail to it.
 */
function sampleValue(input: TemplateInput): string {
  return input.type === 'file' || /^\S+@\S+$/.test(input.example) ? '' : input.example
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
        [STEPS_MARKER.id]: { ...STEPS_MARKER },
        inputFormat: {
          id: 'inputFormat',
          type: 'input-format',
          value: template.inputs.map((input) => ({
            id: generateId(),
            name: input.name,
            type: input.type === 'file' ? 'file[]' : 'string',
            value: sampleValue(input),
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
