import { isRecordLike } from '@sim/utils/object'

/**
 * Nexora edition: the instance organization's metadata holds server-only state under `nexora*`
 * keys — the instance settings (identity provider, SMTP server, encrypted secrets, domains), the
 * monthly budgets and the first-launch progress. Every presentation of an organization to a
 * client goes through this, so a member reading their organization never sees them.
 */
export function withoutNexoraMetadata<T>(metadata: T): T {
  if (!isRecordLike(metadata)) return metadata
  const kept: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (!/^nexora/i.test(key)) kept[key] = value
  }
  return kept as T
}

/**
 * {@link withoutNexoraMetadata} applied to every `metadata` found in a response body: the Better
 * Auth organization endpoints return organizations alone, in lists, or nested in members.
 */
export function withoutNexoraMetadataDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutNexoraMetadataDeep)
  if (!isRecordLike(value)) return value
  const result: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    result[key] =
      key === 'metadata'
        ? withoutNexoraMetadata(withoutNexoraMetadataDeep(entry))
        : withoutNexoraMetadataDeep(entry)
  }
  return result
}
