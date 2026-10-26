/**
 * Builds `public/embed.js`, the one-line chat widget served at `/embed.js`, from its readable source
 * `lib/nexora/embed/embed.src.js`: `bun run build:embed`. The banner carries a hash of the source,
 * which `embed-script.test.ts` compares so a source change without a rebuild fails the tests.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const appRoot = path.resolve(import.meta.dirname, '..')
const sourcePath = path.join(appRoot, 'lib/nexora/embed/embed.src.js')
const outputPath = path.join(appRoot, 'public/embed.js')

const hash = createHash('sha256').update(readFileSync(sourcePath)).digest('hex').slice(0, 12)
const result = await Bun.build({ entrypoints: [sourcePath], minify: true, target: 'browser' })
if (!result.success || result.outputs.length !== 1) {
  throw new Error(`embed.js build failed: ${result.logs.map(String).join('; ')}`)
}
const code = (await result.outputs[0].text()).trim()
const banner = `/* Nexora WorkStudio chat widget, source sha256:${hash} */\n`
writeFileSync(outputPath, `${banner}${code}\n`)
console.log(`public/embed.js: ${Buffer.byteLength(banner + code)} bytes (source ${hash})`)
