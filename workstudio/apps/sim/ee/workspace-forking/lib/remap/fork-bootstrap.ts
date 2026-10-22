// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

/** Identity transform: without forks no sub-block reference needs remapping. */
export function createForkBootstrapTransform(
  _resolve: (kind: string, id: string) => string | null
): <T>(subBlocks: T, kind?: string) => T {
  return (subBlocks) => subBlocks
}
