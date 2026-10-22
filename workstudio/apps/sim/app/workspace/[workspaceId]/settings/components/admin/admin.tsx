'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Chip,
  ChipConfirmModal,
  ChipInput,
  ChipLink,
  ChipModalError,
  ChipModalField,
  ChipSelect,
  Label,
  OverflowText,
  Search,
  Switch,
  toast,
} from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import { useQueryStates } from 'nuqs'
import { useSettingsUnsavedGuard } from '@/components/settings/use-settings-unsaved-guard'
import type { MothershipEnvironment } from '@/lib/api/contracts'
import { useSession } from '@/lib/auth/client'
import { APP_ENTRY_PATH } from '@/lib/navigation/paths'
import { AddUserModal } from '@/app/workspace/[workspaceId]/settings/components/admin/add-user-modal'
import {
  adminParsers,
  adminUrlKeys,
} from '@/app/workspace/[workspaceId]/settings/components/admin/search-params'
import { useRecentImpersonations } from '@/app/workspace/[workspaceId]/settings/components/admin/use-recent-impersonations'
import { RowActionsMenu } from '@/app/workspace/[workspaceId]/settings/components/row-actions-menu'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import {
  type AdminUser,
  useAdminUsers,
  useAdminUsersByEmails,
  useBanUser,
  useImpersonateUser,
  useSendPasswordReset,
  useSetUserRole,
  useUnbanUser,
} from '@/hooks/queries/admin-users'
import { useBenchmarkAvailability } from '@/hooks/queries/benchmarks'
import { useGeneralSettings, useUpdateGeneralSetting } from '@/hooks/queries/general-settings'
import { useImportWorkflow } from '@/hooks/queries/workflows'
import { clearUserData } from '@/stores'

const PAGE_SIZE = 20 as const

function UserTableHeader() {
  const t = useTranslations('settings.admin.columns')
  return (
    <div className='flex items-center gap-3 px-3 pb-1 text-[var(--text-tertiary)] text-caption'>
      <span className='w-[170px]'>{t('name')}</span>
      <span className='flex-1'>{t('email')}</span>
      <span className='w-[60px]'>{t('role')}</span>
      <span className='w-[55px]'>{t('status')}</span>
      <span className='w-[150px] text-right'>{t('actions')}</span>
    </div>
  )
}

/**
 * The row action awaiting confirmation. Holds ids, never the user row, so a
 * refetch while the modal is open refreshes the name it shows without
 * redirecting the action the admin committed to.
 */
type PendingUserAction =
  | { type: 'ban'; userId: string }
  | { type: 'role'; userId: string; nextRole: 'admin' | 'user' }

const MOTHERSHIP_ENVIRONMENTS: readonly MothershipEnvironment[] = [
  'default',
  'dev',
  'staging',
  'prod',
]

