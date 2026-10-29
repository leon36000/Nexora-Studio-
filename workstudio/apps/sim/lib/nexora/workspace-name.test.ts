import { describe, expect, it } from 'vitest'
import { defaultWorkspaceName } from '@/lib/nexora/workspace-name'

describe('defaultWorkspaceName', () => {
  it('names a person’s first workspace in French, by their first name', () => {
    expect(defaultWorkspaceName('Camille Martin')).toBe('Espace de Camille')
    expect(defaultWorkspaceName('  ')).toBe('Mon espace')
    expect(defaultWorkspaceName(null)).toBe('Mon espace')
  })

  it('elides « de » before a vowel, accented or not (« Espace d’Essai », not « Espace de Essai »)', () => {
    expect(defaultWorkspaceName('Essai SSO')).toBe('Espace d’Essai')
    expect(defaultWorkspaceName('Amélie Roy')).toBe('Espace d’Amélie')
    expect(defaultWorkspaceName('élodie')).toBe('Espace d’élodie')
    expect(defaultWorkspaceName('Océane')).toBe('Espace d’Océane')
    expect(defaultWorkspaceName('Ugo')).toBe('Espace d’Ugo')
    expect(defaultWorkspaceName('Yann')).toBe('Espace de Yann')
  })

  it('keeps « de » before a consonant, h included', () => {
    expect(defaultWorkspaceName('Hugo')).toBe('Espace de Hugo')
    expect(defaultWorkspaceName('Léa')).toBe('Espace de Léa')
  })

  it('does not take a name that is only an e-mail address or junk for a first name', () => {
    expect(defaultWorkspaceName('camille@example.fr')).toBe('Mon espace')
    expect(defaultWorkspaceName('---')).toBe('Mon espace')
  })
})
