/**
 * Nexora edition: the fields « Extraire des données » reads — a visual schema (`input-format` rows)
 * or a ready template — and the JSON Schema Nexora API fills (Mistral's `document_annotation_format`).
 * Client-safe: the block and the « Capturer » card import it.
 */

import { toRecord } from '@sim/utils/object'

export const EXTRACTION_FIELD_TYPES = [
  'string',
  'number',
  'boolean',
  'date',
  'array',
  'object',
] as const
export type ExtractionFieldType = (typeof EXTRACTION_FIELD_TYPES)[number]

export interface ExtractionField {
  name: string
  type: ExtractionFieldType
  description?: string
  example?: string
  required?: boolean
}

export const EXTRACTION_TEMPLATE_IDS = [
  'invoice',
  'quote',
  'purchase_order',
  'expense_report',
] as const
export type ExtractionTemplateId = (typeof EXTRACTION_TEMPLATE_IDS)[number]

const field = (
  name: string,
  type: ExtractionFieldType,
  description: string,
  required = false
): ExtractionField => ({ name, type, description, ...(required ? { required } : {}) })

/** Field names are valid table column names (`a_verifier` and `motifs` are added to a row). */
export const EXTRACTION_TEMPLATES: Record<ExtractionTemplateId, ExtractionField[]> = {
  invoice: [
    field('numero', 'string', 'Numéro de la facture', true),
    field('date', 'date', 'Date d’émission de la facture', true),
    field(
      'fournisseur',
      'string',
      'Raison sociale du fournisseur qui émet la facture, sans son adresse',
      true
    ),
    field('client', 'string', 'Nom du client facturé, sans son adresse'),
    field('total_ht', 'number', 'Montant total hors taxes', true),
    field('total_tva', 'number', 'Montant total de la TVA', true),
    field('total_ttc', 'number', 'Montant total toutes taxes comprises, à payer', true),
    field('date_echeance', 'date', 'Date d’échéance du paiement'),
    field('devise', 'string', 'Code ISO de la devise, par exemple EUR'),
  ],
  quote: [
    field('numero', 'string', 'Numéro du devis', true),
    field('date', 'date', 'Date du devis', true),
    field(
      'fournisseur',
      'string',
      'Raison sociale de l’entreprise qui émet le devis, sans son adresse',
      true
    ),
    field('client', 'string', 'Nom du client, sans son adresse'),
    field('objet', 'string', 'Objet ou résumé de la prestation'),
    field('total_ht', 'number', 'Montant total hors taxes', true),
    field('total_tva', 'number', 'Montant total de la TVA'),
    field('total_ttc', 'number', 'Montant total toutes taxes comprises'),
    field('date_validite', 'date', 'Date de fin de validité du devis'),
  ],
  purchase_order: [
    field('numero', 'string', 'Numéro du bon de commande', true),
    field('date', 'date', 'Date de la commande', true),
    field('acheteur', 'string', 'Entreprise qui passe la commande, sans son adresse', true),
    field(
      'fournisseur',
      'string',
      'Fournisseur à qui la commande est passée, sans son adresse',
      true
    ),
    field('total_ht', 'number', 'Montant total hors taxes'),
    field('total_ttc', 'number', 'Montant total toutes taxes comprises'),
    field('date_livraison', 'date', 'Date de livraison demandée'),
    field('adresse_livraison', 'string', 'Adresse de livraison'),
  ],
  expense_report: [
    field('date', 'date', 'Date de la dépense', true),
    field('commercant', 'string', 'Nom du commerçant ou du prestataire', true),
    field(
      'categorie',
      'string',
      'Catégorie : repas, transport, hébergement, carburant ou autre',
      true
    ),
    field('montant_ttc', 'number', 'Montant payé, toutes taxes comprises', true),
    field('montant_tva', 'number', 'Montant de la TVA indiqué sur le justificatif'),
    field('devise', 'string', 'Code ISO de la devise, par exemple EUR'),
    field('moyen_paiement', 'string', 'Moyen de paiement : carte, espèces, virement ou autre'),
  ],
}

const EDITOR_TYPES: Record<string, ExtractionFieldType> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'date',
  array: 'array',
  object: 'object',
}

/** The fields of the block's visual schema (`input-format` rows): named, unique, typed. */
export function toExtractionFields(raw: unknown): ExtractionField[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const fields: ExtractionField[] = []
  for (const item of raw) {
    const row = toRecord(item)
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    if (!name || seen.has(name)) continue
    seen.add(name)
    const description = typeof row.description === 'string' ? row.description.trim() : ''
    const example =
      typeof row.value === 'string' || typeof row.value === 'number' ? String(row.value).trim() : ''
    fields.push({
      name,
      type: EDITOR_TYPES[typeof row.type === 'string' ? row.type : ''] ?? 'string',
      ...(description ? { description } : {}),
      ...(example ? { example } : {}),
    })
  }
  return fields
}

interface JsonSchemaProperty {
  type: string[]
  description?: string
}

export interface AnnotationFormat {
  type: 'json_schema'
  json_schema: {
    name: string
    strict: boolean
    schema: {
      type: 'object'
      additionalProperties: false
      required: string[]
      properties: Record<string, JsonSchemaProperty>
    }
  }
}

const SCHEMA_TYPES: Record<ExtractionFieldType, string> = {
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  date: 'string',
  array: 'array',
  object: 'object',
}

/** Mistral's `document_annotation_format`: every field present, `null` when the document lacks it. */
export function annotationFormat(fields: readonly ExtractionField[]): AnnotationFormat {
  const properties: Record<string, JsonSchemaProperty> = {}
  for (const item of fields) {
    const notes = [
      item.description,
      item.type === 'date' ? 'date au format AAAA-MM-JJ' : '',
      item.example ? `exemple : ${item.example}` : '',
    ].filter(Boolean)
    properties[item.name] = {
      type: [SCHEMA_TYPES[item.type], 'null'],
      ...(notes.length ? { description: notes.join(' ; ') } : {}),
    }
  }
  return {
    type: 'json_schema',
    json_schema: {
      name: 'extraction',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: fields.map((item) => item.name),
        properties,
      },
    },
  }
}
