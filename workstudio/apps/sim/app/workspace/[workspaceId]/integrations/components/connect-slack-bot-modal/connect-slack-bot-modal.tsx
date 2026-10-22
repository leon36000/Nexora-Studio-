'use client'

import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Chip,
  ChipDropdown,
  type ChipDropdownOption,
  ChipInput,
  ChipModalField,
  Wizard,
} from '@sim/emcn'
import { Loader, Plus, Trash } from '@sim/emcn/icons'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { generateId } from '@sim/utils/id'
import { useTranslations } from 'next-intl'
import { SlackIcon } from '@/components/icons'
import { SlackAppManifest } from '@/components/integrations/slack-app-manifest'
import { resourceScopeFields, resourceScopeFromOwner } from '@/lib/core/resource-scope'
import { getBaseUrl } from '@/lib/core/utils/urls'
import {
  buildSlackAppCreationUrl,
  getSlackAppNameError,
  SLACK_APP_CREATION_URL_MAX_LENGTH,
} from '@/lib/integrations/slack-manifest'
import { SLACK_CUSTOM_BOT_PROVIDER_ID } from '@/lib/oauth/types'
import {
  useCreateScopedCredential,
  useUpdateScopedCredential,
} from '@/hooks/queries/scoped-credentials'
import {
  buildSlackManifest,
  getSlackManagedUserAuthorizationManifestConfig,
  SLACK_CAPABILITIES,
  SLACK_MANAGED_USER_AUTHORIZATION_CAPABILITY,
  type SlackSlashCommand,
} from '@/triggers/slack/capabilities'
import { buildSlackCustomBotRequestUrl } from '@/triggers/webhook-url'

const logger = createLogger('ConnectSlackBotModal')

const DEFAULT_APP_NAME = 'Nexora Bot'
const DONE_STEP = 4

const CUSTOM_BOT_CAPABILITIES = [
  ...SLACK_CAPABILITIES,
  SLACK_MANAGED_USER_AUTHORIZATION_CAPABILITY,
] as const

const DEFAULT_CAPABILITIES = new Set(
  CUSTOM_BOT_CAPABILITIES.filter((capability) => capability.defaultChecked).map(
    (capability) => capability.id
  )
)

const CAPABILITY_OPTIONS: ChipDropdownOption[] = CUSTOM_BOT_CAPABILITIES.map((capability) => ({
  value: capability.id,
  label: capability.label,
}))

interface SlackSlashCommandDraft extends SlackSlashCommand {
  id: string
}

/** Returns the `integrations.slackBot.errors` message key for invalid slash commands. */
function getSlashCommandsErrorKey(commands: readonly SlackSlashCommandDraft[]): string | null {
  if (commands.some((entry) => !entry.command.trim() || !entry.description.trim())) {
    return 'slashCommandIncomplete'
  }
  if (
    commands.some((entry) => {
      const command = entry.command.trim()
      return !command.startsWith('/') || command.length === 1 || /\s/.test(command)
    })
  ) {
    return 'slashCommandFormat'
  }
  if (commands.some((entry) => entry.command.trim().length > 32)) {
    return 'slashCommandLength'
  }
  const normalizedCommands = commands.map((entry) => entry.command.trim())
  if (new Set(normalizedCommands).size !== normalizedCommands.length) {
    return 'slashCommandUnique'
  }
  return null
}

/** Returns the `integrations.slackBot.errors` message key for an over-long description. */
function getAgentDescriptionErrorKey(description: string): string | null {
  return description.trim().length > 300 ? 'descriptionLength' : null
}

interface ConnectSlackBotModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId?: string
  organizationId?: string
  /**
   * When set, the modal reconnects (rotates secrets on) this existing credential
   * instead of creating a new one — the id is reused so the Slack ingest URL
   * `/api/webhooks/slack/custom/{id}` stays valid, and saving updates the
   * credential in place.
   */
  credentialId?: string
  /** Existing display name, seeded into the bot-name field on reconnect. */
  initialDisplayName?: string
  /** Existing description, seeded into the description field on reconnect. */
  initialDescription?: string
  /** Called with the credential id after a successful create or reconnect. */
  onCreated?: (credentialId: string) => void
}

