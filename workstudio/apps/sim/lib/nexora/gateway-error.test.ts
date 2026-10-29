import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { afterEach, describe, expect, it } from 'vitest'
import { NexoraGatewayError } from '@/lib/nexora/gateway-error'

afterEach(() => {
  resetEnvMock()
})

describe('NexoraGatewayError', () => {
  it('asks for a WorkStudio subscription and points to the wallet page of the site', () => {
    setEnv({ NEXT_PUBLIC_NEXORA_SITE_URL: 'https://nexora.example' })
    const message = new NexoraGatewayError('subscription-required').message
    expect(message).toContain(
      'Un abonnement WorkStudio est requis pour utiliser les modèles. Choisissez une offre dans votre espace Nexora AI.'
    )
    expect(message).toContain('https://nexora.example/compte/facturation')
  })

  it('still asks for the subscription without a site address', () => {
    setEnv({ NEXT_PUBLIC_NEXORA_SITE_URL: undefined })
    const message = new NexoraGatewayError('subscription-required').message
    expect(message).toContain('abonnement WorkStudio')
    expect(message).not.toContain('http')
  })
})
