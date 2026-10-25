/**
 * @vitest-environment node
 */
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { CodeLanguage } from '@/lib/execution/languages'
import { nexoraProvider } from '@/lib/execution/remote-sandbox/nexora'

interface Recorded {
  path: string
  body: Record<string, unknown>
  authorization: string | undefined
}

let server: Server
let calls: Recorded[]
let respond: (path: string, body: Record<string, unknown>) => { status: number; json?: unknown }

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString()
  return raw ? JSON.parse(raw) : {}
}

beforeAll(async () => {
  server = createServer(async (request, response) => {
    const body = await readBody(request)
    const path = request.url ?? ''
    calls.push({ path, body, authorization: request.headers.authorization })
    const { status, json } = respond(path, body)
    response.statusCode = status
    if (json !== undefined) {
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify(json))
    } else response.end()
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
})

beforeEach(() => {
  calls = []
  respond = (path) => {
    if (path === '/v1/sandboxes')
      return { status: 201, json: { sandboxId: 'abc', expiresInMs: 60_000 } }
    return { status: 204 }
  }
  const { port } = server.address() as AddressInfo
  setEnv({
    NEXORA_CODE_SANDBOX_URL: `http://127.0.0.1:${port}`,
    NEXORA_CODE_SANDBOX_TOKEN: 'secret-token-secret-token-secret-token',
  })
})

afterEach(() => {
  resetEnvMock()
})

describe('nexoraProvider', () => {
  it('only creates Python code sandboxes', async () => {
    await expect(nexoraProvider.create('shell', { language: CodeLanguage.Shell })).rejects.toThrow(
      /Python/
    )
    await expect(
      nexoraProvider.create('code', { language: CodeLanguage.JavaScript })
    ).rejects.toThrow(/Python/)
    await expect(nexoraProvider.create('mothership', {})).rejects.toThrow(/Python/)
    expect(calls).toHaveLength(0)
  })

  it('creates a sandbox with the token and the requested lifetime', async () => {
    const handle = await nexoraProvider.create('code', {
      language: CodeLanguage.Python,
      lifetimeMs: 90_000,
    })
    expect(handle.sandboxId).toBe('abc')
    expect(calls[0].path).toBe('/v1/sandboxes')
    expect(calls[0].body).toEqual({ lifetimeMs: 90_000 })
    expect(calls[0].authorization).toBe('Bearer secret-token-secret-token-secret-token')
  })

  it('maps a finished run to stdout, stderr and no error', async () => {
    respond = (path) =>
      path === '/v1/sandboxes'
        ? { status: 201, json: { sandboxId: 'abc' } }
        : { status: 200, json: { stdout: 'ok\n', stderr: 'warn', exitCode: 0, timedOut: false } }
    const handle = await nexoraProvider.create('code', { language: CodeLanguage.Python })
    const result = await handle.runCode('print("ok")', { timeoutMs: 5000, envs: { SIM_X: '1' } })
    expect(result).toMatchObject({ stdout: 'ok\n', stderr: 'warn', text: '' })
    expect(result.error).toBeUndefined()
    expect(calls[1].path).toBe('/v1/sandboxes/abc/run')
    expect(calls[1].body).toMatchObject({
      code: 'print("ok")',
      timeoutMs: 5000,
      envs: { SIM_X: '1' },
    })
  })

  it('reports a Python error and a timeout', async () => {
    respond = (path) =>
      path === '/v1/sandboxes'
        ? { status: 201, json: { sandboxId: 'abc' } }
        : {
            status: 200,
            json: {
              stdout: '',
              stderr: '',
              exitCode: 1,
              timedOut: false,
              error: {
                name: 'ZeroDivisionError',
                value: 'division by zero',
                traceback: 'Traceback…',
              },
            },
          }
    const handle = await nexoraProvider.create('code', { language: CodeLanguage.Python })
    const failed = await handle.runCode('1/0', { timeoutMs: 5000 })
    expect(failed.error).toEqual({
      name: 'ZeroDivisionError',
      value: 'division by zero',
      traceback: 'Traceback…',
    })
    respond = () => ({
      status: 200,
      json: { stdout: '', stderr: '', exitCode: -1, timedOut: true },
    })
    expect((await handle.runCode('while True: pass', { timeoutMs: 1000 })).timedOut).toBe(true)
  })

  it('explains a saturated controller in French', async () => {
    respond = () => ({ status: 429, json: { error: 'busy' } })
    await expect(nexoraProvider.create('code', { language: CodeLanguage.Python })).rejects.toThrow(
      /saturée/
    )
  })

  it('explains an unreachable controller', async () => {
    setEnv({ NEXORA_CODE_SANDBOX_URL: 'http://127.0.0.1:1' })
    await expect(nexoraProvider.create('code', { language: CodeLanguage.Python })).rejects.toThrow(
      /interpréteur de code/
    )
  })

  it('writes bytes as base64 and reads them back within the limit', async () => {
    const handle = await nexoraProvider.create('code', { language: CodeLanguage.Python })
    await handle.writeFile('/tmp/sim/inputs/a.bin', new Uint8Array([0, 1, 2]).buffer)
    expect(calls[1].path).toBe('/v1/sandboxes/abc/files/write')
    expect(calls[1].body).toEqual({ path: '/tmp/sim/inputs/a.bin', contentBase64: 'AAEC' })

    respond = () => ({ status: 200, json: { contentBase64: 'AAEC', byteLength: 3 } })
    const file = await handle.readFileWithLimit('/tmp/sim/outputs/a.bin', {
      maxBytes: 10,
      encoding: 'base64',
    })
    expect(file).toEqual({ content: 'AAEC', byteLength: 3 })
    expect(calls.at(-1)?.body).toEqual({ path: '/tmp/sim/outputs/a.bin', maxBytes: 10 })
  })

  it('refuses a file over the limit', async () => {
    const handle = await nexoraProvider.create('code', { language: CodeLanguage.Python })
    respond = () => ({ status: 413, json: { error: 'too_large' } })
    await expect(
      handle.readFileWithLimit('/tmp/sim/outputs/big', { maxBytes: 5, encoding: 'utf8' })
    ).rejects.toThrow(/5/)
  })

  it('lists files and gives their size', async () => {
    const handle = await nexoraProvider.create('code', { language: CodeLanguage.Python })
    respond = (path) =>
      path.endsWith('/files/list')
        ? {
            status: 200,
            json: {
              entries: [
                { path: '/tmp/sim/outputs/g.png', relativePath: 'g.png', kind: 'file', size: 42 },
              ],
            },
          }
        : { status: 200, json: { size: 42 } }
    expect(await handle.listFiles('/tmp/sim/outputs', { depth: 12 })).toEqual([
      { path: '/tmp/sim/outputs/g.png', relativePath: 'g.png', kind: 'file', size: 42 },
    ])
    expect(await handle.getFileSize('/tmp/sim/outputs/g.png')).toBe(42)
  })

  it('cannot run shell commands (no network, no URL mounts)', async () => {
    const handle = await nexoraProvider.create('code', { language: CodeLanguage.Python })
    await expect(handle.runCommand('curl x', { timeoutMs: 1000 })).rejects.toThrow(/Python/)
  })

  it('kills a sandbox once, and ignores a sandbox already gone', async () => {
    const handle = await nexoraProvider.create('code', { language: CodeLanguage.Python })
    respond = () => ({ status: 404, json: { error: 'not_found' } })
    await expect(handle.kill()).resolves.toBeUndefined()
    await expect(handle.kill()).resolves.toBeUndefined()
    expect(calls.filter((call) => call.path.endsWith('/kill'))).toHaveLength(1)
  })
})