/**
 * One-time setup for a reusable custom Slack bot credential — the same guided
 * wizard as the legacy in-block setup, but it persists a scoped credential
 * instead of writing sub-block values. The credential id is pre-generated so the
 * ingest URL `/api/webhooks/slack/custom/{id}` (and the manifest that embeds it)
 * can be shown up front; the credential is created on the final step once the
 * signing secret + bot token are pasted.
 */
export function ConnectSlackBotModal({
  open,
  onOpenChange,
  workspaceId,
  organizationId,
  credentialId: reconnectCredentialId,
  initialDisplayName,
  initialDescription,
  onCreated,
}: ConnectSlackBotModalProps) {
  const t = useTranslations('integrations.slackBot')
  const scope = resourceScopeFromOwner({ workspaceId, organizationId })
  const searchOnly = scope.kind === 'organization'
  const isReconnect = Boolean(reconnectCredentialId)
  const [step, setStep] = useState(0)
  const [credentialId, setCredentialId] = useState(() => reconnectCredentialId ?? generateId())
  const [appName, setAppName] = useState(initialDisplayName ?? '')
  const [appDescription, setAppDescription] = useState(initialDescription ?? '')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(DEFAULT_CAPABILITIES))
  const [slashCommands, setSlashCommands] = useState<SlackSlashCommandDraft[]>([])
  const [signingSecret, setSigningSecret] = useState('')
  const [botToken, setBotToken] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [created, setCreated] = useState(false)

  const createCredential = useCreateScopedCredential()
  const updateCredential = useUpdateScopedCredential()

  useEffect(() => {
    if (open) return
    setStep(0)
    setAppName(initialDisplayName ?? '')
    setAppDescription(initialDescription ?? '')
    setSelected(new Set(DEFAULT_CAPABILITIES))
    setSlashCommands([])
    setSigningSecret('')
    setBotToken('')
    setCreateError(null)
    // Mint a fresh ingest id only after a bot was actually saved, and never when
    // reconnecting (that id belongs to an existing credential + Slack app).
    // Otherwise keep it stable so a user who already pasted this Request URL into
    // their Slack app can reopen and finish creating the credential under the
    // same id — a regenerated id would leave Slack posting to a URL no credential
    // resolves.
    if (created) {
      if (!isReconnect) setCredentialId(generateId())
      setCreated(false)
    }
  }, [open, created, isReconnect, initialDisplayName, initialDescription])

  // Shared server-side derivation: uses the app public base (not
  // window.location.origin) so Slack's servers can reach it.
  const requestUrl = buildSlackCustomBotRequestUrl(credentialId)

  const nameError = isReconnect ? null : getSlackAppNameError(appName)
  const descriptionErrorKey = getAgentDescriptionErrorKey(appDescription)
  const descriptionError = descriptionErrorKey ? t(`errors.${descriptionErrorKey}`) : null
  const slashCommandsErrorKey =
    searchOnly || isReconnect ? null : getSlashCommandsErrorKey(slashCommands)
  const slashCommandsError = slashCommandsErrorKey ? t(`errors.${slashCommandsErrorKey}`) : null
  const manifestConfigurationError = descriptionError ?? slashCommandsError

  const manifestJson = useMemo(() => {
    if (isReconnect || manifestConfigurationError) return ''
    const capabilities = searchOnly ? DEFAULT_CAPABILITIES : selected
    const managedUserAuthorization = capabilities.has(
      SLACK_MANAGED_USER_AUTHORIZATION_CAPABILITY.id
    )
      ? getSlackManagedUserAuthorizationManifestConfig(getBaseUrl())
      : undefined
    const manifest = buildSlackManifest(capabilities, {
      appName: appName.trim() || DEFAULT_APP_NAME,
      webhookUrl: requestUrl,
      description: appDescription,
      slashCommands: (searchOnly ? [] : slashCommands).map(
        ({ command, description, usageHint }) => ({
          command,
          description,
          usageHint,
        })
      ),
      ...(managedUserAuthorization ? { managedUserAuthorization } : {}),
    })
    return JSON.stringify(manifest)
  }, [
    isReconnect,
    manifestConfigurationError,
    selected,
    appName,
    appDescription,
    slashCommands,
    requestUrl,
    searchOnly,
  ])

  const createAppUrl = buildSlackAppCreationUrl(manifestJson)
  const creationUrlError =
    createAppUrl.length > SLACK_APP_CREATION_URL_MAX_LENGTH
      ? t('errors.configurationTooLarge')
      : null

  const capabilityIds = [...selected]
  const setCapabilityIds = (next: string[]) => setSelected(new Set(next))

  const isPending = createCredential.isPending || updateCredential.isPending

  const runCreate = async () => {
    setCreateError(null)
    try {
      if (isReconnect) {
        // Rotate secrets on the existing credential in place — same id, so the
        // Slack app's Request URL and any shares stay intact.
        await updateCredential.mutateAsync({
          ...resourceScopeFields(scope),
          credentialId,
          signingSecret: signingSecret.trim(),
          botToken: botToken.trim(),
          displayName: appName.trim() || undefined,
          description: appDescription.trim() || undefined,
        })
      } else {
        await createCredential.mutateAsync({
          ...resourceScopeFields(scope),
          type: 'service_account',
          providerId: SLACK_CUSTOM_BOT_PROVIDER_ID,
          id: credentialId,
          signingSecret: signingSecret.trim(),
          botToken: botToken.trim(),
          displayName: appName.trim() || undefined,
          description: appDescription.trim() || undefined,
        })
      }
      setCreated(true)
      onCreated?.(credentialId)
    } catch (err: unknown) {
      setCreateError(getErrorMessage(err, t('errors.connectFailed')))
      logger.error('Failed to add custom Slack bot credential', err)
    }
  }

  const handleStepChange = (nextStep: number) => {
    setStep(nextStep)
    if (nextStep === DONE_STEP && step !== DONE_STEP) void runCreate()
  }

  return (
    <Wizard
      open={open}
      onOpenChange={onOpenChange}
      currentStep={step}
      onStepChange={handleStepChange}
      size='lg'
      icon={SlackIcon}
      title={
        searchOnly
          ? t('titles.searchSetup')
          : isReconnect
            ? t('titles.reconnect')
            : t('titles.create')
      }
      doneLabel={t('done.label')}
    >
      {/* Bot name is required so the credential name, the manifest app name, and
          uniqueness all use the user's choice — never the shared Slack team name
          fallback, which collides for a second bot in the same workspace. */}
      <Wizard.Step
        title={searchOnly ? t('steps.nameApp') : t('steps.configure')}
        canAdvance={
          appName.trim().length > 0 &&
          !nameError &&
          !manifestConfigurationError &&
          !creationUrlError
        }
      >
        <StepConfigure
          searchOnly={searchOnly}
          reconnect={isReconnect}
          appName={appName}
          nameError={appName ? nameError : null}
          onAppNameChange={setAppName}
          appDescription={appDescription}
          onAppDescriptionChange={setAppDescription}
          descriptionError={descriptionError}
          slashCommands={slashCommands}
          onSlashCommandsChange={setSlashCommands}
          slashCommandsError={slashCommandsError ?? creationUrlError}
          capabilityIds={capabilityIds}
          onCapabilityIdsChange={setCapabilityIds}
        />
      </Wizard.Step>
      <Wizard.Step title={isReconnect ? t('steps.openApp') : t('steps.createApp')}>
        <StepCreate
          manifestJson={manifestJson}
          createAppUrl={createAppUrl}
          reconnect={isReconnect}
        />
      </Wizard.Step>
      <Wizard.Step title={t('steps.installToken')} canAdvance={botToken.trim().length > 0}>
        <StepToken value={botToken} onChange={setBotToken} reconnect={isReconnect} />
      </Wizard.Step>
      <Wizard.Step title={t('steps.pasteSecret')} canAdvance={signingSecret.trim().length > 0}>
        <StepSecret value={signingSecret} onChange={setSigningSecret} />
      </Wizard.Step>
      <Wizard.Step title={t('steps.allSet')}>
        <StepDone
          searchOnly={searchOnly}
          pending={isPending}
          created={created}
          error={createError}
          onRetry={runCreate}
        />
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
      <div className='min-w-0 flex-1 text-[var(--text-secondary)] text-sm leading-relaxed'>
        {children}
      </div>
    </li>
  )
}

