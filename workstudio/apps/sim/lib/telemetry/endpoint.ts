/** Environment variables that can name an OpenTelemetry collector. */
export interface TelemetryEndpointEnv {
  OTEL_EXPORTER_OTLP_ENDPOINT?: string
  TELEMETRY_ENDPOINT?: string
  NEXT_TELEMETRY_DISABLED?: string
}

function normalize(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : null
}

/**
 * The collector to export telemetry to, or `null` when telemetry is off.
 * There is no default collector: nothing leaves the instance unless an operator
 * names one. Prefers the OpenTelemetry spec variable over the legacy one.
 */
export function resolveTelemetryEndpoint(vars: TelemetryEndpointEnv): string | null {
  if (vars.NEXT_TELEMETRY_DISABLED === '1') return null
  return normalize(vars.OTEL_EXPORTER_OTLP_ENDPOINT) ?? normalize(vars.TELEMETRY_ENDPOINT)
}
