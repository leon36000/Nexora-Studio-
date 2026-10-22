// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.

import { FeatureDisabledError } from '@/ee/_nexora/disabled'

export async function copyForkResourceContainers(
  _args: any
): Promise<{ contentPlan: { knowledgeBases: any[]; [key: string]: any }; [key: string]: any }> {
  throw new FeatureDisabledError('Workspace forking')
}
export async function copyForkResourceContent(_args: any): Promise<any> {
  throw new FeatureDisabledError('Workspace forking')
}
export async function planForkMappedKbDocumentCopies(_args: {
  resolver?: (kind: string, id: string) => string | null
  [key: string]: any
}): Promise<any> {
  throw new FeatureDisabledError('Workspace forking')
}