interface StepConfigureProps {
  searchOnly: boolean
  reconnect: boolean
  appName: string
  nameError: string | null
  onAppNameChange: (next: string) => void
  appDescription: string
  onAppDescriptionChange: (next: string) => void
  descriptionError: string | null
  slashCommands: readonly SlackSlashCommandDraft[]
  onSlashCommandsChange: (commands: SlackSlashCommandDraft[]) => void
  slashCommandsError: string | null
  capabilityIds: string[]
  onCapabilityIdsChange: (next: string[]) => void
}
function StepConfigure({
  searchOnly,
  reconnect,
  appName,
  nameError,
  onAppNameChange,
  appDescription,
  onAppDescriptionChange,
  descriptionError,
  slashCommands,
  onSlashCommandsChange,
  slashCommandsError,
  capabilityIds,
  onCapabilityIdsChange,
}: StepConfigureProps) {
  const t = useTranslations('integrations.slackBot')
  const canConfigureApp = !searchOnly && !reconnect
  const allSelected = capabilityIds.length === CUSTOM_BOT_CAPABILITIES.length

  return (
    <>
      <ChipModalField
        type='input'
        title={searchOnly ? t('configure.appName') : t('configure.botName')}
        value={appName}
        onChange={onAppNameChange}
        placeholder={DEFAULT_APP_NAME}
        error={nameError}
      />
      <ChipModalField
        type='input'
        title={t('configure.description')}
        value={appDescription}
        onChange={onAppDescriptionChange}
        placeholder={
          reconnect
            ? t('configure.descriptionPlaceholder')
            : t('configure.descriptionProfilePlaceholder')
        }
        maxLength={140}
        error={descriptionError}
      />
      {canConfigureApp && (
        <ChipModalField
          type='custom'
          title={t('configure.permissions')}
          hint={allSelected ? t('configure.allPermissionsHint') : undefined}
        >
          <ChipDropdown
            multiple
            fullWidth
            value={capabilityIds}
            onChange={onCapabilityIdsChange}
            options={CAPABILITY_OPTIONS}
            allLabel={t('configure.noPermissions')}
            showAllOption={false}
          />
        </ChipModalField>
      )}
      {canConfigureApp && (
        <SlashCommandsEditor
          commands={slashCommands}
          onChange={onSlashCommandsChange}
          error={slashCommandsError}
        />
      )}
    </>
  )
}

