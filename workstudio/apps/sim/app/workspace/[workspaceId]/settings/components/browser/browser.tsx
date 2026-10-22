'use client'

import { useCallback, useEffect, useState } from 'react'
import { BROWSER_DATA_KINDS, type BrowserDataKind } from '@sim/browser-protocol'
import type {
  BrowserCredentialMetadata,
  DesktopAppearanceTheme,
  DesktopPreferences,
  DesktopZoomPercent,
} from '@sim/desktop-bridge'
import { Chip, ChipConfirmModal, Label, Switch, toast } from '@sim/emcn'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getDesktopBridge } from '@/lib/desktop'
import { AppearanceThemeSelect } from '@/app/workspace/[workspaceId]/settings/components/appearance-theme-select'
import { PasswordsView } from '@/app/workspace/[workspaceId]/settings/components/browser/components/passwords-view/passwords-view'
import { DefaultZoomSelect } from '@/app/workspace/[workspaceId]/settings/components/default-zoom-select'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { useDesktopPreferenceMutation } from '@/hooks/use-desktop-preference-mutation'

interface DataRow {
  kind: BrowserDataKind
  /**
   * Message key for the row's label, action, and consequence. The consequence is
   * what the user actually loses: not shown in the row — the action names
   * itself — but spelled out in the confirmation, where it matters.
   */
  key: 'cookies' | 'siteData' | 'cache'
}

/**
 * Download history is deliberately absent: files are saved directly to the
 * configured folder without retaining a separate browsing-history record.
 */
const DATA_ROWS: DataRow[] = [
  { kind: 'cookies', key: 'cookies' },
  { kind: 'site-data', key: 'siteData' },
  { kind: 'cache', key: 'cache' },
]

