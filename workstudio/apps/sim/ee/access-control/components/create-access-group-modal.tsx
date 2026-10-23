// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

'use client'

import { useState } from 'react'
import {
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  ChipSelect,
} from '@sim/emcn'
import { useTranslations } from 'next-intl'
import {
  ACCESS_GROUP_TEMPLATES,
  type AccessGroupTemplateId,
  templateConfig,
} from '@/lib/nexora/access-groups'
import { accessGroupErrorKey } from '@/ee/access-control/components/access-group-errors'
import { WorkspaceChecklist } from '@/ee/access-control/components/workspace-checklist'
import {
  useCreatePermissionGroup,
  useOrganizationWorkspaceRefs,
} from '@/ee/access-control/hooks/permission-groups'

type Scope = 'default' | 'workspaces'

interface CreateAccessGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  /** The organization already has a default group: a second one is refused. */
  hasDefaultGroup: boolean
  onCreated: (groupId: string) => void
}

/** Creates a group from a template, for every workspace (default group) or chosen ones. */
export function CreateAccessGroupModal({
  open,
  onOpenChange,
  organizationId,
  hasDefaultGroup,
  onCreated,
}: CreateAccessGroupModalProps) {
  const t = useTranslations('settings.accessGroups')
  const tShared = useTranslations('settings.shared')
  const create = useCreatePermissionGroup(organizationId)
  const workspaces = useOrganizationWorkspaceRefs(organizationId)
  const [template, setTemplate] = useState<AccessGroupTemplateId>('read-only')
  const [name, setName] = useState('')
  const [scope, setScope] = useState<Scope>(hasDefaultGroup ? 'workspaces' : 'default')
  const [workspaceIds, setWorkspaceIds] = useState<string[]>([])

  const close = () => {
    if (create.isPending) return
    onOpenChange(false)
    setTemplate('read-only')
    setName('')
    setScope(hasDefaultGroup ? 'workspaces' : 'default')
    setWorkspaceIds([])
    create.reset()
  }

  const groupName = name.trim() || t(`templates.${template}.name`)
  const invalid = scope === 'workspaces' && workspaceIds.length === 0

  const handleCreate = () => {
    create.mutate(
      {
        name: groupName,
        description: t(`templates.${template}.description`),
        config: templateConfig(template),
        ...(scope === 'default' ? { isDefault: true } : { workspaceIds }),
      },
      {
        onSuccess: ({ permissionGroup }) => {
          close()
          onCreated(permissionGroup.id)
        },
      }
    )
  }

  return (
    <ChipModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close()
      }}
      dismissDisabled={create.isPending}
      srTitle={t('create.title')}
      size='md'
    >
      <ChipModalHeader
        onClose={close}
        closeDisabled={create.isPending}
        closeAriaLabel={tShared('close')}
      >
        {t('create.title')}
      </ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='custom'
          title={t('create.template')}
          hint={t(`templates.${template}.description`)}
        >
          <ChipSelect
            fullWidth
            value={template}
            onChange={(value) => {
              const next = ACCESS_GROUP_TEMPLATES.find((candidate) => candidate.id === value)
              if (next) setTemplate(next.id)
            }}
            options={ACCESS_GROUP_TEMPLATES.map(({ id }) => ({
              value: id,
              label: t(`templates.${id}.name`),
            }))}
          />
        </ChipModalField>
        <ChipModalField
          type='input'
          title={t('create.name')}
          value={name}
          onChange={setName}
          placeholder={t(`templates.${template}.name`)}
        />
        <ChipModalField
          type='custom'
          title={t('create.scope')}
          hint={scope === 'default' ? t('scope.defaultHint') : t('scope.workspacesHint')}
        >
          <ChipSelect
            fullWidth
            value={scope}
            onChange={(value) => setScope(value === 'default' ? 'default' : 'workspaces')}
            options={[
              { value: 'default', label: t('scope.default'), disabled: hasDefaultGroup },
              { value: 'workspaces', label: t('scope.workspaces') },
            ]}
          />
        </ChipModalField>
        {scope === 'workspaces' && (
          <ChipModalField type='custom' title={t('create.workspaces')}>
            <WorkspaceChecklist
              workspaces={workspaces.data ?? []}
              selected={workspaceIds}
              onChange={setWorkspaceIds}
              disabled={create.isPending}
            />
          </ChipModalField>
        )}
        <ChipModalError>
          {create.error ? t(`errors.${accessGroupErrorKey(create.error)}`) : null}
        </ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={close}
        cancelLabel={tShared('cancel')}
        cancelDisabled={create.isPending}
        primaryAction={{
          label: create.isPending ? tShared('creating') : tShared('create'),
          onClick: handleCreate,
          disabled: invalid || create.isPending,
        }}
      />
    </ChipModal>
  )
}
