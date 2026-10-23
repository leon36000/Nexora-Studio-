'use client'

import { toNumberOrNull, toStringOrNull } from '@sim/utils/coerce'
import { toRecord } from '@sim/utils/object'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiClientError, isApiClientError, isValidationError } from '@/lib/api/client/errors'
import { requestJson } from '@/lib/api/client/request'
import type { ContractJsonResponse } from '@/lib/api/contracts'
import {
  type AddNexoraModelBody,
  addNexoraModelContract,
  listNexoraModelsContract,
  pullOllamaModelContract,
  removeNexoraModelContract,
  setDefaultNexoraModelContract,
  testNexoraModelContract,
} from '@/lib/api/contracts/nexora-models'
import { providerKeys } from '@/hooks/queries/providers'

const NEXORA_MODELS_STALE_TIME = 30 * 1000

const nexoraModelKeys = {
  all: ['nexora-models'] as const,
  lists: () => [...nexoraModelKeys.all, 'list'] as const,
}

type NexoraModelList = ContractJsonResponse<typeof listNexoraModelsContract>
export type NexoraModel = NexoraModelList['models'][number]
export type OllamaCatalogModel = NexoraModelList['catalog'][number]

const SERVER_ERROR_CODES = [
  'unavailable',
  'duplicate',
  'is-default',
  'not-found',
  'invalid',
  'unreachable',
] as const

/** Why a model administration call failed, worded by the settings page. */
type NexoraModelErrorCode = (typeof SERVER_ERROR_CODES)[number] | 'forbidden' | 'unknown'

function isServerErrorCode(value: string): value is (typeof SERVER_ERROR_CODES)[number] {
  return (SERVER_ERROR_CODES as readonly string[]).includes(value)
}

/** Reads the `{ error: <code> }` the model routes answer with; a rejected input is `invalid`. */
export function getNexoraModelErrorCode(error: unknown): NexoraModelErrorCode {
  if (isApiClientError(error)) {
    if (error.status === 401 || error.status === 403) return 'forbidden'
    if (isServerErrorCode(error.message)) return error.message
  }
  return isValidationError(error) ? 'invalid' : 'unknown'
}

/**
 * Chat models served by Nexora API, the bundled Ollama's catalog and its downloaded models.
 * Instance admins only: other viewers get a 403.
 */
export function useNexoraModels() {
  return useQuery({
    queryKey: nexoraModelKeys.lists(),
    queryFn: ({ signal }) => requestJson(listNexoraModelsContract, { signal }),
    staleTime: NEXORA_MODELS_STALE_TIME,
  })
}

/**
 * Every model change also changes what blocks list (`vllm/<name>`, `vllm/nexora-default`), so the
 * block model list is refetched the next time a workflow editor reads it.
 */
function useInvalidateModelLists() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: nexoraModelKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: providerKeys.list('vllm') }),
    ])
}

export function useAddNexoraModel() {
  const invalidate = useInvalidateModelLists()
  return useMutation({
    mutationFn: (body: AddNexoraModelBody) => requestJson(addNexoraModelContract, { body }),
    onSuccess: invalidate,
  })
}

export function useSetDefaultNexoraModel() {
  const invalidate = useInvalidateModelLists()
  return useMutation({
    mutationFn: (id: number) => requestJson(setDefaultNexoraModelContract, { params: { id } }),
    onSuccess: invalidate,
  })
}

export function useRemoveNexoraModel() {
  const invalidate = useInvalidateModelLists()
  return useMutation({
    mutationFn: (id: number) => requestJson(removeNexoraModelContract, { params: { id } }),
    onSuccess: invalidate,
  })
}

/** Sends a short prompt through Nexora API to the model; changes nothing, so it invalidates nothing. */
export function useTestNexoraModel() {
  return useMutation({
    mutationFn: (id: number) => requestJson(testNexoraModelContract, { params: { id } }),
  })
}

export interface OllamaPullProgress {
  status: string
  completed: number | null
  total: number | null
}

/** Ollama ended the download with an error (an unknown model name, a full disk…). */
export class OllamaPullError extends Error {
  constructor(detail: string) {
    super(detail)
    this.name = 'OllamaPullError'
  }
}

interface PullOllamaModelVariables {
  model: string
  onProgress: (progress: OllamaPullProgress) => void
  signal: AbortSignal
}

/**
 * Downloads a model into the bundled Ollama, reporting each progress event, and resolves once
 * Ollama has finished. Aborting `signal` stops the download.
 */
async function pullOllamaModel({ model, onProgress, signal }: PullOllamaModelVariables) {
  // boundary-raw-fetch: streams the Ollama download progress
  const response = await fetch(pullOllamaModelContract.path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
    signal,
  })
  if (!response.ok || !response.body) {
    const body: unknown = await response.json().catch(() => null)
    throw new ApiClientError({
      status: response.status,
      message: toStringOrNull(toRecord(body).error) ?? response.statusText,
      body,
    })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const event of events) {
        const data = event
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice('data:'.length).trim())
          .join('')
        if (!data) continue
        let payload: Record<string, unknown>
        try {
          payload = toRecord(JSON.parse(data))
        } catch {
          continue
        }
        const error = toStringOrNull(payload.error)
        if (error) throw new OllamaPullError(error)
        if (payload.done === true) return
        onProgress({
          status: toStringOrNull(payload.status) ?? '',
          completed: toNumberOrNull(payload.completed),
          total: toNumberOrNull(payload.total),
        })
      }
    }
  } finally {
    reader.releaseLock()
  }
  throw new OllamaPullError('download interrupted')
}

/** Downloads a model into the bundled Ollama; the catalog's « installed » marks follow. */
export function usePullOllamaModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: pullOllamaModel,
    onSettled: () => queryClient.invalidateQueries({ queryKey: nexoraModelKeys.lists() }),
  })
}
