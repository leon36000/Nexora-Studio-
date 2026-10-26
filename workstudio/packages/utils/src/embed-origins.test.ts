import { describe, expect, it } from 'vitest'
import { parseEmbedOrigins } from './embed-origins'

describe('parseEmbedOrigins', () => {
  it.each([undefined, '', '   ', ' , ,'])('treats %j as « no restriction »', (raw) => {
    expect(parseEmbedOrigins(raw)).toEqual({ configured: false, origins: [], rejected: [] })
  })

  it('keeps https origins and local http origins, normalised and without duplicates', () => {
    const result = parseEmbedOrigins(
      ' https://www.exemple.fr/ , https://WWW.exemple.fr,https://exemple.fr:8443,' +
        'http://localhost:3000,http://127.0.0.1,http://[::1]:8080'
    )
    expect(result.configured).toBe(true)
    expect(result.rejected).toEqual([])
    expect(result.origins).toEqual([
      'https://www.exemple.fr',
      'https://exemple.fr:8443',
      'http://localhost:3000',
      'http://127.0.0.1',
      'http://[::1]:8080',
    ])
  })

  it.each([
    ['*', 'joker'],
    ['https://*', 'joker'],
    ['https://*.exemple.fr', 'joker'],
    ['https://exemple.*', 'joker'],
    ['ftp://exemple.fr', 'schéma'],
    ['javascript:alert(1)', 'schéma'],
    ['data:text/html', 'schéma'],
    ['http://exemple.fr', 'http hors localhost'],
    ['http://localhost.exemple.fr', 'http hors localhost'],
    ['https://exemple.fr/chemin', 'chemin, requête ou fragment'],
    ['https://exemple.fr?x=1', 'chemin, requête ou fragment'],
    ['https://exemple.fr#a', 'chemin, requête ou fragment'],
    ['https://user:secret@exemple.fr', 'identifiants'],
    ['exemple.fr', 'origine illisible'],
    ["https://exemple.fr; script-src 'unsafe-inline'", 'origine illisible'],
    ['https://exemple.fr https://autre.fr', 'origine illisible'],
  ])('ignores %j (%s) and reports it', (entry, reason) => {
    const result = parseEmbedOrigins(`https://ok.exemple.fr,${entry}`)
    expect(result.origins).toEqual(['https://ok.exemple.fr'])
    expect(result.rejected).toEqual([{ entry, reason }])
  })

  it('is configured, with no usable origin, when every entry is invalid', () => {
    const result = parseEmbedOrigins('*, ftp://x.fr')
    expect(result.configured).toBe(true)
    expect(result.origins).toEqual([])
    expect(result.rejected).toHaveLength(2)
  })
})
