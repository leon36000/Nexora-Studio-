'use client'

import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { Checkbox, Chip, ChipModalField, cn, Label, Tooltip, Wizard } from '@sim/emcn'
import { Check, ChevronRight, CircleInfo } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'
import { SlackAppManifest } from '@/components/integrations/slack-app-manifest'
import { buildSlackAppCreationUrl, getSlackAppNameError } from '@/lib/integrations/slack-manifest'
import { useSubBlockValue } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel/components/editor/components/sub-block/hooks/use-sub-block-value'
import { useWebhookManagement } from '@/hooks/use-webhook-management'
import { useWorkflowRegistry } from '@/stores/workflows/registry/store'
import { useSubBlockStore } from '@/stores/workflows/subblock/store'
import {
  buildSlackManifest,
  SLACK_CAPABILITIES,
  type SlackCapability,
  type SlackCapabilityGroup,
} from '@/triggers/slack/capabilities'

const DEFAULT_APP_NAME = 'Nexora Workflow Bot'

const GROUP_ORDER: readonly SlackCapabilityGroup[] = ['trigger', 'action'] as const

const MODAL_HEIGHT_CLASS = 'h-[580px]'

interface SlackSetupWizardProps {
  blockId: string
  isPreview?: boolean
  disabled?: boolean
}

/**
 * Slack app setup wizard sub-block.
 *
 * @remarks
 * The panel renders a single launcher button. The wizard lives in a modal
 * with a fixed-height body so navigating between steps doesn't resize the
 * dialog. Credentials are written directly into the sibling `signingSecret`
 * and `botToken` sub-blocks via the shared sub-block store, so those fields
 * in the panel are populated by the time the user clicks Done.
 */
export function SlackSetupWizard({
  blockId,
  isPreview = false,
  disabled = false,
}: SlackSetupWizardProps) {
  const t = useTranslations('editor.subBlock.slackSetupWizard')
  const [open, setOpen] = useState<boolean>(false)
  const launcherDisabled = isPreview || disabled

  return (
    <>
      <Chip
        fullWidth
        onClick={() => setOpen(true)}
        disabled={launcherDisabled}
        rightIcon={ChevronRight}
      >
        {t('launcher')}
      </Chip>

      <WizardModal
        blockId={blockId}
        open={open}
        onOpenChange={setOpen}
        isPreview={isPreview}
        disabled={disabled}
      />
    </>
  )
}

interface WizardModalProps {
  blockId: string
  open: boolean
  onOpenChange: (next: boolean) => void
  isPreview: boolean
  disabled: boolean
}

function WizardModal({ blockId, open, onOpenChange, isPreview, disabled }: WizardModalProps) {
  const t = useTranslations('editor.subBlock.slackSetupWizard')
  const [step, setStep] = useState<number>(0)

  const { webhookUrl, isLoading } = useWebhookManagement({
    blockId,
    triggerId: 'slack_webhook',
    useWebhookUrl: true,
    isPreview,
  })

  const [appName, setAppName] = useSubBlockValue<string>(blockId, 'botDisplayName')
  const [signingSecret, setSigningSecret] = useSubBlockValue<string>(blockId, 'signingSecret')
  const [botToken, setBotToken] = useSubBlockValue<string>(blockId, 'botToken')
  const selected = useCapabilitySelection(blockId)

  const displayAppName = appName ?? DEFAULT_APP_NAME
  const nameError = getSlackAppNameError(displayAppName.trim() || DEFAULT_APP_NAME)
  const effectiveWebhookUrl = !isLoading && webhookUrl ? webhookUrl : null
  const canCopy = effectiveWebhookUrl !== null
  const controlsDisabled = isPreview || disabled

  const manifestJson = useMemo(() => {
    const manifest = buildSlackManifest(selected, {
      appName: displayAppName.trim() || DEFAULT_APP_NAME,
      webhookUrl: effectiveWebhookUrl,
    })
    return JSON.stringify(manifest)
  }, [selected, displayAppName, effectiveWebhookUrl])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setStep(0)
      onOpenChange(next)
    },
    [onOpenChange]
  )

  return (
    <Wizard
      open={open}
      onOpenChange={handleOpenChange}
      currentStep={step}
      onStepChange={setStep}
      size='lg'
      height={MODAL_HEIGHT_CLASS}
      backLabel={t('wizard.back')}
      nextLabel={t('wizard.next')}
      doneLabel={t('wizard.done')}
      description={t('wizard.description')}
    >
      <Wizard.Step title={t('steps.configure')} canAdvance={!nameError}>
        <StepConfigure
          blockId={blockId}
          appName={displayAppName}
          nameError={nameError}
          onAppNameChange={(v) => {
            if (!controlsDisabled) setAppName(v)
          }}
          selected={selected}
          disabled={controlsDisabled}
        />
      </Wizard.Step>
      <Wizard.Step title={t('steps.create')} canAdvance={canCopy}>
        <StepCreate manifestJson={manifestJson} canCopy={canCopy} isLoading={isLoading} />
      </Wizard.Step>
      <Wizard.Step title={t('steps.token')} canAdvance={Boolean(botToken?.trim())}>
        <StepToken
          value={botToken ?? ''}
          onChange={(v) => {
            if (!controlsDisabled) setBotToken(v)
          }}
          disabled={controlsDisabled}
        />
      </Wizard.Step>
      <Wizard.Step title={t('steps.secret')} canAdvance={Boolean(signingSecret?.trim())}>
        <StepSecret
          value={signingSecret ?? ''}
          onChange={(v) => {
            if (!controlsDisabled) setSigningSecret(v)
          }}
          disabled={controlsDisabled}
        />
      </Wizard.Step>
      <Wizard.Step title={t('steps.done')}>
        <StepDone hasSigningSecret={Boolean(signingSecret)} hasBotToken={Boolean(botToken)} />
      </Wizard.Step>
    </Wizard>
  )
}

