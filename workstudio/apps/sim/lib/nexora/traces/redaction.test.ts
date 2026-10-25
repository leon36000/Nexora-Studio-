/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { redactText, redactValue } from '@/lib/nexora/traces/redaction'

describe('redactText', () => {
  it.each([
    ['mon IBAN est FR76 3000 6000 0112 3456 7890 189 merci', 'mon IBAN est [IBAN] merci'],
    ['FR7630006000011234567890189', '[IBAN]'],
    ['DE89 3704 0044 0532 0130 00 pour le virement', '[IBAN] pour le virement'],
  ])('masque l’IBAN valide dans « %s »', (input, expected) => {
    expect(redactText(input, 'standard')).toEqual({ text: expected, masked: 1 })
  })

  it('laisse intacte une suite qui ressemble à un IBAN mais dont la clé est fausse', () => {
    const text = 'référence FR76 3000 6000 0112 3456 7890 180'
    expect(redactText(text, 'standard')).toEqual({ text, masked: 0 })
  })

  it.each([
    [
      'écrire à jean.dupont+facture@exemple.fr dès que possible',
      'écrire à [E-MAIL] dès que possible',
    ],
    ['Contact : MARIE@SOCIETE.COM.', 'Contact : [E-MAIL].'],
  ])('masque l’e-mail dans « %s »', (input, expected) => {
    expect(redactText(input, 'standard').text).toBe(expected)
  })

  it.each([
    '06 12 34 56 78',
    '06.12.34.56.78',
    '0612345678',
    '+33 6 12 34 56 78',
    '+33612345678',
    '0033612345678',
    '+1 415 555 0100',
  ])('masque le téléphone %s', (phone) => {
    expect(redactText(`appelez le ${phone} demain`, 'standard')).toEqual({
      text: 'appelez le [TÉLÉPHONE] demain',
      masked: 1,
    })
  })

  it.each(['4111 1111 1111 1111', '4111-1111-1111-1111', '4111111111111111'])(
    'masque la carte %s',
    (card) => {
      expect(redactText(`carte ${card} expirée`, 'standard')).toEqual({
        text: 'carte [CARTE] expirée',
        masked: 1,
      })
    }
  )

  it('laisse intacts les nombres qui ne sont ni carte (Luhn faux), ni téléphone', () => {
    const text =
      'commande 4111 1111 1111 1112, horodatage 1792795162036, total 1 234,56 €, ref 2026-10-23'
    expect(redactText(text, 'standard')).toEqual({ text, masked: 0 })
  })

  it('ne prend pas pour une carte un nombre au Luhn valide mais sans préfixe de carte', () => {
    const text = 'horodatage 1792795162032 en millisecondes'
    expect(redactText(text, 'standard')).toEqual({ text, masked: 0 })
  })

  it('ne prend pas pour un téléphone un nombre international trop court ou trop long', () => {
    const text = 'versions +12 34 56 et séquence +33 1234 5678 9012 3456'
    expect(redactText(text, 'standard')).toEqual({ text, masked: 0 })
  })

  it('masque les secrets de type clé, jeton porteur et JWT', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    const input = `clé sk-nexora-abcdefghijklmnopqrstuvwxyz0123456789ABCD, en-tête Bearer abc.def-123_456, jeton ${jwt}`
    const result = redactText(input, 'standard')
    expect(result.text).toBe('clé [SECRET], en-tête [SECRET], jeton [SECRET]')
    expect(result.masked).toBe(3)
  })

  it('compte chaque motif masqué', () => {
    const result = redactText('a@b.fr et c@d.fr, téléphone 0612345678', 'standard')
    expect(result.masked).toBe(3)
  })

  it('ne touche à rien en mode « none »', () => {
    const text = 'a@b.fr FR76 3000 6000 0112 3456 7890 189'
    expect(redactText(text, 'none')).toEqual({ text, masked: 0 })
  })

  it('masque comme en mode standard en mode « strict » (le contenu y est de toute façon retiré plus haut)', () => {
    expect(redactText('a@b.fr', 'strict').text).toBe('[E-MAIL]')
  })

  it('laisse inchangés le texte vide et ce qui n’est pas du texte', () => {
    expect(redactText('', 'standard')).toEqual({ text: '', masked: 0 })
    expect(redactText(undefined as unknown as string, 'standard')).toEqual({
      text: undefined,
      masked: 0,
    })
  })

  it('traite 200 Ko sans motif en moins de 100 ms', () => {
    const text = `${'Bonjour, voici un long texte sans donnée personnelle. '.repeat(4000)}`
    const started = performance.now()
    const result = redactText(text, 'standard')
    expect(performance.now() - started).toBeLessThan(100)
    expect(result.masked).toBe(0)
  })

  it('traite 200 Ko de chiffres et d’espaces en moins de 200 ms', () => {
    const text = '1234 5678 '.repeat(20_000)
    const started = performance.now()
    redactText(text, 'standard')
    expect(performance.now() - started).toBeLessThan(200)
  })
})

describe('redactValue', () => {
  it('parcourt objets et tableaux sans modifier l’original', () => {
    const original = { messages: [{ content: 'écris à a@b.fr' }], n: 3, ok: true, none: null }
    const result = redactValue(original, 'standard')
    expect(result.value).toEqual({
      messages: [{ content: 'écris à [E-MAIL]' }],
      n: 3,
      ok: true,
      none: null,
    })
    expect(result.masked).toBe(1)
    expect(original.messages[0].content).toBe('écris à a@b.fr')
  })

  it.each(['password', 'authorization', 'apiKey', 'api_key', 'clientSecret', 'accessToken'])(
    'masque la valeur de la clé « %s » quel que soit son contenu',
    (key) => {
      const result = redactValue({ [key]: 'valeur banale' }, 'standard')
      expect(result.value).toEqual({ [key]: '[SECRET]' })
      expect(result.masked).toBe(1)
    }
  )

  it('ne masque pas par nom de clé en mode « none »', () => {
    expect(redactValue({ password: 'x' }, 'none')).toEqual({ value: { password: 'x' }, masked: 0 })
  })

  it('supporte les structures circulaires sans boucler', () => {
    const loop: Record<string, unknown> = { text: 'a@b.fr' }
    loop.self = loop
    const result = redactValue(loop, 'standard')
    expect((result.value as { text: string }).text).toBe('[E-MAIL]')
  })
})
