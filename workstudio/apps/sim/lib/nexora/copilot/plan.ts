import { z } from 'zod'

/**
 * The Copilot's step language: a short, typed plan the local Nexora model can fill reliably,
 * compiled into a workflow by `compilePlan`. Strings may reference earlier data as
 * `{{step_name.field}}` or `{{declencheur.field}}`.
 */

/** Steps a plan may hold: enough for an SME automation, few enough for a 7B model to keep coherent. */
const MAX_STEPS = 12
const MAX_TRIGGER_FIELDS = 10

/** Snake_case ASCII, so a step name is also its block's reference name (`<name.field>`). */
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/

/**
 * Names a step cannot take: `declencheur` is the trigger reference, `start` / `webhook` /
 * `planification` are the trigger blocks' names, and the executor reserves the rest.
 */
const RESERVED_STEP_NAMES = new Set([
  'declencheur',
  'start',
  'webhook',
  'planification',
  'loop',
  'parallel',
  'variable',
])

/** Fields the Start block always provides; a declared field must not hide one. */
const START_BUILT_IN_FIELDS = new Set(['input', 'files'])

const identifier = z.string().trim().max(40).regex(SNAKE_CASE)
const text = (max: number) => z.string().trim().min(1).max(max)

const triggerFieldSchema = z.object({
  name: identifier.refine((name) => !START_BUILT_IN_FIELDS.has(name)),
  description: z.string().trim().max(200).default(''),
})

const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const

const triggerSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('manuel'),
    fields: z
      .array(triggerFieldSchema)
      .max(MAX_TRIGGER_FIELDS)
      .default([])
      .refine((fields) => new Set(fields.map((f) => f.name)).size === fields.length),
  }),
  z.object({
    kind: z.literal('planification'),
    frequency: z.enum(['minutes', 'heure', 'jour', 'semaine', 'mois']),
    interval: z.number().int().min(1).max(59).optional(),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    weekday: z.enum(WEEKDAYS).optional(),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
  }),
  z.object({ kind: z.literal('webhook') }),
  z.object({ kind: z.literal('chat') }),
])

const stepName = identifier.refine((name) => !RESERVED_STEP_NAMES.has(name))

/** A scalar the model may write as text, number or boolean; compared as text. */
const scalar = z.union([z.string(), z.number(), z.boolean()]).transform((v) => String(v).trim())

const agentStepSchema = z.object({
  kind: z.literal('agent'),
  name: stepName,
  instructions: text(4000),
  message: text(4000),
  /** Nexora Connect services, by name. */
  services: z.array(text(80)).max(10).default([]),
  /** Workspace knowledge bases, by name. */
  knowledgeBases: z.array(text(120)).max(10).default([]),
  output: z
    .object({
      fields: z
        .array(z.object({ name: identifier, type: z.enum(['string', 'number', 'boolean']) }))
        .min(1)
        .max(10)
        .refine((fields) => new Set(fields.map((f) => f.name)).size === fields.length),
    })
    .optional(),
})

const CONDITION_OPERATORS = [
  'contient',
  'egal',
  'different',
  'superieur',
  'inferieur',
  'vide',
  'non_vide',
] as const

const conditionStepSchema = z.object({
  kind: z.literal('condition'),
  name: stepName,
  if: z
    .object({
      /** `step.field` or `{{step.field}}`. */
      ref: text(120),
      operator: z.enum(CONDITION_OPERATORS),
      value: scalar.optional(),
    })
    .superRefine((rule, ctx) => {
      if (rule.operator === 'vide' || rule.operator === 'non_vide') return
      if (rule.value === undefined || rule.value === '') {
        ctx.addIssue({ code: 'custom', path: ['value'], message: 'value required' })
      } else if (
        (rule.operator === 'superieur' || rule.operator === 'inferieur') &&
        !Number.isFinite(Number(rule.value))
      ) {
        ctx.addIssue({ code: 'custom', path: ['value'], message: 'number required' })
      }
    }),
  then: z.array(identifier).max(MAX_STEPS).default([]),
  else: z.array(identifier).max(MAX_STEPS).default([]),
})

const apiStepSchema = z.object({
  kind: z.literal('api'),
  name: stepName,
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  url: text(2000).regex(/^(https?:\/\/|\{\{)/),
  body: z
    .union([z.string().max(8000), z.record(z.string(), z.unknown())])
    .optional()
    .transform((body) =>
      body === undefined || typeof body === 'string' ? body : JSON.stringify(body, null, 2)
    ),
})

const waitStepSchema = z.object({
  kind: z.literal('attente'),
  name: stepName,
  seconds: z.number().int().min(1).max(86_400),
})

const humanStepSchema = z.object({
  kind: z.literal('validation_humaine'),
  name: stepName,
  message: text(4000),
})

const responseStepSchema = z.object({
  kind: z.literal('reponse'),
  name: stepName,
  fields: z
    .array(z.object({ name: identifier, value: scalar }))
    .min(1)
    .max(20),
})

const stepSchema = z.discriminatedUnion('kind', [
  agentStepSchema,
  conditionStepSchema,
  apiStepSchema,
  waitStepSchema,
  humanStepSchema,
  responseStepSchema,
])

/** A Copilot plan, as the model writes it; validate before compiling. */
export const copilotPlanSchema = z.object({
  title: text(80),
  description: z.string().trim().max(500).optional(),
  trigger: triggerSchema,
  steps: z
    .array(stepSchema)
    .min(1)
    .max(MAX_STEPS)
    .refine((steps) => new Set(steps.map((s) => s.name)).size === steps.length, {
      message: 'step names must be unique',
    }),
})

export type CopilotPlan = z.output<typeof copilotPlanSchema>
export type CopilotTrigger = CopilotPlan['trigger']
export type CopilotStep = CopilotPlan['steps'][number]
