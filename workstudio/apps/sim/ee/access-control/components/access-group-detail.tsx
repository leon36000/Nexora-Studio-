// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

'use client'

import { useState } from 'react'
import { Avatar, Checkbox, ChipConfirmModal, ChipSelect, Label, toast } from '@sim/emcn'
import { ArrowLeft } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { saveDiscardActions } from '@/components/settings/save-discard-actions'
import { useSettingsUnsavedGuard } from '@/components/settings/use-settings-unsaved-guard'
import {
  ACCESS_CAPABILITY_CATEGORIES,
  ACCESS_GROUP_CAPABILITIES,
  ACCESS_GROUP_TEMPLATES,
  type AccessCapabilityKey,
  templateConfig,
} from '@/lib/nexora/access-groups'
import { SettingsTextField } from '@/app/workspace/[workspaceId]/settings/components/nexora-instance/instance-settings-ui'
import { RowActionsMenu } from '@/app/workspace/[workspaceId]/settings/components/row-actions-menu'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import {
  RESOURCE_LIST_STACK,
  SettingsResourceRow,
} from '@/app/workspace/[workspaceId]/settings/components/settings-resource-row'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { accessGroupErrorKey } from '@/ee/access-control/components/access-group-errors'
import { sameModelList } from '@/ee/access-control/components/denied-models'
import { GroupModels } from '@/ee/access-control/components/group-models'
import { WorkspaceChecklist } from '@/ee/access-control/components/workspace-checklist'
import {
  type PermissionGroup,
  useAddPermissionGroupMember,
  useDeletePermissionGroup,
  useOrganizationWorkspaceRefs,
  usePermissionGroupMembers,
  useRemovePermissionGroupMember,
  useUpdatePermissionGroup,
} from '@/ee/access-control/hooks/permission-groups'
import { useOrganizationRoster } from '@/hooks/queries/organization'

type Withheld = Record<AccessCapabilityKey, boolean>

interface GroupDraft {
  name: string
  workspaceIds: string[]
  withheld: Withheld
  /** The WorkStudio ids (`vllm/<name>`) of the models the group may not use. */
  deniedModels: string[]
}

function draftFrom(group: PermissionGroup): GroupDraft {
  return {
    name: group.name,
    workspaceIds: group.workspaces.map((workspace) => workspace.id),
    withheld: Object.fromEntries(
      ACCESS_GROUP_CAPABILITIES.map(({ key }) => [key, group.config[key] === true])
    ) as Withheld,
    deniedModels: [...(group.config.deniedModels ?? [])],
  }
}

function sameDraft(a: GroupDraft, b: GroupDraft): boolean {
  return (
    a.name.trim() === b.name.trim() &&
    [...a.workspaceIds].sort().join(',') === [...b.workspaceIds].sort().join(',') &&
    ACCESS_GROUP_CAPABILITIES.every(({ key }) => a.withheld[key] === b.withheld[key]) &&
    sameModelList(a.deniedModels, b.deniedModels)
  )
}

interface AccessGroupDetailProps {
  organizationId: string
  group: PermissionGroup
  onClose: () => void
}

/**
 * One access group: its name, the workspaces it governs, its members, and what it can do. Each
 * capability is enforced by the server; unchecking one refuses the matching requests.
 */
