// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

/** Mapping store surface (mocked by core tests). Without forks there are no mappings. */
export function resourceTypeToForkKind(resourceType: string): string {
  return resourceType
}
export function nonCredentialForkKindToResourceType(kind: string): string {
  return kind
}
export async function getEdgeMappingRows(..._args: unknown[]): Promise<never[]> {
  return []
}
export async function deleteWorkflowIdentityByIds(..._args: unknown[]): Promise<void> {}
export async function seedEdgeMappings(..._args: unknown[]): Promise<void> {}
export async function upsertEdgeMappings(..._args: unknown[]): Promise<void> {}
export function orientCopiedResourceMappings<T>(rows: T[]): T[] {
  return rows
}
export async function persistCopiedResourceMappings(..._args: unknown[]): Promise<void> {}
export async function deleteEdgeMappingsByChildResources(..._args: unknown[]): Promise<void> {}
export async function deleteCopiedResourceMappingsByTargets(..._args: unknown[]): Promise<void> {}
export function buildForkResolver(..._args: unknown[]): (kind: string, id: string) => string | null {
  return () => null
}
