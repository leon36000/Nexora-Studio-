import { createHash, timingSafeEqual } from 'node:crypto'
import { sleep } from '@sim/utils/helpers'
import { generateId } from '@sim/utils/id'
import { generateRandomHex } from '@sim/utils/random'
import { getRedisClient } from '@/lib/core/config/redis'

/**
 * Nexora edition: the pending « Demander avant d'agir » requests. The requester (the person
 * talking to the agent) receives a one-time token inside their own stream; only the token's
 * fingerprint is stored. The first decision wins; a request nobody answers expires. Redis keeps
 * it across WorkStudio processes; without Redis one process keeps it in memory.
 */

export type ConfirmationDecision = 'allow' | 'deny'
export type DecideOutcome = 'decided' | 'already_decided' | 'expired' | 'forbidden'

export interface ConfirmationRequestInput {
  executionId: string
  title: string
  /** A short text of what the call would do, for the person only. */
  summary: string
}

export const CONFIRMATION_TTL_SECONDS = 15 * 60
const KEY_PREFIX = 'nexora:tool-confirmation:'

interface StoredRequest {
  tokenHash: string
  decision?: ConfirmationDecision
  expiresAt: number
}

const memory = new Map<string, StoredRequest>()

function fingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function sameFingerprint(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function pruneMemory(now: number): void {
  for (const [id, entry] of memory) if (entry.expiresAt <= now) memory.delete(id)
}

export async function createConfirmationRequest(
  input: ConfirmationRequestInput,
  options: { ttlSeconds?: number } = {}
): Promise<{ id: string; token: string; expiresAt: string }> {
  const ttl = options.ttlSeconds ?? CONFIRMATION_TTL_SECONDS
  const id = generateId()
  const token = generateRandomHex(32)
  const expiresAt = Date.now() + ttl * 1000
  const tokenHash = fingerprint(token)
  const redis = getRedisClient()
  if (redis) {
    const key = `${KEY_PREFIX}${id}`
    await redis.hset(key, { tokenHash, executionId: input.executionId })
    await redis.expire(key, ttl)
  } else {
    pruneMemory(Date.now())
    memory.set(id, { tokenHash, expiresAt })
  }
  return { id, token, expiresAt: new Date(expiresAt).toISOString() }
}

export async function decideConfirmation(
  id: string,
  token: string,
  decision: ConfirmationDecision
): Promise<DecideOutcome> {
  const redis = getRedisClient()
  if (redis) {
    const key = `${KEY_PREFIX}${id}`
    const storedHash = await redis.hget(key, 'tokenHash')
    if (!storedHash) return 'expired'
    if (!sameFingerprint(storedHash, fingerprint(token))) return 'forbidden'
    const first = await redis.hsetnx(key, 'decision', decision)
    return first === 1 ? 'decided' : 'already_decided'
  }
  const entry = memory.get(id)
  if (!entry || entry.expiresAt <= Date.now()) return 'expired'
  if (!sameFingerprint(entry.tokenHash, fingerprint(token))) return 'forbidden'
  if (entry.decision) return 'already_decided'
  entry.decision = decision
  return 'decided'
}

async function readDecision(id: string): Promise<ConfirmationDecision | null | 'gone'> {
  const redis = getRedisClient()
  if (redis) {
    const key = `${KEY_PREFIX}${id}`
    const [decision, hash] = await Promise.all([
      redis.hget(key, 'decision'),
      redis.hget(key, 'tokenHash'),
    ])
    if (!hash) return 'gone'
    return decision === 'allow' || decision === 'deny' ? decision : null
  }
  const entry = memory.get(id)
  if (!entry || entry.expiresAt <= Date.now()) return 'gone'
  return entry.decision ?? null
}

/** The decision, or `null` when the time is up, the request expired or the run was cancelled. */
export async function waitForDecision(
  id: string,
  options: { timeoutMs: number; pollMs?: number; signal?: AbortSignal }
): Promise<ConfirmationDecision | null> {
  const pollMs = options.pollMs ?? 500
  const deadline = Date.now() + options.timeoutMs
  while (Date.now() < deadline) {
    if (options.signal?.aborted) return null
    const decision = await readDecision(id)
    if (decision === 'gone') return null
    if (decision) return decision
    await sleep(pollMs)
  }
  return null
}
