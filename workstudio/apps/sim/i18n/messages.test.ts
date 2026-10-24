import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getLocaleMessages,
  MESSAGE_NAMESPACES,
  MESSAGES,
  pageMessages,
  WORKSPACE_ONLY_NAMESPACES,
} from '@/i18n/messages'

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

const APP_ROOT = path.resolve(__dirname, '..')
const SOURCE_DIRS = ['app', 'components', 'hooks', 'lib', 'ee', 'stores', 'providers', 'blocks']
/** Layouts that hand their subtree every namespace again (`getMessages()`). */
const FULL_MESSAGE_LAYOUTS = ['app/workspace/layout.tsx', 'app/o/[organizationId]/layout.tsx']
const ROUTE_ENTRY = /\/(page|layout|template|error|not-found|loading|default)\.tsx$/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return entry === 'node_modules' ? [] : sourceFiles(full)
    return /\.tsx?$/.test(entry) && !/\.(test|integration)\.tsx?$/.test(entry) ? [full] : []
  })
}

/** Every app source file with its comment-free text and the app files it imports. */
function importGraph() {
  const files = SOURCE_DIRS.flatMap((dir) => sourceFiles(path.join(APP_ROOT, dir)))
  const known = new Set(files)
  const resolve = (specifier: string, from: string) => {
    if (!specifier.startsWith('@/') && !specifier.startsWith('.')) return null
    const base = specifier.startsWith('@/')
      ? path.join(APP_ROOT, specifier.slice(2))
      : path.resolve(path.dirname(from), specifier)
    return (
      [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]
        .map((candidate) => (known.has(candidate) ? candidate : null))
        .find(Boolean) ?? null
    )
  }
  const sources = new Map<string, string>()
  const imports = new Map<string, string[]>()
  for (const file of files) {
    const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '')
    sources.set(file, source)
    const specifiers = [
      ...source.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((match) => match[1] ?? match[2])
    imports.set(
      file,
      specifiers.flatMap((specifier) => resolve(specifier, file) ?? [])
    )
  }
  return { files, sources, imports }
}

describe('messages sent to the browser', () => {
  it('leave the workspace-only namespaces out of every page outside the workspace', () => {
    const sent = pageMessages(getLocaleMessages('fr'))
    for (const namespace of WORKSPACE_ONLY_NAMESPACES) expect(sent).not.toHaveProperty(namespace)
    expect(Object.keys(sent).sort()).toEqual(
      MESSAGE_NAMESPACES.filter((ns) => !WORKSPACE_ONLY_NAMESPACES.includes(ns as never)).sort()
    )
  })

  it('reach the workspace-only namespaces only from pages under a layout that provides them', () => {
    const { files, sources, imports } = importGraph()
    const readers = new Set(
      files.filter((file) =>
        WORKSPACE_ONLY_NAMESPACES.some((ns) =>
          new RegExp(`useTranslations\\(\\s*['"\`]${ns}[.'"\`]`).test(sources.get(file) ?? '')
        )
      )
    )
    expect(readers.size).toBeGreaterThan(0)
    const providers = FULL_MESSAGE_LAYOUTS.map((layout) => path.join(APP_ROOT, layout))
    for (const layout of providers) {
      expect(sources.get(layout)).toMatch(/getMessages\(\)/)
      expect(sources.get(layout)).toMatch(/<NextIntlClientProvider messages=\{messages\}>/)
    }
    const provided = (entry: string) =>
      providers.some((layout) => entry.startsWith(`${path.dirname(layout)}${path.sep}`))
    const unprovided = files
      .filter((file) => ROUTE_ENTRY.test(file) && file.startsWith(path.join(APP_ROOT, 'app')))
      .filter((entry) => !provided(entry))
      .filter((entry) => {
        const seen = new Set([entry])
        const stack = [entry]
        while (stack.length > 0) {
          const file = stack.pop() as string
          if (readers.has(file)) return true
          for (const next of imports.get(file) ?? []) {
            if (!seen.has(next)) {
              seen.add(next)
              stack.push(next)
            }
          }
        }
        return false
      })
      .map((entry) => path.relative(APP_ROOT, entry))
    expect(unprovided).toEqual([])
  })
})
