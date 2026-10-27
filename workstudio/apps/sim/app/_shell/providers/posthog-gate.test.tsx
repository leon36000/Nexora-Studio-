/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loaded = vi.hoisted(() => ({ provider: vi.fn() }))

vi.mock('@/app/_shell/providers/posthog-provider', () => {
  loaded.provider()
  return {
    PostHogProvider: ({ children }: { children: React.ReactNode }) => (
      <div data-posthog>{children}</div>
    ),
  }
})

import { PostHogGate } from '@/app/_shell/providers/posthog-gate'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  resetEnvMock()
})

describe('PostHogGate', () => {
  it('renders its children without loading the analytics client when no PostHog key is configured', () => {
    act(() =>
      root.render(
        <PostHogGate consentRequired={false}>
          <p>contenu</p>
        </PostHogGate>
      )
    )
    expect(host.textContent).toBe('contenu')
    expect(loaded.provider).not.toHaveBeenCalled()
  })

  it('loads the provider only when PostHog is enabled and has a key', async () => {
    setEnv({ NEXT_PUBLIC_POSTHOG_ENABLED: 'true', NEXT_PUBLIC_POSTHOG_KEY: 'phc_test' })
    await act(async () => {
      root.render(
        <PostHogGate consentRequired={false}>
          <p>contenu</p>
        </PostHogGate>
      )
    })
    await vi.waitFor(() => expect(host.querySelector('[data-posthog]')).not.toBeNull())
    expect(host.textContent).toBe('contenu')
  })
})