interface SlashCommandsEditorProps {
  commands: readonly SlackSlashCommandDraft[]
  onChange: (commands: SlackSlashCommandDraft[]) => void
  error: string | null
}

function SlashCommandsEditor({ commands, onChange, error }: SlashCommandsEditorProps) {
  const t = useTranslations('integrations.slackBot.slashCommands')
  const addCommand = () => {
    onChange([...commands, { id: generateId(), command: '', description: '', usageHint: '' }])
  }
  const updateCommand = (
    id: string,
    field: keyof Pick<SlackSlashCommandDraft, 'command' | 'description' | 'usageHint'>,
    value: string
  ) => {
    onChange(commands.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)))
  }
  const removeCommand = (id: string) => {
    onChange(commands.filter((entry) => entry.id !== id))
  }

  return (
    <ChipModalField type='custom' title={t('title')} error={error}>
      <Chip className='w-fit' leftIcon={Plus} onClick={addCommand} disabled={commands.length >= 50}>
        {t('add')}
      </Chip>
      {commands.length > 0 && (
        <div className='space-y-2'>
          {commands.map((entry, index) => (
            <div
              key={entry.id}
              className='flex items-start gap-2 rounded-lg border border-[var(--border)] p-2'
            >
              <div className='min-w-0 flex-1 space-y-2'>
                <ChipInput
                  value={entry.command}
                  onChange={(event) => updateCommand(entry.id, 'command', event.target.value)}
                  placeholder='/ask-sim'
                  maxLength={32}
                  inputClassName='font-mono'
                  aria-label={t('commandLabel', { index: index + 1 })}
                />
                <ChipInput
                  value={entry.description}
                  onChange={(event) => updateCommand(entry.id, 'description', event.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                  maxLength={2000}
                  aria-label={t('descriptionLabel', { index: index + 1 })}
                />
                <ChipInput
                  value={entry.usageHint ?? ''}
                  onChange={(event) => updateCommand(entry.id, 'usageHint', event.target.value)}
                  placeholder={t('usageHintPlaceholder')}
                  maxLength={1000}
                  aria-label={t('usageHintLabel', { index: index + 1 })}
                />
              </div>
              <Button
                variant='quiet'
                size='icon'
                aria-label={t('removeLabel', { index: index + 1 })}
                onClick={() => removeCommand(entry.id)}
              >
                <Trash className='size-[14px]' />
              </Button>
            </div>
          ))}
        </div>
      )}
    </ChipModalField>
  )
}

interface StepCreateProps {
  manifestJson: string
  createAppUrl: string
  reconnect: boolean
}
function StepCreate({ manifestJson, createAppUrl, reconnect }: StepCreateProps) {
  const t = useTranslations('integrations.slackBot.create')
  if (reconnect) {
    return (
      <SubStepList>
        <SubStep n={1}>
          {t.rich('openExisting', {
            link: (chunks) => (
              <a
                href='https://api.slack.com/apps'
                target='_blank'
                rel='noopener noreferrer'
                className='text-[var(--brand-secondary)] underline underline-offset-2'
              >
                {chunks}
              </a>
            ),
          })}
        </SubStep>
        <SubStep n={2}>{t('keepManifest')}</SubStep>
      </SubStepList>
    )
  }

  return (
    <div className='space-y-4'>
      <SubStepList>
        <SubStep n={1}>
          <div>{t('openWithManifest')}</div>
          <div className='mt-2'>
            <SlackAppManifest manifest={manifestJson} createAppUrl={createAppUrl} />
          </div>
        </SubStep>
        <SubStep n={2}>
          {t.rich('selectWorkspace', { strong: (chunks) => <strong>{chunks}</strong> })}
        </SubStep>
      </SubStepList>
    </div>
  )
}

interface SecretStepProps {
  value: string
  onChange: (next: string) => void
}
function StepSecret({ value, onChange }: SecretStepProps) {
  const t = useTranslations('integrations.slackBot.secret')
  const strong = (chunks: ReactNode) => <strong>{chunks}</strong>
  return (
    <div className='space-y-4'>
      <SubStepList>
        <SubStep n={1}>{t.rich('openBasicInfo', { strong })}</SubStep>
        <SubStep n={2}>{t.rich('findSecret', { strong })}</SubStep>
        <SubStep n={3}>{t('pasteBelow')}</SubStep>
      </SubStepList>
      <SecretField
        label={t('label')}
        value={value}
        onChange={onChange}
        placeholder={t('placeholder')}
      />
    </div>
  )
}

function StepToken({ value, onChange, reconnect }: SecretStepProps & { reconnect: boolean }) {
  const t = useTranslations('integrations.slackBot.token')
  const strong = (chunks: ReactNode) => <strong>{chunks}</strong>
  return (
    <div className='space-y-4'>
      <SubStepList>
        <SubStep n={1}>
          {reconnect
            ? t.rich('openPermissionsReconnect', { strong })
            : t.rich('install', { strong })}
        </SubStep>
        <SubStep n={2}>
          {t.rich('copyToken', { strong, code: (chunks) => <code>{chunks}</code> })}
        </SubStep>
        <SubStep n={3}>{t('pasteBelow')}</SubStep>
      </SubStepList>
      <SecretField label={t('label')} value={value} onChange={onChange} placeholder='xoxb-...' />
    </div>
  )
}

interface SecretFieldProps {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
}
function SecretField({ label, value, onChange, placeholder }: SecretFieldProps) {
  return (
    <ChipModalField
      type='input'
      inputType='password'
      title={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete='off'
    />
  )
}

interface StepDoneProps {
  searchOnly: boolean
  pending: boolean
  created: boolean
  error: string | null
  onRetry: () => void
}
function StepDone({ searchOnly, pending, created, error, onRetry }: StepDoneProps) {
  const t = useTranslations('integrations.slackBot.done')
  if (pending) {
    return (
      <div className='flex flex-col items-center gap-3 py-10 text-center'>
        <Loader className='size-6 animate-spin text-[var(--text-muted)]' />
        <p className='text-[var(--text-secondary)] text-sm'>{t('verifying')}</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className='flex flex-col items-center gap-3 py-10 text-center'>
        <p className='max-w-sm text-[var(--text-error)] text-sm leading-relaxed'>{error}</p>
        <Chip onClick={onRetry}>{t('tryAgain')}</Chip>
      </div>
    )
  }
  if (created) {
    return (
      <div className='flex flex-col items-center gap-4 py-10 text-center'>
        <div className='space-y-1'>
          <p className='text-[var(--text-primary)] text-base'>
            {searchOnly ? t('appConnected') : t('botConnected')}
          </p>
          <p className='max-w-sm text-[var(--text-secondary)] text-sm leading-relaxed'>
            {searchOnly ? t('verifyMembers') : t('selectable')}
          </p>
        </div>
      </div>
    )
  }
  return null
}
