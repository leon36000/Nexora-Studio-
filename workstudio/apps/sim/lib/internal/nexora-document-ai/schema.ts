import { z } from 'zod'
import { resolvedSecretTraceProvenanceSchema } from '@/lib/api/contracts/primitives'
import { RESOLVED_SECRET_PROVENANCE_FIELD } from '@/lib/execution/private-tool-metadata'
import { EXTRACTION_FIELD_TYPES } from '@/lib/nexora/document-ai/fields'
import { RawFileInputSchema } from '@/lib/uploads/utils/file-schemas'

const singleFileSchema = z.union([RawFileInputSchema, z.array(RawFileInputSchema).length(1)])
const modelSchema = z.string().max(256).optional().nullable()
const provenance = {
  [RESOLVED_SECRET_PROVENANCE_FIELD]: resolvedSecretTraceProvenanceSchema.optional(),
}

export const nexoraVisionInputSchema = z.object({
  imageFile: singleFileSchema,
  model: modelSchema,
  prompt: z.string().optional().nullable(),
  ...provenance,
})

export const nexoraOcrInputSchema = z.object({
  file: singleFileSchema,
  model: modelSchema,
  pages: z.array(z.number().int().min(0)).max(1000).optional(),
  ...provenance,
})

export const nexoraExtractInputSchema = z.object({
  file: singleFileSchema,
  fields: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(64),
        type: z.enum(EXTRACTION_FIELD_TYPES),
        description: z.string().max(1000).optional(),
        example: z.string().max(500).optional(),
        required: z.boolean().optional(),
      })
    )
    .min(1, 'Add at least one field to extract')
    .max(100),
  instructions: z.string().max(4000).optional().nullable(),
  visionModel: modelSchema,
  model: modelSchema,
  pages: z.array(z.number().int().min(0)).max(1000).optional(),
  ...provenance,
})

export const nexoraSttInputSchema = z.object({
  audioFile: singleFileSchema.optional(),
  audioFileReference: singleFileSchema.optional(),
  model: modelSchema,
  language: z.string().max(16).optional(),
  prompt: z.string().max(4000).optional(),
  diarization: z.boolean().optional(),
  numSpeakers: z.coerce.number().int().min(1).max(20).optional(),
  ...provenance,
})
