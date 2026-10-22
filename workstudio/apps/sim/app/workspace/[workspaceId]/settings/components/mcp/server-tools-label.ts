import type { useTranslations } from 'next-intl'
import type { McpServer } from '@/lib/api/contracts/mcp'

interface NamedTool {
  name: string
}

/** `t` is scoped to `settings.mcp.toolsLabel`. */
export function getServerToolsLabel(
  t: ReturnType<typeof useTranslations>,
  tools: NamedTool[],
  connectionStatus?: McpServer['connectionStatus'],
  lastError?: McpServer['lastError'],
  authType?: McpServer['authType']
): string {
  if (connectionStatus === 'error') {
    return lastError?.trim() || t('unableToConnect')
  }

  if (connectionStatus === 'disconnected') {
    return lastError?.trim() || (authType === 'oauth' ? t('oauthRequired') : t('notConnected'))
  }

  const count = tools.length
  return count > 0
    ? t('countWithNames', { count, names: tools.map((tool) => tool.name).join(', ') })
    : t('count', { count })
}
