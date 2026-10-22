// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import type { ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { EmptyState } from '@/components/empty-state/empty-state'
import { PLATFORM_FEATURES } from '@/lib/permission-groups/features'
import { useUserPermissionConfig } from '@/ee/access-control/hooks/permission-groups'
import { useDiscoverAccessRequests } from '@/hooks/queries/access-requests'
import { workspaceFeatureDiscoveryQuery } from '@/hooks/queries/utils/access-request-keys'

interface PermissionAccessBoundaryProps {
  /** The boolean permission-group key that, when true, withholds the guarded surface. */
  configKey: string
  children?: ReactNode
}

/**
 * Page gate for a permission-group restriction (`hideTablesTab`, `hideCopilot`, ...).
 *
 * It fails closed: the guarded children render only once the caller's policy for the CURRENT
 * workspace is known and does not withhold `configKey`. While the policy (or, for a withheld
 * surface, the access-request discovery the server prefetch seeds) is unknown it shows
 * "Checking access"; a withheld surface shows a restriction notice. Access requests are disabled
 * in this edition, so the notice never offers a request.
 */
export function PermissionAccessBoundary({ configKey, children }: PermissionAccessBoundaryProps) {
  const params = useParams()
  const workspaceId = typeof params?.workspaceId === 'string' ? params.workspaceId : undefined
  const policy = useUserPermissionConfig(workspaceId)
  const policyKnown = Boolean(workspaceId) && policy.isSuccess && policy.data !== undefined
  const config = policy.data?.config as Record<string, unknown> | null | undefined
  const restricted = policyKnown && config?.[configKey] === true
  const discovery = useDiscoverAccessRequests(
    workspaceFeatureDiscoveryQuery(workspaceId ?? ''),
    restricted
  )

  if (!policyKnown || (restricted && discovery.isPending)) {
    return <EmptyState title='Checking access' description='Loading your access policy.' />
  }
  if (!restricted) return children ?? null

  const feature = PLATFORM_FEATURES.find((candidate) => candidate.configKey === configKey)
  return (
    <EmptyState
      title={feature ? `${feature.label} is not available` : 'Not available'}
      description='Your organization’s access policy does not include this. Ask an organization admin if you need it.'
    />
  )
}

/** Access requests are disabled in this edition: no surface offers a request. */
export function useWorkspaceAccessRequestFeatures() {
  return {
    data: { enabled: false } as { enabled: boolean } | undefined,
    isLoading: false,
    isSuccess: true,
  }
}
