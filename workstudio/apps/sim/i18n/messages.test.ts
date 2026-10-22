import { describe, expect, it } from 'vitest'
import { MESSAGE_NAMESPACES, MESSAGES } from '@/i18n/messages'

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.set(path, value)
    else for (const [k, v] of flatten(value, path)) out.set(k, v)
  }
  return out
}

/** ICU arguments (`{name}`, `{count, plural, …}`) a message interpolates. */
function argumentsOf(message: string): string[] {
  return [...message.matchAll(/\{\s*([A-Za-z0-9_]+)\s*[,}]/g)].map((m) => m[1]).sort()
}

const fr = flatten(MESSAGES.fr as Tree)
const en = flatten(MESSAGES.en as Tree)

describe('interface messages', () => {
  it('have one namespace per area in both languages', () => {
    expect(Object.keys(MESSAGES.fr).sort()).toEqual([...MESSAGE_NAMESPACES].sort())
    expect(Object.keys(MESSAGES.en).sort()).toEqual([...MESSAGE_NAMESPACES].sort())
  })

  it('define the same keys in French and English', () => {
    expect([...fr.keys()].filter((k) => !en.has(k))).toEqual([])
    expect([...en.keys()].filter((k) => !fr.has(k))).toEqual([])
  })

  it('interpolate the same arguments in both languages', () => {
    const mismatched = [...fr.keys()].filter(
      (key) =>
        en.has(key) &&
        argumentsOf(fr.get(key) ?? '').join() !== argumentsOf(en.get(key) ?? '').join()
    )
    expect(mismatched).toEqual([])
  })

  it('never leave a message empty', () => {
    expect([...fr.entries(), ...en.entries()].filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual(
      []
    )
  })
})
