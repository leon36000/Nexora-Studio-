import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { WorkspaceRoot } from '@/app/workspace/workspace-root'

interface WorkspaceRootLayoutProps {
  children: React.ReactNode
}

/**
 * Gives the workspace every message namespace, the block catalog included, which the root layout
 * keeps off public pages (see `pageMessages`).
 */
export default async function WorkspaceRootLayout({ children }: WorkspaceRootLayoutProps) {
  const messages = await getMessages()
  return (
    <NextIntlClientProvider messages={messages}>
      <WorkspaceRoot>{children}</WorkspaceRoot>
    </NextIntlClientProvider>
  )
}
