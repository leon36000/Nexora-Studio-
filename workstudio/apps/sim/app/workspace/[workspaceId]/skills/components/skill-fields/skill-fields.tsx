'use client'

import type { ReactNode } from 'react'
import { ChipInput, ChipTextarea, chipFieldSurfaceClass, cn, Tooltip } from '@sim/emcn'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { DetailSection } from '@/app/workspace/[workspaceId]/components/credential-detail'
import { SKILL_DESCRIPTION_MAX_LENGTH } from '@/app/workspace/[workspaceId]/skills/components/skill-copy'

const RichMarkdownField = dynamic(
  () =>
    import(
      '@/app/workspace/[workspaceId]/files/components/file-viewer/rich-markdown-editor/rich-markdown-field'
    ).then((m) => m.RichMarkdownField),
  {
    ssr: false,
    loading: () => <div className={cn('min-h-[260px]', chipFieldSurfaceClass)} />,
  }
)

export interface SkillFieldErrors {
  name?: string
  description?: string
  content?: string
}

interface SkillFieldsProps {
  name: string
  description: string
  content: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onContentChange: (value: string) => void
  errors: SkillFieldErrors
  /** Remounts the seed-once rich editor when content is set programmatically. */
  contentKey: string | number
  workspaceId: string
  disabled?: boolean
  /**
   * Why the fields are locked (built-in skill, or viewer is not an editor).
   * Renders a tooltip explaining it — a disabled control swallows hover, so each
   * field is wrapped rather than the control itself.
   */
  lockReason?: string | null
  /** Intercepts a full SKILL.md paste into Content. */
  onPasteText?: (text: string) => boolean
}

interface FieldLockTooltipProps {
  reason: string | null | undefined
  children: ReactNode
}

function FieldLockTooltip({ reason, children }: FieldLockTooltipProps) {
  if (!reason) return <>{children}</>
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div>{children}</div>
      </Tooltip.Trigger>
      <Tooltip.Content>{reason}</Tooltip.Content>
    </Tooltip.Root>
  )
}

/**
 * The hint-or-error line under a field. Renders nothing when there is neither,
 * so a field without a message reserves no space.
 */
function FieldMessage({ error, hint }: { error?: string; hint?: string }) {
  const message = error ?? hint
  if (!message) return null
  return (
    <p
      className={cn(
        'mt-[9px] text-caption',
        error ? 'text-[var(--text-error)]' : 'text-[var(--text-muted)]'
      )}
    >
      {message}
    </p>
  )
}

/**
 * The Name / Description / Content trio as the full-page skill surfaces render
 * it — `DetailSection` rows with the error line beneath each field. Shared by
 * the create and detail pages so the copy, sizing, and error treatment cannot
 * drift between them. The canvas modal frames the same fields with
 * `ChipModalField` (required inside a `ChipModalBody`) and shares the same
 * `integrations.skillsPage.fields` messages instead.
 */
export function SkillFields({
  name,
  description,
  content,
  onNameChange,
  onDescriptionChange,
  onContentChange,
  errors,
  contentKey,
  workspaceId,
  disabled = false,
  lockReason,
  onPasteText,
}: SkillFieldsProps) {
  const t = useTranslations('integrations.skillsPage.fields')
  return (
    <>
      <DetailSection title={t('name')}>
        <FieldLockTooltip reason={lockReason}>
          <ChipInput
            id='skill-name'
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder={t('namePlaceholder')}
            autoComplete='off'
            data-lpignore='true'
            disabled={disabled}
            error={!!errors.name}
          />
        </FieldLockTooltip>
        <FieldMessage error={errors.name} hint={disabled ? undefined : t('nameHint')} />
      </DetailSection>

      <DetailSection title={t('description')}>
        <FieldLockTooltip reason={lockReason}>
          <ChipTextarea
            id='skill-description'
            rows={3}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder={t('descriptionPlaceholder')}
            maxLength={SKILL_DESCRIPTION_MAX_LENGTH}
            autoComplete='off'
            data-lpignore='true'
            disabled={disabled}
            error={!!errors.description}
          />
        </FieldLockTooltip>
        <FieldMessage error={errors.description} />
      </DetailSection>

      <DetailSection title={t('content')}>
        <FieldLockTooltip reason={lockReason}>
          <RichMarkdownField
            key={contentKey}
            value={content}
            onChange={onContentChange}
            placeholder={t('contentPlaceholder')}
            minHeight={260}
            disabled={disabled}
            error={!!errors.content}
            workspaceId={workspaceId}
            onPasteText={onPasteText}
          />
        </FieldLockTooltip>
        <FieldMessage error={errors.content} />
      </DetailSection>
    </>
  )
}
