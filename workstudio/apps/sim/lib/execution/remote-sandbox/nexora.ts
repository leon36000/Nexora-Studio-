import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { env } from '@/lib/core/config/env'
import { CodeLanguage } from '@/lib/execution/languages'
import type {
  CreateSandboxOptions,
  RunCommandOptions,
  SandboxCodeResult,
  SandboxCommandResult,
  SandboxDirectoryEntry,
  SandboxHandle,
  SandboxKind,
  SandboxProvider,
} from '@/lib/execution/remote-sandbox/types'

const logger = createLogger('NexoraCodeSandbox')

const CONTROLLER_TIMEOUT_MARGIN_MS = 15_000
const UNREACHABLE =
  "L'interpréteur de code est injoignable. Demandez à un administrateur de vérifier le service « code-sandbox » (nexora code on)."
const BUSY =
  'Exécution de code saturée : tous les bacs à sable sont occupés. Réessayez dans un instant.'
const WORKSPACE_BUSY =
  'Une exécution de code de cet espace de travail est déjà en cours. Attendez sa fin, puis réessayez.'

/** Whether the code sandbox controller (profile « code ») is configured for this instance. */
export function isCodeSandboxConfigured(): boolean {
  return Boolean(env.NEXORA_CODE_SANDBOX_URL && env.NEXORA_CODE_SANDBOX_TOKEN)
}

interface ControllerResponse {
  status: number
  body: unknown
}

async function callController(
  path: string,
  body: Record<string, unknown>,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<ControllerResponse> {
  const base = env.NEXORA_CODE_SANDBOX_URL
  const token = env.NEXORA_CODE_SANDBOX_TOKEN
  if (!base || !token) throw new Error(UNREACHABLE)
  const timeout = AbortSignal.timeout(timeoutMs)
  try {
    // boundary-raw-fetch: the code sandbox controller is a separate internal service
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
    const text = await response.text()
    let parsed: unknown = null
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = null
      }
    }
    return { status: response.status, body: parsed }
  } catch (error) {
    signal?.throwIfAborted()
    logger.warn('Code sandbox controller unreachable', { error: getErrorMessage(error) })
    throw new Error(UNREACHABLE)
  }
}

function describeFailure({ status, body }: ControllerResponse): string {
  if (status === 429) {
    const scope = typeof body === 'object' && body !== null && 'scope' in body ? body.scope : null
    return scope === 'workspace' ? WORKSPACE_BUSY : BUSY
  }
  if (status === 401)
    return "L'interpréteur de code refuse le jeton de WorkStudio (NEXORA_CODE_SANDBOX_TOKEN)."
  const message =
    typeof body === 'object' && body !== null && 'message' in body ? String(body.message) : ''
  return `Interpréteur de code : requête refusée (${status})${message ? ` — ${message}` : ''}.`
}

function expect(response: ControllerResponse, ok: number[]): unknown {
  if (!ok.includes(response.status)) throw new Error(describeFailure(response))
  return response.body
}

function toBase64(content: string | ArrayBuffer): string {
  return typeof content === 'string'
    ? Buffer.from(content, 'utf8').toString('base64')
    : Buffer.from(content).toString('base64')
}

interface RunBody {
  stdout?: string
  stderr?: string
  timedOut?: boolean
  error?: { name?: string; value?: string; traceback?: string }
}

