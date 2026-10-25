/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { hasStepsMarker, resolveEditorMode, STEPS_MARKER } from '@/lib/nexora/steps/mode'

describe('resolveEditorMode', () => {
  it('ouvre en Étapes un workflow construit en étapes et resté reconnu', () => {
    expect(resolveEditorMode({ preference: null, marked: true, recognized: true })).toBe('steps')
  })

  it('ouvre en canevas tous les autres workflows', () => {
    expect(resolveEditorMode({ preference: null, marked: false, recognized: true })).toBe('canvas')
    expect(resolveEditorMode({ preference: null, marked: true, recognized: false })).toBe('canvas')
  })

  it('respecte le choix de la personne, même en lecture seule', () => {
    expect(resolveEditorMode({ preference: 'canvas', marked: true, recognized: true })).toBe(
      'canvas'
    )
    expect(resolveEditorMode({ preference: 'steps', marked: false, recognized: false })).toBe(
      'steps'
    )
  })
})

describe('hasStepsMarker', () => {
  const trigger = (type: string, value: unknown) => ({
    blocks: {
      a: {
        type,
        subBlocks: { [STEPS_MARKER.id]: { id: STEPS_MARKER.id, type: 'short-input', value } },
      },
    },
  })

  it('lit le repère posé sur le déclencheur', () => {
    expect(hasStepsMarker(trigger('start_trigger', 'etapes'))).toBe(true)
    expect(hasStepsMarker(trigger('schedule', 'etapes'))).toBe(true)
  })

  it('ignore un autre contenu, un autre bloc et un état malformé', () => {
    expect(hasStepsMarker(trigger('start_trigger', 'autre'))).toBe(false)
    expect(hasStepsMarker(trigger('agent', 'etapes'))).toBe(false)
    expect(hasStepsMarker(null)).toBe(false)
    expect(hasStepsMarker({ blocks: [] })).toBe(false)
  })
})
