import { getErrorMessage } from '@sim/utils/errors'
import { toRecord } from '@sim/utils/object'
import { env } from '@/lib/core/config/env'

/** The embedding model of the instance's knowledge bases, which the semantic judge uses unless told otherwise. */
const DEFAULT_EMBEDDING_MODEL = 'bge-m3'

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

/** The local model name: the knowledge bases write it `ollama/bge-m3`, the Ollama server knows `bge-m3`. */
function localModelName(model: string): string {
  return model.replace(/^(ollama|vllm)\//, '') || DEFAULT_EMBEDDING_MODEL
}

/**
 * Embeds `texts` with the instance's own Ollama server, the one its knowledge bases use: nothing
 * leaves the instance. Vectors come back in input order.
 */
export async function embedTexts(
  texts: string[],
  model: string,
  signal?: AbortSignal
): Promise<number[][]> {
  const baseUrl = (env.OLLAMA_URL ?? '').trim().replace(/\/+$/, '')
  if (!baseUrl) throw new Error('Le serveur de modèles local (Ollama) n’est pas configuré.')
  let response: Response
  try {
    // boundary-raw-fetch: the bundled Ollama is a separate service on the internal network
    response = await fetch(`${baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: localModelName(model), input: texts, truncate: true }),
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
  const embeddings = Array.isArray(body.embeddings) ? body.embeddings : []
  const vectors = embeddings.map((entry) => (Array.isArray(entry) ? entry.map(Number) : []))
  if (vectors.length !== texts.length || vectors.some((vector) => vector.length === 0)) {
    throw new Error('Les embeddings ont renvoyé une réponse inattendue.')
  }
  return vectors
}
