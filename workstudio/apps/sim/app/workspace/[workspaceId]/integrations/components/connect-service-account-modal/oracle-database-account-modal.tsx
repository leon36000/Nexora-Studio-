'use client'

import { type ComponentType, useState } from 'react'
import {
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  ChipTextarea,
  SecretInput,
} from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { isApiClientError } from '@/lib/api/client/errors'
import { docsUrl } from '@/lib/branding/docs-url'
import {
  resourceScopeFields,
  resourceScopeFromOwner,
  resourceScopeKey,
} from '@/lib/core/resource-scope'
import { ORACLE_DATABASE_SERVICE_ACCOUNT_PROVIDER_ID } from '@/lib/oauth/types'
import { withBrandIcon } from '@/blocks/brand-icon'
import {
  useCreateScopedCredential,
  useUpdateScopedCredential,
} from '@/hooks/queries/scoped-credentials'

interface OracleDatabaseAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId?: string
  organizationId?: string
  serviceIcon: ComponentType<{ className?: string }>
  credentialId?: string
  initialDisplayName?: string
  initialDescription?: string
  onCreated?: (credentialId: string) => void
}

interface ConnectionFields {
  host: string
  port: string
  protocol: string
  connectionType: string
  serviceName: string
  sid: string
  username: string
  password: string
  walletContent: string
  walletPassword: string
}

/** Saved Oracle Net connections share the standard credential create/reconnect lifecycle. */
export function OracleDatabaseAccountModal(props: OracleDatabaseAccountModalProps) {
  if (!props.open) return null
  return (
    <OracleDatabaseAccountForm
      key={`${resourceScopeKey(resourceScopeFromOwner(props))}:${props.credentialId ?? 'new'}`}
      {...props}
    />
  )
}

