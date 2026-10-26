/**
 * @vitest-environment jsdom
 *
 * `public/embed.js` is a standalone script that runs on other people's sites. The tests load it
 * the way a browser would (a `<script data-nexora-chat src=…>` in the page, then its source run),
 * and look at the page and at the iframe it builds.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SCRIPT_PATH = path.resolve(__dirname, '../../../public/embed.js')
const SOURCE = readFileSync(SCRIPT_PATH, 'utf8')
const ORIGIN = 'https://nexora.exemple.fr'

interface NexoraChatApi {
  open: () => void
  close: () => void
  toggle: () => void
  isOpen: () => boolean
}

function chatApi(): NexoraChatApi | undefined {
  return (window as unknown as { NexoraChat?: NexoraChatApi }).NexoraChat
}

function stubMedia(matching: Partial<Record<'mobile' | 'reduced', boolean>> = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('max-width') ? !!matching.mobile : !!matching.reduced,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

function install(attributes: Record<string, string> = {}, origin = ORIGIN) {
  const script = document.createElement('script')
  script.setAttribute('src', `${origin}/embed.js`)
  const all: Record<string, string> = { 'data-nexora-chat': 'support', ...attributes }
  for (const [name, value] of Object.entries(all)) script.setAttribute(name, value)
  document.head.appendChild(script)
  new Function(SOURCE)()
  return script
}

const bubble = () => document.querySelector<HTMLButtonElement>('button[aria-controls]')
const frame = () => document.querySelector<HTMLIFrameElement>('iframe')
const panel = () => document.querySelector<HTMLElement>('[role="dialog"]')

beforeEach(() => {
  stubMedia()
})

afterEach(() => {
  ;(window as unknown as { NexoraChat?: unknown }).NexoraChat = undefined
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

describe('embed.js: the floating bubble', () => {
  it('adds one accessible button, closed, and loads no chat until it is opened', () => {
    install()
    const button = bubble()
    expect(button).not.toBeNull()
    expect(button?.getAttribute('aria-label')).toBeTruthy()
    expect(button?.getAttribute('aria-expanded')).toBe('false')
    expect(button?.textContent).toBe('Discuter avec nous')
    expect(frame()).toBeNull()
  })

  it('opens the chat of the instance in a sandboxed iframe, and closes it with the button, Escape or NexoraChat', () => {
    install()
    bubble()?.click()
    const iframe = frame()
    expect(iframe?.getAttribute('src')).toBe(`${ORIGIN}/chat/support`)
    const sandbox = iframe?.getAttribute('sandbox') ?? ''
    expect(sandbox).toContain('allow-scripts')
    expect(sandbox).not.toContain('allow-top-navigation')
    expect(iframe?.getAttribute('title')).toBeTruthy()
    expect(bubble()?.getAttribute('aria-expanded')).toBe('true')
    expect(panel()?.style.display).not.toBe('none')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(panel()?.style.display).toBe('none')
    expect(bubble()?.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(bubble())

    bubble()?.click()
    expect(chatApi()?.isOpen()).toBe(true)
    chatApi()?.close()
    expect(chatApi()?.isOpen()).toBe(false)
    chatApi()?.toggle()
    expect(chatApi()?.isOpen()).toBe(true)
    chatApi()?.toggle()
    expect(panel()?.style.display).toBe('none')
    chatApi()?.open()
    expect(chatApi()?.isOpen()).toBe(true)
    expect(document.querySelectorAll('iframe')).toHaveLength(1)
  })

  it('closes from the panel header button, which a phone user needs', () => {
    install()
    chatApi()?.open()
    const close = panel()?.querySelector<HTMLButtonElement>('button')
    expect(close?.getAttribute('aria-label')).toBe('Fermer')
    close?.click()
    expect(chatApi()?.isOpen()).toBe(false)
  })

  it('opens on load with data-open and puts the bubble on the left with data-position', () => {
    install({ 'data-open': '', 'data-position': 'left' })
    expect(chatApi()?.isOpen()).toBe(true)
    expect(frame()).not.toBeNull()
    expect(bubble()?.style.left).toBe('20px')
    expect(bubble()?.style.right).not.toBe('20px')
  })

  it('shows data-label as text and in the accessible name, in English on an English page', () => {
    document.documentElement.lang = 'en'
    install()
    expect(bubble()?.textContent).toBe('Chat with us')
    document.documentElement.lang = ''
  })

  it('uses data-label verbatim as text', () => {
    install({ 'data-label': 'Une question ?' })
    expect(bubble()?.textContent).toBe('Une question ?')
    expect(bubble()?.getAttribute('aria-label')).toBe('Une question ?')
  })

  it('fills the screen on a phone', () => {
    stubMedia({ mobile: true })
    install()
    chatApi()?.open()
    expect(panel()?.style.width).toBe('100%')
    expect(panel()?.style.height).toBe('100%')
    expect(panel()?.style.top).toBe('0px')
  })

  it('is a corner panel on a computer', () => {
    install()
    chatApi()?.open()
    expect(panel()?.style.width).toBe('380px')
    expect(panel()?.style.right).toBe('20px')
  })

  it('does not animate for people who asked for reduced motion', () => {
    stubMedia({ reduced: true })
    install()
    chatApi()?.open()
    expect(panel()?.style.transition).toBe('')
    expect(bubble()?.style.transition).toBe('')
  })

  it('animates otherwise', () => {
    install()
    chatApi()?.open()
    expect(panel()?.style.transition).not.toBe('')
  })

  it('does not build a second bubble when the script runs twice', () => {
    install()
    install()
    expect(document.querySelectorAll('button[aria-controls]')).toHaveLength(1)
  })

  it('stays under 6 KB, minified', () => {
    expect(Buffer.byteLength(SOURCE)).toBeLessThan(6144)
  })

  it('is built from the current source (run `bun run build:embed` after editing embed.src.js)', () => {
    const source = readFileSync(path.resolve(__dirname, 'embed.src.js'))
    const hash = createHash('sha256').update(source).digest('hex').slice(0, 12)
    expect(SOURCE.split('\n')[0]).toContain(`source sha256:${hash}`)
  })
})

describe('embed.js: refusing what it cannot trust', () => {
  it.each([
    ['empty', ''],
    ['a path', '../../api/auth'],
    ['capitals and a space', 'Mon Chat'],
    ['markup', '"><img src=x onerror=alert(1)>'],
    ['a scheme', 'https://evil.exemple'],
    ['too long', 'a'.repeat(101)],
  ])('builds nothing for an identifier that is %s', (_label, value) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    install({ 'data-nexora-chat': value })
    expect(bubble()).toBeNull()
    expect(document.querySelector('iframe')).toBeNull()
    expect(document.body.children).toHaveLength(0)
    expect(chatApi()).toBeUndefined()
    expect(warn).toHaveBeenCalled()
  })

  it('does not turn attributes into markup', () => {
    install({
      'data-label': '<img src=x onerror=alert(1)><script>alert(2)</script>',
      'data-color': 'red;background:url(https://evil.exemple/x)',
    })
    chatApi()?.open()
    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelectorAll('script')).toHaveLength(1)
    expect(bubble()?.textContent).toContain('<img')
    expect(bubble()?.style.background).not.toContain('evil')
    expect(document.body.innerHTML).not.toContain('evil.exemple')
  })

  it('applies a hex data-color and ignores anything else', () => {
    install({ 'data-color': '#0a7d33' })
    expect(bubble()?.style.backgroundColor).toBe('rgb(10, 125, 51)')
  })

  it.each(['red', 'rgb(1,2,3)', '#12345678', 'url(//evil.exemple/x)'])(
    'falls back to the Nexora colour for data-color %j',
    (value) => {
      install({ 'data-color': value })
      expect(bubble()?.style.backgroundColor).toBe('rgb(79, 70, 229)')
    }
  )

  it('builds nothing when the script was not loaded over http(s)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    install({}, 'javascript:alert(1)//')
    expect(bubble()).toBeNull()
  })
})

describe('embed.js: inline mode', () => {
  it('puts the chat in the target element, without a bubble', () => {
    document.body.innerHTML = '<div id="aide"></div>'
    install({ 'data-mode': 'inline', 'data-target': '#aide' })
    const iframe = document.querySelector('#aide iframe')
    expect(iframe?.getAttribute('src')).toBe(`${ORIGIN}/chat/support`)
    expect(bubble()).toBeNull()
  })

  it.each([
    ['a missing target', '#absent'],
    ['a target that is not a selector', '<img src=x onerror=alert(1)>'],
    ['no target', ''],
  ])('builds nothing with %s', (_label, target) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    install({ 'data-mode': 'inline', 'data-target': target })
    expect(document.querySelector('iframe')).toBeNull()
    expect(document.querySelector('img')).toBeNull()
  })
})

describe('embed.js: messages', () => {
  function post(data: unknown, origin: string, source: MessageEventSource | null) {
    window.dispatchEvent(new MessageEvent('message', { data, origin, source }))
  }

  it('obeys « close » only from the chat frame of the instance', () => {
    install()
    chatApi()?.open()
    const message = { source: 'nexora-chat', type: 'close' }
    const chatWindow = frame()?.contentWindow ?? null

    post(message, 'https://evil.exemple', chatWindow)
    expect(chatApi()?.isOpen()).toBe(true)
    post(message, ORIGIN, window)
    expect(chatApi()?.isOpen()).toBe(true)
    post({ type: 'close' }, ORIGIN, chatWindow)
    expect(chatApi()?.isOpen()).toBe(true)
    post('close', ORIGIN, chatWindow)
    expect(chatApi()?.isOpen()).toBe(true)

    post(message, ORIGIN, chatWindow)
    expect(chatApi()?.isOpen()).toBe(false)
  })

  it('tells the page when the chat opens and closes', () => {
    const seen: string[] = []
    for (const type of ['nexora:open', 'nexora:close']) {
      window.addEventListener(type, () => seen.push(type))
    }
    install()
    chatApi()?.open()
    chatApi()?.close()
    expect(seen).toEqual(['nexora:open', 'nexora:close'])
  })
})
