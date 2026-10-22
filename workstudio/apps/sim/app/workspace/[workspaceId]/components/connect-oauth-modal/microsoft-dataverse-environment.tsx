'use client'

import { useState } from 'react'
import { ChipModalField } from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import {
  getMicrosoftDataverseIdentityScopes,
  getMicrosoftDataverseOAuthScopes,
  MICROSOFT_DATAVERSE_PROVIDER_ID,
  normalizeMicrosoftDataverseEnvironmentUrl,
} from '@/lib/oauth/microsoft-dataverse'

interface UseMicrosoftDataverseEnvironmentFormProps {
  fallbackScopes: readonly string[]
  lockedEnvironmentUrl?: string
  open: boolean
  providerId: string
  required: boolean
}

export interface MicrosoftDataverseEnvironmentForm {
  effectiveScopes: readonly string[]
  enabled: boolean
  error: string | null
  isComplete: boolean
  isLocked: boolean
  setValue: (value: string) => void
  validate: () => string | undefined
  value: string
}

export function useMicrosoftDataverseEnvironmentForm({
  fallbackScopes,
  lockedEnvironmentUrl,
  open,
  providerId,
  required,
}: UseMicrosoftDataverseEnvironmentFormProps): MicrosoftDataverseEnvironmentForm {
  const t = useTranslations('shell.connectOAuthModal.dataverse')
  const enabled = required && providerId === MICROSOFT_DATAVERSE_PROVIDER_ID
  const initialValue = enabled ? (lockedEnvironmentUrl ?? '') : ''
  const [value, setEnvironmentValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const sessionKey = `${open}:${enabled}:${lockedEnvironmentUrl ?? ''}`
  const [previousSessionKey, setPreviousSessionKey] = useState(sessionKey)

  if (previousSessionKey !== sessionKey) {
    setPreviousSessionKey(sessionKey)
    setEnvironmentValue(open && enabled ? (lockedEnvironmentUrl ?? '') : '')
    setError(null)
  }

  const setValue = (nextValue: string) => {
    setEnvironmentValue(nextValue)
    setError(null)
  }

  const validate = () => {
    if (!enabled) return undefined
    try {
      const environmentUrl = normalizeMicrosoftDataverseEnvironmentUrl(value)
      setError(null)
      return environmentUrl
    } catch (validationError) {
      setError(getErrorMessage(validationError, t('invalidUrl')))
      return undefined
    }
  }

  const effectiveScopes = (() => {
    if (!enabled) return fallbackScopes
    if (!value.trim()) return getMicrosoftDataverseIdentityScopes(fallbackScopes)
    try {
      return getMicrosoftDataverseOAuthScopes(value)
    } catch {
      return fallbackScopes
    }
  })()

  return {
    effectiveScopes,
    enabled,
    error,
    isComplete: !enabled || value.trim().length > 0,
    isLocked: enabled && Boolean(lockedEnvironmentUrl),
    setValue,
    validate,
    value,
  }
}

interface MicrosoftDataverseEnvironmentFieldProps {
  form: MicrosoftDataverseEnvironmentForm
}

export function MicrosoftDataverseEnvironmentField({
  form,
}: MicrosoftDataverseEnvironmentFieldProps) {
  const t = useTranslations('shell.connectOAuthModal.dataverse')
  if (!form.enabled) return null

  if (form.isLocked) {
    return (
      <ChipModalField
        type='copy'
        title={t('environmentUrl')}
        value={form.value}
        copyLabel={t('copyEnvironmentUrl')}
        required
        error={form.error ?? undefined}
        hint={t('lockedHint')}
      />
    )
  }

  return (
    <ChipModalField
      type='input'
      inputType='url'
      title={t('environmentUrl')}
      value={form.value}
      onChange={form.setValue}
      placeholder='https://myorg.crm.dynamics.com'
      autoComplete='off'
      required
      error={form.error ?? undefined}
      hint={t('restrictedHint')}
    />
  )
}