interface SubStepListProps {
  children: ReactNode
}

function SubStepList({ children }: SubStepListProps) {
  return <ol className='space-y-2.5'>{children}</ol>
}

interface SubStepProps {
  n: number
  children: ReactNode
}

function SubStep({ n, children }: SubStepProps) {
  return (
    <li className='flex gap-2.5'>
      <span className='mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-5)] text-[var(--text-secondary)] text-xs tabular-nums'>
        {n}
      </span>
      <div className='flex-1 text-[var(--text-secondary)] text-sm leading-relaxed'>{children}</div>
    </li>
  )
}

interface StepConfigureProps {
  blockId: string
  appName: string
  nameError: string | null
  onAppNameChange: (next: string) => void
  selected: ReadonlySet<string>
  disabled: boolean
}

function StepConfigure({
  blockId,
  appName,
  nameError,
  onAppNameChange,
  selected,
  disabled,
}: StepConfigureProps) {
  const t = useTranslations('editor.subBlock.slackSetupWizard')
  return (
    <div className='space-y-4'>
      <ChipModalField
        type='input'
        title={t('botName')}
        value={appName}
        onChange={onAppNameChange}
        disabled={disabled}
        placeholder={DEFAULT_APP_NAME}
        error={nameError}
      />
      <div className='grid grid-cols-2 gap-x-4 gap-y-4'>
        {GROUP_ORDER.map((group) => {
          const items = SLACK_CAPABILITIES.filter((c) => c.group === group)
          if (items.length === 0) return null
          return (
            <CapabilityGroup
              key={group}
              blockId={blockId}
              label={t(`groups.${group}`)}
              capabilities={items}
              selected={selected}
              disabled={disabled}
            />
          )
        })}
      </div>
    </div>
  )
}

interface StepCreateProps {
  manifestJson: string
  canCopy: boolean
  isLoading: boolean
}

function StepCreate({ manifestJson, canCopy, isLoading }: StepCreateProps) {
  const t = useTranslations('editor.subBlock.slackSetupWizard')
  return (
    <div className='space-y-4'>
      <SubStepList>
        <SubStep n={1}>
          <div>{t('create.openSlack')}</div>
          <div className='mt-2'>
            <SlackAppManifest
              manifest={manifestJson}
              createAppUrl={buildSlackAppCreationUrl(manifestJson)}
              disabled={!canCopy}
            />
          </div>
          {!canCopy && (
            <p role='status' className='mt-2 text-[var(--text-secondary)] text-sm'>
              {isLoading ? t('create.loadingWebhook') : t('create.webhookUnavailable')}
            </p>
          )}
        </SubStep>
        <SubStep n={2}>
          {t.rich('create.selectWorkspace', { strong: (chunks) => <strong>{chunks}</strong> })}
        </SubStep>
      </SubStepList>
    </div>
  )
}

interface StepSecretProps {
  value: string
  onChange: (next: string) => void
  disabled: boolean
}

function StepSecret({ value, onChange, disabled }: StepSecretProps) {
  const t = useTranslations('editor.subBlock.slackSetupWizard')
  return (
    <div className='space-y-4'>
      <SubStepList>
        <SubStep n={1}>
          {t.rich('secret.openBasicInfo', { strong: (chunks) => <strong>{chunks}</strong> })}
        </SubStep>
        <SubStep n={2}>
          {t.rich('secret.findSecret', { strong: (chunks) => <strong>{chunks}</strong> })}
        </SubStep>
        <SubStep n={3}>{t('pasteBelow')}</SubStep>
      </SubStepList>
      <SecretField
        label={t('signingSecret')}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={t('secret.placeholder')}
      />
    </div>
  )
}

interface StepTokenProps {
  value: string
  onChange: (next: string) => void
  disabled: boolean
}

