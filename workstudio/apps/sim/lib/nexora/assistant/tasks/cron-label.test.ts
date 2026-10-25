import { describe, expect, it } from 'vitest'
import { describeCron } from '@/lib/nexora/assistant/tasks/cron-label'

describe('describeCron', () => {
  it.each([
    ['0 8 * * *', 'Tous les jours à 8 h'],
    ['30 7 * * *', 'Tous les jours à 7 h 30'],
    ['0 9 * * 1', 'Chaque lundi à 9 h'],
    ['15 18 * * 5', 'Chaque vendredi à 18 h 15'],
    ['0 9 * * 0', 'Chaque dimanche à 9 h'],
    ['0 9 * * 7', 'Chaque dimanche à 9 h'],
    ['0 10 1 * *', 'Le 1er de chaque mois à 10 h'],
    ['0 10 15 * *', 'Le 15 de chaque mois à 10 h'],
    ['*/5 * * * *', 'Toutes les 5 minutes'],
    ['*/1 * * * *', 'Toutes les minutes'],
    ['* * * * *', 'Toutes les minutes'],
    ['20 * * * *', 'Toutes les heures, à la minute 20'],
    ['0 * * * *', 'Toutes les heures'],
  ])('words %s as « %s »', (cron, label) => {
    expect(describeCron(cron)).toBe(label)
  })

  it('falls back to the expression itself for anything else', () => {
    expect(describeCron('0 8 * * 1-5')).toBe('Planification (0 8 * * 1-5)')
    expect(describeCron('not a cron')).toBe('Planification (not a cron)')
  })
})
