// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

export interface ForkCopyProgress {
  completed: string[]
  tables: Record<string, unknown>
  embeddings: Record<string, unknown>
}
