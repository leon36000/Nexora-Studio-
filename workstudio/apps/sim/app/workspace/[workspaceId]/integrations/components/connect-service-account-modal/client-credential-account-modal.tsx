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
import { createLogger } from '@sim/logger'
import { useTranslations } from 'next-intl'
import { isApiClientError } from '@/lib/api/client/errors'
import {
  resourceScopeFields,
  resourceScopeFromOwner,
  resourceScopeKey,
} from '@/lib/core/resource-scope'
import {
  AUTH_METHOD_FIELD_ID,
  type ClientCredentialAccountDescriptor,
  type ClientCredentialAccountField,
  type ClientCredentialAccountFieldId,
  partitionClientCredentialFields,
} from '@/lib/credentials/client-credential-accounts/descriptors'
import { useConnectNounTranslator } from '@/app/workspace/[workspaceId]/integrations/components/connect-service-account-modal/use-service-account-connect'
import { withBrandIcon } from '@/blocks/brand-icon'
import {
  useCreateScopedCredential,
  useUpdateScopedCredential,
} from '@/hooks/queries/scoped-credentials'

const logger = createLogger('ClientCredentialAccountModal')

/**
 * Maps server `error.code` values from client-credential verification (a real
 * token mint against the provider) to user-facing messages, personalized with
 * the provider's field labels. `t` is scoped to `integrations.serviceAccount`.
 */
function messageForClientCredentialError(
  err: unknown,
  descriptor: ClientCredentialAccountDescriptor,
  requiredFields: ClientCredentialAccountField[],
  t: ReturnType<typeof useTranslations>
): string {
  if (isApiClientError(err) && err.code) {
    // Names the fields the *selected* auth method needed, so a JWT failure
    // doesn't tell the user to check a consumer secret they never entered.
    const fieldLabels = requiredFields.map((field) => field.label).join(', ')
    switch (err.code) {
      case 'invalid_credentials':
        return t('clientCredential.errors.invalidCredentials', {
          fieldLabels,
          serviceLabel: descriptor.serviceLabel,
        })
      case 'permission_conflict':
        return t('clientCredential.errors.permissionConflict')
      case 'site_not_found': {
        // "host field" named a label no provider renders — Salesforce calls it
        // My Domain host, and Zoom/Box/Zoho Desk have no host field at all.
        const hostFieldLabel =
          descriptor.fields.find((field) => field.id === 'orgId')?.label ??
          t('clientCredential.hostFallback')
        return t('clientCredential.errors.siteNotFound', {
          serviceLabel: descriptor.serviceLabel,
          hostFieldLabel,
        })
      }
      case 'provider_unavailable':
        return t('clientCredential.errors.providerUnavailable', {
          serviceLabel: descriptor.serviceLabel,
        })
      case 'duplicate_display_name':
        return t('atlassian.errors.duplicateDisplayName')
      default:
        return t('clientCredential.errors.fallback')
    }
  }
  return t('clientCredential.errors.fallback')
}

type FieldValues = Partial<Record<ClientCredentialAccountFieldId, string>>

function openDocs(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

interface ClientCredentialAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId?: string
  organizationId?: string
  descriptor: ClientCredentialAccountDescriptor
  serviceName: string
  serviceIcon: ComponentType<{ className?: string }>
  /** When set, reconnect (rotate the secrets on) this credential in place. */
  credentialId?: string
  initialDisplayName?: string
  initialDescription?: string
  /** Called with the credential id after a successful create or reconnect. */
  onCreated?: (credentialId: string) => void
}

/**
 * Generic connect modal for client-credential service accounts (Zoom
 * Server-to-Server OAuth, Box CCG, Salesforce). Renders the fields declared by
 * the provider's {@link ClientCredentialAccountDescriptor}, in descriptor
 * order, and submits through the same create/update credential mutations as
 * the other service-account modals. The server verifies the credential by
 * minting a real access token; failures are mapped from the route's
 * `error.code`.
 *
 * A descriptor offering more than one grant declares an `authMethod` field;
 * selecting a method shows only that branch's fields and gates submit on that
 * branch's requirements, mirroring the server-side secret builder.
 */
