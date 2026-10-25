import { env } from '@/lib/core/config/env'
import { isCodeSandboxConfigured } from '@/lib/execution/remote-sandbox/nexora'
import { isCodeExecutionEnabled } from '@/lib/nexora/code-execution'

interface ToolLike {
  type?: string
  toolId?: string
  params?: Record<string, unknown>
}

function isPythonFunctionTool(tool: ToolLike): boolean {
  return (
    tool.type === 'function' &&
    tool.toolId === 'function_execute' &&
    tool.params?.language === 'python'
  )
}

function isWebSearchTool(tool: ToolLike): boolean {
  return tool.type === 'searxng'
}

/**
 * Nexora edition: built-in tools an agent was configured with but the instance cannot run now are
 * not offered to the model — the Python interpreter while the sandbox service is installed but
 * code execution is off (an administrator can turn it off at any time, with agents already
 * published), and the web search without a SearXNG address. The model then never promises what it
 * cannot do.
 */
export async function dropUnavailableBuiltinTools<T extends ToolLike>(tools: T[]): Promise<T[]> {
  const python = tools.some(isPythonFunctionTool)
  const pythonOffered = !python || !isCodeSandboxConfigured() || (await isCodeExecutionEnabled())
  const searchOffered = Boolean(env.SEARXNG_URL)
  return tools.filter((tool) => {
    if (isPythonFunctionTool(tool)) return pythonOffered
    if (isWebSearchTool(tool)) return searchOffered
    return true
  })
}
