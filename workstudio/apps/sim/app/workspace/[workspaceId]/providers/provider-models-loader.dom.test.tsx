/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  requests: [] as { provider: string; enabled: boolean | undefined }[],
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ workspaceId: 'ws-1' }),
  usePathname: () => '/workspace/ws-1/home',
}))
vi.mock('@/hooks/queries/providers', () => ({
  useProviderModels: (provider: string, _workspaceId?: string, options?: { enabled?: boolean }) => {
    state.requests.push({ provider, enabled: options?.enabled })
    return { data: undefined, isLoading: false, isFetching: false, error: null }
  },
}))

import { FeatureFlagsProvider } from '@/app/workspace/[workspaceId]/providers/feature-flags-provider'
import { ProviderModelsLoader } from '@/app/workspace/[workspaceId]/providers/provider-models-loader'

let host: HTMLDivElement
let root: Root

const flags = {
  dashboards: false,
  'workflow-tests': false,
  changelog: false,
  'mothership-model-selector': false,
  'mothership-plan-mode': false,
}
const enabledProviders = () => state.requests.filter((r) => r.enabled).map((r) => r.provider)

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  state.requests = []
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('provider models loader', () => {
  it('asks only Nexora API for its models when the deployment offers nothing else', () => {
    act(() =>
      root.render(
        <FeatureFlagsProvider flags={{ ...flags, 'nexora-only-models': true }}>
          <ProviderModelsLoader />
        </FeatureFlagsProvider>
      )
    )
    expect(new Set(enabledProviders())).toEqual(new Set(['vllm']))
  })

  it('asks every provider on a deployment that offers them all', () => {
    act(() =>
      root.render(
        <FeatureFlagsProvider flags={flags}>
          <ProviderModelsLoader />
        </FeatureFlagsProvider>
      )
    )
    expect(new Set(enabledProviders())).toEqual(
      new Set([
        'base',
        'ollama',
        'ollama-cloud',
        'vllm',
        'litellm',
        'openrouter',
        'fireworks',
        'together',
        'baseten',
      ])
    )
  })

  it('loads every provider outside a workspace layout that supplies the flags', () => {
    act(() => root.render(<ProviderModelsLoader />))
    expect(enabledProviders()).toContain('openrouter')
  })
})
