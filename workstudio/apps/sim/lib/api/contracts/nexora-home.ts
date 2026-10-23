import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'
import { ONBOARDING_STEPS } from '@/lib/nexora/onboarding-steps'

const onboardingSchema = z.object({
  completed: z.array(z.enum(ONBOARDING_STEPS)),
  dismissed: z.boolean(),
})

/** What the Nexora home page shows besides its cards: the default model and, for admins, the first launch. */
export const getNexoraHomeContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/home',
  response: {
    mode: 'json',
    schema: z.object({
      defaultModel: z.string().nullable(),
      isInstanceAdmin: z.boolean(),
      onboarding: onboardingSchema.nullable(),
      /** The organization whose first launch this is (admins only). */
      organizationId: z.string().nullable(),
      /** Invitations can be e-mailed; otherwise the invitation link is copied by hand. */
      emailConfigured: z.boolean(),
    }),
  },
})

export const updateNexoraOnboardingContract = defineRouteContract({
  method: 'PATCH',
  path: '/api/nexora/onboarding',
  body: z
    .object({
      complete: z.enum(ONBOARDING_STEPS).optional(),
      dismissed: z.boolean().optional(),
    })
    .refine((body) => body.complete !== undefined || body.dismissed !== undefined, {
      message: 'complete or dismissed is required',
    }),
  response: { mode: 'json', schema: z.object({ onboarding: onboardingSchema }) },
})
