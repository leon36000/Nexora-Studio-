'use client'

import { sleep } from '@sim/utils/helpers'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isApiClientError } from '@/lib/api/client/errors'
import { requestJson } from '@/lib/api/client/request'
import type { ContractJsonResponse } from '@/lib/api/contracts'
import {
  applyNexoraSettingsContract,
  getNexoraSettingsContract,
  nexoraHealthContract,
  testNexoraEmailContract,
  testNexoraSsoContract,
  type UpdateNexoraSettingsBody,
  updateNexoraSettingsContract,
} from '@/lib/api/contracts/nexora-settings'

const NEXORA_SETTINGS_STALE_TIME = 30 * 1000
const RESTART_POLL_INTERVAL_MS = 2_000
const RESTART_TIMEOUT_MS = 120_000
/** Without a refused probe, the server is taken as restarted once this much time has passed. */
const RESTART_MIN_WAIT_MS = 15_000

const nexoraSettingsKeys = {
  all: ['nexora-settings'] as const,
  detail: () => [...nexoraSettingsKeys.all, 'detail'] as const,
}

export type NexoraSettings = ContractJsonResponse<typeof getNexoraSettingsContract>
export type NexoraSmtpDraft = NonNullable<UpdateNexoraSettingsBody['smtp']>

/** Why a settings call failed, worded by the settings page. */
const CONFLICT_CODES = [
  'env-override',
  'not-supervised',
  'restart-in-progress',
  'nothing-pending',
] as const

export type NexoraSettingsErrorCode =
  | 'forbidden'
  | 'owner-only'
  | (typeof CONFLICT_CODES)[number]
  | 'unavailable'
  | 'invalid'
  | 'unknown'

export function getNexoraSettingsErrorCode(error: unknown): NexoraSettingsErrorCode {
  if (!isApiClientError(error)) return 'unknown'
  if (error.message === 'owner-only') return 'owner-only'
  if (error.status === 401 || error.status === 403) return 'forbidden'
  if (error.status === 400) return 'invalid'
  const conflict = CONFLICT_CODES.find((code) => code === error.message)
  if (conflict) return conflict
  if (error.status === 503) return 'unavailable'
  return 'unknown'
}

/** Single sign-on, e-mail and sign-up domains of the instance. Instance admins only. */
export function useNexoraSettings() {
  return useQuery({
    queryKey: nexoraSettingsKeys.detail(),
    queryFn: ({ signal }) => requestJson(getNexoraSettingsContract, { signal }),
    staleTime: NEXORA_SETTINGS_STALE_TIME,
  })
}

export function useUpdateNexoraSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateNexoraSettingsBody) =>
      requestJson(updateNexoraSettingsContract, { body }),
    onSuccess: (settings) => queryClient.setQueryData(nexoraSettingsKeys.detail(), settings),
  })
}

/** Sends a test e-mail to the signed-in administrator; changes nothing. */
export function useTestNexoraEmail() {
  return useMutation({
    mutationFn: (smtp: NexoraSmtpDraft | undefined) =>
      requestJson(testNexoraEmailContract, { body: { smtp } }),
  })
}

/** Reads the identity provider's discovery document; changes nothing. */
export function useTestNexoraSso() {
  return useMutation({
    mutationFn: (issuer: string | undefined) =>
      requestJson(testNexoraSsoContract, { body: { issuer } }),
  })
}

/** WorkStudio did not come back by itself within {@link RESTART_TIMEOUT_MS}. */
export class NexoraRestartTimeoutError extends Error {
  constructor() {
    super('WorkStudio did not restart in time')
    this.name = 'NexoraRestartTimeoutError'
  }
}

/**
 * Polls the health probe until WorkStudio answers again after going down. A probe that never
 * fails (the restart was quicker than the first poll) counts after {@link RESTART_MIN_WAIT_MS}.
 */
async function waitForRestart(): Promise<void> {
  const startedAt = Date.now()
  let wentDown = false
  while (Date.now() - startedAt < RESTART_TIMEOUT_MS) {
    await sleep(RESTART_POLL_INTERVAL_MS)
    try {
      await requestJson(nexoraHealthContract, { signal: AbortSignal.timeout(5_000) })
      if (wentDown || Date.now() - startedAt >= RESTART_MIN_WAIT_MS) return
    } catch {
      wentDown = true
    }
  }
  throw new NexoraRestartTimeoutError()
}

/**
 * « Appliquer »: restarts WorkStudio, then resolves once it answers again. The mutation stays
 * pending for the whole wait, so the page can show it; the caller reloads afterwards.
 */
export function useApplyNexoraSettings() {
  return useMutation({
    mutationFn: async () => {
      await requestJson(applyNexoraSettingsContract, {})
      await waitForRestart()
    },
  })
}