export function AccessGroupDetail({ organizationId, group, onClose }: AccessGroupDetailProps) {
  const t = useTranslations('settings.accessGroups')
  const tShared = useTranslations('settings.shared')
  const update = useUpdatePermissionGroup(organizationId)
  const remove = useDeletePermissionGroup(organizationId)
  const workspaces = useOrganizationWorkspaceRefs(organizationId)
  const [initial] = useState(() => draftFrom(group))
  const [draft, setDraft] = useState(initial)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const dirty = !sameDraft(draft, initial)

  const guard = useSettingsUnsavedGuard({
    isDirty: dirty,
    navigationBlocked: update.isPending,
    onDiscard: () => setDraft(initial),
  })

  const invalid = !draft.name.trim() || (!group.isDefault && draft.workspaceIds.length === 0)

  const handleSave = () => {
    update.mutate(
      {
        groupId: group.id,
        body: {
          name: draft.name.trim(),
          config: { ...draft.withheld, deniedModels: draft.deniedModels },
          ...(group.isDefault ? {} : { workspaceIds: draft.workspaceIds }),
        },
      },
      {
        onSuccess: () => toast.success(t('saved')),
        onError: (cause) => toast.error(t(`errors.${accessGroupErrorKey(cause)}`)),
      }
    )
  }

  const handleDelete = () => {
    remove.mutate(group.id, {
      onSuccess: () => {
        setConfirmDelete(false)
        onClose()
      },
      onError: (cause) => {
        setConfirmDelete(false)
        toast.error(t(`errors.${accessGroupErrorKey(cause)}`))
      },
    })
  }

  const setWithheld = (key: AccessCapabilityKey, withheld: boolean) =>
    setDraft((current) => ({ ...current, withheld: { ...current.withheld, [key]: withheld } }))

  return (
    <>
      <SettingsPanel
        back={{ text: t('back'), icon: ArrowLeft, onSelect: () => guard.guardBack(onClose) }}
        title={group.name}
        actions={[
          {
            id: 'delete',
            text: remove.isPending ? tShared('deleting') : tShared('delete'),
            onSelect: () => setConfirmDelete(true),
            disabled: remove.isPending || update.isPending,
          },
          ...saveDiscardActions({
            dirty,
            saving: update.isPending,
            onSave: handleSave,
            onDiscard: () => setDraft(initial),
            saveDisabled: invalid,
            saveTooltip: invalid ? t('detail.incomplete') : undefined,
          }),
        ]}
      >
        <div className='flex flex-col gap-7'>
          <SettingsSection label={t('detail.general')}>
            <div className='flex flex-col gap-4'>
              <SettingsTextField
                id='access-group-name'
                label={t('detail.name')}
                maxLength={100}
                value={draft.name}
                disabled={update.isPending}
                onValueChange={(name) => setDraft((current) => ({ ...current, name }))}
              />
              {group.isDefault ? (
                <p className='text-[var(--text-muted)] text-small'>{t('scope.defaultHint')}</p>
              ) : (
                <div className='flex flex-col gap-[9px]'>
                  <Label>{t('create.workspaces')}</Label>
                  <WorkspaceChecklist
                    workspaces={workspaces.data ?? group.workspaces}
                    selected={draft.workspaceIds}
                    onChange={(workspaceIds) =>
                      setDraft((current) => ({ ...current, workspaceIds }))
                    }
                    disabled={update.isPending}
                  />
                </div>
              )}
            </div>
          </SettingsSection>

          {!group.isDefault && (
            <GroupMembers
              organizationId={organizationId}
              groupId={group.id}
              memberCount={group.memberCount}
            />
          )}

          <SettingsSection
            label={t('detail.capabilities')}
            action={
              <ChipSelect
                value=''
                placeholder={t('detail.applyTemplate')}
                disabled={update.isPending}
                onChange={(value) => {
                  const template = ACCESS_GROUP_TEMPLATES.find(({ id }) => id === value)
                  if (template) {
                    setDraft((current) => ({ ...current, withheld: templateConfig(template.id) }))
                  }
                }}
                options={ACCESS_GROUP_TEMPLATES.map(({ id }) => ({
                  value: id,
                  label: t(`templates.${id}.name`),
                }))}
                align='end'
              />
            }
          >
            <div className='flex flex-col gap-6'>
              {ACCESS_CAPABILITY_CATEGORIES.map((category) => {
                const capabilities = ACCESS_GROUP_CAPABILITIES.filter(
                  (capability) => capability.category === category
                )
                if (capabilities.length === 0) return null
                return (
                  <div key={category} className='flex flex-col gap-2'>
                    <p className='text-[var(--text-muted)] text-caption'>
                      {t(`categories.${category}`)}
                    </p>
                    {capabilities.map(({ key, scope }) => {
                      const readFromDefault = scope === 'organization' && !group.isDefault
                      const id = `access-capability-${key}`
                      return (
                        <div key={key} className='flex items-center gap-2'>
                          <Checkbox
                            id={id}
                            size='sm'
                            checked={!draft.withheld[key]}
                            disabled={update.isPending || readFromDefault}
                            onCheckedChange={(checked) => setWithheld(key, checked !== true)}
                          />
                          <Label htmlFor={id}>{t(`capabilities.${key}`)}</Label>
                          {readFromDefault && (
                            <span className='text-[var(--text-muted)] text-caption'>
                              {t('detail.defaultGroupOnly')}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </SettingsSection>

          <GroupModels
            denied={draft.deniedModels}
            disabled={update.isPending}
            onChange={(deniedModels) => setDraft((current) => ({ ...current, deniedModels }))}
          />
        </div>
      </SettingsPanel>

      <ChipConfirmModal
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setConfirmDelete(false)
        }}
        title={t('deleteDialog.title')}
        text={[
          t('deleteDialog.textBefore'),
          { text: group.name, bold: true },
          t('deleteDialog.textAfter'),
        ]}
        dismissLabel={tShared('cancel')}
        confirm={{
          label: tShared('delete'),
          onClick: handleDelete,
          pending: remove.isPending,
          pendingLabel: tShared('deleting'),
        }}
      />
    </>
  )
}

interface GroupMembersProps {
  organizationId: string
  groupId: string
  memberCount: number
}

/** Explicit members; a group without any governs everyone in its workspaces. */
function GroupMembers({ organizationId, groupId, memberCount }: GroupMembersProps) {
  const t = useTranslations('settings.accessGroups')
  const members = usePermissionGroupMembers(organizationId, groupId)
  const roster = useOrganizationRoster(organizationId)
  const add = useAddPermissionGroupMember(organizationId)
  const removeMember = useRemovePermissionGroupMember(organizationId)

  const memberUserIds = new Set((members.data ?? []).map((member) => member.userId))
  const candidates = (roster.data?.members ?? []).filter(
    (member) => !memberUserIds.has(member.userId)
  )

  const handleAdd = (userId: string) => {
    add.mutate(
      { groupId, userId },
      { onError: (cause) => toast.error(t(`errors.${accessGroupErrorKey(cause)}`)) }
    )
  }

  const handleRemove = (memberId: string) => {
    removeMember.mutate(
      { groupId, memberId },
      { onError: (cause) => toast.error(t(`errors.${accessGroupErrorKey(cause)}`)) }
    )
  }

  return (
    <SettingsSection
      label={t('members.title')}
      action={
        <ChipSelect
          value=''
          placeholder={add.isPending ? t('members.adding') : t('members.add')}
          disabled={add.isPending || candidates.length === 0}
          searchable
          searchPlaceholder={t('members.search')}
          onChange={handleAdd}
          options={candidates.map((member) => ({
            value: member.userId,
            label: member.name || member.email,
            searchTerms: [member.email],
          }))}
          align='end'
        />
      }
    >
      {members.isLoading ? null : memberCount === 0 && (members.data ?? []).length === 0 ? (
        <SettingsEmptyState variant='inline'>{t('members.empty')}</SettingsEmptyState>
      ) : (
        <div className={RESOURCE_LIST_STACK}>
          {(members.data ?? []).map((member) => {
            const label = member.userName || member.userEmail || member.userId
            return (
              <SettingsResourceRow
                key={member.id}
                icon={<Avatar size='xs' name={label} src={member.userImage ?? undefined} />}
                iconVariant='plain'
                title={label}
                description={member.userName ? member.userEmail : undefined}
                trailing={
                  <RowActionsMenu
                    label={t('members.actions', { name: label })}
                    actions={[
                      {
                        label: t('members.remove'),
                        destructive: true,
                        disabled: removeMember.isPending,
                        onSelect: () => handleRemove(member.id),
                      },
                    ]}
                  />
                }
              />
            )
          })}
        </div>
      )}
    </SettingsSection>
  )
}
