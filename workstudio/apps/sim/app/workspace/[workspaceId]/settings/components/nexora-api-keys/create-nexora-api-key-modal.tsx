'use client'

import { useState } from 'react'
import {
  Checkbox,
  ChipButtonGroup,
  ChipButtonGroupItem,
  ChipLink,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  Label,
  SecretReveal,
  Switch,
} from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import {
  NEXORA_API_KEY_DEFAULT_RPM,
  NEXORA_API_KEY_MAX_RPM,
} from '@/lib/api/contracts/nexora-api-keys'
import { getBaseUrl } from '@/lib/core/utils/urls'
import { developerBaseUrl } from '@/lib/nexora/developer-api/snippets'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'
import {
  useCreateInstanceNexoraApiKey,
  useCreateWorkspaceNexoraApiKey,
} from '@/hooks/queries/nexora-api-keys'
import { useProviderModels } from '@/hooks/queries/providers'

const EXPIRY_DAYS = { never: null, '30': 30, '90': 90, '365': 365 } as const
type ExpiryChoice = keyof typeof EXPIRY_DAYS
const DAY_MS = 24 * 60 * 60 * 1000
const NEXORA_MODEL_PREFIX = 'vllm/'

interface CreateNexoraApiKeyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  /** Members who can edit the workspace create its keys. */
  canCreateWorkspaceKeys: boolean
  /** Instance administrators may also create instance-wide keys. */
  canCreateInstanceKeys: boolean
}

function parseWholeNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN
}

/**
 * Creates a developer API key: name, scope, expiry, allowed models, published agents, monthly
 * cap and requests per minute. The value is shown once, then only its last characters.
 */