function OracleDatabaseAccountForm({
  open,
  onOpenChange,
  workspaceId,
  organizationId,
  serviceIcon: ServiceIcon,
  credentialId,
  initialDisplayName,
  initialDescription,
  onCreated,
}: OracleDatabaseAccountModalProps) {
  const t = useTranslations('integrations.serviceAccount')
  const [values, setValues] = useState<ConnectionFields>({
    host: '',
    port: '1521',
    protocol: 'tcps',
    connectionType: 'serviceName',
    serviceName: '',
    sid: '',
    username: '',
    password: '',
    walletContent: '',
    walletPassword: '',
  })
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '')
  const [description, setDescription] = useState(initialDescription ?? '')
  const [error, setError] = useState<string | null>(null)
  const createCredential = useCreateScopedCredential()
  const updateCredential = useUpdateScopedCredential()
  const isPending = createCredential.isPending || updateCredential.isPending
  const title = credentialId ? t('oracle.reconnectTitle') : t('oracle.addTitle')
  const identifier = values.connectionType === 'sid' ? values.sid : values.serviceName
  const disabled =
    isPending ||
    !values.host.trim() ||
    !values.port.trim() ||
    !identifier.trim() ||
    !values.username.trim() ||
    !values.password
  const setField = (field: keyof ConnectionFields, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setError(null)
  }
  const submit = async () => {
    if (disabled) return
    setError(null)
    const connection = {
      host: values.host.trim(),
      port: Number(values.port),
      protocol: values.protocol,
      connectionType: values.connectionType,
      ...(values.connectionType === 'sid'
        ? { sid: values.sid.trim() }
        : { serviceName: values.serviceName.trim() }),
      username: values.username.trim(),
      password: values.password,
      ...(values.protocol === 'tcps' && values.walletContent
        ? {
            walletContent: values.walletContent,
            ...(values.walletPassword ? { walletPassword: values.walletPassword } : {}),
          }
        : {}),
    }
    const input = {
      ...resourceScopeFields(resourceScopeFromOwner({ workspaceId, organizationId })),
      serviceAccountJson: JSON.stringify(connection),
      displayName: displayName.trim() || undefined,
      description: description.trim() || undefined,
    }
    try {
      let connectedId = credentialId
      if (credentialId)
        await updateCredential.mutateAsync({
          ...input,
          credentialId,
          description: description.trim() || null,
        })
      else {
        const created = await createCredential.mutateAsync({
          ...input,
          type: 'service_account',
          providerId: ORACLE_DATABASE_SERVICE_ACCOUNT_PROVIDER_ID,
        })
        connectedId = created.credential.id
      }
      if (connectedId) onCreated?.(connectedId)
      onOpenChange(false)
    } catch (error) {
      setError(
        isApiClientError(error) && error.code === 'duplicate_display_name'
          ? t('oracle.duplicateDisplayName')
          : t('oracle.verifyFailed')
      )
    }
  }
  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={title}>
      <ChipModalHeader icon={withBrandIcon(ServiceIcon)} onClose={() => onOpenChange(false)}>
        {title}
      </ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='input'
          title={t('oracle.host')}
          value={values.host}
          onChange={(value) => setField('host', value)}
          placeholder='db.example.com'
          required
          autoComplete='off'
        />
        <ChipModalField
          type='input'
          title={t('oracle.port')}
          value={values.port}
          onChange={(value) => setField('port', value)}
          placeholder='1521'
          required
          autoComplete='off'
        />
        <ChipModalField
          type='dropdown'
          title={t('oracle.protocol')}
          value={values.protocol}
          onChange={(value) => setField('protocol', value)}
          options={[
            { value: 'tcps', label: 'TCPS (TLS)' },
            { value: 'tcp', label: 'TCP' },
          ]}
          placeholder={t('oracle.protocolPlaceholder')}
          required
          hint={values.protocol === 'tcp' ? t('oracle.tcpHint') : t('oracle.tcpsHint')}
        />
        <ChipModalField
          type='dropdown'
          title={t('oracle.connectionIdentifier')}
          value={values.connectionType}
          onChange={(value) => setField('connectionType', value)}
          options={[
            { value: 'serviceName', label: t('oracle.serviceName') },
            { value: 'sid', label: 'SID' },
          ]}
          placeholder={t('oracle.identifierPlaceholder')}
          required
        />
        {values.connectionType === 'sid' ? (
          <ChipModalField
            type='input'
            title='SID'
            value={values.sid}
            onChange={(value) => setField('sid', value)}
            placeholder='ORCL'
            required
          />
        ) : (
          <ChipModalField
            type='input'
            title={t('oracle.serviceName')}
            value={values.serviceName}
            onChange={(value) => setField('serviceName', value)}
            placeholder='FREEPDB1'
            required
          />
        )}
        <ChipModalField
          type='input'
          title={t('oracle.username')}
          value={values.username}
          onChange={(value) => setField('username', value)}
          placeholder='app_user'
          required
          autoComplete='off'
        />
        <ChipModalField type='custom' title={t('oracle.password')} required>
          {(aria) => (
            <SecretInput
              {...aria}
              value={values.password}
              onChange={(value) => setField('password', value)}
              placeholder={t('oracle.passwordPlaceholder')}
              autoComplete='new-password'
              data-lpignore='true'
            />
          )}
        </ChipModalField>
        {values.protocol === 'tcps' && (
          <>
            <ChipModalField
              type='custom'
              title={t('oracle.pemWallet')}
              hint={t('oracle.pemWalletHint')}
            >
              {(aria) => (
                <ChipTextarea
                  {...aria}
                  value={values.walletContent}
                  onChange={(event) => setField('walletContent', event.target.value)}
                  placeholder={t('oracle.pemWalletPlaceholder')}
                  className='min-h-[120px]'
                  spellCheck={false}
                  autoComplete='off'
                  autoCorrect='off'
                  autoCapitalize='off'
                  data-lpignore='true'
                  data-form-type='other'
                />
              )}
            </ChipModalField>
            {values.walletContent && (
              <ChipModalField type='custom' title={t('oracle.walletPassword')}>
                {(aria) => (
                  <SecretInput
                    {...aria}
                    value={values.walletPassword}
                    onChange={(value) => setField('walletPassword', value)}
                    placeholder={t('oracle.walletPasswordPlaceholder')}
                    autoComplete='new-password'
                    data-lpignore='true'
                  />
                )}
              </ChipModalField>
            )}
          </>
        )}
        <ChipModalField
          type='input'
          title={t('common.displayName')}
          value={displayName}
          onChange={setDisplayName}
          placeholder={t('oracle.displayNamePlaceholder')}
        />
        <ChipModalField
          type='textarea'
          title={t('common.description')}
          value={description}
          onChange={setDescription}
          placeholder={t('common.optionalDescription')}
          maxLength={500}
          minHeight={80}
        />
        <ChipModalError>{error}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => onOpenChange(false)}
        secondaryActions={[
          {
            label: t('common.setupGuide'),
            onClick: () =>
              window.open(docsUrl('/integrations/oracledb'), '_blank', 'noopener,noreferrer'),
          },
        ]}
        primaryAction={{
          label: isPending
            ? t('oracle.verifying')
            : credentialId
              ? t('oracle.reconnectConnection')
              : t('oracle.addConnection'),
          onClick: submit,
          disabled,
        }}
      />
    </ChipModal>
  )
}
