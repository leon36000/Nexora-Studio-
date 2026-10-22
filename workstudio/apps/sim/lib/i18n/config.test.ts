import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALES, resolveLocale } from '@/lib/i18n/config'

describe('resolveLocale', () => {
  it('defaults to French when nothing is known', () => {
    expect(resolveLocale({})).toBe('fr')
    expect(DEFAULT_LOCALE).toBe('fr')
  })

  it('honours a supported locale cookie over the browser languages', () => {
    expect(resolveLocale({ cookie: 'en', acceptLanguage: 'fr-FR,fr;q=0.9' })).toBe('en')
    expect(resolveLocale({ cookie: 'fr', acceptLanguage: 'en-US,en;q=0.9' })).toBe('fr')
  })

  it('ignores an unsupported or malformed cookie', () => {
    expect(resolveLocale({ cookie: 'de', acceptLanguage: 'en-US' })).toBe('en')
    expect(resolveLocale({ cookie: '../../etc', acceptLanguage: undefined })).toBe('fr')
  })

  it('picks the best supported browser language by quality', () => {
    expect(resolveLocale({ acceptLanguage: 'de-DE,en;q=0.8,fr;q=0.5' })).toBe('en')
    expect(resolveLocale({ acceptLanguage: 'de-DE,fr;q=0.8,en;q=0.9' })).toBe('en')
    expect(resolveLocale({ acceptLanguage: 'fr-CA' })).toBe('fr')
  })

  it('falls back to French when no browser language is supported', () => {
    expect(resolveLocale({ acceptLanguage: 'de-DE,es;q=0.9' })).toBe('fr')
    expect(resolveLocale({ acceptLanguage: '*' })).toBe('fr')
  })

  it('lists exactly the shipped locales', () => {
    expect([...LOCALES]).toEqual(['fr', 'en'])
  })
})
