/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { resetEnvMock, setEnv } from '@sim/testing/mocks/env.mock'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NexoraSiteLinks } from '@/lib/nexora/site-links'

const home = vi.hoisted(() => ({ data: undefined as { viaSite: boolean } | undefined }))
vi.mock('@/hooks/queries/nexora-home', () => ({ useNexoraHome: () => ({ data: home.data }) }))

import { useNexoraSiteLinks } from '@/hooks/use-nexora-site-links'

let host: HTMLDivElement
let root: Root
let seen: NexoraSiteLinks | null | undefined

function Probe() {
  seen = useNexoraSiteLinks()
  return null
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  seen = undefined
  setEnv({ NEXT_PUBLIC_NEXORA_SITE_URL: 'https://nexora.example' })
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  resetEnvMock()
})

describe('useNexoraSiteLinks', () => {
  it('gives the account pages to a person who came by the site, in the interface language', () => {
    home.data = { viaSite: true }
    act(() => root.render(<Probe />))
    expect(seen).toMatchObject({
      account: 'https://nexora.example/en/compte',
      billing: 'https://nexora.example/en/compte/facturation',
      activity: 'https://nexora.example/en/compte/activite',
    })
  })

  it('gives nothing to an operator account that never used the site', () => {
    home.data = { viaSite: false }
    act(() => root.render(<Probe />))
    expect(seen).toBeNull()
  })

  it('gives nothing while the home status loads (no flash of links, then none)', () => {
    home.data = undefined
    act(() => root.render(<Probe />))
    expect(seen).toBeNull()
  })

  it('gives nothing when the instance does not know the site', () => {
    setEnv({ NEXT_PUBLIC_NEXORA_SITE_URL: undefined })
    home.data = { viaSite: true }
    act(() => root.render(<Probe />))
    expect(seen).toBeNull()
  })
})
