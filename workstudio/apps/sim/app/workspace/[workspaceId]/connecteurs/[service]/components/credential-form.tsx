'use client'

import { type FormEvent, useState } from 'react'
import { Chip, ChipInput, ChipTextarea, Label, toast } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import {
  type ConnectorCredentialField,
  type CredentialFieldError,
  credentialFieldLabel,
  credentialFieldPlaceholder,
  readCredentialValues,
} from '@/lib/nexora/connector-credentials'
import {
  type ConnectorScope,
  getConnectorErrorCode,
  useConnectConnector,
} from '@/hooks/queries/nexora-connectors'

interface CredentialFormProps {
  workspaceId: string
  scope: ConnectorScope
  service: string
  serviceName: string
  authType: 'api_key' | 'custom_credential'
  fields: ConnectorCredentialField[]
}

/**
 * The API-key or custom-credential form a service's setup describes. Values only travel to
 * Nexora Connect (through the connectors route) and are never shown again.
 */
export function CredentialForm({
  workspaceId,
  scope,
  service,
  serviceName,
  authType,
  fields,
}: CredentialFormProps) {
  const t = useTranslations('connectors')
  const connect = useConnectConnector()
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, CredentialFieldError>>({})

  const setValue = (key: string, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    if (errors[key]) setErrors(({ [key]: _cleared, ...rest }) => rest)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const read = readCredentialValues(fields, values)
    setErrors(read.errors)
    if (Object.keys(read.errors).length > 0) return
    connect.mutate(
      { workspaceId, service, scope, authType, values: read.values },
      {
        onSuccess: () => {
          setValues({})
          toast.success(t('detail.connectedToast', { name: serviceName }))
        },
        onError: (error) => toast.error(t(`errors.${getConnectorErrorCode(error)}`)),
      }
    )
  }

  return (
    <form className='flex flex-col gap-4' onSubmit={handleSubmit} noValidate>
      {fields.map((field) => {
        const id = `connector-${service}-${field.key}`
        const error = errors[field.key]
        const isMultiline = field.inputType === 'textarea' || field.inputType === 'json'
        const errorHint = error
          ? t(error === 'json' ? 'detail.form.jsonError' : 'detail.form.requiredError')
          : null
        const placeholder = credentialFieldPlaceholder(field.placeholder)
        return (
          <div key={field.key} className='flex flex-col gap-[9px]'>
            <Label htmlFor={id}>
              {credentialFieldLabel(field.label, t)}
              {field.required && (
                <span className='text-[var(--text-muted)]'> {t('detail.form.requiredMark')}</span>
              )}
            </Label>
            {isMultiline ? (
              <ChipTextarea
                id={id}
                value={values[field.key] ?? ''}
                placeholder={placeholder}
                error={Boolean(error)}
                aria-invalid={Boolean(error)}
                rows={field.inputType === 'json' ? 6 : 3}
                spellCheck={false}
                onChange={(event) => setValue(field.key, event.target.value)}
              />
            ) : (
              <ChipInput
                id={id}
                type={field.secret || field.inputType === 'password' ? 'password' : 'text'}
                autoComplete='off'
                spellCheck={false}
                value={values[field.key] ?? ''}
                placeholder={placeholder}
                error={Boolean(error)}
                aria-invalid={Boolean(error)}
                onChange={(event) => setValue(field.key, event.target.value)}
              />
            )}
            {errorHint ? (
              <p className='text-[var(--text-error)] text-caption'>{errorHint}</p>
            ) : field.description ? (
              <details className='text-[var(--text-muted)] text-caption'>
                <summary className='cursor-pointer'>{t('detail.form.providerHelp')}</summary>
                <p lang='en' className='mt-1'>
                  {field.description}
                </p>
              </details>
            ) : null}
          </div>
        )
      })}
      <Chip type='submit' variant='primary' className='self-start' disabled={connect.isPending}>
        {connect.isPending ? t('detail.connecting') : t('detail.connect')}
      </Chip>
    </form>
  )
}