export function ClientCredentialAccountModal(props: ClientCredentialAccountModalProps) {
  if (!props.open) return null
  return (
    <ClientCredentialAccountModalForm
      key={`${resourceScopeKey(resourceScopeFromOwner(props))}:${props.descriptor.providerId}:${props.credentialId ?? 'new'}`}
      {...props}
    />
  )
}

function ClientCredentialAccountModalForm({
  open,
  onOpenChange,
  workspaceId,
  organizationId,
  descriptor,
  serviceName,
  serviceIcon: ServiceIcon,
  credentialId,
  initialDisplayName,
  initialDescription,
  onCreated,
}: ClientCredentialAccountModalProps) {
  const t = useTranslations('integrations.serviceAccount')
  const tConnect = useTranslations('integrations.serviceAccountConnect')
  const noun = useConnectNounTranslator()(descriptor.connectNoun)
  const [values, setValues] = useState<FieldValues>({})
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '')
  const [description, setDescription] = useState(initialDescription ?? '')
  const [error, setError] = useState<string | null>(null)

  const createCredential = useCreateScopedCredential()
  const updateCredential = useUpdateScopedCredential()

  const authMethodField = descriptor.fields.find((field) => field.id === AUTH_METHOD_FIELD_ID)
  /**
   * A reconnect cannot pre-select the grant: the stored method lives inside the
   * encrypted blob and is never returned to the client, so the admin restates it
   * — they are retyping the secret anyway. Leaving it unset hides every
   * branch-specific field, so the selector is the only thing left to fill.
   */
  const mustRestateAuthMethod = Boolean(credentialId && !values.authMethod && authMethodField)

  const { visible, required } = partitionClientCredentialFields(descriptor, values.authMethod)
  const visibleFields = mustRestateAuthMethod
    ? visible.filter((field) => !field.requiredForAuthMethods)
    : visible
  // Markers reflect the descriptor's real requirements, so `clientId` and the
  // host keep their asterisk while the method is unset — plus the picker itself
  // while it is the thing blocking submit, so the greyed button has a visible
  // cause.
  const requiredFieldIds = new Set(required.map((field) => field.id))
  if (mustRestateAuthMethod) requiredFieldIds.add(AUTH_METHOD_FIELD_ID)
  /**
   * On a create the form already behaves as the descriptor's default grant, so
   * the picker shows it rather than an empty placeholder implying no choice.
   */
  const displayedAuthMethod = mustRestateAuthMethod
    ? undefined
    : (values.authMethod ?? descriptor.defaultAuthMethod)
  const missingRequired =
    mustRestateAuthMethod || required.some((field) => !values[field.id]?.trim())

  const isPending = createCredential.isPending || updateCredential.isPending
  const isDisabled = missingRequired || isPending
  const title = credentialId
    ? t('common.reconnectTitle', { serviceName, noun })
    : t('common.addTitle', { serviceName, noun })

  const setField = (id: ClientCredentialAccountFieldId, value: string) => {
    setValues((current) => ({ ...current, [id]: value }))
    if (error) setError(null)
  }

  const hintFor = (field: ClientCredentialAccountField, value: string): string | undefined => {
    if (!field.hintPattern || !field.hintMessage || value.length === 0) return undefined
    const normalized = field.hintNormalize ? field.hintNormalize(value) : value
    return field.hintPattern.test(normalized) ? undefined : field.hintMessage
  }

  const handleSubmit = async () => {
    setError(null)
    if (isDisabled) return
    try {
      let connectedCredentialId = credentialId
      // Only the fields the selected auth method actually uses are submitted;
      // a value typed before switching methods must not ride along and end up
      // stored on a credential whose grant never reads it.
      const secretFields: FieldValues = {}
      for (const field of visibleFields) {
        const value = field.preserveWhitespace ? values[field.id] : values[field.id]?.trim()
        if (value) secretFields[field.id] = value
      }
      if (credentialId) {
        await updateCredential.mutateAsync({
          ...resourceScopeFields(resourceScopeFromOwner({ workspaceId, organizationId })),
          credentialId,
          ...secretFields,
          displayName: displayName.trim() || undefined,
          description: description.trim() || undefined,
        })
      } else {
        const created = await createCredential.mutateAsync({
          ...resourceScopeFields(resourceScopeFromOwner({ workspaceId, organizationId })),
          type: 'service_account',
          providerId: descriptor.providerId,
          ...secretFields,
          displayName: displayName.trim() || undefined,
          description: description.trim() || undefined,
        })
        connectedCredentialId = created.credential.id
      }
      if (connectedCredentialId) onCreated?.(connectedCredentialId)
      onOpenChange(false)
    } catch (err: unknown) {
      setError(messageForClientCredentialError(err, descriptor, required, t))
      logger.error(`Failed to save ${descriptor.serviceLabel} service account credential`, err)
    }
  }

  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={title}>
      <ChipModalHeader icon={withBrandIcon(ServiceIcon)} onClose={() => onOpenChange(false)}>
        {title}
      </ChipModalHeader>
      <ChipModalBody>
        {visibleFields.map((field) => {
          const value = values[field.id] ?? ''
          const required = requiredFieldIds.has(field.id)
          // helpText lands on the org identifier, not on a secret: every
          // provider's caveat qualifies the org identifier or what the
          // credential can reach (Box's Admin Console authorization, Zoom's
          // Account ID, Salesforce's run-as user), never the secret being
          // pasted. A live format hint still wins, matching the token modal's
          // precedence.
          const hint =
            hintFor(field, value.trim()) ??
            field.hint ??
            (field.id === 'orgId' ? descriptor.helpText : undefined)

          if (field.options) {
            return (
              <ChipModalField
                key={field.id}
                type='dropdown'
                title={field.label}
                value={field.id === AUTH_METHOD_FIELD_ID ? displayedAuthMethod : value || undefined}
                onChange={(next) => setField(field.id, next)}
                options={field.options}
                placeholder={field.placeholder}
                align='start'
                required={required}
                hint={hint}
              />
            )
          }

          if (field.secret && field.multiline) {
            return (
              <ChipModalField
                key={field.id}
                type='custom'
                title={field.label}
                required={required}
                hint={hint}
              >
                {(aria) => (
                  <ChipTextarea
                    {...aria}
                    value={value}
                    onChange={(event) => setField(field.id, event.target.value)}
                    placeholder={field.placeholder}
                    className='min-h-[120px] font-mono'
                    // Browser spell-check and autofill ship textarea contents to
                    // third-party services — an exfiltration route for a pasted
                    // private key. `ChipModalField type='textarea'` exposes none
                    // of these, which is why this branch drops to `custom`.
                    spellCheck={false}
                    autoComplete='off'
                    autoCorrect='off'
                    autoCapitalize='off'
                    data-lpignore='true'
                    data-form-type='other'
                  />
                )}
              </ChipModalField>
            )
          }

          if (field.secret) {
            return (
              <ChipModalField
                key={field.id}
                type='custom'
                title={field.label}
                required={required}
                hint={hint}
              >
                {(aria) => (
                  <SecretInput
                    {...aria}
                    value={value}
                    onChange={(next) => setField(field.id, next)}
                    placeholder={field.placeholder}
                    name={`${descriptor.providerId}_${field.id}`}
                    autoComplete='new-password'
                    autoCorrect='off'
                    autoCapitalize='off'
                    data-lpignore='true'
                    data-form-type='other'
                  />
                )}
              </ChipModalField>
            )
          }

          return (
            <ChipModalField
              key={field.id}
              type='input'
              title={field.label}
              value={value}
              onChange={(next) => setField(field.id, next)}
              placeholder={field.placeholder}
              autoComplete='off'
              required={required}
              hint={hint}
            />
          )
        })}

        <ChipModalField
          type='input'
          title={t('common.displayName')}
          value={displayName}
          onChange={setDisplayName}
          placeholder={t('common.accountNamePlaceholder', {
            serviceLabel: descriptor.serviceLabel,
          })}
          autoComplete='off'
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
            onClick: () => openDocs(descriptor.docsUrl),
          },
        ]}
        primaryAction={{
          label: isPending
            ? credentialId
              ? t('common.reconnecting')
              : t('common.adding')
            : credentialId
              ? t('common.reconnectNoun', { noun })
              : tConnect('addNoun', { noun }),
          onClick: handleSubmit,
          disabled: isDisabled,
        }}
      />
    </ChipModal>
  )
}
