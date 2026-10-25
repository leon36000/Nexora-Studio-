import { describe, expect, it } from 'vitest'
import { selectDelegationTargets } from '@/lib/nexora/delegation/form-targets'

const folders = [
  { id: 'f-sub', name: 'Agents', parentId: 'f-other' },
  { id: 'f-agents', name: 'Agents', parentId: null },
  { id: 'f-other', name: 'Modèles PME', parentId: null },
]

const workflows = [
  { id: 'wf-tarifs', name: 'Agent tarifs', folderId: 'f-agents', isDeployed: true },
  { id: 'wf-brouillon', name: 'Agent brouillon', folderId: 'f-agents', isDeployed: false },
  { id: 'wf-ailleurs', name: 'Relance factures', folderId: 'f-other', isDeployed: true },
  { id: 'wf-sous-dossier', name: 'Agent rangé', folderId: 'f-sub', isDeployed: true },
  { id: 'wf-moi', name: 'Agent courant', folderId: 'f-agents', isDeployed: true },
  { id: 'wf-sans-dossier', name: 'Sans dossier', folderId: null, isDeployed: true },
]

describe('agents an agent can be allowed to hand a request to', () => {
  it('lists the deployed agents of the top-level « Agents » folder, not the agent itself', () => {
    expect(selectDelegationTargets(workflows, folders, 'wf-moi')).toEqual([
      { id: 'wf-tarifs', name: 'Agent tarifs' },
    ])
  })

  it('lists nothing while the folders are not known, or when the workspace has no « Agents » folder', () => {
    expect(selectDelegationTargets(workflows, undefined, 'wf-moi')).toEqual([])
    expect(selectDelegationTargets(workflows, [folders[2]], 'wf-moi')).toEqual([])
  })

  it('sorts agents by name', () => {
    const more = [
      ...workflows,
      { id: 'wf-a', name: 'Agent achats', folderId: 'f-agents', isDeployed: true },
    ]
    expect(selectDelegationTargets(more, folders, 'wf-moi').map((agent) => agent.name)).toEqual([
      'Agent achats',
      'Agent tarifs',
    ])
  })
})
