/**
 * Failure modes owned here (calls to Nexora API that legitimately last minutes on a CPU server):
 * - the runtime's own fetch gives up after 5 minutes waiting for the response headers, whatever
 *   the caller's abort signal says (observed: documents read for 301 s, 338 s, 344 s);
 * - the longer wait must still be bounded, and must not hide a server that is really down.
 */
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createLongFetch } from '@/lib/nexora/long-fetch.server'

let server: Server | undefined

function serveAfter(delayMs: number): Promise<string> {
  return new Promise((resolve) => {
    server = createServer((_request, response) => {
      setTimeout(() => {
        response.setHeader('Content-Type', 'application/json')
        response.end('{"ok":true}')
      }, delayMs)
    }).listen(0, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${(server?.address() as AddressInfo).port}/`)
    })
  })
}

afterEach(async () => {
  server?.closeAllConnections()
  await new Promise((resolve) => server?.close(resolve))
  server = undefined
})

describe('createLongFetch', () => {
  it('waits for a slow answer when the allowed wait is long enough', async () => {
    const url = await serveAfter(600)
    const response = await createLongFetch(5_000)(url)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('gives up when the answer takes longer than the allowed wait', async () => {
    const url = await serveAfter(1_500)
    await expect(createLongFetch(300)(url)).rejects.toThrow()
  })
})
