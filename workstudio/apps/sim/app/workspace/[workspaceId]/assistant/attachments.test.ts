import { describe, expect, it } from 'vitest'
import {
  ASSISTANT_MAX_FILE_BYTES,
  ASSISTANT_MAX_FILES,
  admitAttachments,
} from '@/app/workspace/[workspaceId]/assistant/attachments'

function file(name: string, size = 1024): { name: string; size: number } {
  return { name, size }
}

describe('admitAttachments', () => {
  it('admits documents and images the agent can read', () => {
    const result = admitAttachments([], [file('devis.pdf'), file('photo.png'), file('notes.txt')])
    expect(result.admitted.map((f) => f.name)).toEqual(['devis.pdf', 'photo.png', 'notes.txt'])
    expect(result.refused).toEqual([])
  })

  it('refuses a file over the size limit before anything is sent', () => {
    const result = admitAttachments([], [file('gros.pdf', ASSISTANT_MAX_FILE_BYTES + 1)])
    expect(result.admitted).toEqual([])
    expect(result.refused).toEqual([{ name: 'gros.pdf', reason: 'too-large' }])
  })

  it('accepts a file of exactly the size limit', () => {
    const result = admitAttachments([], [file('juste.pdf', ASSISTANT_MAX_FILE_BYTES)])
    expect(result.admitted).toHaveLength(1)
  })

  it('refuses an empty file', () => {
    expect(admitAttachments([], [file('vide.pdf', 0)]).refused).toEqual([
      { name: 'vide.pdf', reason: 'empty' },
    ])
  })

  it('refuses executables, archives and files without an extension', () => {
    const result = admitAttachments([], [file('setup.exe'), file('dossier.zip'), file('README')])
    expect(result.admitted).toEqual([])
    expect(result.refused.map((r) => r.reason)).toEqual([
      'unsupported',
      'unsupported',
      'unsupported',
    ])
  })

  it('refuses a file already attached (same name and size)', () => {
    const result = admitAttachments([file('devis.pdf', 10)], [file('devis.pdf', 10)])
    expect(result.refused).toEqual([{ name: 'devis.pdf', reason: 'duplicate' }])
  })

  it('refuses a duplicate inside the same selection', () => {
    const result = admitAttachments([], [file('a.pdf', 10), file('a.pdf', 10)])
    expect(result.admitted).toHaveLength(1)
    expect(result.refused).toEqual([{ name: 'a.pdf', reason: 'duplicate' }])
  })

  it('stops at the per-message limit, counting files already attached', () => {
    const current = Array.from({ length: ASSISTANT_MAX_FILES - 1 }, (_, i) => file(`f${i}.pdf`))
    const result = admitAttachments(current, [file('dernier.pdf'), file('en-trop.pdf')])
    expect(result.admitted.map((f) => f.name)).toEqual(['dernier.pdf'])
    expect(result.refused).toEqual([{ name: 'en-trop.pdf', reason: 'too-many' }])
  })
})
