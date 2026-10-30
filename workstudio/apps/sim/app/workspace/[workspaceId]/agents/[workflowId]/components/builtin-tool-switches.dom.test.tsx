/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  tools: { codeInterpreter: false, webSearch: true },
  isInstanceAdmin: false,
}))

vi.mock('@/hooks/queries/nexora-code-execution', () => ({
  useNexoraAgentTools: () => ({ data: state.tools }),
}))
vi.mock('@/hooks/queries/nexora-home', () => ({
  useNexoraHome: () => ({ data: { isInstanceAdmin: state.isInstanceAdmin } }),
}))

import { BuiltinToolSwitches } from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/builtin-tool-switches'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  state.tools = { codeInterpreter: false, webSearch: true }
  state.isInstanceAdmin = false
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function render(codeInterpreter = false) {
  act(() =>
    root.render(
      <BuiltinToolSwitches
        codeInterpreter={codeInterpreter}
        webSearch={false}
        disabled={false}
        onChange={vi.fn()}
      />
    )
  )
}

describe('built-in tool switches, when the code interpreter cannot run', () => {
  it('sends the administrator to the settings page they can open', () => {
    state.isInstanceAdmin = true
    render()
    expect(host.textContent).toContain('Settings › Code execution')
  })

  it('tells anybody else to contact the instance administrator, not to open a page they cannot see', () => {
    render()
    expect(host.textContent).toContain('contact the instance administrator')
    expect(host.textContent).not.toContain('Settings › Code execution')
  })

  it('keeps the usual hint once the interpreter is available', () => {
    state.tools = { codeInterpreter: true, webSearch: true }
    render()
    expect(host.textContent).not.toContain('administrator')
  })
})
