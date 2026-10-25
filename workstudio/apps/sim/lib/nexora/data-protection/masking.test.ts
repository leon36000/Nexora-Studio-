import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PersonalDataServiceError } from '@/lib/nexora/data-protection/errors'
import {
  type MaskingDeps,
  PII_POLICY_ENTITIES,
  protectTexts,
  resetProtectionCache,
} from '@/lib/nexora/data-protection/masking'

const IBAN = 'FR76 3000 6000 0112 3456 7890 189'

/** A stand-in for the local service: names it knows become <PERSON>, like the French model would. */
function fakeService(names: string[] = ['Marie Dupont']) {
  return vi.fn(async (texts: string[]) =>
    texts.map((text) => names.reduce((masked, name) => masked.replaceAll(name, '<PERSON>'), text))
  )
}

function deps(maskWithService: MaskingDeps['maskWithService'] | null): MaskingDeps {
  return {
    serviceConfigured: () => maskWithService !== null,
    maskWithService: maskWithService ?? (async () => []),
  }
}

describe('protectTexts without the local service (patterns only)', () => {
  beforeEach(() => resetProtectionCache())

  it('masks an IBAN, an e-mail, a phone number and a card, and counts them', async () => {
    const result = await protectTexts(
      [
        `Mon IBAN est ${IBAN}, écrivez à marie@exemple.fr ou au 06 12 34 56 78. Carte 4111 1111 1111 1111.`,
      ],
      deps(null)
    )
    expect(result.texts[0]).toBe(
      'Mon IBAN est [IBAN], écrivez à [E-MAIL] ou au [TÉLÉPHONE]. Carte [CARTE].'
    )
    expect(result.found).toEqual({
      IBAN_CODE: 1,
      EMAIL_ADDRESS: 1,
      PHONE_NUMBER: 1,
      CREDIT_CARD: 1,
    })
  })

  it('counts a secret too, so a refusal can name it', async () => {
    const result = await protectTexts(['Authorization: Bearer abcdefghijklmnop12345'], deps(null))
    expect(result.found).toEqual({ SECRET: 1 })
  })

  it('leaves a sentence with places, dates and amounts alone', async () => {
    const text = 'Rendez-vous à Paris le 12 mars 2026 pour 1 000,50 € HT, facture 2026 10 25 0001.'
    const result = await protectTexts([text], deps(null))
    expect(result.texts).toEqual([text])
    expect(result.found).toEqual({})
  })

  it('does not take an IBAN with a wrong check digit for one', async () => {
    const text = 'Référence FR76 3000 6000 0112 3456 7890 180'
    expect((await protectTexts([text], deps(null))).found).toEqual({})
  })

  it('does not count a placeholder that was already in the text', async () => {
    const result = await protectTexts(['Le modèle écrit <PERSON> et [IBAN] tout seul.'], deps(null))
    expect(result.found).toEqual({})
  })

  it('keeps the order and the length of what it is given, empty strings included', async () => {
    const result = await protectTexts(['', `a ${IBAN}`, ''], deps(null))
    expect(result.texts).toEqual(['', 'a [IBAN]', ''])
  })
})

describe('protectTexts with the local service', () => {
  beforeEach(() => resetProtectionCache())

  it('masks names on top of the patterns and counts them', async () => {
    const service = fakeService()
    const result = await protectTexts(
      [`Bonjour, je suis Marie Dupont, IBAN ${IBAN}.`],
      deps(service)
    )
    expect(result.texts[0]).toBe('Bonjour, je suis <PERSON>, IBAN [IBAN].')
    expect(result.found).toEqual({ IBAN_CODE: 1, PERSON: 1 })
  })

  it('hands the service the text as it was written: a [E-MAIL] mark beside a name makes it see a person in the mark', async () => {
    const service = fakeService()
    await protectTexts([`Mon IBAN ${IBAN} et marie@exemple.fr`], deps(service))
    expect(service).toHaveBeenCalledTimes(1)
    expect(service.mock.calls[0][0]).toEqual([`Mon IBAN ${IBAN} et marie@exemple.fr`])
  })

  it('still masks with the patterns what the service does not know, such as a key, and counts it', async () => {
    const result = await protectTexts(
      ['Marie Dupont a envoyé Bearer abcdefghijklmnop12345'],
      deps(fakeService())
    )
    expect(result.texts[0]).toBe('<PERSON> a envoyé [SECRET]')
    expect(result.found).toEqual({ PERSON: 1, SECRET: 1 })
  })

  it('counts what the service masked itself (an IBAN it recognizes) once, not twice', async () => {
    const service = vi.fn(async (texts: string[]) =>
      texts.map((text) => text.replace(IBAN, '<IBAN_CODE>'))
    )
    const result = await protectTexts([`IBAN ${IBAN}`], deps(service))
    expect(result.texts[0]).toBe('IBAN <IBAN_CODE>')
    expect(result.found).toEqual({ IBAN_CODE: 1 })
  })

  it('asks the service only for the texts that are not empty, once for all of them', async () => {
    const service = fakeService()
    await protectTexts(['', 'Marie Dupont', 'Bonjour'], deps(service))
    expect(service).toHaveBeenCalledTimes(1)
    expect(service.mock.calls[0][0]).toEqual(['Marie Dupont', 'Bonjour'])
  })

  it('analyses a text it has already seen only once, however many turns resend it', async () => {
    const service = fakeService()
    const first = await protectTexts(['Marie Dupont a écrit.'], deps(service))
    const second = await protectTexts(['Marie Dupont a écrit.', 'Nouvelle question'], deps(service))
    expect(service).toHaveBeenCalledTimes(2)
    expect(service.mock.calls[1][0]).toEqual(['Nouvelle question'])
    expect(second.texts[0]).toBe(first.texts[0])
    expect(second.found).toEqual({ PERSON: 1 })
  })

  it('does not call the service when there is nothing to send it', async () => {
    const service = fakeService()
    await protectTexts([], deps(service))
    await protectTexts(['', ''], deps(service))
    expect(service).not.toHaveBeenCalled()
  })

  it('fails with a 503 error rather than let the text through when the service does not answer', async () => {
    const down = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    await expect(protectTexts(['Marie Dupont'], deps(down))).rejects.toBeInstanceOf(
      PersonalDataServiceError
    )
  })

  it('asks for the entities the policy covers, not places or dates', () => {
    expect([...PII_POLICY_ENTITIES]).toEqual([
      'PERSON',
      'EMAIL_ADDRESS',
      'PHONE_NUMBER',
      'IBAN_CODE',
      'CREDIT_CARD',
      'IP_ADDRESS',
      'FR_NIR',
    ])
  })
})
