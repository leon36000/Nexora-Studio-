import { describe, expect, it } from 'vitest'
import { resolveTelemetryEndpoint } from '@/lib/telemetry/endpoint'

describe('resolveTelemetryEndpoint', () => {
  it('returns null when no collector is configured (no default third-party collector)', () => {
    expect(resolveTelemetryEndpoint({})).toBeNull()
  })

  it('prefers the OpenTelemetry spec variable', () => {
    expect(
      resolveTelemetryEndpoint({
        OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel.example/v1/traces',
        TELEMETRY_ENDPOINT: 'https://legacy.example/v1/traces',
      })
    ).toBe('https://otel.example/v1/traces')
  })

  it('falls back to the legacy TELEMETRY_ENDPOINT', () => {
    expect(resolveTelemetryEndpoint({ TELEMETRY_ENDPOINT: 'https://legacy.example' })).toBe(
      'https://legacy.example'
    )
  })

  it('ignores blank and non-http values', () => {
    expect(resolveTelemetryEndpoint({ TELEMETRY_ENDPOINT: '   ' })).toBeNull()
    expect(resolveTelemetryEndpoint({ TELEMETRY_ENDPOINT: 'ftp://x' })).toBeNull()
  })

  it('is disabled by NEXT_TELEMETRY_DISABLED=1 even when configured', () => {
    expect(
      resolveTelemetryEndpoint({
        TELEMETRY_ENDPOINT: 'https://legacy.example',
        NEXT_TELEMETRY_DISABLED: '1',
      })
    ).toBeNull()
  })
})