export function Admin() {
  const t = useTranslations('settings.admin')
  const { data: session } = useSession()

  const { data: settings } = useGeneralSettings()
  const updateSetting = useUpdateGeneralSetting()
  const benchmarkAvailability = useBenchmarkAvailability(Boolean(settings?.superUserModeEnabled))
  const importWorkflow = useImportWorkflow()

  const setUserRole = useSetUserRole()
  const banUser = useBanUser()
  const unbanUser = useUnbanUser()
  const impersonateUser = useImpersonateUser()
  const sendPasswordReset = useSendPasswordReset()
  const { recentEmails, recordImpersonation } = useRecentImpersonations()
  const { data: recentUsers } = useAdminUsersByEmails(recentEmails)

  const [workflowId, setWorkflowId] = useState('')
  const [targetWorkspaceId, setTargetWorkspaceId] = useState('')
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null)
  const isImpersonating = impersonatingUserId !== null || impersonateUser.isPending
  const discardImport = () => {
    setWorkflowId('')
    setTargetWorkspaceId('')
  }
  const importGuard = useSettingsUnsavedGuard({
    isDirty: Boolean(workflowId.trim() || targetWorkspaceId.trim()),
    navigationBlocked: importWorkflow.isPending || isImpersonating,
    onDiscard: discardImport,
  })

  const [{ q: searchQuery, offset: usersOffset }, setAdminParams] = useQueryStates(
    adminParsers,
    adminUrlKeys
  )

  const [searchInput, setSearchInput] = useState(searchQuery)
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null)
  const [banReason, setBanReason] = useState('')
  const [impersonationGuardError, setImpersonationGuardError] = useState<string | null>(null)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [provisionWarning, setProvisionWarning] = useState<string | null>(null)

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useAdminUsers(usersOffset, PAGE_SIZE, searchQuery)

  const handleSearch = () => {
    const trimmed = searchInput.trim()
    setAdminParams({ q: trimmed.length > 0 ? trimmed : null, offset: null })
  }

  const lastSyncedSearchRef = useRef(searchQuery)
  useEffect(() => {
    if (searchQuery === lastSyncedSearchRef.current) return
    lastSyncedSearchRef.current = searchQuery
    setSearchInput((current) => (current === searchQuery ? current : searchQuery))
  }, [searchQuery])

  const totalPages = Math.ceil((usersData?.total ?? 0) / PAGE_SIZE)
  const currentPage = Math.floor(usersOffset / PAGE_SIZE) + 1

  const handleSuperUserModeToggle = async (checked: boolean) => {
    if (checked !== settings?.superUserModeEnabled && !updateSetting.isPending) {
      await updateSetting.mutateAsync({ key: 'superUserModeEnabled', value: checked })
    }
  }

  const handleMothershipEnvironmentChange = async (nextEnvironment: MothershipEnvironment) => {
    if (nextEnvironment !== settings?.mothershipEnvironment && !updateSetting.isPending) {
      await updateSetting.mutateAsync({
        key: 'mothershipEnvironment',
        value: nextEnvironment,
      })
    }
  }

  const handleImpersonate = (userId: string, email: string) => {
    if (isImpersonating || importWorkflow.isPending) return
    setImpersonationGuardError(null)
    if (session?.user?.role !== 'admin') {
      setImpersonatingUserId(null)
      setImpersonationGuardError(t('users.onlyAdmins'))
      return
    }

    importGuard.guardBack(() => {
      setImpersonatingUserId(userId)
      impersonateUser.reset()
      impersonateUser.mutate(
        { userId },
        {
          onError: () => {
            setImpersonatingUserId(null)
          },
          onSuccess: async () => {
            recordImpersonation(email)
            await clearUserData({ preserveRecentImpersonations: true })
            window.location.assign(APP_ENTRY_PATH)
          },
        }
      )
    })
  }

  const handleImport = () => {
    const sourceId = workflowId.trim()
    const targetId = targetWorkspaceId.trim()
    if (!sourceId || !targetId || importWorkflow.isPending || isImpersonating) return
    importWorkflow.mutate(
      { workflowId: sourceId, targetWorkspaceId: targetId },
      {
        onSuccess: discardImport,
      }
    )
  }

  const pendingUser = pendingAction
    ? (usersData?.users.find((u) => u.id === pendingAction.userId) ??
      recentUsers?.find((u) => u.id === pendingAction.userId) ??
      null)
    : null
  const isDemotion = pendingAction?.type === 'role' && pendingAction.nextRole === 'user'

  const closePendingAction = () => {
    setPendingAction(null)
    setBanReason('')
  }

  const handleConfirmBan = () => {
    if (pendingAction?.type !== 'ban') return
    const trimmedReason = banReason.trim()
    banUser.mutate(
      {
        userId: pendingAction.userId,
        ...(trimmedReason ? { banReason: trimmedReason } : {}),
      },
      { onSuccess: closePendingAction }
    )
  }

  const handleConfirmRoleChange = () => {
    if (pendingAction?.type !== 'role') return
    setUserRole.mutate(
      { userId: pendingAction.userId, role: pendingAction.nextRole },
      { onSuccess: closePendingAction }
    )
  }

  const pendingUserIds = new Set<string>()
  for (const mutation of [setUserRole, banUser, unbanUser, impersonateUser, sendPasswordReset]) {
    if (mutation.isPending && mutation.variables?.userId)
      pendingUserIds.add(mutation.variables.userId)
  }
  if (impersonatingUserId) pendingUserIds.add(impersonatingUserId)

  const renderUserRow = (u: AdminUser) => (
    <div key={u.id} className='flex items-center gap-3 px-3 py-2 text-small'>
      <OverflowText label={u.name || '—'} className='w-[170px] text-[var(--text-primary)]' />
      <OverflowText label={u.email} className='flex-1 text-[var(--text-secondary)]' />
      <span className='w-[60px]'>
        <Badge variant={u.role === 'admin' ? 'blue' : 'gray'}>{u.role || 'user'}</Badge>
      </span>
      <span className='w-[55px]'>
        {u.banned ? (
          <Badge variant='red'>{t('status.banned')}</Badge>
        ) : (
          <Badge variant='green'>{t('status.active')}</Badge>
        )}
      </span>
      <span className='flex w-[150px] items-center justify-end gap-1'>
        {u.id !== session?.user?.id && (
          <>
            <Chip
              aria-label={t('row.impersonateAria', { email: u.email })}
              onClick={() => handleImpersonate(u.id, u.email)}
              disabled={importWorkflow.isPending || isImpersonating || pendingUserIds.has(u.id)}
            >
              {impersonatingUserId === u.id ? t('row.switching') : t('row.impersonate')}
            </Chip>
            <RowActionsMenu
              label={t('row.actionsAria', { email: u.email })}
              actions={[
                {
                  label: t('row.resetPassword'),
                  onSelect: () => {
                    setProvisionWarning(null)
                    sendPasswordReset.mutate(
                      { userId: u.id, email: u.email },
                      {
                        onSuccess: () => toast.success(t('row.resetSent', { email: u.email })),
                        onError: (error) =>
                          toast.error(
                            getErrorMessage(error, t('row.resetFailed', { email: u.email }))
                          ),
                      }
                    )
                  },
                  disabled: pendingUserIds.has(u.id),
                },
                {
                  label: u.role === 'admin' ? t('row.demote') : t('row.promote'),
                  onSelect: () => {
                    setUserRole.reset()
                    setPendingAction({
                      type: 'role',
                      userId: u.id,
                      nextRole: u.role === 'admin' ? 'user' : 'admin',
                    })
                  },
                  disabled: pendingUserIds.has(u.id),
                },
                u.banned
                  ? {
                      label: t('row.unban'),
                      onSelect: () => unbanUser.mutate({ userId: u.id }),
                      disabled: pendingUserIds.has(u.id),
                    }
                  : {
                      label: t('row.ban'),
                      onSelect: () => {
                        banUser.reset()
                        setBanReason('')
                        setPendingAction({ type: 'ban', userId: u.id })
                      },
                      destructive: true,
                      disabled: pendingUserIds.has(u.id),
                    },
              ]}
            />
          </>
        )}
      </span>
    </div>
  )

  return (
    <SettingsPanel>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <Label htmlFor='super-user-mode'>{t('superAdminMode')}</Label>
          <Switch
            id='super-user-mode'
            checked={settings?.superUserModeEnabled ?? false}
            disabled={updateSetting.isPending}
            onCheckedChange={handleSuperUserModeToggle}
          />
        </div>

        {settings?.superUserModeEnabled && benchmarkAvailability.data?.available && (
          <div>
            <ChipLink href='/benchmark'>{t('openBenchmarks')}</ChipLink>
          </div>
        )}

        {settings?.superUserModeEnabled && (
          <>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex flex-col gap-1'>
                <Label>{t('mothershipEnvironment')}</Label>
                <p className='text-[var(--text-secondary)] text-caption'>
                  {t('mothershipEnvironmentHint')}
                </p>
              </div>
              <ChipSelect
                align='start'
                dropdownWidth={160}
                value={settings?.mothershipEnvironment ?? 'default'}
                onChange={(value) =>
                  handleMothershipEnvironmentChange(value as MothershipEnvironment)
                }
                placeholder={t('selectEnvironment')}
                disabled={updateSetting.isPending}
                options={MOTHERSHIP_ENVIRONMENTS.map((value) => ({
                  value,
                  label: t(`environments.${value}`),
                }))}
              />
            </div>
          </>
        )}
      </div>

      <div className='h-px bg-[var(--border)]' />

      <div className='flex flex-col gap-2'>
        <p className='text-[var(--text-secondary)] text-sm'>{t('import.description')}</p>
        <div className='flex gap-2'>
          <ChipInput
            value={workflowId}
            onChange={(event) => {
              setWorkflowId(event.target.value)
              importWorkflow.reset()
            }}
            placeholder={t('import.sourcePlaceholder')}
            disabled={importWorkflow.isPending || isImpersonating}
          />
          <ChipInput
            value={targetWorkspaceId}
            onChange={(event) => {
              setTargetWorkspaceId(event.target.value)
              importWorkflow.reset()
            }}
            placeholder={t('import.targetPlaceholder')}
            disabled={importWorkflow.isPending || isImpersonating}
          />
          <Button
            variant='primary'
            onClick={handleImport}
            disabled={
              importWorkflow.isPending ||
              isImpersonating ||
              !workflowId.trim() ||
              !targetWorkspaceId.trim()
            }
          >
            {importWorkflow.isPending ? t('import.importing') : t('import.import')}
          </Button>
        </div>
        {importWorkflow.error && (
          <p className='text-[var(--text-error)] text-small'>{importWorkflow.error.message}</p>
        )}
        {importWorkflow.isSuccess && (
          <p className='text-[var(--text-secondary)] text-small'>
            {t('import.success', {
              id: importWorkflow.data.newWorkflowId,
              count: importWorkflow.data.copilotChatsImported ?? 0,
            })}
          </p>
        )}
      </div>

      <div className='h-px bg-[var(--border)]' />

      <SettingsSection
        label={t('users.title')}
        action={<Chip onClick={() => setIsAddUserOpen(true)}>{t('users.addUser')}</Chip>}
      >
        <div className='flex flex-col gap-3'>
          <div className='flex gap-2'>
            <ChipInput
              icon={Search}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('users.searchPlaceholder')}
              className='min-w-0 flex-1'
            />
            <Button variant='primary' onClick={handleSearch} disabled={usersLoading}>
              {usersLoading ? t('users.searching') : t('users.search')}
            </Button>
          </div>

          {usersError && (
            <p className='text-[var(--text-muted)] text-small'>
              {getErrorMessage(usersError, t('users.fetchFailed'))}
            </p>
          )}

          {(unbanUser.error || impersonateUser.error || impersonationGuardError) && (
            <p className='text-[var(--text-error)] text-small'>
              {impersonationGuardError ||
                (unbanUser.error || impersonateUser.error)?.message ||
                t('users.actionFailed')}
            </p>
          )}

          {provisionWarning && (
            <p className='text-[var(--text-error)] text-small'>{provisionWarning}</p>
          )}

          {sendPasswordReset.isPending && sendPasswordReset.variables && (
            <p className='text-[var(--text-secondary)] text-small'>
              {t('users.sendingReset', { email: sendPasswordReset.variables.email })}
            </p>
          )}

          {searchQuery.length > 0 && usersData ? (
            <>
              <div className='flex flex-col gap-0.5'>
                <UserTableHeader />

                {usersData.users.length === 0 && (
                  <SettingsEmptyState variant='inline'>{t('users.noUsers')}</SettingsEmptyState>
                )}

                {usersData.users.map((u) => renderUserRow(u))}
              </div>

              {totalPages > 1 && (
                <div className='flex items-center justify-between text-[var(--text-secondary)] text-small'>
                  <span>
                    {t('users.pageInfo', {
                      page: currentPage,
                      totalPages,
                      total: usersData.total,
                    })}
                  </span>
                  <div className='flex gap-1'>
                    <Button
                      variant='active'
                      className='h-[28px] text-caption'
                      onClick={() =>
                        setAdminParams((prev) => ({
                          offset: Math.max(0, prev.offset - PAGE_SIZE),
                        }))
                      }
                      disabled={usersOffset === 0 || usersLoading}
                    >
                      {t('users.previous')}
                    </Button>
                    <Button
                      variant='active'
                      className='h-[28px] text-caption'
                      onClick={() =>
                        setAdminParams((prev) => ({ offset: prev.offset + PAGE_SIZE }))
                      }
                      disabled={usersOffset + PAGE_SIZE >= (usersData?.total ?? 0) || usersLoading}
                    >
                      {t('users.next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            searchQuery.length === 0 &&
            recentUsers &&
            recentUsers.length > 0 && (
              <div className='flex flex-col gap-0.5'>
                <UserTableHeader />
                {recentUsers.map((u) => renderUserRow(u))}
              </div>
            )
          )}
        </div>
      </SettingsSection>
      <ChipConfirmModal
        open={pendingAction?.type === 'ban'}
        onOpenChange={(open) => {
          if (!open) closePendingAction()
        }}
        srTitle={t('banModal.title')}
        title={t('banModal.title')}
        defaultAction='none'
        text={[
          t('banModal.prefix'),
          { text: pendingUser?.email ?? t('banModal.thisUser'), bold: true },
          ' ',
          { text: t('banModal.consequence'), error: true },
          t('banModal.suffix'),
        ]}
        confirm={{
          label: t('banModal.confirm'),
          onClick: handleConfirmBan,
          pending: banUser.isPending,
          pendingLabel: t('banModal.pending'),
        }}
      >
        <ChipModalField
          type='input'
          title={t('banModal.reason')}
          value={banReason}
          onChange={setBanReason}
          placeholder={t('banModal.reasonPlaceholder')}
          disabled={banUser.isPending}
        />
        <ChipModalError>{banUser.error?.message}</ChipModalError>
      </ChipConfirmModal>

      <ChipConfirmModal
        open={pendingAction?.type === 'role'}
        onOpenChange={(open) => {
          if (!open) closePendingAction()
        }}
        srTitle={isDemotion ? t('roleModal.demoteTitle') : t('roleModal.promoteTitle')}
        title={isDemotion ? t('roleModal.demoteTitle') : t('roleModal.promoteTitle')}
        text={[
          isDemotion ? t('roleModal.demotePrefix') : t('roleModal.promotePrefix'),
          { text: pendingUser?.email ?? t('banModal.thisUser'), bold: true },
          ' ',
          isDemotion
            ? { text: t('roleModal.demoteConsequence'), error: true }
            : t('roleModal.promoteConsequence'),
        ]}
        confirm={{
          label: isDemotion ? t('roleModal.demote') : t('roleModal.promote'),
          onClick: handleConfirmRoleChange,
          variant: isDemotion ? 'destructive' : 'primary',
          pending: setUserRole.isPending,
          pendingLabel: isDemotion ? t('roleModal.demoting') : t('roleModal.promoting'),
        }}
      >
        <ChipModalError>{setUserRole.error?.message}</ChipModalError>
      </ChipConfirmModal>

      <AddUserModal
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        onCreated={(user, resetEmailError) => {
          // Search for the new user either way: when the reset email failed,
          // the recovery action named below lives on that user's row.
          setSearchInput(user.email)
          setAdminParams({ q: user.email, offset: null })
          setProvisionWarning(
            resetEmailError
              ? t('users.provisionWarning', { email: user.email, error: resetEmailError })
              : null
          )
        }}
      />
    </SettingsPanel>
  )
}
