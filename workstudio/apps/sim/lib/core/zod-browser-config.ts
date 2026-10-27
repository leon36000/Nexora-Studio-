import { z } from 'zod'

/**
 * Zod probes `new Function("")` once to decide whether it may compile validators. Under the strict
 * Content-Security-Policy (no `unsafe-eval`) Firefox reports that caught probe as a console error on every
 * page. In the browser the interpreted path is plenty fast, so skip the probe. Zod reads the setting when a
 * schema is built, so this module is loaded first, from `instrumentation-client.ts`, before any schema exists.
 */
if (typeof window !== 'undefined') z.config({ jitless: true })
