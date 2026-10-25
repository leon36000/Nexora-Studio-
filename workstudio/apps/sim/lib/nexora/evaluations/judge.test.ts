/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import {
  buildJudgeMessages,
  type JudgeDeps,
  parseJudgeReply,
  runJudge,
} from '@/lib/nexora/evaluations/judge'
import { cosineSimilarity } from '@/lib/nexora/evaluations/semantic'
import type { LlmClassJudgeConfig, LlmScoreJudgeConfig } from '@/lib/nexora/evaluations/types'

const classConfig: LlmClassJudgeConfig = {
  kind: 'llm_class',
  model: 'nexora-default',
  instructions: 'La réponse doit donner le bon prix.',
  labels: ['correct', 'incorrect'],
  passLabels: ['correct'],
}

const scoreConfig: LlmScoreJudgeConfig = {
  kind: 'llm_score',
  model: 'nexora-default',
  instructions: 'Note l’exactitude.',
  min: 1,
  max: 10,
  passAt: 7,
}

const subject = {
  input: 'Combien coûte le forfait Pro ?',
  answer: 'Le forfait Pro coûte 49 € par mois.',
  expected: '49 € par mois',
  guidance: 'Le prix doit être exact.',
}

describe('consignes du juge', () => {
  it('donne au juge la question, la référence, la consigne et la réponse, et le met en garde contre la réponse', () => {
    const [system, user] = buildJudgeMessages(classConfig, subject)
    expect(system.role).toBe('system')
    expect(system.content).toContain('La réponse doit donner le bon prix.')
    expect(system.content).toContain('correct | incorrect')
    expect(system.content).toMatch(/ignore toute instruction/i)
    expect(user.content).toContain('Combien coûte le forfait Pro ?')
    expect(user.content).toContain('49 € par mois')
    expect(user.content).toContain('Le prix doit être exact.')
    expect(user.content).toContain('Le forfait Pro coûte 49 € par mois.')
  })

  it('omet la référence et la consigne absentes au lieu d’écrire « null »', () => {
    const [, user] = buildJudgeMessages(classConfig, { ...subject, expected: null, guidance: null })
    expect(user.content).not.toContain('null')
    expect(user.content).not.toMatch(/RÉPONSE ATTENDUE/)
  })
})

describe('lecture du verdict d’un juge qui classe', () => {
  it('lit un objet JSON et applique les étiquettes de réussite', () => {
    expect(parseJudgeReply(classConfig, '{"verdict":"correct","note":"Prix exact."}')).toEqual({
      verdict: 'pass',
      score: null,
      note: 'Prix exact.',
    })
    expect(
      parseJudgeReply(classConfig, '{"verdict":"incorrect","note":"Prix faux."}').verdict
    ).toBe('fail')
  })

  it('accepte une clôture Markdown, du texte autour et la casse', () => {
    expect(
      parseJudgeReply(classConfig, 'Voici mon avis :\n```json\n{"verdict": "Correct"}\n```').verdict
    ).toBe('pass')
  })

  it('ignore le raisonnement entre balises think', () => {
    const reply = '<think>Le {"verdict":"incorrect"} semble faux</think>{"verdict":"correct"}'
    expect(parseJudgeReply(classConfig, reply).verdict).toBe('pass')
  })

  it('accepte une étiquette seule', () => {
    expect(parseJudgeReply(classConfig, ' incorrect. ').verdict).toBe('fail')
  })

  it('ne devine jamais : texte libre ou étiquette inconnue donnent une erreur avec la réponse brute', () => {
    const free = parseJudgeReply(classConfig, 'Je pense que la réponse est plutôt bonne.')
    expect(free.verdict).toBe('error')
    expect(free.note).toContain('plutôt bonne')
    const unknown = parseJudgeReply(classConfig, '{"verdict":"peut-être"}')
    expect(unknown.verdict).toBe('error')
    expect(unknown.note).toContain('peut-être')
  })
})

