import { z } from 'zod'
import { workspaceIdSchema } from '@/lib/api/contracts/primitives'
import { defineRouteContract } from '@/lib/api/contracts/types'

/** The periods the consumption screen offers, in days. */
export const CONSUMPTION_PERIODS = ['7', '30', '90'] as const
export type ConsumptionPeriod = (typeof CONSUMPTION_PERIODS)[number]

/** A monthly cap: a whole number of tokens, at most a quadrillion. */
const MAX_MONTHLY_TOKENS = 1e15
/** Budgets the screen can hold per workspace in one save. */
const MAX_WORKSPACE_BUDGETS = 500

const nexoraConsumptionQuerySchema = z.object({
  days: z
    .enum(CONSUMPTION_PERIODS, { error: 'days must be 7, 30 or 90' })
    .default('30')
    .transform(Number),
})

/** Estimated from a row's tokens per model and Nexora API's measured carbon per token. */
const estimatedFootprintSchema = z.object({
  kgCO2eq: z.number(),
  /** Tokens of models Nexora API measured, which the estimate covers. */
  estimatedTokens: z.number(),
  /** Tokens of models Nexora API did not measure, left out of the estimate. */
  unestimatedTokens: z.number(),
  estimate: z.literal(true),
})

const consumptionTotalsSchema = z.object({
  executions: z.number(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
})

const modelConsumptionSchema = z.object({
  model: z.string(),
  aliases: z.array(z.string()),
  requests: z.number(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  kWh: z.number(),
  kgCO2eq: z.number(),
})

const workspaceConsumptionSchema = consumptionTotalsSchema.extend({
  /** `null` for usage of workspaces since deleted. */
  workspaceId: z.string().nullable(),
  name: z.string().nullable(),
  status: z.enum(['active', 'archived', 'deleted']),
  footprint: estimatedFootprintSchema.nullable(),
})

const userConsumptionSchema = consumptionTotalsSchema.extend({
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  footprint: estimatedFootprintSchema.nullable(),
})

const nexoraConsumptionResponseSchema = z.object({
  period: z.object({
    days: z.number(),
    start: z.string(),
    end: z.string(),
    timeZone: z.string(),
  }),
  /** `false` when Nexora API could not be read: its figures are then `null`. */
  nexoraApiAvailable: z.boolean(),
  /** Nexora API's measure of every model call of the instance (exact). */
  measured: z
    .object({
      requests: z.number(),
      totalTokens: z.number(),
      kWh: z.number(),
      kgCO2eq: z.number(),
      /** The same emissions as kilometres driven by an average car. */
      carKm: z.number(),
    })
    .nullable(),
  /** WorkStudio's own record of its runs and of the tokens they used. */
  workstudio: consumptionTotalsSchema,
  carEmissionFactor: z.object({
    kgCO2eqPerKm: z.number(),
    source: z.string(),
    recordedOn: z.string(),
  }),
  /** Every local day of the period, oldest first, zero when nothing ran. */
  days: z.array(z.object({ date: z.string(), executions: z.number(), totalTokens: z.number() })),
  models: z.array(modelConsumptionSchema).nullable(),
  workspaces: z.array(workspaceConsumptionSchema),
  /** The 20 people who used the most tokens. */
  users: z.array(userConsumptionSchema),
  /** Developer API keys used over the period, heaviest first. */
  apiKeys: z.array(
    z.object({
      keyId: z.string(),
      name: z.string(),
      scope: z.enum(['workspace', 'instance']),
      workspaceId: z.string().nullable(),
      workspaceName: z.string().nullable(),
      revoked: z.boolean(),
      requests: z.number(),
      /** Direct model calls (also counted per model above). */
      modelTokens: z.number(),
      /** Published agents' runs (also counted in their workspace above). */
      agentTokens: z.number(),
    })
  ),
})

/** Consumption of the whole instance over a period (Nexora edition, instance admins). */
export const getNexoraConsumptionContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/consumption',
  query: nexoraConsumptionQuerySchema,
  response: { mode: 'json', schema: nexoraConsumptionResponseSchema },
})

const monthlyTokensSchema = z
  .number({ error: 'A cap must be a number of tokens' })
  .int('A cap must be a whole number of tokens')
  .positive('A cap must be above zero')
  .max(MAX_MONTHLY_TOKENS, 'A cap is too large')

const budgetAlertSchema = z.object({
  scope: z.enum(['workspace', 'instance']),
  workspaceId: z.string().nullable(),
  level: z.enum(['threshold', 'exhausted']),
  month: z.string(),
  at: z.string(),
  usage: z.number(),
  cap: z.number(),
})

const nexoraBudgetsResponseSchema = z.object({
  budgets: z.object({
    instanceMonthlyTokens: z.number().nullable(),
    workspaceMonthlyTokens: z.record(z.string(), z.number()),
    /** Share of a cap, above 0 and at most 1. */
    alertThreshold: z.number(),
  }),
  /** The current budget month in the instance time zone, `YYYY-MM`. */
  month: z.string(),
  /** Tokens used since the 1st of the month. */
  usage: z.object({
    instance: z.number(),
    workspaces: z.record(z.string(), z.number()),
  }),
  /** The workspaces of the instance a cap can be set on, by name. */
  workspaces: z.array(
    z.object({ id: z.string(), name: z.string(), status: z.enum(['active', 'archived']) })
  ),
  /** Thresholds and caps reached this month. */
  alerts: z.array(budgetAlertSchema),
})

const updateNexoraBudgetsBodySchema = z
  .object({
    /** `null` removes the instance cap. */
    instanceMonthlyTokens: monthlyTokensSchema.nullable().optional(),
    /** A `null` cap removes that workspace's budget. */
    workspaceMonthlyTokens: z
      .record(workspaceIdSchema, monthlyTokensSchema.nullable())
      .refine((caps) => Object.keys(caps).length <= MAX_WORKSPACE_BUDGETS, {
        message: `At most ${MAX_WORKSPACE_BUDGETS} workspace budgets can be changed at once`,
      })
      .optional(),
    alertThreshold: z
      .number({ error: 'The alert threshold must be a number' })
      .min(0.05, 'The alert threshold must be between 5 % and 100 %')
      .max(1, 'The alert threshold must be between 5 % and 100 %')
      .optional(),
  })
  .refine(
    (change) =>
      change.instanceMonthlyTokens !== undefined ||
      change.workspaceMonthlyTokens !== undefined ||
      change.alertThreshold !== undefined,
    { message: 'Nothing to change' }
  )

export type UpdateNexoraBudgetsBody = z.input<typeof updateNexoraBudgetsBodySchema>

/** Monthly token budgets of the instance and its workspaces (Nexora edition, instance admins). */
export const getNexoraBudgetsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/budgets',
  response: { mode: 'json', schema: nexoraBudgetsResponseSchema },
})

export const updateNexoraBudgetsContract = defineRouteContract({
  method: 'PUT',
  path: '/api/nexora/budgets',
  body: updateNexoraBudgetsBodySchema,
  response: { mode: 'json', schema: nexoraBudgetsResponseSchema },
})
