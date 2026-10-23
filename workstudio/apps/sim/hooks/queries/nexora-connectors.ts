'use client'

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { isApiClientError, isValidationError } from '@/lib/api/client/errors'
import { requestJson } from '@/lib/api/client/request'
import {
  connectConnectorContract,
  connectorOAuthStatusContract,
  disconnectConnectorContract,
  getConnectorContract,
  listConnectorsContract,
  setConnectorOAuthAppContract,
  startConnectorOAuthContract,
} from '@/lib/api/contracts/nexora-connectors'
import type { ContractJsonResponse } from '@/lib/api/contracts/types'
import { type ConnectorOAuthOutcome, pollConnectorOAuth } from '@/lib/nexora/connector-oauth'

const CONNECTOR_CATALOG_STALE_TIME = 60 * 1000
const CONNECTOR_DETAIL_STALE_TIME = 30 * 1000
const CONNECTOR_CATALOG_PAGE_SIZE = 30

const connectorKeys = {
  all: ['nexora-connectors'] as const,
  catalogs: () => [...connectorKeys.all, 'catalog'] as const,
  catalog: (workspaceId?: string, query = '', category = '', pageSize = 0) =>
    [...connectorKeys.catalogs(), workspaceId ?? '', query, category, pageSize] as const,
  details: () => [...connectorKeys.all, 'detail'] as const,
  detail: (workspaceId?: string, service?: string) =>
    [...connectorKeys.details(), workspaceId ?? '', service ?? ''] as const,
}

type ConnectorCatalogPage = ContractJsonResponse<typeof listConnectorsContract>
export type ConnectorCatalogService = ConnectorCatalogPage['services'][number]
export type ConnectorDetail = ContractJsonResponse<typeof getConnectorContract>

const SERVER_ERROR_CODES = ['unavailable', 'refused', 'superseded'] as const

/** Why a connectors call failed, worded by the connectors pages. */
export type ConnectorErrorCode =
  | (typeof SERVER_ERROR_CODES)[number]
  | 'forbidden'
  | 'invalid'
  | 'unknown'

function isServerErrorCode(value: string): value is (typeof SERVER_ERROR_CODES)[number] {
  return (SERVER_ERROR_CODES as readonly string[]).includes(value)
}

/** Reads the `{ error: <code> }` the connectors routes answer with. */
export function getConnectorErrorCode(error: unknown): ConnectorErrorCode {
  if (isApiClientError(error)) {
    if (error.status === 401 || error.status === 403) return 'forbidden'
    if (isServerErrorCode(error.message)) return error.message
  }
  return isValidationError(error) ? 'invalid' : 'unknown'
}

interface ConnectorCatalogFilters {
  query: string
  category: string
}

/**
 * The Nexora Connect catalog, searched and filtered by category, the workspace's connected
 * services first. Pages of {@link CONNECTOR_CATALOG_PAGE_SIZE} are added with `fetchNextPage`.
 */
export function useConnectorCatalog(
  workspaceId: string | undefined,
  { query, category }: ConnectorCatalogFilters,
  pageSize = CONNECTOR_CATALOG_PAGE_SIZE
) {
  return useInfiniteQuery({
    queryKey: connectorKeys.catalog(workspaceId, query, category, pageSize),
    queryFn: ({ pageParam, signal }) =>
      requestJson(listConnectorsContract, {
        query: {
          workspaceId: workspaceId as string,
          ...(query ? { q: query } : {}),
          ...(category ? { category } : {}),
          offset: pageParam,
          limit: pageSize,
        },
        signal,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.services.length, 0)
      return lastPage.services.length > 0 && loaded < lastPage.total ? loaded : undefined
    },
    enabled: Boolean(workspaceId),
    staleTime: CONNECTOR_CATALOG_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}

/** One service: how to connect it, its actions, and the workspace's connection. */
export function useConnector(workspaceId: string | undefined, service: string | undefined) {
  return useQuery({
    queryKey: connectorKeys.detail(workspaceId, service),
    queryFn: ({ signal }) =>
      requestJson(getConnectorContract, {
        params: { service: service as string },
        query: { workspaceId: workspaceId as string },
        signal,
      }),
    enabled: Boolean(workspaceId && service),
    staleTime: CONNECTOR_DETAIL_STALE_TIME,
  })
}

interface ConnectorTarget {
  workspaceId: string
  service: string
}

/** A connection changes the service's page and the catalog's « Connecté » marks. */
function useInvalidateConnector() {
  const queryClient = useQueryClient()
  return ({ workspaceId, service }: ConnectorTarget) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: connectorKeys.detail(workspaceId, service) }),
      queryClient.invalidateQueries({ queryKey: connectorKeys.catalogs() }),
    ])
}

interface ConnectWithCredentialsVariables extends ConnectorTarget {
  authType: 'api_key' | 'custom_credential'
  values: Record<string, string>
}

export function useConnectConnector() {
  const invalidate = useInvalidateConnector()
  return useMutation({
    mutationFn: ({ workspaceId, service, authType, values }: ConnectWithCredentialsVariables) =>
      requestJson(connectConnectorContract, {
        params: { service },
        body: { workspaceId, authType, values },
      }),
    onSuccess: (_data, variables) => invalidate(variables),
  })
}

export function useDisconnectConnector() {
  const invalidate = useInvalidateConnector()
  return useMutation({
    mutationFn: ({ workspaceId, service }: ConnectorTarget) =>
      requestJson(disconnectConnectorContract, {
        params: { service },
        query: { workspaceId },
      }),
    onSuccess: (_data, variables) => invalidate(variables),
  })
}

interface ConnectWithOAuthVariables extends ConnectorTarget {
  /** Opened by the click itself (a window opened after an await is blocked). */
  popup: Window
  signal: AbortSignal
}

/**
 * Starts the OAuth consent, sends the popup to the provider, then follows the request until it
 * ends. The page is refreshed whatever the outcome: a consent finished after the window was
 * closed still shows.
 */
export function useConnectConnectorWithOAuth() {
  const invalidate = useInvalidateConnector()
  return useMutation({
    mutationFn: async ({
      workspaceId,
      service,
      popup,
      signal,
    }: ConnectWithOAuthVariables): Promise<ConnectorOAuthOutcome> => {
      const { requestId, authorizationUrl } = await requestJson(startConnectorOAuthContract, {
        params: { service },
        body: { workspaceId },
        signal,
      })
      popup.location.href = authorizationUrl
      return pollConnectorOAuth({
        fetchStatus: () =>
          requestJson(connectorOAuthStatusContract, {
            params: { requestId },
            query: { workspaceId },
            signal,
          }),
        isPopupClosed: () => popup.closed,
        signal,
      })
    },
    onSettled: (_data, _error, variables) => invalidate(variables),
  })
}

interface SetOAuthAppVariables {
  service: string
  clientId: string
  clientSecret: string
}

/** Saves the operator's OAuth application for a service (instance admins). */
export function useSetConnectorOAuthApp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ service, clientId, clientSecret }: SetOAuthAppVariables) =>
      requestJson(setConnectorOAuthAppContract, {
        params: { service },
        body: { clientId, clientSecret },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: connectorKeys.details() }),
  })
}
