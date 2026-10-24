/**
 * @vitest-environment jsdom
 */
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmcnLabelsProvider } from '../labels/labels'
import { Calendar } from './calendar'

let root: Root | null = null
let container: HTMLDivElement | null = null

function mount(ui: ReactNode): HTMLDivElement {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root?.render(ui))
  return container
}

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
})

/** The weekday header, then the day grid's leading blanks before the 1st. */
function readGrid(element: HTMLElement) {
  const [weekdays, days] = Array.from(element.querySelectorAll('.grid.grid-cols-7'))
  const cells = Array.from(days.children)
  return {
    weekdays: Array.from(weekdays.children).map((cell) => cell.textContent),
    leadingBlanks: cells.findIndex((cell) => cell.textContent === '1'),
  }
}

describe('Calendar weeks', () => {
  it('start on Sunday by default', () => {
    const grid = readGrid(mount(<Calendar value='2026-10-15' />))
    expect(grid.weekdays).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'])
    expect(grid.leadingBlanks).toBe(4)
  })

  it('start on Monday when the labels say so, the 1st under its weekday', () => {
    const grid = readGrid(
      mount(
        <EmcnLabelsProvider labels={{ weekdays: 'D,L,M,M,J,V,S', weekStartsOn: '1' }}>
          <Calendar value='2026-10-15' />
        </EmcnLabelsProvider>
      )
    )
    expect(grid.weekdays).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D'])
    expect(grid.leadingBlanks).toBe(3)
  })

  it('render weekday initials that repeat without key collisions', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mount(
      <EmcnLabelsProvider labels={{ weekdays: 'S,M,T,W,T,F,S' }}>
        <Calendar value='2026-10-15' />
      </EmcnLabelsProvider>
    )
    expect(consoleError.mock.calls.flat().join(' ')).not.toMatch(/same key/)
  })
})
