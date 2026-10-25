/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { explainStepError } from '@/lib/nexora/steps/errors'

describe('explainStepError', () => {
  it.each([
    ['Email is missing required fields: To, Subject', 'missingFields'],
    ['API is missing required fields: URL', 'missingFields'],
    ['Budget mensuel de jetons atteint pour cet espace.', 'budget'],
    ['Request failed with status 402', 'budget'],
    ['Model vllm/nexora-xl not found', 'modelNotFound'],
    ['The model `gpt-9` does not exist', 'modelNotFound'],
    ['The operation was aborted due to timeout', 'timeout'],
    ['connect ETIMEDOUT 10.0.0.4:443', 'timeout'],
    ['URL is not allowed: private address 10.0.0.4', 'egress'],
    ['Outbound request blocked by egress policy', 'egress'],
    ['HTTP 401 Unauthorized', 'auth'],
    ['Request failed with status code 403', 'auth'],
    ['Invalid API key provided', 'auth'],
    ['Request failed with status code 404', 'notFound'],
    ['429 Too Many Requests', 'rateLimit'],
    ['Request failed with status code 503', 'server'],
    ['getaddrinfo ENOTFOUND exemple.invalid', 'network'],
    ['fetch failed', 'network'],
    ['Unexpected token < in JSON at position 0', 'json'],
    ["Cannot read properties of undefined (reading 'categorie')", 'reference'],
    ['SMTP connection failed: Invalid login 535', 'smtp'],
  ])('« %s » ⇒ %s', (message, key) => {
    expect(explainStepError(message).key).toBe(key)
  })

  it('extrait le bloc et les champs d’un « champ obligatoire manquant »', () => {
    expect(explainStepError('Email is missing required fields: To, Subject').values).toEqual({
      block: 'Email',
      fields: 'To, Subject',
    })
  })

  it('garde le texte d’origine pour une erreur inconnue, jamais un message vide', () => {
    expect(explainStepError('Quelque chose d’étrange')).toEqual({
      key: 'unknown',
      values: { message: 'Quelque chose d’étrange' },
    })
    expect(explainStepError('   ').key).toBe('unknown')
  })
})
