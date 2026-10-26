/**
 * Builds `public/embed.js`, the one-line chat widget served at `/embed.js`, from its readable source
 * `lib/nexora/embed/embed.src.js`: `bun run build:embed`. The banner carries a hash of the source,
 * which `script.test.ts` compares so a source change without a rebuild fails the tests.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const appRoot = path.resolve(import.meta.dirname, '..')
const sourcePath = path.join(appRoot, 'lib/nexora/embed/embed.src.js')
const outputPath = path.join(appRoot, 'public/embed.js')

const hash = createHash('sha256').update(readFileSync(sourcePath)).digest('hex').slice(0, 12)
const code = execFileSync('bun', ['build', sourcePath, '--minify', '--target=browser'], {
  encoding: 'utf8',
}).trim()
const banner = `/* Nexora WorkStudio chat widget, source sha256:${hash} */\n`
writeFileSync(outputPath, `${banner}${code}\n`)
console.log(`public/embed.js: ${Buffer.byteLength(banner + code)} bytes (source ${hash})`)
