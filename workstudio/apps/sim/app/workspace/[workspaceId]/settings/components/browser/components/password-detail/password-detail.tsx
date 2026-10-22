'use client'

import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import type { BrowserCredentialMetadata } from '@sim/desktop-bridge'
import {
  ArrowLeft,
  Button,
  ChipConfirmModal,
  ChipCopyInput,
  ChipInput,
  cn,
  Duplicate,
  Eye,
  EyeOff,
  Tooltip,
  toast,
} from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { BrowserCredentialIcon } from '@/components/browser-credential-icon'
import { getDesktopBridge } from '@/lib/desktop'
import {
  RESOURCE_TILE_BASE,
  RESOURCE_TILE_PLAIN,
} from '@/app/workspace/[workspaceId]/components/resource-tile'
import { SettingsField } from '@/app/workspace/[workspaceId]/settings/components/settings-field'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'

/** The same focus-independent mask the Secrets page uses for values. */
const MASKED_STYLE = { WebkitTextSecurity: 'disc' } as CSSProperties
const MASK_PLACEHOLDER = '\u2022'.repeat(12)

/**
 * A revealed password re-hides itself rather than staying on screen for the
 * rest of the session. Long enough to read or type, short enough that walking
 * away does not leave it visible.
 */
const REVEAL_TIMEOUT_MS = 30_000

function siteLabel(origin: string): string {
  return origin.replace(/^https?:\/\//, '')
}

interface PasswordDetailProps {
  credential: BrowserCredentialMetadata
  onBack: () => void
  onForgotten: (credentials: BrowserCredentialMetadata[]) => void
}

/**
 * One saved login.
 *
 * The password is masked like any other secret field, but unlike the Secrets
 * page it does not reveal on focus — Sim does not hold the plaintext until the
 * shell hands it over, and the shell asks for Touch ID first. Copying never
 * brings the password into this page at all.
 */
export function PasswordDetail({ credential, onBack, onForgotten }: PasswordDetailProps) {
  const t = useTranslations('settings.browser.passwordDetail')
  const [revealed, setRevealed] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmingForget, setConfirmingForget] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = null
    setRevealed(null)
  }, [])

  // Nothing revealed may outlive this view, including a switch to another
  // credential without unmounting.
  useEffect(() => hide, [hide])
  useEffect(() => {
    hide()
  }, [hide])

  const toggleReveal = useCallback(async () => {
    if (revealed !== null) {
      hide()
      return
    }
    const bridge = getDesktopBridge()?.browserCredentials
    if (!bridge) return
    setBusy(true)
    try {
      // The shell prompts for Touch ID here; null means the user declined.
      const password = await bridge.reveal(credential.id)
      if (password === null) return
      setRevealed(password)
      hideTimer.current = setTimeout(hide, REVEAL_TIMEOUT_MS)
    } catch {
      toast.error(t('revealError'))
    } finally {
      setBusy(false)
    }
  }, [credential.id, hide, revealed])

  const copy = useCallback(async () => {
    const bridge = getDesktopBridge()?.browserCredentials
    if (!bridge) return
    setBusy(true)
    try {
      await bridge.copy(credential.id)
    } catch {
      toast.error(t('copyError'))
    } finally {
      setBusy(false)
    }
  }, [credential.id])

  const forget = useCallback(async () => {
    const bridge = getDesktopBridge()?.browserCredentials
    if (!bridge) return
    setBusy(true)
    try {
      hide()
      onForgotten(await bridge.forget(credential.id))
      onBack()
    } catch {
      toast.error(t('forgetError'))
    } finally {
      setBusy(false)
    }
  }, [credential.id, hide, onBack, onForgotten])

  const site = siteLabel(credential.origin)
  return (
    <>
      <SettingsPanel
        back={{ text: t('back'), icon: ArrowLeft, onSelect: onBack }}
        title={site}
        description={t('description')}
        actions={[
          {
            id: 'delete',
            text: t('forget'),
            onSelect: () => setConfirmingForget(true),
            disabled: busy,
          },
        ]}
      >
        <SettingsSection label={t('login')}>
          <div className='flex flex-col gap-4'>
            <SettingsField label={t('site')}>
              <div className='flex items-center gap-2.5'>
                <div className={cn(RESOURCE_TILE_BASE, RESOURCE_TILE_PLAIN)}>
                  <BrowserCredentialIcon icon={credential.icon} />
                </div>
                <ChipCopyInput value={credential.origin} copyLabel={t('copySite')} />
              </div>
            </SettingsField>

            <SettingsField label={t('username')}>
              <ChipCopyInput value={credential.username || '—'} copyLabel={t('copyUsername')} />
            </SettingsField>

            <SettingsField label={t('password')}>
              <ChipInput
                readOnly
                aria-label={t('password')}
                value={revealed ?? MASK_PLACEHOLDER}
                style={revealed ? undefined : MASKED_STYLE}
                autoComplete='off'
                spellCheck={false}
                endAdornment={
                  <>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <Button
                          type='button'
                          variant='quiet'
                          size='icon'
                          disabled={busy}
                          onClick={() => void toggleReveal()}
                          aria-label={revealed ? t('hidePassword') : t('showPassword')}
                        >
                          {revealed ? (
                            <EyeOff className='size-[13px]' />
                          ) : (
                            <Eye className='size-[13px]' />
                          )}
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        {revealed ? t('hidePassword') : t('showPassword')}
                      </Tooltip.Content>
                    </Tooltip.Root>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <Button
                          type='button'
                          variant='quiet'
                          size='icon'
                          disabled={busy}
                          onClick={() => void copy()}
                          aria-label={t('copyPassword')}
                        >
                          <Duplicate className='size-[13px]' />
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>{t('copyPassword')}</Tooltip.Content>
                    </Tooltip.Root>
                  </>
                }
              />
            </SettingsField>
          </div>
        </SettingsSection>
      </SettingsPanel>

      <ChipConfirmModal
        open={confirmingForget}
        onOpenChange={(open) => !open && setConfirmingForget(false)}
        title={t('forgetTitle')}
        text={[t('forgetConfirm.before'), { text: site, bold: true }, t('forgetConfirm.after')]}
        confirm={{
          label: t('forget'),
          pending: busy,
          pendingLabel: t('forgetting'),
          onClick: () => void forget(),
        }}
      />
    </>
  )
}
