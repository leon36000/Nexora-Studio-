// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

export interface PromoteForkResult {
  operation?: unknown
  replayed?: boolean
  triggerUrlChanges?: Array<{ workflowName: string; path: string }>
  [key: string]: unknown
}
