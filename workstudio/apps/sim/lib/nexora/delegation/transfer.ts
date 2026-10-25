import { LRUCache } from 'lru-cache'
import { getRedisClient } from '@/lib/core/config/redis'
import type { AgentHandoff } from '@/lib/nexora/delegation/handoffs'

/**
 * Nexora edition: « la main est passée ». When a called agent was given the conversation
 * (mode `transfer`), the calling agent's next messages of that conversation go to it. The state
 * is kept in Redis for a week (in memory without Redis, for one process) and is tied to the
 * calling agent, so removing the agent from « Peut confier à » gives the conversation back.
 */

export const TRANSFER_TTL_SECONDS = 7 * 24 * 60 * 60
const KEY_PREFIX = 'nexora:delegation:transfer:'

interface TransferScope {
  workspaceId: string
  /** The agent that handed the conversation over. */
  workflowId: string
  conversationId: string
}

interface MemoryEntry {
  agentId: string
  expiresAt: number
}

const memory = new LRUCache<string, MemoryEntry>({ max: 5_000 })

function keyOf(scope: TransferScope): string {
  return `${KEY_PREFIX}${scope.workspaceId}:${scope.workflowId}:${scope.conversationId}`
}

export async function setTransfer(scope: TransferScope, agentId: string): Promise<void> {
  const key = keyOf(scope)
  const redis = getRedisClient()
  if (redis) {
    await redis.set(key, agentId, 'EX', TRANSFER_TTL_SECONDS)
    return
  }
  memory.set(key, { agentId, expiresAt: Date.now() + TRANSFER_TTL_SECONDS * 1000 })
}

export async function clearTransfer(scope: TransferScope): Promise<void> {
  const key = keyOf(scope)
  const redis = getRedisClient()
  if (redis) await redis.del(key)
  else memory.delete(key)
}

async function readTransfer(scope: TransferScope): Promise<string | null> {
  const key = keyOf(scope)
  const redis = getRedisClient()
  if (redis) return redis.get(key)
  const entry = memory.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key)
    return null
  }
  return entry.agentId
}

/**
 * The handoff the conversation was handed to, `null` when it was not or when that agent is no
 * longer a `transfer` handoff of the calling agent.
 */
export async function resolveTransferTarget(
  scope: TransferScope,
  handoffs: readonly AgentHandoff[]
): Promise<AgentHandoff | null> {
  const agentId = await readTransfer(scope)
  if (!agentId) return null
  const handoff = handoffs.find((candidate) => candidate.agentId === agentId)
  return handoff?.mode === 'transfer' ? handoff : null
}
