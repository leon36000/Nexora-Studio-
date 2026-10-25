/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import {
  applyTraceSettingsChange,
  DEFAULT_TRACE_SETTINGS,
  parseStoredTraceSettings,
  presentTraceSettings,
  TraceSettingsError,
} from '@/lib/nexora/traces/settings'

const encrypt = async (secret: string) => `enc(${secret})`

describe('parseStoredTraceSettings', () => {
  it('donne les défauts d’une instance neuve : 30 jours, masquage standard, export éteint', () => {
    expect(parseStoredTraceSettings({})).toEqual(DEFAULT_TRACE_SETTINGS)
    expect(DEFAULT_TRACE_SETTINGS).toMatchObject({
      enabled: true,
      retentionDays: 30,
      redaction: 'standard',
      conversationRetentionDays: null,
      otlp: { enabled: false, endpoint: '', headers: [] },
    })
  })

  it.each([
    [{ nexoraTraces: 'n’importe quoi' }],
    [{ nexoraTraces: { retentionDays: 'trente', redaction: 'tout', otlp: 3 } }],
    [{ nexoraTraces: { retentionDays: -4, conversationRetentionDays: 0 } }],
    [null],
    [undefined],
  ])('retombe sur les défauts quand ce qui est stocké est illisible (%j)', (metadata) => {
    expect(parseStoredTraceSettings(metadata)).toEqual(DEFAULT_TRACE_SETTINGS)
  })

  it('garde les autres clés des métadonnées hors de son périmètre', () => {
    const stored = parseStoredTraceSettings({
      nexoraBudgets: { instanceMonthlyTokens: 5 },
      nexoraTraces: { retentionDays: 7, redaction: 'strict' },
    })
    expect(stored.retentionDays).toBe(7)
    expect(stored.redaction).toBe('strict')
  })
})

describe('applyTraceSettingsChange', () => {
  const base = DEFAULT_TRACE_SETTINGS

  it.each([0, 366, 1.5, Number.NaN, -1])('refuse une rétention de %s jours', async (days) => {
    await expect(applyTraceSettingsChange(base, { retentionDays: days }, encrypt)).rejects.toBeInstanceOf(
      TraceSettingsError
    )
  })

  it('accepte les bornes 1 et 365', async () => {
    expect((await applyTraceSettingsChange(base, { retentionDays: 1 }, encrypt)).retentionDays).toBe(1)
    expect((await applyTraceSettingsChange(base, { retentionDays: 365 }, encrypt)).retentionDays).toBe(365)
  })

  it('règle la rétention des conversations de 1 à 3650 jours, ou la retire avec null', async () => {
    const withLimit = await applyTraceSettingsChange(base, { conversationRetentionDays: 90 }, encrypt)
    expect(withLimit.conversationRetentionDays).toBe(90)
    expect((await applyTraceSettingsChange(withLimit, { conversationRetentionDays: null }, encrypt)).conversationRetentionDays).toBeNull()
    await expect(applyTraceSettingsChange(base, { conversationRetentionDays: 0 }, encrypt)).rejects.toBeInstanceOf(TraceSettingsError)
    await expect(applyTraceSettingsChange(base, { conversationRetentionDays: 3651 }, encrypt)).rejects.toBeInstanceOf(TraceSettingsError)
  })

  it.each(['ftp://collecteur.local/v1/traces', 'collecteur.local', 'javascript:alert(1)'])(
    'refuse l’adresse de collecteur %s',
    async (endpoint) => {
      await expect(
        applyTraceSettingsChange(base, { otlp: { enabled: true, endpoint } }, encrypt)
      ).rejects.toBeInstanceOf(TraceSettingsError)
    }
  )

  it('refuse d’activer l’export sans adresse', async () => {
    await expect(applyTraceSettingsChange(base, { otlp: { enabled: true } }, encrypt)).rejects.toBeInstanceOf(
      TraceSettingsError
    )
  })

  it('chiffre les valeurs d’en-têtes et garde celle d’un en-tête laissé vide', async () => {
    const first = await applyTraceSettingsChange(
      base,
      {
        otlp: {
          enabled: true,
          endpoint: 'http://langfuse.local:3000/api/public/otel/v1/traces',
          headers: [{ name: 'Authorization', value: 'Basic abc' }],
        },
      },
      encrypt
    )
    expect(first.otlp.headers).toEqual([{ name: 'Authorization', value: 'enc(Basic abc)' }])
    const second = await applyTraceSettingsChange(
      first,
      { otlp: { headers: [{ name: 'authorization', value: '' }, { name: 'x-langfuse-ingestion-version', value: '4' }] } },
      encrypt
    )
    expect(second.otlp.headers).toEqual([
      { name: 'Authorization', value: 'enc(Basic abc)' },
      { name: 'x-langfuse-ingestion-version', value: 'enc(4)' },
    ])
  })

  it('refuse un en-tête sans valeur ni valeur déjà stockée, ou au nom invalide', async () => {
    await expect(
      applyTraceSettingsChange(base, { otlp: { headers: [{ name: 'Authorization', value: '' }] } }, encrypt)
    ).rejects.toBeInstanceOf(TraceSettingsError)
    await expect(
      applyTraceSettingsChange(base, { otlp: { headers: [{ name: 'bad name\n', value: 'x' }] } }, encrypt)
    ).rejects.toBeInstanceOf(TraceSettingsError)
  })

  it('retire les en-têtes absents de la nouvelle liste', async () => {
    const withHeader = { ...base, otlp: { ...base.otlp, headers: [{ name: 'X-A', value: 'enc(1)' }] } }
    const cleared = await applyTraceSettingsChange(withHeader, { otlp: { headers: [] } }, encrypt)
    expect(cleared.otlp.headers).toEqual([])
  })

  it('ne modifie pas ce qui n’est pas demandé', async () => {
    const changed = await applyTraceSettingsChange(base, { enabled: false }, encrypt)
    expect(changed).toEqual({ ...base, enabled: false })
  })
})

describe('presentTraceSettings', () => {
  it('ne renvoie jamais une valeur d’en-tête, chiffrée ou non', () => {
    const presented = presentTraceSettings({
      ...DEFAULT_TRACE_SETTINGS,
      otlp: {
        enabled: true,
        endpoint: 'http://c.local/v1/traces',
        headers: [{ name: 'Authorization', value: 'enc(Basic secret)' }],
      },
    })
    expect(JSON.stringify(presented)).not.toContain('secret')
    expect(presented.otlp.headers).toEqual([{ name: 'Authorization', hasValue: true }])
  })
})
