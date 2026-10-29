/**
 * @vitest-environment jsdom
 */

import { act, type ReactNode } from 'react'
import { flushMicrotasks } from '@sim/testing/helpers/async'
import {
  apiClientRequestMock,
  apiClientRequestMockFns,
} from '@sim/testing/mocks/api-client-request.mock'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/client/request', () => apiClientRequestMock)

const home = vi.hoisted(() => ({ data: undefined as { isInstanceAdmin: boolean } | undefined }))
vi.mock('@/hooks/queries/nexora-home', () => ({ useNexoraHome: () => ({ data: home.data }) }))

import { listInstanceNexoraApiKeysContract } from '@/lib/api/contracts/nexora-api-keys'
import { getTraceSettingsContract } from '@/lib/api/contracts/nexora-traces'
import { useInstanceNexoraApiKeys } from '@/hooks/queries/nexora-api-keys'
import { useNexoraTraceSettings } from '@/hooks/queries/nexora-traces'

const mockRequestJson = apiClientRequestMockFns.mockRequestJson

let host: HTMLDivElement
let root: Root

function Probe() {
  useNexoraTraceSettings()
  useInstanceNexoraApiKeys()
  return null
}

async function mount() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper: ReactNode = (
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>
  )
  await act(async () => {
    root.render(wrapper)
    await flushMicrotasks(10)
  })
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  mockRequestJson.mockReset().mockResolvedValue({})
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('instance-administrator queries', () => {
  it('are not sent for a member, so no 403 lands in the browser console of every page', async () => {
    home.data = { isInstanceAdmin: false }
    await mount()
    const called = mockRequestJson.mock.calls.map(([contract]) => contract)
    expect(called).not.toContain(getTraceSettingsContract)
    expect(called).not.toContain(listInstanceNexoraApiKeysContract)
  })

  it('wait for the home status rather than guess', async () => {
    home.data = undefined
    await mount()
    expect(mockRequestJson).not.toHaveBeenCalled()
  })

  it('are sent for an instance administrator', async () => {
    home.data = { isInstanceAdmin: true }
    await mount()
    const called = mockRequestJson.mock.calls.map(([contract]) => contract)
    expect(called).toContain(getTraceSettingsContract)
    expect(called).toContain(listInstanceNexoraApiKeysContract)
  })
})
