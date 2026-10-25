import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { EditorMode } from '@/lib/nexora/steps/mode'
import { registerUserDataReset } from '@/stores/user-data-reset-registry'

/** Workflows whose chosen view is remembered; the oldest choice is forgotten past this. */
const MAX_REMEMBERED_WORKFLOWS = 200

interface EditorViewState {
  /** What the person chose for each workflow; absent: the workflow's default view. */
  preferences: Record<string, EditorMode>
  setPreference: (workflowId: string, mode: EditorMode) => void
  reset: () => void
}

export const useEditorViewStore = create<EditorViewState>()(
  devtools(
    persist(
      (set) => ({
        preferences: {},
        setPreference: (workflowId, mode) =>
          set((state) => {
            const { [workflowId]: _previous, ...others } = state.preferences
            const kept = Object.entries(others).slice(-(MAX_REMEMBERED_WORKFLOWS - 1))
            return { preferences: { ...Object.fromEntries(kept), [workflowId]: mode } }
          }),
        reset: () => set({ preferences: {} }),
      }),
      { name: 'editor-view-mode', partialize: (state) => ({ preferences: state.preferences }) }
    ),
    { name: 'editor-view-mode-store' }
  )
)

registerUserDataReset('editor-view-mode', () => useEditorViewStore.getState().reset())
