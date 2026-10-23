import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'

const httpUrlSchema = z
  .string()
  .trim()
  .max(512, 'issuer is too long')
  .regex(/^https?:\/\/[^\s/]+(\/\S*)?$/i, 'issuer must start with http:// or https://')

const secretSchema = z.string().max(1024, 'secret is too long')

const ssoDraftSchema = z.object({
  issuer: httpUrlSchema,
  clientId: z.string().trim().min(1, 'clientId is required').max(256, 'clientId is too long'),
  /** Empty or omitted keeps the stored secret. */
  clientSecret: secretSchema.optional(),
  buttonName: z.string().trim().min(1, 'buttonName is required').max(60, 'buttonName is too long'),
  required: z.boolean().optional(),
})

const smtpDraftSchema = z.object({
  host: z
    .string()
    .trim()
    .min(1, 'host is required')
    .max(255, 'host is too long')
    .regex(/^\S+$/, 'host cannot contain spaces'),
  port: z.number().int().min(1, 'port must be between 1 and 65535').max(65535),
  user: z.string().trim().max(256, 'user is too long').optional(),
  /** Empty or omitted keeps the stored password. */
  password: secretSchema.optional(),
  from: z.string().trim().max(320, 'from is too long').optional(),
})

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((domain) => domain.replace(/^@/, ''))
  .pipe(
    z
      .string()
      .max(253, 'domain is too long')
      .regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/, 'Use a domain such as pme.fr')
  )

const settingsViewSchema = z.object({
  sso: z
    .object({
      issuer: z.string(),
      clientId: z.string(),
      buttonName: z.string().optional(),
      required: z.boolean().optional(),
      hasSecret: z.boolean(),
    })
    .nullable(),
  smtp: z
    .object({
      host: z.string(),
      port: z.number(),
      user: z.string().optional(),
      from: z.string().optional(),
      hasPassword: z.boolean(),
    })
    .nullable(),
  allowedDomains: z.array(z.string()),
  /** Groups deploy/.env sets: the screen shows them read-only. */
  envOverrides: z.object({ sso: z.boolean(), smtp: z.boolean(), domains: z.boolean() }),
  /** Saved changes the running WorkStudio has not applied yet (« Appliquer » restarts it). */
  pendingApply: z.boolean(),
  /** Redirect URI to register with the identity provider. */
  redirectUri: z.string(),
})

/** Réglages › Sécurité and › E-mail: the instance settings, without any secret. */
export const getNexoraSettingsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/settings',
  response: { mode: 'json', schema: settingsViewSchema },
})

const updateNexoraSettingsBodySchema = z.object({
  sso: ssoDraftSchema.nullable().optional(),
  smtp: smtpDraftSchema.nullable().optional(),
  allowedDomains: z.array(domainSchema).max(50, 'at most 50 domains').optional(),
})

export type UpdateNexoraSettingsBody = z.input<typeof updateNexoraSettingsBodySchema>

/** Saves a change; WorkStudio uses it after « Appliquer » restarts it. */
export const updateNexoraSettingsContract = defineRouteContract({
  method: 'PUT',
  path: '/api/nexora/settings',
  body: updateNexoraSettingsBodySchema,
  response: { mode: 'json', schema: settingsViewSchema },
})

/** Sends a test e-mail to the administrator with the SMTP on screen, or the stored one. */
export const testNexoraEmailContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/settings/test-email',
  body: z.object({ smtp: smtpDraftSchema.optional() }),
  response: {
    mode: 'json',
    schema: z.discriminatedUnion('ok', [
      z.object({ ok: z.literal(true), sentTo: z.string() }),
      z.object({
        ok: z.literal(false),
        reason: z.enum([
          'not-configured',
          'auth',
          'connection',
          'timeout',
          'tls',
          'rejected',
          'unknown',
        ]),
        detail: z.string(),
      }),
    ]),
  },
})

/** Reads the identity provider's OpenID Connect discovery document. */
export const testNexoraSsoContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/settings/test-sso',
  body: z.object({ issuer: httpUrlSchema.optional() }),
  response: {
    mode: 'json',
    schema: z.discriminatedUnion('ok', [
      z.object({
        ok: z.literal(true),
        issuer: z.string(),
        authorizationEndpoint: z.string(),
        issuerMatches: z.boolean(),
      }),
      z.object({
        ok: z.literal(false),
        reason: z.enum([
          'not-configured',
          'invalid-issuer',
          'unreachable',
          'timeout',
          'not-found',
          'invalid',
        ]),
      }),
    ]),
  },
})

/** Restarts WorkStudio so it starts with the saved settings; Docker brings it back (~20 s). */
export const applyNexoraSettingsContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/settings/apply',
  response: { mode: 'json', schema: z.object({ restarting: z.literal(true) }) },
})

/** The health probe the settings screen polls while WorkStudio restarts. */
export const nexoraHealthContract = defineRouteContract({
  method: 'GET',
  path: '/api/health',
  response: { mode: 'json', schema: z.object({ status: z.literal('ok'), timestamp: z.string() }) },
})