function createHandle(sandboxId: string): SandboxHandle {
  const path = (operation: string) => `/v1/sandboxes/${sandboxId}/${operation}`
  let killed = false
  return {
    sandboxId,
    async runCode(code, options): Promise<SandboxCodeResult> {
      const response = await callController(
        path('run'),
        {
          code,
          envs: options.envs,
          timeoutMs: options.timeoutMs,
          maxOutputBytes: options.maxOutputBytes,
        },
        options.timeoutMs + CONTROLLER_TIMEOUT_MARGIN_MS,
        options.signal
      )
      const run = expect(response, [200]) as RunBody
      return {
        text: '',
        stdout: run.stdout ?? '',
        stderr: run.stderr ?? '',
        ...(run.timedOut ? { timedOut: true } : {}),
        ...(run.error
          ? {
              error: {
                name: run.error.name ?? 'Error',
                value: run.error.value ?? '',
                ...(run.error.traceback ? { traceback: run.error.traceback } : {}),
              },
            }
          : {}),
      }
    },
    async runCommand(_command: string, _options: RunCommandOptions): Promise<SandboxCommandResult> {
      throw new Error(
        "L'interpréteur de code n'exécute que du Python : les commandes shell et les montages par adresse ne sont pas disponibles."
      )
    },
    async getFileSize(filePath) {
      const body = expect(
        await callController(path('files/stat'), { path: filePath }, 30_000),
        [200]
      )
      return Number((body as { size: number }).size)
    },
    async readFile(filePath) {
      const file = await this.readFileWithLimit(filePath, {
        maxBytes: 32 * 1024 * 1024,
        encoding: 'utf8',
      })
      return file.content
    },
    async readFileWithLimit(filePath, options) {
      const response = await callController(
        path('files/read'),
        { path: filePath, maxBytes: options.maxBytes },
        60_000,
        options.signal
      )
      if (response.status === 413) {
        throw new Error(`Le fichier ${filePath} dépasse la limite de ${options.maxBytes} octets.`)
      }
      const body = expect(response, [200]) as { contentBase64: string; byteLength: number }
      const content =
        options.encoding === 'base64'
          ? body.contentBase64
          : Buffer.from(body.contentBase64, 'base64').toString('utf8')
      return { content, byteLength: body.byteLength }
    },
    async writeFile(filePath, content) {
      expect(
        await callController(
          path('files/write'),
          { path: filePath, contentBase64: toBase64(content) },
          60_000
        ),
        [204]
      )
    },
    async removeFile(filePath) {
      expect(await callController(path('files/remove'), { path: filePath }, 30_000), [204])
    },
    async listFiles(directory, options): Promise<SandboxDirectoryEntry[]> {
      const body = expect(
        await callController(
          path('files/list'),
          { path: directory, depth: options?.depth ?? 1 },
          30_000
        ),
        [200]
      ) as { entries: SandboxDirectoryEntry[] }
      return body.entries
    },
    async kill() {
      if (killed) return
      killed = true
      await callController(path('kill'), {}, 15_000).catch(() => undefined)
    },
  }
}

export const nexoraProvider: SandboxProvider = {
  id: 'nexora',
  dependencyStrategy: 'runtime',
  resolveLifetimeMs: (lifetimeMs) => lifetimeMs,
  async create(kind: SandboxKind, options?: CreateSandboxOptions): Promise<SandboxHandle> {
    if (kind !== 'code' || options?.language !== CodeLanguage.Python) {
      throw new Error("L'interpréteur de code n'exécute que du Python.")
    }
    const response = await callController(
      '/v1/sandboxes',
      { lifetimeMs: options.lifetimeMs, workspaceId: options.workspaceId },
      30_000
    )
    const body = expect(response, [201]) as { sandboxId: string }
    return createHandle(body.sandboxId)
  },
}

export interface CodeSandboxHealth {
  reachable: boolean
  limits?: {
    cpus: number
    memoryMb: number
    tmpfsMb: number
    pids: number
    maxRunSeconds: number
    maxSandboxes: number
    runtime: string
  }
}

/** Asks the controller for its limits; an unreachable service is reported, not thrown. */
export async function checkCodeSandboxHealth(): Promise<CodeSandboxHealth> {
  const base = env.NEXORA_CODE_SANDBOX_URL
  if (!base) return { reachable: false }
  try {
    // boundary-raw-fetch: the code sandbox controller is a separate internal service
    const response = await fetch(`${base.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) return { reachable: false }
    const body = (await response.json()) as { limits?: CodeSandboxHealth['limits'] }
    return { reachable: true, limits: body.limits }
  } catch {
    return { reachable: false }
  }
}
