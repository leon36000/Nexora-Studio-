import { describe, expect, it } from 'vitest'
import {
  defaultFolderId,
  folderChoices,
} from '@/app/workspace/[workspaceId]/components/copilot-dialog/folder-choices'
import type { WorkflowFolder } from '@/stores/folders/types'

const WORKSPACE = 'ws-1'

function folder(
  id: string,
  name: string,
  parentId: string | null = null,
  extra: Partial<WorkflowFolder> = {}
): WorkflowFolder {
  return {
    id,
    resourceType: 'workflow',
    name,
    userId: 'u-1',
    workspaceId: WORKSPACE,
    parentId,
    locked: false,
    sortOrder: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...extra,
  }
}

function map(...folders: WorkflowFolder[]): Record<string, WorkflowFolder> {
  return Object.fromEntries(folders.map((f) => [f.id, f]))
}

describe('folderChoices', () => {
  it('lists folders in sidebar order, each labelled with its full path', () => {
    const choices = folderChoices(
      map(
        folder('b', 'Ventes', null, { sortOrder: 1 }),
        folder('a', 'Compta', null, { sortOrder: 0 }),
        folder('a1', 'Factures', 'a')
      ),
      WORKSPACE
    )
    expect(choices).toEqual([
      { id: 'a', label: 'Compta' },
      { id: 'a1', label: 'Compta / Factures' },
      { id: 'b', label: 'Ventes' },
    ])
  })

  it('leaves out a locked folder and everything inside it', () => {
    const choices = folderChoices(
      map(
        folder('a', 'Archives', null, { locked: true }),
        folder('a1', '2025', 'a'),
        folder('b', 'Ventes')
      ),
      WORKSPACE
    )
    expect(choices.map((c) => c.id)).toEqual(['b'])
  })

  it('leaves out another workspace’s folders', () => {
    const choices = folderChoices(
      map(folder('a', 'Compta'), folder('x', 'Ailleurs', null, { workspaceId: 'ws-2' })),
      WORKSPACE
    )
    expect(choices.map((c) => c.id)).toEqual(['a'])
  })
})

describe('defaultFolderId', () => {
  const choices = [
    { id: 'a', label: 'Compta' },
    { id: 'b', label: 'Ventes' },
  ]

  it('starts at the workspace root when no folder is suggested', () => {
    expect(defaultFolderId(choices, [])).toBeNull()
    expect(defaultFolderId(choices, [null, undefined])).toBeNull()
  })

  it('takes the first suggested folder that can be chosen', () => {
    expect(defaultFolderId(choices, ['b', 'a'])).toBe('b')
    expect(defaultFolderId(choices, [null, 'a'])).toBe('a')
  })

  it('skips a suggested folder that was deleted or is locked', () => {
    expect(defaultFolderId(choices, ['deleted', 'a'])).toBe('a')
    expect(defaultFolderId(choices, ['locked'])).toBeNull()
  })
})
