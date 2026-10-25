/**
 * @vitest-environment node
 */
import { mockEnvObject } from '@sim/testing/mocks/env.mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { embedTexts } from '@/lib/nexora/evaluations/semantic'

describe('embeddings locaux', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    mockEnvObject.OLLAMA_URL = 'http://ollama:11434/'
    vi.stubGlobal('fetch', fetchMock)
  })

  it('interroge l’Ollama de l’instance avec le nom local du modèle et rend les vecteurs dans l’ordre', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        embeddings: [
          [1, 0],
          [0, 1],
        ],
      })
    )
    await expect(embedTexts(['réponse', 'attendu'], 'ollama/bge-m3')).resolves.toEqual([
      [1, 0],
      [0, 1],
    ])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://ollama:11434/api/embed')
    expect(JSON.parse(init.body)).toEqual({
      model: 'bge-m3',
      input: ['réponse', 'attendu'],
      truncate: true,
    })
  })

  it('refuse une réponse qui n’a pas un vecteur par texte', async () => {
    fetchMock.mockResolvedValue(Response.json({ embeddings: [[1, 0]] }))
    await expect(embedTexts(['a', 'b'], 'bge-m3')).rejects.toThrow(/inattendue/)
  })

  it('dit clairement que le serveur local manque ou répond mal', async () => {
    mockEnvObject.OLLAMA_URL = undefined
    await expect(embedTexts(['a'], 'bge-m3')).rejects.toThrow(/Ollama/)
    mockEnvObject.OLLAMA_URL = 'http://ollama:11434'
    fetchMock.mockResolvedValue(new Response('no', { status: 500 }))
    await expect(embedTexts(['a'], 'bge-m3')).rejects.toThrow(/HTTP 500/)
  })
})
