import { ErrorBoundary } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/error'

export default function WorkflowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex h-full flex-1 flex-col overflow-hidden'>
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  )
}
