import { describe, expect, it, vi } from 'vitest'
import { seedNexoraTemplates } from '@/lib/nexora/seed-templates'
import { NEXORA_TEMPLATES, NEXORA_TEMPLATES_FOLDER } from '@/lib/nexora/templates'

const workspace = { workspaceId: 'ws-1', userId: 'user-1' }

function deps() {
  return {
    createFolder: vi.fn().mockResolvedValue({ success: true, folder: { id: 'folder-1' } }),
    importWorkflow: vi.fn().mockResolvedValue({ workflowId: 'wf' }),
    model: 'vllm/nexora-default',
    enabled: true,
  }
}

describe('seedNexoraTemplates', () => {
  it('creates the « Modèles PME » folder and imports every template into it', async () => {
    const d = deps()
    await expect(seedNexoraTemplates(workspace, d)).resolves.toBe(NEXORA_TEMPLATES.length)
    expect(d.createFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws-1',
        userId: 'user-1',
        name: NEXORA_TEMPLATES_FOLDER,
        resourceType: 'workflow',
      })
    )
    expect(d.importWorkflow).toHaveBeenCalledTimes(NEXORA_TEMPLATES.length)
    for (const [call] of d.importWorkflow.mock.calls) {
      expect(call).toMatchObject({ workspaceId: 'ws-1', userId: 'user-1', folderId: 'folder-1' })
    }
    expect(d.importWorkflow.mock.calls.map(([call]) => call.name)).toEqual(
      NEXORA_TEMPLATES.map((t) => t.name)
    )
  })

  it('does nothing when templates are turned off', async () => {
    const d = { ...deps(), enabled: false }
    await expect(seedNexoraTemplates(workspace, d)).resolves.toBe(0)
    expect(d.createFolder).not.toHaveBeenCalled()
  })

  it('keeps importing the other templates when one fails, and never throws', async () => {
    const d = deps()
    d.importWorkflow.mockRejectedValueOnce(new Error('boom'))
    await expect(seedNexoraTemplates(workspace, d)).resolves.toBe(NEXORA_TEMPLATES.length - 1)
    const failing = { ...deps(), createFolder: vi.fn().mockRejectedValue(new Error('db down')) }
    await expect(seedNexoraTemplates(workspace, failing)).resolves.toBe(0)
  })
})
