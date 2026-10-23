// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.
'use client'

import { NexoraConsumption } from '@/app/workspace/[workspaceId]/settings/components/nexora-consumption/nexora-consumption'

interface UsageMonitoringProps {
  organizationId: string
  eventsHref?: string
  auditLogsHref?: string
}

/**
 * Nexora edition: Réglages › Consommation — the instance's consumption, its carbon footprint
 * and its monthly budgets, for the instance administrators.
 */
export function UsageMonitoring(_props: UsageMonitoringProps) {
  return <NexoraConsumption />
}
