/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NEXORA_TEMPLATES } from '@/lib/nexora/templates'

const state = vi.hoisted(() => ({
  workflows: [] as { id: string; name: string }[],
  loading: false,
  mutate: vi.fn(),
  reset: vi.fn(),
  run: { data: undefined as unknown, error: null as unknown, isPending: false },
}))

vi.mock('next/dynamic', () => ({
  default: () =>
    function Markdown({ content }: { content: string }) {
      return <div data-testid='markdown'>{content}</div>
    },
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock('@/app/workspace/[workspaceId]/home/nexora-home/use-template-workflows', () => ({
  useTemplateWorkflows: () => ({ templates: state.workflows, isLoading: state.loading }),
}))
vi.mock('@/hooks/queries/nexora-home', () => ({
  useRunWorkflowOnce: () => ({
    mutate: state.mutate,
    reset: state.reset,
    data: state.run.data,
    error: state.run.error,
    isPending: state.run.isPending,
  }),
}))

vi.mock('@/app/workspace/[workspaceId]/home/nexora-home/workspace-name-form', () => ({
  WorkspaceNameForm: () => <div data-testid='workspace-name-form' />,
}))

import { WelcomePanel } from '@/app/workspace/[workspaceId]/home/nexora-home/welcome-panel'

let host: HTMLDivElement
let root: Root

const devis = NEXORA_TEMPLATES.find((template) => template.slug === 'devis')
const buttons = () => [...host.querySelectorAll('button')]
const button = (label: string) => buttons().find((b) => b.textContent?.includes(label))

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  state.workflows = NEXORA_TEMPLATES.map((template, index) => ({
    id: `wf-${index}`,
    name: template.name,
  }))
  state.loading = false
  state.mutate.mockReset()
  state.reset.mockReset()
  state.run = { data: undefined, error: null, isPending: false }
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function render(props: { hasModel?: boolean; onClose?: () => void } = {}) {
  act(() =>
    root.render(
      <WelcomePanel
        workspaceId='ws-1'
        hasModel={props.hasModel ?? true}
        onClose={props.onClose ?? vi.fn()}
      />
    )
  )
}

describe('welcome panel', () => {
  it('offers the everyday templates and runs the picked one with its example values', () => {
    render()
    expect(button(devis?.name ?? 'absent')).toBeDefined()
    act(() => button('Run with the example')?.click())
    expect(state.mutate).toHaveBeenCalledTimes(1)
    const [variables] = state.mutate.mock.calls[0] as [
      { workflowId: string; input: Record<string, string> },
    ]
    expect(variables.workflowId).toBe('wf-0')
    expect(variables.input).toEqual(
      Object.fromEntries((devis?.inputs ?? []).map((field) => [field.name, field.example]))
    )
  })

  it('runs another template once the person picks it', () => {
    render()
    const other = NEXORA_TEMPLATES.find((template) => template.slug === 'relance-facture')
    act(() => button(other?.name ?? '')?.click())
    expect(state.reset).toHaveBeenCalled()
    act(() => button('Run with the example')?.click())
    const [variables] = state.mutate.mock.calls[0] as [{ workflowId: string }]
    expect(variables.workflowId).toBe(`wf-${NEXORA_TEMPLATES.indexOf(other as never)}`)
  })

  it('shows the first result and turns « Later » into « Done »', () => {
    state.run.data = { success: true, output: { content: '# Devis n° 1' } }
    render()
    expect(host.querySelector('[data-testid=markdown]')?.textContent).toBe('# Devis n° 1')
    expect(button('Later')).toBeUndefined()
    expect(button('Done')).toBeDefined()
  })

  it('shows the reason a failed run reported, such as an empty wallet worded by the gateway', () => {
    state.run.data = {
      success: false,
      error: 'Le solde de votre portefeuille Nexora AI est insuffisant.',
    }
    render()
    expect(host.querySelector('[role=alert]')?.textContent).toBe(
      'Le solde de votre portefeuille Nexora AI est insuffisant.'
    )
  })

  it('cannot run, and says why, while the person has no model', () => {
    render({ hasModel: false })
    expect((button('Run with the example') as HTMLButtonElement).disabled).toBe(true)
    expect(host.textContent).toContain('No model is available')
  })

  it('stays out of the way when the workspace has none of the templates', () => {
    state.workflows = []
    render()
    expect(host.innerHTML).toBe('')
  })

  it('closes on « Later »', () => {
    const onClose = vi.fn()
    render({ onClose })
    act(() => button('Later')?.click())
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
