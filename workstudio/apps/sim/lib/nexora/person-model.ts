import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { resolveGatewayAccess } from '@/lib/nexora/gateway-access'
import { NexoraGatewayError } from '@/lib/nexora/gateway-error'
import { nexoraGatewayUrl } from '@/lib/nexora/gateway-url'

const logger = createLogger('NexoraPersonModel')

/**
 * What the site's gateway says about one person. `defaultModel` is `undefined` when the instance's
 * own model is theirs (no gateway, or an operator account that never signed in through the site),
 * the model their key gives when they came by the site, `null` while it cannot be known.
 */
export interface PersonModel {
  viaSite: boolean
  defaultModel: string | null | undefined
}

/**
 * The model a person's own key makes their default at the site's gateway. A person whose key cannot
 * be read has no model shown: the instance's model would be someone else's.
 */
export async function resolvePersonModel(userId: string | null): Promise<PersonModel> {
  if (!nexoraGatewayUrl() || !userId) return { viaSite: false, defaultModel: undefined }
  try {
    const access = await resolveGatewayAccess({ userId })
    return access
      ? { viaSite: true, defaultModel: access.model }
      : { viaSite: false, defaultModel: undefined }
  } catch (error) {
    if (!(error instanceof NexoraGatewayError)) {
      logger.warn('The gateway model of a person could not be read', {
        error: getErrorMessage(error, 'Unknown error'),
      })
    }
    return { viaSite: true, defaultModel: null }
  }
}
