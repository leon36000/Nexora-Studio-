import { getErrorMessage } from '@sim/utils/errors'
import { toRecord } from '@sim/utils/object'
import { env } from '@/lib/core/config/env'

/** The embedding model the semantic judge uses unless it names another: the one of the knowledge bases. */
export const DEFAULT_EMBEDDING_MODEL = 'bge-m3'

/** Cosine of the angle between two vectors; 0 for vectors of different length or a null vector. */
export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length === 0 || left.length !== right.length) return 0
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < left.length; index++) {
    dot += left[index] * right[index]
    leftNorm += left[index] * left[index]
    rightNorm += right[index] * right[index]
  }
  if (leftNorm === 0 || rightNorm === 0) return 0
  return dot / Math.sqrt(leftNorm * rightNorm)
}

/**
 * Embeds `texts` with the deployment's own embedding model through Nexora API (nothing leaves the
 * instance). Vectors come back in input order.
 */
export async function embedTexts(
  texts: string[],
  model: string,
  signal?: AbortSignal
): Promise<number[][]> {
  const baseUrl = (env.VLLM_BASE_URL ?? '').replace(/\/+$/, '')
  let response: Response
  try {
    // boundary-raw-fetch: Nexora API is a separate OpenAI-compatible service, not a same-origin route
    response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.VLLM_API_KEY ? { Authorization: `Bearer ${env.VLLM_API_KEY}` } : {}),
      },
      body: JSON.stringify({ model: model.replace(/^vllm\//, ''), input: texts }),
      signal,
    })
  } catch (error) {
    throw new Error(
      `Les embeddings sont indisponibles : ${getErrorMessage(error, 'requête échouée')}`
    )
  }
  if (!response.ok) {
    throw new Error(`Les embeddings ont répondu HTTP ${response.status}.`)
  }
  const body = toRecord(await response.json().catch(() => null))
  const data = Array.isArray(body.data) ? body.data : []
  const vectors = data.map((entry) => {
    const embedding = toRecord(entry).embedding
    return Array.isArray(embedding) ? embedding.map(Number) : []
  })
  if (vectors.length !== texts.length || vectors.some((vector) => vector.length === 0)) {
    throw new Error('Les embeddings ont renvoyé une réponse inattendue.')
  }
  return vectors
}
