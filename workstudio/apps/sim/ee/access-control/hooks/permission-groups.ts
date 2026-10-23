// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import type { ContractBodyInput, ContractJsonResponse } from '@/lib/api/contracts'
import {
  addPermissionGroupMemberContract,
  createPermissionGroupContract,
  deletePermissionGroupContract,
  getUserPermissionConfigContract,
  listOrganizationWorkspacesContract,
  listPermissionGroupMembersContract,
  listPermissionGroupsContract,
  removePermissionGroupMemberContract,
  type UpdatePermissionGroupBody,
  updatePermissionGroupContract,
} from '@/lib/api/contracts/permission-groups'
import {
  PERMISSION_GROUPS_STALE_TIME,
  permissionGroupKeys,
} from '@/hooks/queries/utils/permission-group-keys'

/**
 * Reads the caller's effective permission config from the core route /api/permission-groups/user.
 * Shares the core query key, so the server prefetch in prefetch-access.ts hydrates it.
 */
export function useUserPermissionConfig(workspaceId: string | undefined) {
  return useQuery({
    queryKey: permissionGroupKeys.userConfig(workspaceId),
    queryFn: ({ signal }) =>
      requestJson(getUserPermissionConfigContract, {
        query: { workspaceId: workspaceId ?? '' },
        signal,
      }),
    enabled: Boolean(workspaceId),
    staleTime: PERMISSION_GROUPS_STALE_TIME,
  })
}

type CreatePermissionGroupBody = ContractBodyInput<typeof createPermissionGroupContract>
type PermissionGroupList = ContractJsonResponse<typeof listPermissionGroupsContract>
export type PermissionGroup = NonNullable<PermissionGroupList['permissionGroups']>[number]

/** The organization's permission groups (Réglages › Groupes d'accès). Organization admins only. */
export function usePermissionGroups(organizationId: string) {
  return useQuery({
    queryKey: permissionGroupKeys.list(organizationId),
    queryFn: async ({ signal }) => {
      const data = await requestJson(listPermissionGroupsContract, {
        params: { id: organizationId },
        signal,
      })
      return data.permissionGroups ?? []
    },
    staleTime: PERMISSION_GROUPS_STALE_TIME,
  })
}

export function usePermissionGroupMembers(organizationId: string, groupId: string | null) {
  return useQuery({
    queryKey: permissionGroupKeys.members(organizationId, groupId ?? undefined),
    queryFn: async ({ signal }) => {
      const data = await requestJson(listPermissionGroupMembersContract, {
        params: { id: organizationId, groupId: groupId ?? '' },
        signal,
      })
      return data.members ?? []
    },
    enabled: Boolean(groupId),
    staleTime: PERMISSION_GROUPS_STALE_TIME,
  })
}

/** The organization's workspaces a group can target. */
export function useOrganizationWorkspaceRefs(organizationId: string) {
  return useQuery({
    queryKey: permissionGroupKeys.orgWorkspaces(organizationId),
    queryFn: async ({ signal }) => {
      const data = await requestJson(listOrganizationWorkspacesContract, {
        params: { id: organizationId },
        signal,
      })
      return data.workspaces
    },
    staleTime: PERMISSION_GROUPS_STALE_TIME,
  })
}

/**
 * A group change changes what its members may do: the group list, the group's members and every
 * cached effective config (`userConfig`) are refetched, so the root key is invalidated.
 */
function useInvalidatePermissionGroups() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: permissionGroupKeys.all })
}

export function useCreatePermissionGroup(organizationId: string) {
  const invalidate = useInvalidatePermissionGroups()
  return useMutation({
    mutationFn: (body: CreatePermissionGroupBody) =>
      requestJson(createPermissionGroupContract, { params: { id: organizationId }, body }),
    onSuccess: invalidate,
  })
}

export function useUpdatePermissionGroup(organizationId: string) {
  const invalidate = useInvalidatePermissionGroups()
  return useMutation({
    mutationFn: ({ groupId, body }: { groupId: string; body: UpdatePermissionGroupBody }) =>
      requestJson(updatePermissionGroupContract, {
        params: { id: organizationId, groupId },
        body,
      }),
    onSuccess: invalidate,
  })
}

export function useDeletePermissionGroup(organizationId: string) {
  const invalidate = useInvalidatePermissionGroups()
  return useMutation({
    mutationFn: (groupId: string) =>
      requestJson(deletePermissionGroupContract, { params: { id: organizationId, groupId } }),
    onSuccess: invalidate,
  })
}

export function useAddPermissionGroupMember(organizationId: string) {
  const invalidate = useInvalidatePermissionGroups()
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      requestJson(addPermissionGroupMemberContract, {
        params: { id: organizationId, groupId },
        body: { userId },
      }),
    onSuccess: invalidate,
  })
}

export function useRemovePermissionGroupMember(organizationId: string) {
  const invalidate = useInvalidatePermissionGroups()
  return useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) =>
      requestJson(removePermissionGroupMemberContract, {
        params: { id: organizationId, groupId },
        query: { memberId },
      }),
    onSuccess: invalidate,
  })
}