function StepToken({ value, onChange, disabled }: StepTokenProps) {
  const t = useTranslations('editor.subBlock.slackSetupWizard')
  return (
    <div className='space-y-4'>
      <SubStepList>
        <SubStep n={1}>
          {t.rich('token.install', { strong: (chunks) => <strong>{chunks}</strong> })}
        </SubStep>
        <SubStep n={2}>
          {t.rich('token.copy', {
            strong: (chunks) => <strong>{chunks}</strong>,
            code: (chunks) => <code>{chunks}</code>,
          })}
        </SubStep>
        <SubStep n={3}>{t('pasteBelow')}</SubStep>
      </SubStepList>
      <SecretField
        label={t('botToken')}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder='xoxb-...'
      />
    </div>
  )
}

interface SecretFieldProps {
  label: string
  value: string
  onChange: (next: string) => void
  disabled: boolean
  placeholder?: string
}

function SecretField({ label, value, onChange, disabled, placeholder }: SecretFieldProps) {
  return (
    <ChipModalField
      type='input'
      inputType='password'
      title={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete='off'
    />
  )
}

interface StepDoneProps {
  hasSigningSecret: boolean
  hasBotToken: boolean
}

function StepDone({ hasSigningSecret, hasBotToken }: StepDoneProps) {
  const t = useTranslations('editor.subBlock.slackSetupWizard')
  return (
    <div className='space-y-4'>
      <p className='text-[var(--text-secondary)] text-sm leading-relaxed'>
        {t('done.instructions')}
      </p>
      <div className='flex flex-col gap-2'>
        <StatusRow label={t('signingSecret')} ok={hasSigningSecret} />
        <StatusRow label={t('botToken')} ok={hasBotToken} />
      </div>
    </div>
  )
}

interface StatusRowProps {
  label: string
  ok: boolean
}

function StatusRow({ label, ok }: StatusRowProps) {
  const t = useTranslations('editor.subBlock.slackSetupWizard')
  return (
    <span className='flex items-center gap-2'>
      <Check
        className={cn(
          'size-[14px]',
          ok ? 'text-[var(--text-success)]' : 'text-[var(--text-muted)]'
        )}
      />
      <span>
        {label}
        {!ok && <span className='ml-1 text-[var(--text-muted)]'>{t('done.notSaved')}</span>}
      </span>
    </span>
  )
}

interface CapabilityGroupProps {
  blockId: string
  label: string
  capabilities: readonly SlackCapability[]
  selected: ReadonlySet<string>
  disabled: boolean
}

function CapabilityGroup({
  blockId,
  label,
  capabilities,
  selected,
  disabled,
}: CapabilityGroupProps) {
  return (
    <div className='space-y-2'>
      <div className='text-[var(--text-muted)] text-xs uppercase tracking-wide'>{label}</div>
      <div className='flex flex-col gap-y-2.5'>
        {capabilities.map((c) => (
          <CapabilityRow
            key={c.id}
            blockId={blockId}
            capability={c}
            checked={selected.has(c.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

interface CapabilityRowProps {
  blockId: string
  capability: SlackCapability
  checked: boolean
  disabled: boolean
}

function CapabilityRow({ blockId, capability, checked, disabled }: CapabilityRowProps) {
  const [, setValue] = useSubBlockValue<boolean>(blockId, capability.id)
  const id = `${blockId}-wizard-${capability.id}`

  const handleChange = useCallback(
    (next: boolean) => {
      if (disabled) return
      setValue(next)
    },
    [disabled, setValue]
  )

  return (
    <div className='flex items-center gap-1.5'>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => handleChange(v === true)}
        disabled={disabled}
      />
      <Label
        htmlFor={id}
        className='cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-60'
      >
        {capability.label}
      </Label>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <CircleInfo className='size-[14px] cursor-default text-[var(--text-muted)]' />
        </Tooltip.Trigger>
        <Tooltip.Content side='top' align='start' className='max-w-xs'>
          <p>{capability.description}</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  )
}

/**
 * Builds the set of enabled capability ids by reading each capability's
 * individual sub-block value in a single shallow-compared store selector.
 * A `null`/`undefined` store value falls back to the capability's
 * `defaultChecked` so untouched configs still reflect the defaults.
 */
function useCapabilitySelection(blockId: string): ReadonlySet<string> {
  const activeWorkflowId = useWorkflowRegistry((s) => s.activeWorkflowId)
  const enabledFlags = useSubBlockStore(
    useShallow((state) => {
      const blockValues = activeWorkflowId
        ? state.workflowValues[activeWorkflowId]?.[blockId]
        : undefined
      return SLACK_CAPABILITIES.map((c) => {
        const raw = blockValues?.[c.id]
        return typeof raw === 'boolean' ? raw : c.defaultChecked
      })
    })
  )
  return useMemo(
    () => new Set(SLACK_CAPABILITIES.filter((_, i) => enabledFlags[i]).map((c) => c.id)),
    [enabledFlags]
  )
}
