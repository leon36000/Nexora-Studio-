// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

/** No workspace has a fork parent or children in this edition. */
export async function getForkParentId(..._args: unknown[]): Promise<string | null> {
  return null
}
export async function getForkParent(..._args: unknown[]): Promise<null> {
  return null
}
export async function getForkChildren(..._args: unknown[]): Promise<never[]> {
  return []
}
export async function resolveForkEdge(..._args: unknown[]): Promise<null> {
  return null
}
export async function setForkLockTimeout(..._args: unknown[]): Promise<void> {}
export async function acquireForkEdgeLock(..._args: unknown[]): Promise<void> {}
export async function acquireForkTargetLock(..._args: unknown[]): Promise<void> {}
export async function acquireForkLineageLock(..._args: unknown[]): Promise<void> {}