export function CreateNexoraApiKeyModal({
  open,
  onOpenChange,
  workspaceId,
  canCreateWorkspaceKeys,
  canCreateInstanceKeys,
}: CreateNexoraApiKeyModalProps) {
  const t = useTranslations('developers.keys.create')
  const createWorkspaceKey = useCreateWorkspaceNexoraApiKey()
  const createInstanceKey = useCreateInstanceNexoraApiKey()
  const { data: modelList } = useProviderModels('vllm')
  const [name, setName] = useState('')
  const [scope, setScope] = useState<'workspace' | 'instance'>('workspace')
  const [expiry, setExpiry] = useState<ExpiryChoice>('never')
  const [allModels, setAllModels] = useState(true)
  const [models, setModels] = useState<string[]>([])
  const [allowAgents, setAllowAgents] = useState(true)
  const [cap, setCap] = useState('')
  const [rpm, setRpm] = useState(String(NEXORA_API_KEY_DEFAULT_RPM))
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ name: string; value: string } | null>(null)

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setName('')
      setScope(canCreateWorkspaceKeys ? 'workspace' : 'instance')
      setExpiry('never')
      setAllModels(true)
      setModels([])
      setAllowAgents(true)
      setCap('')
      setRpm(String(NEXORA_API_KEY_DEFAULT_RPM))
      setError(null)
    }
  }

  const modelNames = [
    DEFAULT_MODEL_ALIAS,
    ...(modelList?.models ?? [])
      .map((model) => model.replace(NEXORA_MODEL_PREFIX, ''))
      .filter((model) => model !== DEFAULT_MODEL_ALIAS),
  ]
  const capValue = parseWholeNumber(cap)
  const rpmValue = parseWholeNumber(rpm)
  const capInvalid = Number.isNaN(capValue)
  const rpmInvalid =
    rpmValue === null || Number.isNaN(rpmValue) || rpmValue > NEXORA_API_KEY_MAX_RPM
  const modelsInvalid = !allModels && models.length === 0
  const isPending = createWorkspaceKey.isPending || createInstanceKey.isPending
  const canSubmit = name.trim() && !capInvalid && !rpmInvalid && !modelsInvalid && !isPending

  const toggleModel = (model: string, checked: boolean) =>
    setModels((current) =>
      checked ? [...current, model] : current.filter((entry) => entry !== model)
    )

  const handleCreate = async () => {
    if (!canSubmit || rpmValue === null || Number.isNaN(rpmValue)) return
    setError(null)
    const days = EXPIRY_DAYS[expiry]
    const settings = {
      name: name.trim(),
      expiresAt: days === null ? null : new Date(Date.now() + days * DAY_MS).toISOString(),
      allowedModels: allModels ? null : models,
      monthlyTokenCap: capValue,
      requestsPerMinute: rpmValue,
    }
    try {
      const result =
        scope === 'instance'
          ? await createInstanceKey.mutateAsync(settings)
          : await createWorkspaceKey.mutateAsync({ ...settings, workspaceId, allowAgents })
      setCreated({ name: result.key.name, value: result.value })
      onOpenChange(false)
    } catch (createError) {
      setError(getErrorMessage(createError, t('failed')))
    }
  }

  const close = () => {
    if (!isPending) onOpenChange(false)
  }

  return (
    <>
      <ChipModal
        open={open}
        onOpenChange={(next) => {
          if (!isPending) onOpenChange(next)
        }}
        dismissDisabled={isPending}
        srTitle={t('title')}
      >
        <ChipModalHeader onClose={close}>{t('title')}</ChipModalHeader>
        <ChipModalBody>
          <ChipModalField
            type='input'
            title={t('name')}
            value={name}
            onChange={setName}
            placeholder={t('namePlaceholder')}
            autoComplete='off'
            maxLength={100}
            required
          />
          {canCreateInstanceKeys && (
            <ChipModalField type='custom' title={t('scope')} hint={t('scopeHint')}>
              <ChipButtonGroup
                value={scope}
                onValueChange={(value) => setScope(value === 'instance' ? 'instance' : 'workspace')}
              >
                <ChipButtonGroupItem value='workspace' disabled={!canCreateWorkspaceKeys}>
                  {t('scopeWorkspace')}
                </ChipButtonGroupItem>
                <ChipButtonGroupItem value='instance'>{t('scopeInstance')}</ChipButtonGroupItem>
              </ChipButtonGroup>
            </ChipModalField>
          )}
          <ChipModalField
            type='dropdown'
            title={t('expiry')}
            value={expiry}
            onChange={(value) =>
              setExpiry(value in EXPIRY_DAYS ? (value as ExpiryChoice) : 'never')
            }
            options={[
              { value: 'never', label: t('expiryNever') },
              { value: '30', label: t('expiryDays', { days: 30 }) },
              { value: '90', label: t('expiryDays', { days: 90 }) },
              { value: '365', label: t('expiryYear') },
            ]}
          />
          <ChipModalField
            type='custom'
            title={t('models')}
            error={modelsInvalid ? t('modelsRequired') : undefined}
          >
            <div className='flex flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <Switch
                  id='nexora-key-all-models'
                  checked={allModels}
                  onCheckedChange={setAllModels}
                />
                <Label htmlFor='nexora-key-all-models'>{t('allModels')}</Label>
              </div>
              {!allModels && (
                <div className='flex max-h-[160px] flex-col gap-1.5 overflow-y-auto pl-1'>
                  {modelNames.map((model) => (
                    <div key={model} className='flex items-center gap-2'>
                      <Checkbox
                        id={`nexora-key-model-${model}`}
                        checked={models.includes(model)}
                        onCheckedChange={(checked) => toggleModel(model, checked === true)}
                      />
                      <Label htmlFor={`nexora-key-model-${model}`} className='font-mono'>
                        {model}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ChipModalField>
          {scope === 'workspace' && (
            <ChipModalField type='custom' title={t('agents')}>
              <div className='flex items-center gap-2'>
                <Switch
                  id='nexora-key-agents'
                  checked={allowAgents}
                  onCheckedChange={setAllowAgents}
                />
                <Label htmlFor='nexora-key-agents'>{t('agentsAllowed')}</Label>
              </div>
            </ChipModalField>
          )}
          <ChipModalField
            type='input'
            title={t('cap')}
            value={cap}
            onChange={setCap}
            placeholder={t('capPlaceholder')}
            inputMode='numeric'
            hint={t('capHint')}
            error={capInvalid ? t('capInvalid') : undefined}
          />
          <ChipModalField
            type='input'
            title={t('rpm')}
            value={rpm}
            onChange={setRpm}
            inputMode='numeric'
            error={rpmInvalid ? t('rpmInvalid', { max: NEXORA_API_KEY_MAX_RPM }) : undefined}
          />
          <ChipModalError>{error}</ChipModalError>
        </ChipModalBody>
        <ChipModalFooter
          onCancel={close}
          primaryAction={{
            label: isPending ? t('creating') : t('submit'),
            onClick: handleCreate,
            disabled: !canSubmit,
          }}
        />
      </ChipModal>

      <ChipModal
        open={created !== null}
        onOpenChange={(next) => {
          if (!next) setCreated(null)
        }}
        srTitle={t('createdTitle')}
      >
        <ChipModalHeader onClose={() => setCreated(null)}>{t('createdTitle')}</ChipModalHeader>
        <ChipModalBody>
          <ChipModalField type='custom' title={t('copyNow', { name: created?.name ?? '' })}>
            {created && <SecretReveal value={created.value} />}
          </ChipModalField>
          <ChipModalField
            type='copy'
            title={t('baseUrl')}
            value={developerBaseUrl(getBaseUrl())}
            titleActions={
              <ChipLink href={`/workspace/${workspaceId}/developpeurs`}>
                {t('openDevelopers')}
              </ChipLink>
            }
          />
        </ChipModalBody>
        <ChipModalFooter
          hideCancel
          primaryAction={{ label: t('done'), onClick: () => setCreated(null) }}
        />
      </ChipModal>
    </>
  )
}
