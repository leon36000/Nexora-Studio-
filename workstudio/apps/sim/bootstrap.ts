/**
 * Container entrypoint. Hydrates `process.env` from the runtime secret before
 * loading the Next.js standalone server, so application modules that read env at
 * import time see the full configuration. See `@sim/runtime-secrets`.
 */
import { createLogger } from '@sim/logger'
import { loadRuntimeSecrets } from '@sim/runtime-secrets'
import { distrustCompromisedRoots } from '@sim/security/tls-trust'
import { getErrorMessage } from '@sim/utils/errors'
import { loadInstanceSettingsIntoEnv } from '@/lib/nexora/startup-settings'

const tlsTrust = distrustCompromisedRoots()
await loadRuntimeSecrets()
const logger = createLogger('Bootstrap')
if (tlsTrust.unsupported || tlsTrust.error) {
  logger.error('Could not distrust compromised CA roots', tlsTrust)
} else if (tlsTrust.removed.length > 0) {
  logger.info('Distrusted compromised CA roots', { removed: tlsTrust.removed })
}
// Nexora edition: single sign-on, e-mail and sign-up domains saved in Réglages are read once,
// here, because Better Auth and the mailer read their configuration when the server loads.
// Starting without them would drop the sign-in policy (allowed domains, required single sign-on)
// for the life of the process, so a database that cannot be read after a few attempts stops the
// container and Docker starts it again. A secret that no longer decrypts only skips its group.
try {
  const settings = await loadInstanceSettingsIntoEnv()
  if (settings?.applied.length) logger.info('Applied instance settings', settings)
  if (settings?.failed.length) {
    logger.error('Instance settings could not be decrypted; check ENCRYPTION_KEY', settings)
  }
} catch (error) {
  logger.error('Could not read the instance settings; stopping until the database answers', {
    error: getErrorMessage(error),
  })
  process.exit(1)
}
// `server.js` is the Next standalone build artifact, a sibling of this file in
// the image; it does not exist at type-check time, so the specifier is held in a
// variable to keep it out of static module resolution.
const standaloneServer = './server.js'
await import(standaloneServer)
