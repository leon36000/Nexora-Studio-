import { redirect } from 'next/navigation'

/**
 * Resolves the workspace landing route: `/home`, the chat composer or, in the Nexora
 * edition (chat disabled), the Nexora home page.
 *
 * Deliberately does no work of its own. Resolving the workflow here would mean
 * a session lookup, an access check, and a query before anything renders — and
 * a slow database would leave the user on a blank page instead of a redirect,
 * since there is nothing to show until all three finish.
 */
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  redirect(`/workspace/${workspaceId}/home`)
}
