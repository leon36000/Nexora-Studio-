import { Chip } from '@sim/emcn'
import { Plus } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { EmptyState, type EmptyStateProps } from '@/components/empty-state/empty-state'
import { docsUrl } from '@/lib/branding/docs-url'
import { EmptyStateDocsLink } from '@/app/workspace/[workspaceId]/components/resource/components/resource-empty-state/docs-link'
import { KnowledgeIsoMark } from '@/app/workspace/[workspaceId]/components/resource/components/resource-empty-state/knowledge-iso'

const KNOWLEDGE_DOCS_URL = docsUrl('/knowledgebase')

interface CreateKnowledgeEmptyStateProps {
  /** Opens the create-base modal — the same action the header's primary chip runs. */
  onCreate: () => void
  /** Mirrors the header chip's disabled state: no edit rights on the workspace. */
  createDisabled?: boolean
}

type KnowledgeEmptyStateProps = CreateKnowledgeEmptyStateProps | Omit<EmptyStateProps, 'graphic'>

/** Shared knowledge illustration and actions for empty or unavailable bases. */
export function KnowledgeEmptyState(props: KnowledgeEmptyStateProps) {
  const t = useTranslations('shell.emptyStates.knowledge')
  const content = 'title' in props ? props : undefined
  return (
    <EmptyState
      graphic={<KnowledgeIsoMark />}
      title={content?.title ?? t('title')}
      description={content?.description ?? t('description')}
      action={
        <>
          {'onCreate' in props ? (
            <Chip
              variant='primary'
              onClick={props.onCreate}
              disabled={props.createDisabled}
              leftIcon={Plus}
            >
              {t('action')}
            </Chip>
          ) : (
            content?.action
          )}
          <EmptyStateDocsLink href={KNOWLEDGE_DOCS_URL} />
        </>
      }
    />
  )
}
