/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import type { CampaignRecord, ScheduleRecord } from '@/lib/nexora/evaluations/repository'
import {
  nextRunAfter,
  runDueSchedules,
  type ScheduleDeps,
  validateSchedule,
} from '@/lib/nexora/evaluations/schedule'

describe('échéances', () => {
  it('calcule la prochaine nuit à l’heure locale, heure d’été comprise', () => {
    expect(
      nextRunAfter('0 3 * * *', 'Europe/Paris', new Date('2026-10-23T12:00:00Z'))?.toISOString()
    ).toBe('2026-10-24T01:00:00.000Z')
    expect(
      nextRunAfter('0 3 * * *', 'Europe/Paris', new Date('2026-10-24T12:00:00Z'))?.toISOString()
    ).toBe('2026-10-25T02:00:00.000Z')
  })

  it('refuse une expression ou un fuseau invalide, en français', () => {
    expect(validateSchedule('0 3 * * *', 'Europe/Paris')).toBeNull()
    expect(validateSchedule('pas une expression', 'Europe/Paris')).toMatch(/expression/i)
    expect(validateSchedule('0 3 * * *', 'Mars/Olympus')).toMatch(/fuseau/i)
  })
})

function schedule(id: string, name: string): ScheduleRecord {
  return {
    id,
    workspaceId: 'ws-1',
    name,
    cron: '0 3 * * *',
    timezone: 'Europe/Paris',
    datasetId: 'ds-1',
    judgeId: 'judge-1',
    targets: [{ key: 't1', label: 'a', kind: 'model', model: 'a', system: null }],
    concurrency: 2,
    alertThreshold: 0.9,
    enabled: true,
    nextRunAt: new Date('2026-11-01T02:00:00Z'),
    lastRunAt: null,
    lastCampaignId: null,
    createdBy: 'user-1',
  }
}

describe('runDueSchedules', () => {
  const now = new Date('2026-11-03T02:00:30Z')

  function deps(overrides: Partial<ScheduleDeps> = {}): ScheduleDeps {
    return {
      claim: vi.fn(async (_now, nextRun) => {
        const due = [schedule('s1', 'Nuit'), schedule('s2', 'Hebdo')]
        // The store hands the function the claimed schedules, as it does for the real ones.
        for (const entry of due) nextRun(entry)
        return due
      }),
      launch: vi.fn(async (entry) => ({ id: `camp-${entry.id}` }) as CampaignRecord),
      onLaunchFailed: vi.fn(async () => {}),
      setLastCampaign: vi.fn(async () => {}),
      ...overrides,
    }
  }

  it('lance une campagne par planification échue et la rattache à celle-ci', async () => {
    const dependencies = deps()
    const result = await runDueSchedules(now, dependencies)
    expect(result).toEqual({ started: ['camp-s1', 'camp-s2'], failed: [] })
    expect(dependencies.setLastCampaign).toHaveBeenCalledWith('s1', 'camp-s1')
    expect(dependencies.setLastCampaign).toHaveBeenCalledWith('s2', 'camp-s2')
  })

  it('reprogramme à partir de maintenant : plusieurs échéances manquées ne donnent qu’une campagne', async () => {
    const dependencies = deps()
    await runDueSchedules(now, dependencies)
    const nextRun = vi.mocked(dependencies.claim).mock.calls[0][1]
    expect(nextRun(schedule('s1', 'Nuit'))?.toISOString()).toBe('2026-11-04T02:00:00.000Z')
  })

  it('n’empêche pas les autres de partir quand un lancement échoue, et signale l’échec', async () => {
    const dependencies = deps({
      launch: vi.fn(async (entry) => {
        if (entry.id === 's1') throw new Error('Le jeu de tests est vide')
        return { id: 'camp-s2' } as CampaignRecord
      }),
    })
    const result = await runDueSchedules(now, dependencies)
    expect(result).toEqual({ started: ['camp-s2'], failed: ['s1'] })
    expect(dependencies.onLaunchFailed).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1' }),
      'Le jeu de tests est vide'
    )
  })

  it('ne lance rien quand aucune planification n’est échue', async () => {
    const dependencies = deps({ claim: vi.fn(async () => []) })
    expect(await runDueSchedules(now, dependencies)).toEqual({ started: [], failed: [] })
    expect(dependencies.launch).not.toHaveBeenCalled()
  })
})
