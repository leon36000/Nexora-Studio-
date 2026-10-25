import { describe, expect, it } from 'vitest'
import {
  type ActingMemberDependencies,
  registerRunMember,
  resolveActingMember,
} from '@/lib/nexora/acting-member'

const WS = 'workspace-1'
const TASK_WORKFLOW = 'wf-task'

function deps(overrides: Partial<ActingMemberDependencies> = {}): ActingMemberDependencies {
  return {
    taskOwner: async (workflowId) => (workflowId === TASK_WORKFLOW ? 'alice' : null),
    executionTrigger: async () => null,
    activeDeployer: async () => 'alice',
    ...overrides,
  }
}

describe('resolveActingMember', () => {
  it('is the member whose Assistant conversation the run serves, while it runs', async () => {
    const unregister = registerRunMember('exec-1', 'alice')
    await expect(
      resolveActingMember(
        { executionId: 'exec-1', workflowId: 'wf-agent', workspaceId: WS },
        deps()
      )
    ).resolves.toBe('alice')
    unregister()
    await expect(
      resolveActingMember(
        { executionId: 'exec-1', workflowId: 'wf-agent', workspaceId: WS },
        deps()
      )
    ).resolves.toBeNull()
  })

  it('does not let a run registered by one member serve another execution', async () => {
    const unregister = registerRunMember('exec-1', 'alice')
    await expect(
      resolveActingMember(
        { executionId: 'exec-2', workflowId: 'wf-agent', workspaceId: WS },
        deps()
      )
    ).resolves.toBeNull()
    unregister()
  })

  it('is the task owner when the planner starts the task', async () => {
    await expect(
      resolveActingMember(
        { executionId: 'exec-3', workflowId: TASK_WORKFLOW, workspaceId: WS },
        deps({ executionTrigger: async () => 'schedule' })
      )
    ).resolves.toBe('alice')
  })

  it('is the task owner when the owner runs the task by hand', async () => {
    await expect(
      resolveActingMember(
        { executionId: 'exec-4', workflowId: TASK_WORKFLOW, workspaceId: WS, actorUserId: 'alice' },
        deps({ executionTrigger: async () => 'manual' })
      )
    ).resolves.toBe('alice')
  })

  it('is nobody when another member runs the owner’s task by hand', async () => {
    await expect(
      resolveActingMember(
        { executionId: 'exec-5', workflowId: TASK_WORKFLOW, workspaceId: WS, actorUserId: 'bob' },
        deps({ executionTrigger: async () => 'manual' })
      )
    ).resolves.toBeNull()
  })

  it('is nobody for any other workflow', async () => {
    await expect(
      resolveActingMember(
        { executionId: 'exec-6', workflowId: 'wf-other', workspaceId: WS, actorUserId: 'alice' },
        deps({ executionTrigger: async () => 'schedule' })
      )
    ).resolves.toBeNull()
  })

  it('is nobody when a colleague deployed the version the planner starts', async () => {
    await expect(
      resolveActingMember(
        { executionId: 'exec-7', workflowId: TASK_WORKFLOW, workspaceId: WS },
        deps({ executionTrigger: async () => 'schedule', activeDeployer: async () => 'bob' })
      )
    ).resolves.toBeNull()
  })

  it('is nobody when the owner runs by hand a task whose version a colleague deployed', async () => {
    await expect(
      resolveActingMember(
        { executionId: 'exec-8', workflowId: TASK_WORKFLOW, workspaceId: WS, actorUserId: 'alice' },
        deps({ executionTrigger: async () => 'manual', activeDeployer: async () => 'bob' })
      )
    ).resolves.toBeNull()
  })

  it('is nobody when the task has no known deployer (no active version, API deployment)', async () => {
    await expect(
      resolveActingMember(
        { executionId: 'exec-9', workflowId: TASK_WORKFLOW, workspaceId: WS },
        deps({ executionTrigger: async () => 'schedule', activeDeployer: async () => null })
      )
    ).resolves.toBeNull()
  })

  it('does not apply the deployer rule to the member whose conversation the run serves', async () => {
    const unregister = registerRunMember('exec-10', 'alice')
    await expect(
      resolveActingMember(
        { executionId: 'exec-10', workflowId: TASK_WORKFLOW, workspaceId: WS },
        deps({ activeDeployer: async () => 'bob' })
      )
    ).resolves.toBe('alice')
    unregister()
  })
})
