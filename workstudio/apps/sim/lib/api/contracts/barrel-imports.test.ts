/**
 * @vitest-environment node
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const APP_ROOT = path.resolve(__dirname, '../../..')
const SERVER_ONLY_PREFIXES = [
  'app/api/',
  'lib/api/contracts/',
  'lib/api/server/',
  'lib/internal/',
  'lib/function-execution/',
  'lib/knowledge/__integration__/',
  'scripts/',
]
const SCANNED_DIRECTORIES = ['app', 'components', 'ee', 'hooks', 'lib', 'stores']
const VALUE_IMPORT_FROM_BARREL = /import\s*\{[^}]*\}\s*from\s*'@\/lib\/api\/contracts'/g

function* sourceFiles(directory: string): Generator<string> {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') yield* sourceFiles(full)
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|integration)\./.test(entry.name)) {
      yield full
    }
  }
}

describe('contract imports in browser-reachable code', () => {
  it('never take a value from the contracts barrel, which would ship every Zod schema to the page', () => {
    const offenders: string[] = []
    for (const directory of SCANNED_DIRECTORIES) {
      for (const file of sourceFiles(path.join(APP_ROOT, directory))) {
        const relative = path.relative(APP_ROOT, file).split(path.sep).join('/')
        if (SERVER_ONLY_PREFIXES.some((prefix) => relative.startsWith(prefix))) continue
        const text = readFileSync(file, 'utf8')
        for (const match of text.matchAll(VALUE_IMPORT_FROM_BARREL)) {
          if (!match[0].startsWith('import type')) offenders.push(relative)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
