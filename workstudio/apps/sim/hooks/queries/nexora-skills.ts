'use client'

import { useQuery } from '@tanstack/react-query'
import { requestJson } from '@/lib/api/client/request'
import { listSkillsContract } from '@/lib/api/contracts/skills'

/** A skill saved in Compétences shows up in the pickers within 30 s. */
const NEXORA_SKILLS_STALE_TIME = 30 * 1000

const nexoraSkillKeys = {
  all: ['nexora-skills'] as const,
  lists: () => [...nexoraSkillKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...nexoraSkillKeys.lists(), workspaceId] as const,
}

/**
 * The workspace's own skills (the built-in ones teach the workflow editor, not the people who
 * talk to an agent), for the agent form and the Assistant's `@`. Reads the skills contract
 * directly: the contracts barrel the Skills page's hook imports weighs on the Assistant's bundle.
 */
export function useWorkspaceSkills(workspaceId: string) {
  return useQuery({
    queryKey: nexoraSkillKeys.list(workspaceId),
    queryFn: async ({ signal }) =>
      (await requestJson(listSkillsContract, { query: { workspaceId }, signal })).data.filter(
        (skill) => !skill.readOnly
      ),
    enabled: Boolean(workspaceId),
    staleTime: NEXORA_SKILLS_STALE_TIME,
  })
}
