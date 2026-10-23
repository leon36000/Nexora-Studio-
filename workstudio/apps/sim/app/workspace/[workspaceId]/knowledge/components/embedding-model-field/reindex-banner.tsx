'use client'

import { useEffect, useRef } from 'react'
import { ReindexProgress } from '@/app/workspace/[workspaceId]/knowledge/components/embedding-model-field/reindex-progress'
import { useKnowledgeReindex } from '@/hooks/queries/kb/reindex'

interface ReindexBannerProps {
  knowledgeBaseId: string
  /** Called once a running reindex has switched the base to its new model. */
  onCompleted: () => void
}

/** The reindex of a base, shown above its documents while it runs or after it failed. */
export function ReindexBanner({ knowledgeBaseId, onCompleted }: ReindexBannerProps) {
  const { data } = useKnowledgeReindex(knowledgeBaseId)
  const reindex = data?.reindex ?? null
  const status = reindex?.status
  const previousStatusRef = useRef(status)
  useEffect(() => {
    if (previousStatusRef.current === 'running' && status === 'completed') onCompleted()
    previousStatusRef.current = status
  }, [status, onCompleted])

  if (!reindex || reindex.status === 'completed') return null
  return (
    <div className='mx-4 my-2 rounded-lg border border-[var(--border)] px-3 py-2'>
      <ReindexProgress reindex={reindex} />
    </div>
  )
}