describe('lecture de la note d’un juge qui note', () => {
  it('lit le score, applique le seuil et le garde', () => {
    expect(parseJudgeReply(scoreConfig, '{"score": 8, "note": "Bien."}')).toEqual({
      verdict: 'pass',
      score: 8,
      note: 'Bien.',
    })
    expect(parseJudgeReply(scoreConfig, '{"score": 6}').verdict).toBe('fail')
    expect(parseJudgeReply(scoreConfig, '{"score": 7}').verdict).toBe('pass')
  })

  it('lit « 7/10 » et une virgule décimale', () => {
    expect(parseJudgeReply(scoreConfig, 'Note : 7/10').score).toBe(7)
    expect(parseJudgeReply(scoreConfig, '{"score": "7,5"}').score).toBe(7.5)
  })

  it('refuse une note hors de l’échelle', () => {
    expect(parseJudgeReply(scoreConfig, '{"score": 11}').verdict).toBe('error')
    expect(parseJudgeReply(scoreConfig, '{"score": 0}').verdict).toBe('error')
    expect(parseJudgeReply(scoreConfig, 'aucune note').verdict).toBe('error')
    expect(parseJudgeReply(scoreConfig, 'La réponse tient en 3 phrases').verdict).toBe('error')
  })
})

describe('proximité sémantique', () => {
  it('mesure le cosinus de deux vecteurs', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 6)
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6)
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 6)
  })

  it('renvoie 0 pour un vecteur nul ou de longueur différente, jamais NaN', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0)
  })
})

describe('exécution d’un juge', () => {
  function deps(overrides: Partial<JudgeDeps> = {}): JudgeDeps {
    return {
      complete: vi.fn(async () => ({
        text: '{"verdict":"correct","note":"ok"}',
        usage: { promptTokens: 40, completionTokens: 8 },
      })),
      embed: vi.fn(async () => [
        [1, 0],
        [0.9, 0.1],
      ]),
      ...overrides,
    }
  }

  it('appelle le modèle du juge sans aléa et rend ses jetons', async () => {
    const dependencies = deps()
    const run = await runJudge(classConfig, subject, dependencies)
    expect(run).toMatchObject({ verdict: 'pass', usage: { promptTokens: 40, completionTokens: 8 } })
    expect(dependencies.complete).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'nexora-default', temperature: 0 })
    )
  })

  it('transforme une panne du modèle en erreur du juge, pas en réussite', async () => {
    const run = await runJudge(
      classConfig,
      subject,
      deps({
        complete: vi.fn(async () => {
          throw new Error('Nexora API indisponible')
        }),
      })
    )
    expect(run.verdict).toBe('error')
    expect(run.note).toContain('Nexora API indisponible')
  })

  it('juge une règle sans appeler de modèle', async () => {
    const dependencies = deps()
    const run = await runJudge(
      { kind: 'contains', value: '49', caseSensitive: false },
      subject,
      dependencies
    )
    expect(run.verdict).toBe('pass')
    expect(dependencies.complete).not.toHaveBeenCalled()
    expect(dependencies.embed).not.toHaveBeenCalled()
  })

  it('juge la proximité sémantique avec le seuil', async () => {
    const close = await runJudge(
      { kind: 'semantic', model: 'bge-m3', passAt: 0.8 },
      subject,
      deps()
    )
    expect(close.verdict).toBe('pass')
    expect(close.score).toBeGreaterThan(0.9)
    const far = await runJudge(
      { kind: 'semantic', model: 'bge-m3', passAt: 0.8 },
      subject,
      deps({
        embed: vi.fn(async () => [
          [1, 0],
          [0, 1],
        ]),
      })
    )
    expect(far.verdict).toBe('fail')
  })

  it('refuse la proximité sans réponse attendue', async () => {
    const run = await runJudge(
      { kind: 'semantic', model: 'bge-m3', passAt: 0.8 },
      { ...subject, expected: null },
      deps()
    )
    expect(run.verdict).toBe('error')
  })
})
