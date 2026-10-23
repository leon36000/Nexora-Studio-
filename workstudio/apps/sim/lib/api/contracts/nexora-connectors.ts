import { z } from 'zod'
import { defineRouteContract } from '@/lib/api/contracts/types'

const serviceParamsSchema = z.object({
  service: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{0,79}$/, 'service must be a Nexora Connect service id'),
})
const workspaceIdSchema = z
  .string()
  .min(1, 'workspaceId is required')
  .max(128, 'workspaceId is too long')

const catalogServiceSchema = z.object({
  service: z.string(),
  displayName: z.string(),
  description: z.string(),
  categories: z.array(z.string()),
  authTypes: z.array(z.string()),
  iconUrl: z.string().nullable(),
  homepageUrl: z.string().nullable(),
  actionCount: z.number(),
  connected: z.boolean(),
})

const connectionSchema = z.object({ id: z.string(), service: z.string(), authType: z.string() })

/** The Nexora Connect catalog, searched, with the workspace's connections marked. */
export const listConnectorsContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/connectors',
  query: z.object({
    workspaceId: workspaceIdSchema,
    q: z.string().max(100, 'search is too long').optional(),
    category: z.string().max(80, 'category is too long').optional(),
    offset: z.coerce.number().int().min(0).max(5000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
  response: {
    mode: 'json',
    schema: z.object({
      services: z.array(catalogServiceSchema),
      total: z.number(),
      categories: z.array(z.string()),
      connections: z.array(connectionSchema),
    }),
  },
})

const setupFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  inputType: z.string(),
  required: z.boolean(),
  secret: z.boolean(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
})

/** One service's page: how to connect it, its actions, and the workspace's connection. */
export const getConnectorContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/connectors/[service]',
  params: serviceParamsSchema,
  query: z.object({ workspaceId: workspaceIdSchema }),
  response: {
    mode: 'json',
    schema: z.object({
      service: catalogServiceSchema.omit({ connected: true }).nullable(),
      auth: z.array(
        z.object({
          type: z.string(),
          label: z.string().optional(),
          fields: z.array(setupFieldSchema).optional(),
        })
      ),
      oauth: z.object({ configured: z.boolean(), redirectUri: z.string().nullable() }).nullable(),
      actions: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })),
      connection: connectionSchema.nullable(),
      canManage: z.boolean(),
    }),
  },
})

export const connectConnectorContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/connectors/[service]',
  params: serviceParamsSchema,
  body: z.object({
    workspaceId: workspaceIdSchema,
    authType: z.enum(['api_key', 'custom_credential']),
    values: z
      .record(
        z.string().max(64, 'field name is too long'),
        z.string().max(8192, 'value is too long')
      )
      .refine((values) => Object.keys(values).length > 0 && Object.keys(values).length <= 20, {
        message: 'between 1 and 20 values are required',
      }),
  }),
  response: { mode: 'json', schema: z.object({ connection: connectionSchema }) },
})

export const disconnectConnectorContract = defineRouteContract({
  method: 'DELETE',
  path: '/api/nexora/connectors/[service]',
  params: serviceParamsSchema,
  query: z.object({ workspaceId: workspaceIdSchema }),
  response: { mode: 'json', schema: z.object({ success: z.literal(true) }) },
})

export const startConnectorOAuthContract = defineRouteContract({
  method: 'POST',
  path: '/api/nexora/connectors/[service]/oauth',
  params: serviceParamsSchema,
  body: z.object({ workspaceId: workspaceIdSchema }),
  response: {
    mode: 'json',
    schema: z.object({ requestId: z.string(), authorizationUrl: z.string() }),
  },
})

export const connectorOAuthStatusContract = defineRouteContract({
  method: 'GET',
  path: '/api/nexora/connectors/oauth/[requestId]',
  params: z.object({ requestId: z.string().regex(/^[\w-]{1,128}$/, 'invalid request id') }),
  query: z.object({ workspaceId: workspaceIdSchema }),
  response: {
    mode: 'json',
    schema: z.object({
      status: z.enum(['initiated', 'connected', 'failed', 'expired']),
      errorMessage: z.string().nullable(),
    }),
  },
})

/** The operator's OAuth application for a service (instance admins). */
export const setConnectorOAuthAppContract = defineRouteContract({
  method: 'PUT',
  path: '/api/nexora/connectors/oauth-apps/[service]',
  params: serviceParamsSchema,
  body: z.object({
    clientId: z.string().trim().min(1, 'clientId is required').max(512, 'clientId is too long'),
    clientSecret: z
      .string()
      .trim()
      .min(1, 'clientSecret is required')
      .max(2048, 'clientSecret is too long'),
  }),
  response: {
    mode: 'json',
    schema: z.object({ configured: z.boolean(), redirectUri: z.string().nullable() }),
  },
})
