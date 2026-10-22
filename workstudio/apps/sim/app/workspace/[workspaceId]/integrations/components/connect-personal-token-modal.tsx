'use client'

import { useState } from 'react'
import {
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  SecretInput,
} from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { GitlabIcon } from '@/components/icons'
import {
  useCreateWorkspaceCredential,
  useUpdateWorkspaceCredential,
} from '@/hooks/queries/credentials'

interface ConnectPersonalTokenModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  credentialId?: string
  instanceUrl?: string
  onConnected?: () => void
}

/** Personal connections use the existing credential modal and mutation conventions. */
export function ConnectPersonalTokenModal(props: ConnectPersonalTokenModalProps) {
  if (!props.open) return null
  return (
    <PersonalTokenForm key={`${props.workspaceId}:${props.credentialId ?? 'new'}`} {...props} />
  )
}

function PersonalTokenForm({
  open,
  onOpenChange,
  workspaceId,
  credentialId,
  instanceUrl,
  onConnected,
}: ConnectPersonalTokenModalProps) {
  const t = useTranslations('integrations.personalToken')
  const [host, setHost] = useState(instanceUrl ? new URL(instanceUrl).host : 'gitlab.com')
  const [token, setToken] = useState('')
  const create = useCreateWorkspaceCredential()
  const update = useUpdateWorkspaceCredential(workspaceId)
  const pending = create.isPending || update.isPending
  const error = (credentialId ? update.error : create.error)?.message
  function submit() {
    if (!host.trim() || !token.trim() || pending) return
    const onSuccess = () => {
      onConnected?.()
      onOpenChange(false)
    }
    if (credentialId) update.mutate({ credentialId, apiToken: token.trim() }, { onSuccess })
    else
      create.mutate(
        {
          workspaceId,
          type: 'personal_token',
          providerId: 'gitlab',
          apiToken: token.trim(),
          domain: host.trim(),
        },
        { onSuccess }
      )
  }
  return (
    <ChipModal open={open} onOpenChange={onOpenChange} srTitle={t('title')}>
      <ChipModalHeader icon={GitlabIcon} onClose={() => onOpenChange(false)}>
        {t('title')}
      </ChipModalHeader>
      <ChipModalBody>
        {credentialId ? (
          <ChipModalField type='copy' title={t('host')} value={host} />
        ) : (
          <ChipModalField
            type='input'
            title={t('host')}
            value={host}
            onChange={setHost}
            placeholder='gitlab.example.com'
            required
          />
        )}
        <ChipModalField type='custom' title={t('token')} required hint={t('tokenHint')}>
          <SecretInput
            value={token}
            onChange={setToken}
            autoComplete='new-password'
            placeholder='glpat-…' // i18n-ignore: GitLab token prefix
          />
        </ChipModalField>
        <ChipModalError>{error}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => onOpenChange(false)}
        primaryAction={{
          label: pending ? t('connecting') : credentialId ? t('reconnect') : t('connect'),
          onClick: submit,
          disabled: pending || !host.trim() || !token.trim(),
        }}
        secondaryActions={[
          {
            label: t('createToken'),
            onClick: () =>
              window.open(
                'https://docs.gitlab.com/user/profile/personal_access_tokens/',
                '_blank',
                'noopener,noreferrer'
              ),
          },
        ]}
      />
    </ChipModal>
  )
}
