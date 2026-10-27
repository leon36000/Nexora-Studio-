/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePrehydrationValues } from '@/app/(auth)/components/use-prehydration-values'

let host: HTMLDivElement
let fields: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  fields = document.createElement('div')
  document.body.appendChild(fields)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  fields.remove()
})

function Probe({ onValue }: { onValue: (id: string, value: string) => void }) {
  usePrehydrationValues({
    email: (value) => onValue('email', value),
    password: (value) => onValue('password', value),
  })
  return null
}

describe('usePrehydrationValues', () => {
  it('hands back what the browser or the user typed into the fields before React took over (autofill, fast typists on a slow phone)', () => {
    fields.innerHTML =
      '<input id="email" value="marie@exemple.fr"><input id="password" value="secret"><input id="autre" value="x">'
    const onValue = vi.fn()
    act(() => root.render(<Probe onValue={onValue} />))
    expect(onValue.mock.calls).toEqual([
      ['email', 'marie@exemple.fr'],
      ['password', 'secret'],
    ])
  })

  it('does nothing for fields that are empty or absent', () => {
    fields.innerHTML = '<input id="email" value="">'
    const onValue = vi.fn()
    act(() => root.render(<Probe onValue={onValue} />))
    expect(onValue).not.toHaveBeenCalled()
  })
})