export function Browser() {
  const t = useTranslations('settings.browser')
  const tShared = useTranslations('settings.shared')
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const workspaceId = params.workspaceId as string
  const [preferences, setPreferences] = useState<DesktopPreferences | null>(null)
  const [credentials, setCredentials] = useState<BrowserCredentialMetadata[]>([])
  const openImport = searchParams.get('browserImport') === '1'
  const [showPasswords, setShowPasswords] = useState(
    searchParams.get('browserView') === 'passwords' || openImport
  )
  const [confirming, setConfirming] = useState<DataRow | 'all' | null>(
    searchParams.get('browserClear') === '1' ? 'all' : null
  )
  const [clearPending, setClearPending] = useState(false)

  const { pending: themePending, mutate: setTheme } = useDesktopPreferenceMutation(
    (bridge, theme: DesktopAppearanceTheme) => bridge.settings.setBrowserTheme(theme),
    t('errors.theme'),
    setPreferences
  )

  const { pending: zoomPending, mutate: setDefaultZoom } = useDesktopPreferenceMutation(
    (bridge, zoom: DesktopZoomPercent) => bridge.settings.setBrowserDefaultZoom(zoom),
    t('errors.zoom'),
    setPreferences
  )

  // A cancelled chooser resolves without preferences, which the hook skips.
  const { pending: downloadDirectoryPending, mutate: chooseDownloadDirectory } =
    useDesktopPreferenceMutation(
      (bridge) => bridge.settings.chooseBrowserDownloadDirectory(),
      t('errors.downloadDirectory'),
      setPreferences
    )

  const refreshCredentials = useCallback(async () => {
    const bridge = getDesktopBridge()?.browserCredentials
    if (!bridge) return
    const available = await bridge.isAvailable().catch(() => false)
    setCredentials(available ? await bridge.list().catch(() => []) : [])
  }, [])

  useEffect(() => {
    const bridge = getDesktopBridge()
    if (!bridge) {
      router.replace(`/workspace/${workspaceId}/settings/general`)
      return
    }
    void Promise.all([bridge.settings.getPreferences(), refreshCredentials()])
      .then(([next]) => setPreferences(next))
      .catch(() => toast.error(t('errors.load')))
  }, [refreshCredentials, router, workspaceId])

  const { pending: togglePending, mutate: setEnabled } = useDesktopPreferenceMutation(
    (bridge, enabled: boolean) => bridge.settings.setPreference('browserEnabled', enabled),
    t('errors.update'),
    setPreferences
  )

  const { pending: searchSuggestionsPending, mutate: setSearchSuggestionsEnabled } =
    useDesktopPreferenceMutation(
      async (bridge, enabled: boolean) =>
        bridge.settings.setBrowserSearchSuggestionsEnabled?.(enabled),
      t('errors.searchSuggestions'),
      setPreferences
    )

  const clear = useCallback(async (kinds: readonly BrowserDataKind[]) => {
    const desktop = getDesktopBridge()
    if (!desktop) return
    setClearPending(true)
    try {
      await desktop.browserAgent.clearBrowsingData(kinds)
      setConfirming(null)
    } catch {
      toast.error(t('errors.clear'))
    } finally {
      setClearPending(false)
    }
  }, [])

  const actions = [
    {
      id: 'passwords',
      text: t('actions.passwords'),
      onSelect: () => setShowPasswords(true),
      disabled: !preferences,
    },
    {
      id: 'clear-all',
      text: t('actions.clearAll'),
      variant: 'destructive' as const,
      onSelect: () => setConfirming('all'),
      disabled: !preferences || clearPending,
    },
  ]

  if (!preferences) {
    return <SettingsPanel actions={actions} />
  }

  if (showPasswords) {
    return (
      <PasswordsView
        credentials={credentials}
        initialImportOpen={openImport}
        onChange={setCredentials}
        onBack={() => setShowPasswords(false)}
        onImported={refreshCredentials}
      />
    )
  }

  const enabled = preferences.browserEnabled
  const supportsSearchSuggestions = Boolean(
    getDesktopBridge()?.settings.setBrowserSearchSuggestionsEnabled
  )
  const target = confirming === 'all' ? null : confirming

  return (
    <>
      <SettingsPanel actions={actions}>
        <SettingsSection label={t('sections.general')}>
          <div className='flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='browser-enabled'>{t('enabled')}</Label>
              <Switch
                id='browser-enabled'
                checked={enabled}
                disabled={togglePending}
                onCheckedChange={(checked) => void setEnabled(checked)}
              />
            </div>

            {supportsSearchSuggestions && (
              <div className='flex items-center justify-between gap-4'>
                <div className='flex min-w-0 flex-col gap-1'>
                  <Label htmlFor='browser-search-suggestions'>{t('searchSuggestions')}</Label>
                  <p className='text-[var(--text-muted)] text-caption'>
                    {t('searchSuggestionsDescription')}
                  </p>
                </div>
                <Switch
                  id='browser-search-suggestions'
                  checked={preferences.browserSearchSuggestionsEnabled ?? true}
                  disabled={searchSuggestionsPending}
                  onCheckedChange={(checked) => void setSearchSuggestionsEnabled(checked)}
                />
              </div>
            )}

            <div className='flex items-center justify-between gap-4'>
              <Label>{t('theme')}</Label>
              <AppearanceThemeSelect
                ariaLabel={t('themeAriaLabel')}
                value={preferences.browserTheme}
                disabled={themePending}
                onChange={(theme) => void setTheme(theme)}
              />
            </div>

            <div className='flex items-center justify-between gap-4'>
              <Label>{t('defaultZoom')}</Label>
              <DefaultZoomSelect
                value={preferences.browserDefaultZoom}
                onChange={(zoom) => void setDefaultZoom(zoom)}
                disabled={zoomPending}
              />
            </div>

            <div className='flex items-center justify-between gap-4'>
              <div className='flex min-w-0 flex-col gap-1'>
                <Label>{t('downloadLocation')}</Label>
                <p
                  className='max-w-[520px] truncate text-[var(--text-muted)] text-caption'
                  title={preferences.browserDownloadDirectory}
                >
                  {preferences.browserDownloadDirectory}
                </p>
              </div>
              <Chip
                disabled={downloadDirectoryPending}
                onClick={() => void chooseDownloadDirectory()}
              >
                {downloadDirectoryPending ? t('choosing') : t('change')}
              </Chip>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection label={t('sections.browsingData')}>
          <div className='flex flex-col gap-3'>
            {DATA_ROWS.map((row) => (
              <div key={row.kind} className='flex items-center justify-between'>
                <Label>{t(`dataRows.${row.key}.label`)}</Label>
                <Chip disabled={clearPending} onClick={() => setConfirming(row)}>
                  {t(`dataRows.${row.key}.action`)}
                </Chip>
              </div>
            ))}
          </div>
        </SettingsSection>
      </SettingsPanel>

      <ChipConfirmModal
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={target ? t(`dataRows.${target.key}.action`) : t('clearConfirm.allTitle')}
        defaultAction={target?.kind === 'cache' ? 'confirm' : 'dismiss'}
        text={[
          t('clearConfirm.before'),
          {
            text: target
              ? t(`dataRows.${target.key}.consequence`)
              : t('clearConfirm.allConsequence'),
            bold: true,
          },
          t('clearConfirm.after'),
        ]}
        confirm={{
          label: target ? t(`dataRows.${target.key}.action`) : t('actions.clearAll'),
          pending: clearPending,
          pendingLabel: tShared('deleting'),
          onClick: () => void clear(target ? [target.kind] : BROWSER_DATA_KINDS),
        }}
      />
    </>
  )
}
