/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import {
  type AlertDeps,
  alertEmail,
  alertsFor,
  raiseCampaignAlerts,
} from '@/lib/nexora/evaluations/alerts'
import type { SummaryItem } from '@/lib/nexora/evaluations/stats'
import type { EvalTarget } from '@/lib/nexora/evaluations/types'

const targets: EvalTarget[] = [
  { key: 't1', label: 'qwen2.5:7b', kind: 'model', model: 'qwen2.5:7b', system: null },
  { key: 't2', label: 'GLM 5.3', kind: 'model', model: 'cloud-glm-5-3', system: null },
]

const campaign = {
  id: 'camp-1',
  workspaceId: 'ws-1',
  name: 'FAQ tarifs, la nuit',
  targets,
  alertThreshold: 0.8,
  createdBy: 'user-1',
  scheduleId: 'sched-1',
}

function items(pass: number, fail: number, errors = 0): SummaryItem[] {
  const base = {
    score: null,
    latencyMs: 100,
    inputTokens: 1,
    outputTokens: 1,
    kgCo2eq: null,
  }
  return [
    ...Array.from({ length: pass }, () => ({
      ...base,
      status: 'done' as const,
      verdict: 'pass' as const,
    })),
    ...Array.from({ length: fail }, () => ({
      ...base,
      status: 'done' as const,
      verdict: 'fail' as const,
    })),
    ...Array.from({ length: errors }, () => ({ ...base, status: 'error' as const, verdict: null })),
  ]
}

describe('alertsFor', () => {
  it('lève une alerte par cible sous le seuil, pas pour les autres', () => {
    const alerts = alertsFor(
      campaign,
      new Map([
        ['t1', items(2, 1)],
        ['t2', items(9, 1)],
      ]),
      'completed'
    )
    expect(alerts).toEqual([
      expect.objectContaining({
        targetKey: 't1',
        targetLabel: 'qwen2.5:7b',
        kind: 'below_threshold',
        threshold: 0.8,
      }),
    ])
    expect(alerts[0].passRate).toBeCloseTo(2 / 3, 5)
  })

  it('ne lève rien quand le taux atteint le seuil', () => {
    const exactly = alertsFor(
      campaign,
      new Map([
        ['t1', items(4, 1)],
        ['t2', items(5, 0)],
      ]),
      'completed'
    )
    expect(exactly).toEqual([])
  })

  it('ne lève rien sans seuil', () => {
    expect(
      alertsFor({ ...campaign, alertThreshold: null }, new Map([['t1', items(0, 5)]]), 'completed')
    ).toEqual([])
  })

  it('compte les erreurs comme des échecs : une campagne en panne ne passe pas pour verte', () => {
    const alerts = alertsFor(
      campaign,
      new Map([
        ['t1', items(1, 0, 4)],
        ['t2', items(5, 0)],
      ]),
      'completed'
    )
    expect(alerts.map((alert) => alert.targetKey)).toEqual(['t1'])
  })

  it('lève une alerte « en échec » pour une cible sans aucun résultat', () => {
    const alerts = alertsFor(campaign, new Map([['t2', items(5, 0)]]), 'completed')
    expect(alerts).toEqual([
      expect.objectContaining({ targetKey: 't1', kind: 'failed', passRate: null }),
    ])
  })

  it('lève une alerte pour toute la campagne quand elle est interrompue ou en échec', () => {
    const interrupted = alertsFor(campaign, new Map(), 'interrupted')
    expect(interrupted).toEqual([
      expect.objectContaining({
        targetKey: '*',
        targetLabel: 'FAQ tarifs, la nuit',
        kind: 'failed',
      }),
    ])
    expect(alertsFor({ ...campaign, alertThreshold: null }, new Map(), 'failed')).toEqual([])
  })
})

describe('alerte par e-mail', () => {
  it('dit la campagne, la cible, le taux et le seuil, en français', () => {
    const { subject, text } = alertEmail(campaign, [
      {
        workspaceId: 'ws-1',
        campaignId: 'camp-1',
        targetKey: 't1',
        targetLabel: 'qwen2.5:7b',
        kind: 'below_threshold',
        passRate: 0.6667,
        threshold: 0.8,
      },
    ])
    expect(subject).toContain('FAQ tarifs, la nuit')
    expect(text).toContain('qwen2.5:7b')
    expect(text).toContain('67 %')
    expect(text).toContain('80 %')
  })
})

describe('raiseCampaignAlerts', () => {
  function deps(overrides: Partial<AlertDeps> = {}): AlertDeps {
    return {
      loadSeries: vi.fn(
        async () =>
          new Map([
            ['t1', items(1, 2)],
            ['t2', items(5, 0)],
          ])
      ),
      insertAlerts: vi.fn(async (alerts) => [...alerts]),
      recipients: vi.fn(async () => ['admin@pme.fr']),
      hasEmailService: () => true,
      sendEmail: vi.fn(async () => {}),
      ...overrides,
    }
  }

  it('enregistre l’alerte et prévient par e-mail quand le SMTP est configuré', async () => {
    const dependencies = deps()
    const raised = await raiseCampaignAlerts(campaign, 'completed', dependencies)
    expect(raised).toHaveLength(1)
    expect(dependencies.sendEmail).toHaveBeenCalledTimes(1)
    expect(vi.mocked(dependencies.sendEmail).mock.calls[0][0].to).toEqual(['admin@pme.fr'])
  })

  it('enregistre l’alerte pour le bandeau même sans SMTP', async () => {
    const dependencies = deps({ hasEmailService: () => false })
    const raised = await raiseCampaignAlerts(campaign, 'completed', dependencies)
    expect(raised).toHaveLength(1)
    expect(dependencies.insertAlerts).toHaveBeenCalledTimes(1)
    expect(dependencies.sendEmail).not.toHaveBeenCalled()
  })

  it('ne prévient pas deux fois : seule une alerte nouvellement enregistrée part par e-mail', async () => {
    const dependencies = deps({ insertAlerts: vi.fn(async () => []) })
    await raiseCampaignAlerts(campaign, 'completed', dependencies)
    expect(dependencies.sendEmail).not.toHaveBeenCalled()
  })

  it('garde l’alerte quand l’e-mail échoue', async () => {
    const dependencies = deps({
      sendEmail: vi.fn(async () => {
        throw new Error('SMTP refusé')
      }),
    })
    await expect(raiseCampaignAlerts(campaign, 'completed', dependencies)).resolves.toHaveLength(1)
  })
})
