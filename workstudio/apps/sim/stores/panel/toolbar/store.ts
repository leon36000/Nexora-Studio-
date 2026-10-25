import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type ToolbarSectionKey =
  | 'triggers'
  | 'essentials'
  | 'blocks'
  | 'connect'
  | 'customBlocks'
  | 'tools'

interface ToolbarState {
  expandedSections: Record<ToolbarSectionKey, boolean>
  setSectionExpanded: (key: ToolbarSectionKey, expanded: boolean) => void
}

const initialState: Pick<ToolbarState, 'expandedSections'> = {
  expandedSections: {
    essentials: true,
    triggers: false,
    blocks: true,
    connect: true,
    customBlocks: true,
    tools: false,
  },
}

export const useToolbarStore = create<ToolbarState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        setSectionExpanded: (key, expanded) =>
          set((state) => ({
            expandedSections: { ...state.expandedSections, [key]: expanded },
          })),
      }),
      {
        name: 'toolbar-state',
        partialize: (state) => ({ expandedSections: state.expandedSections }),
        merge: (persisted, current) => ({
          ...current,
          expandedSections: {
            ...current.expandedSections,
            ...(persisted as Partial<ToolbarState> | undefined)?.expandedSections,
          },
        }),
      }
    ),
    { name: 'toolbar-store' }
  )
)
