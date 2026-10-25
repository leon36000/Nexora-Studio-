import { describe, expect, it } from 'vitest'
import { canOpenInEditor, looksLikeScheduledTask } from '@/lib/nexora/assistant/schedule-phrase'

describe('looksLikeScheduledTask', () => {
  it.each([
    'tous les matins à 8 h, résume mes e-mails',
    'Chaque lundi à 9 h, envoie-moi le point des ventes',
    'toutes les 15 minutes, vérifie la boîte de réception',
    'Tous les jours à 18h prépare le récapitulatif',
    'du lundi au vendredi à 7 h 30, liste mes rendez-vous',
    'une fois par semaine, relance les devis sans réponse',
    'chaque 1er du mois, génère le rapport',
    'Chaque vendredi soir, rappelle-moi de facturer',
  ])('proposes to schedule « %s »', (message) => {
    expect(looksLikeScheduledTask(message)).toBe(true)
  })

  it.each([
    'Rédige un devis pour la boulangerie Martin',
    'Que fais-tu chaque lundi ?',
    'Résume ce document',
    'Nous passons chaque jour par le même fournisseur, est-ce normal ?',
    '',
    '   ',
  ])('leaves « %s » to the agent', (message) => {
    expect(looksLikeScheduledTask(message)).toBe(false)
  })

  it('leaves a long text to the agent, even with a schedule phrase in it', () => {
    expect(looksLikeScheduledTask(`tous les matins ${'texte '.repeat(100)}`)).toBe(false)
  })
})

describe('canOpenInEditor', () => {
  it('is for writers and administrators of the workspace', () => {
    expect(canOpenInEditor('write')).toBe(true)
    expect(canOpenInEditor('admin')).toBe(true)
    expect(canOpenInEditor('read')).toBe(false)
    expect(canOpenInEditor(null)).toBe(false)
    expect(canOpenInEditor(undefined)).toBe(false)
  })
})
