import { z } from 'zod'
import { resolvedSecretTraceProvenanceSchema } from '@/lib/api/contracts/primitives'
import { RESOLVED_SECRET_PROVENANCE_FIELD } from '@/lib/execution/private-tool-metadata'
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

export const nexoraSttInputSchema = z.object({
  audioFile: singleFileSchema.optional(),
  audioFileReference: singleFileSchema.optional(),
  model: modelSchema,
  language: z.string().max(16).optional(),
  prompt: z.string().max(4000).optional(),
  ...provenance,
})
