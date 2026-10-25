import { describe, expect, it } from 'vitest'
import {
  asksByDefault,
  CONNECT_READ_ONLY_TOOLS,
  needsConfirmation,
  type ToolConfirmationSpec,
} from '@/lib/nexora/tool-confirmation/policy'

const connectExecute: ToolConfirmationSpec = {
  required: true,
  serverName: 'Nexora Connect',
  toolName: 'execute_action',
  title: 'execute_action',
}
const otherMcp: ToolConfirmationSpec = {
  required: true,
  serverName: 'Mon MCP',
  toolName: 'delete_row',
  title: 'delete_row',
}

const operationType =
  (known: Record<string, 'read' | 'write' | 'destructive' | null>) => async (actionId: string) =>
    known[actionId] ?? null

describe('needsConfirmation', () => {
  it('never asks for a tool that was not flagged', async () => {
    const decision = await needsConfirmation(
      { ...connectExecute, required: false },
      { actionId: 'postmark.send_email' },
      operationType({})
    )
    expect(decision).toEqual({ needed: false })
  })

  it('asks before a Nexora Connect write or destructive action, and names it', async () => {
    const lookup = operationType({
      'postmark.send_email': 'write',
      'github.delete_repo': 'destructive',
    })
    expect(
      await needsConfirmation(
        connectExecute,
        { actionId: 'postmark.send_email', input: { to: 'a@b.fr' } },
        lookup
      )
    ).toMatchObject({
      needed: true,
      title: 'postmark.send_email',
    })
    expect(
      (await needsConfirmation(connectExecute, { actionId: 'github.delete_repo' }, lookup)).needed
    ).toBe(true)
  })

  it('lets a Nexora Connect read action through', async () => {
    expect(
      await needsConfirmation(
        connectExecute,
        { actionId: 'postmark.get_server' },
        operationType({ 'postmark.get_server': 'read' })
      )
    ).toEqual({
      needed: false,
    })
  })

  it('asks when Connect cannot say what the action does (unknown action, catalogue unreachable, no action id)', async () => {
    expect(
      (await needsConfirmation(connectExecute, { actionId: 'inconnue.action' }, operationType({})))
        .needed
    ).toBe(true)
    expect(
      (
        await needsConfirmation(connectExecute, { actionId: 'x.y' }, async () => {
          throw new Error('Connect injoignable')
        })
      ).needed
    ).toBe(true)
    expect((await needsConfirmation(connectExecute, {}, operationType({}))).needed).toBe(true)
  })

  it('asks before any other flagged MCP tool, whatever it does', async () => {
    expect(await needsConfirmation(otherMcp, { id: 3 }, operationType({}))).toEqual({
      needed: true,
      title: 'delete_row',
    })
  })

  it("adds new MCP tools with the question on, except Connect's read-only ones", () => {
    expect(asksByDefault('Nexora Connect', 'execute_action')).toBe(true)
    expect(asksByDefault('Nexora Connect', 'search_actions')).toBe(false)
    expect(asksByDefault('Mon MCP', 'search_actions')).toBe(true)
    expect(asksByDefault(undefined, 'delete_row')).toBe(true)
  })

  it("knows Connect's read-only tools, which the form does not flag", () => {
    expect([...CONNECT_READ_ONLY_TOOLS].sort()).toEqual([
      'get_action_guide',
      'list_apps',
      'list_connections',
      'search_actions',
    ])
  })
})
