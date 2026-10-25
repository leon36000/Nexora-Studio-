import type { UpdateNexoraDataProtectionBody } from '@/lib/api/contracts/nexora-data-protection'
import type { NexoraDataProtection } from '@/hooks/queries/nexora-data-protection'

type PersonalDataMode = NexoraDataProtection['policy']['defaultMode']

/** A workspace's choice: one of the modes, or « inherit » to follow the instance default. */
export type WorkspaceChoice = PersonalDataMode | 'inherit'

export interface PolicyDraft {
  defaultMode: PersonalDataMode
  choices: Record<string, WorkspaceChoice>
}

export function draftFromOverview(overview: NexoraDataProtection): PolicyDraft {
  const choices: Record<string, WorkspaceChoice> = {}
  for (const workspace of overview.workspaces) {
    choices[workspace.id] = Object.hasOwn(overview.policy.workspaceModes, workspace.id)
      ? overview.policy.workspaceModes[workspace.id]
      : 'inherit'
  }
  return { defaultMode: overview.policy.defaultMode, choices }
}

export function samePolicyDraft(a: PolicyDraft, b: PolicyDraft): boolean {
  if (a.defaultMode !== b.defaultMode) return false
  const ids = new Set([...Object.keys(a.choices), ...Object.keys(b.choices)])
  return [...ids].every((id) => (a.choices[id] ?? 'inherit') === (b.choices[id] ?? 'inherit'))
}

/** The smallest save that turns `initial` into `draft`, or `null` when they are the same. */
export function policyChange(
  initial: PolicyDraft,
  draft: PolicyDraft
): UpdateNexoraDataProtectionBody | null {
  const workspaceModes: Record<string, PersonalDataMode | null> = {}
  for (const [id, choice] of Object.entries(draft.choices)) {
    if (choice === (initial.choices[id] ?? 'inherit')) continue
    workspaceModes[id] = choice === 'inherit' ? null : choice
  }
  const body: UpdateNexoraDataProtectionBody = {}
  if (draft.defaultMode !== initial.defaultMode) body.defaultMode = draft.defaultMode
  if (Object.keys(workspaceModes).length > 0) body.workspaceModes = workspaceModes
  return Object.keys(body).length > 0 ? body : null
}
