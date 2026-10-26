import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import manifest from '@/app/manifest'

const PUBLIC_DIR = path.resolve(__dirname, '../public')
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function pngSize(file: string): string {
  const bytes = readFileSync(file)
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`
}

describe('the installable application manifest', () => {
  const result = manifest()

  it('describes Nexora WorkStudio in French, as a standalone app that opens the whole site', () => {
    expect(result.name).toBe('Nexora WorkStudio')
    expect(result.short_name).toBe('Nexora')
    expect(result.lang).toBe('fr')
    expect(result.id).toBe('/')
    expect(result.start_url).toBe('/')
    expect(result.scope).toBe('/')
    expect(result.display).toBe('standalone')
    expect(result.theme_color).toMatch(HEX_COLOR)
    expect(result.background_color).toMatch(HEX_COLOR)
    expect(result.description).toContain('Nexora WorkStudio')
    expect(result.description).toContain('agents')
  })

  it('does not lock the orientation: a PC window is landscape', () => {
    expect(result.orientation).toBeUndefined()
  })

  it('offers 192 and 512 icons, plain and maskable, and every file exists with the declared size', () => {
    const icons = result.icons ?? []
    const key = (purpose: string, sizes: string) =>
      icons.find((icon) => (icon.purpose ?? 'any') === purpose && icon.sizes === sizes)
    for (const purpose of ['any', 'maskable']) {
      for (const sizes of ['192x192', '512x512']) {
        expect(key(purpose, sizes), `${purpose} ${sizes}`).toBeDefined()
      }
    }
    for (const icon of icons) {
      const file = path.join(PUBLIC_DIR, icon.src)
      expect(existsSync(file), icon.src).toBe(true)
      expect(icon.type).toBe('image/png')
      expect(pngSize(file), icon.src).toBe(icon.sizes)
    }
  })

  it('keeps each icon to one purpose, as browsers recommend', () => {
    for (const icon of result.icons ?? []) {
      expect(icon.purpose ?? 'any').toMatch(/^(any|maskable)$/)
    }
  })

  it('has French shortcuts that stay inside the scope', () => {
    const shortcuts = result.shortcuts ?? []
    expect(shortcuts.length).toBeGreaterThan(0)
    for (const shortcut of shortcuts) {
      expect(shortcut.url.startsWith('/')).toBe(true)
    }
    expect(shortcuts[0]?.name).toBe('Créer un workflow')
  })

  it('carries no upstream brand', () => {
    const text = JSON.stringify(result)
    expect(text).not.toMatch(/\bsim\b/i)
    expect(text).not.toMatch(/sim\.ai/i)
  })
})

describe('offline support', () => {
  it('adds no service worker: the signed-in application must never be cached offline', () => {
    for (const name of ['sw.js', 'service-worker.js', 'serviceworker.js', 'workbox-sw.js']) {
      expect(existsSync(path.join(PUBLIC_DIR, name)), name).toBe(false)
    }
    for (const file of ['../app/layout.tsx', '../next.config.ts']) {
      expect(readFileSync(path.resolve(__dirname, file), 'utf8')).not.toMatch(/serviceWorker/)
    }
  })
})
