// Parcours clés de Nexora WorkStudio dans Chromium, Firefox et WebKit (Safari), bureau et mobile (390 px).
//
// Usage : NEXORA_E2E_URL=http://localhost:3200 NEXORA_E2E_EMAIL=… NEXORA_E2E_PASSWORD=… \
//           node scripts/verification/navigateurs.mjs [rapport.json] [--navigateurs chromium,firefox,webkit] [--profils bureau,mobile]
// Prérequis : playwright-core (dépendance du monorepo) et les navigateurs installés par `playwright install`.
// WebKit demande des bibliothèques système (libflite, libavif, libjxl…) : si le lancement échoue, le rapport le dit
// (« non vérifié ») au lieu de le compter comme réussi.
//
// Vérifie, pour chaque navigateur et chaque profil : pages publiques (rendu, polices, débordement horizontal),
// connexion, balayage des écrans de l'application (aucune erreur console, aucun message de traduction manquant),
// éditeur (canevas, glisser-déposer d'un bloc, annuler, raccourcis Cmd ou Ctrl selon la plateforme), chat public,
// bulle /embed.js sur un site tiers, indices de performance (CLS, LCP quand le navigateur les donne).
import fs from 'node:fs'
import http from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const { chromium, firefox, webkit, devices } = require(path.join(root, 'workstudio/node_modules/playwright-core'))

const argv = process.argv.slice(2)
const option = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : fallback
}
const reportPath = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--')) ?? 'navigateurs.json'
const base = (process.env.NEXORA_E2E_URL ?? 'http://localhost:3200').replace(/\/$/, '')
const email = process.env.NEXORA_E2E_EMAIL
const password = process.env.NEXORA_E2E_PASSWORD
if (!email || !password) {
  console.error('NEXORA_E2E_EMAIL et NEXORA_E2E_PASSWORD sont obligatoires')
  process.exit(2)
}
const wanted = option('navigateurs', 'chromium,firefox,webkit').split(',')
const profiles = option('profils', 'bureau,mobile').split(',')
const shotsDir = process.env.NEXORA_E2E_SHOTS ?? path.join(path.dirname(path.resolve(reportPath)), 'captures')
fs.mkdirSync(shotsDir, { recursive: true })

const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

/** Bruit sans conséquence : une navigation annule les requêtes en cours (préchargements RSC, flux). */
const IGNORED_CONSOLE = [
  // Safari ne connaît pas `interactive-widget` (méta viewport de Next) et le signale en erreur : sans effet sur la page.
  /Viewport argument key "interactive-widget" not recognized/,
  /ERR_ABORTED/,
  /net::ERR_FAILED.*_rsc/,
  /Download the React DevTools/,
  /favicon/i,
]

const SCREENS = [
  ['accueil', 'home'],
  ['assistant', 'assistant'],
  ['playground', 'playground'],
  ['agents', 'agents'],
  ['prompts', 'prompts'],
  ['connecteurs', 'connecteurs'],
  ['développeurs', 'developpeurs'],
  ['traces', 'traces'],
  ['évaluations', 'evaluations'],
  ['lots', 'batches'],
  ['intégrations', 'integrations'],
  ['tables', 'tables'],
  ['fichiers', 'files'],
  ['connaissances', 'knowledge'],
  ['journaux', 'logs'],
  ['compétences', 'skills'],
  ['réglages', 'settings/general'],
  ['réglages : modèles', 'settings/models'],
  ['réglages : clés', 'settings/apikeys'],
  ['réglages : équipe', 'settings/teammates'],
]

function pickLauncher(name) {
  return { chromium, firefox, webkit }[name]
}

function contextOptions(browserName, profile, mac) {
  if (profile === 'mobile') {
    const device = { chromium: 'Pixel 7', firefox: 'Pixel 7', webkit: 'iPhone 14' }[browserName]
    const d = { ...devices[device] }
    if (browserName === 'firefox') {
      delete d.isMobile
      d.viewport = { width: 390, height: 844 }
    }
    return { ...d, locale: 'fr-FR' }
  }
  return {
    viewport: { width: 1440, height: 900 },
    locale: 'fr-FR',
    ...(mac ? { userAgent: MAC_UA } : {}),
  }
}

/** Serveur d'un « site tiers » : une page qui insère la bulle /embed.js (autre origine que l'instance). */
function startThirdPartySite(chatId) {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Site client</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h1>Site de démonstration</h1><script src="${base}/embed.js" data-nexora-chat="${chatId}" async></script></body></html>`
    )
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

const report = { url: base, date: new Date().toISOString(), runs: [] }

for (const browserName of wanted) {
  for (const profile of profiles) {
    for (const mac of profile === 'bureau' ? [false, true] : [false]) {
      const label = `${browserName} · ${profile}${mac ? ' · plateforme Mac' : ''}`
      const run = { navigateur: browserName, profil: profile, mac, label, etapes: [] }
      report.runs.push(run)
      let browser
      try {
        browser = await pickLauncher(browserName).launch()
      } catch (error) {
        run.nonVerifie = String(error.message).split('\n').filter(Boolean).slice(0, 3).join(' ')
        console.log(`[NON VÉRIFIÉ] ${label} : ${run.nonVerifie.slice(0, 160)}`)
        continue
      }
      const context = await browser.newContext(contextOptions(browserName, profile, mac))
      const page = await context.newPage()
      let notes = []
      page.on('console', (m) => {
        if (!['error', 'warning'].includes(m.type())) return
        const text = m.text()
        if (IGNORED_CONSOLE.some((r) => r.test(text))) return
        notes.push(`${m.type()}: ${text.slice(0, 220)}`)
      })
      page.on('pageerror', (e) => notes.push(`pageerror: ${String(e).slice(0, 220)}`))
      let workspaceId = ''
      const shot = async (name) => {
        try {
          await page.screenshot({ path: path.join(shotsDir, `${browserName}-${profile}${mac ? '-mac' : ''}-${name}.png`) })
        } catch {}
      }
      const step = async (name, fn, { allowConsole = false } = {}) => {
        notes = []
        const started = Date.now()
        const entry = { nom: name, ok: true, ms: 0, details: '' }
        try {
          entry.details = (await fn()) ?? ''
          const errors = notes.filter((n) => !n.startsWith('warning'))
          if (errors.length && !allowConsole) {
            entry.ok = false
            entry.details += ` | console : ${errors.slice(0, 3).join(' ; ')}`
          } else if (notes.length) {
            entry.avertissements = notes.slice(0, 5)
          }
        } catch (error) {
          entry.ok = false
          entry.details = String(error.message).split('\n')[0].slice(0, 300)
          await shot(`echec-${name.replace(/\W+/g, '-')}`)
        }
        entry.ms = Date.now() - started
        run.etapes.push(entry)
        console.log(`[${entry.ok ? 'OK  ' : 'ÉCHEC'}] ${label} — ${name} (${entry.ms} ms) ${entry.details.slice(0, 200)}`)
      }
      const overflow = () =>
        page.evaluate(() => {
          const doc = document.documentElement
          return doc.scrollWidth - doc.clientWidth
        })

      for (const [name, route] of [
        ['connexion', '/login'],
        ['inscription', '/signup'],
        ['mot de passe oublié', '/reset-password'],
      ]) {
        await step(`page publique « ${name} »`, async () => {
          const response = await page.goto(`${base}${route}`, { waitUntil: 'load' })
          if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`)
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
          const info = await page.evaluate(async () => {
            await document.fonts.ready
            return {
              lang: document.documentElement.lang,
              title: document.title,
              fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')),
              bodyFont: getComputedStyle(document.body).fontFamily,
              inputs: document.querySelectorAll('input').length,
            }
          })
          if (info.lang !== 'fr') throw new Error(`langue ${info.lang}`)
          if (!/Nexora/.test(info.title)) throw new Error(`titre « ${info.title} »`)
          if (!info.inputs) throw new Error('aucun champ')
          if (!info.fonts.length) throw new Error(`aucune police chargée (${info.bodyFont})`)
          const extra = await overflow()
          if (extra > 1) throw new Error(`débordement horizontal de ${extra} px`)
          if (route === '/login') await shot('login')
          return `polices : ${[...new Set(info.fonts)].join(', ')}`
        })
      }

      await step('connexion par le formulaire', async () => {
        await page.goto(`${base}/login`, { waitUntil: 'load' })
        await page.fill('input[name=email]', email)
        await page.fill('input[type=password]', password)
        await page.keyboard.press('Enter')
        // Plusieurs redirections s'enchaînent après la connexion (/home → /workspace → /workspace/<id>) : on attend l'adresse finale.
        await page.waitForFunction(() => /\/workspace\/[0-9a-f-]{36}\/(home|w\/)/.test(location.href), null, { timeout: 45000 })
        workspaceId = page.url().match(/workspace\/([0-9a-f-]{36})/)[1]
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
        await shot('accueil')
        return `espace ${workspaceId.slice(0, 8)}`
      })
      if (!workspaceId) {
        await browser.close()
        continue
      }

      for (const [name, route] of SCREENS) {
        await step(`écran « ${name} »`, async () => {
          const response = await page.goto(`${base}/workspace/${workspaceId}/${route}`, { waitUntil: 'load' })
          if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()}`)
          await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
          await page.waitForTimeout(400)
          const text = await page.evaluate(() => document.body.innerText)
          if (/MISSING_MESSAGE|Application error|Something went wrong|Une erreur est survenue/i.test(text)) {
            throw new Error('message d’erreur affiché')
          }
          if (/\b(settings|common|shell|home|editor)\.[a-z]+\.[a-zA-Z]+\b/.test(text)) throw new Error('clé de traduction visible')
          const extra = await overflow()
          if (profile === 'mobile' && extra > 1) throw new Error(`débordement horizontal de ${extra} px`)
          if (['accueil', 'réglages'].includes(name)) await shot(name.replace(/\W+/g, '-'))
          return extra > 1 ? `débordement ${extra} px (bureau)` : ''
        })
      }

      if (profile === 'bureau') {
        const mod = mac ? 'Meta' : 'Control'
        // Un workflow jetable : l'éditeur enregistre tout seul, il ne faut jamais déposer un bloc dans un workflow existant.
        const scratch = await page.request.post(`${base}/api/workflows`, {
          headers: { Origin: base, 'Content-Type': 'application/json' },
          data: { name: `Navigateurs éditeur ${Date.now().toString(36)}`, workspaceId },
        })
        const scratchBody = await scratch.json().catch(() => ({}))
        const scratchId = scratchBody.id ?? scratchBody.workflow?.id ?? scratchBody.data?.id
        await step('éditeur : ouverture du canevas', async () => {
          if (!scratchId) throw new Error(`workflow jetable non créé (HTTP ${scratch.status()})`)
          await page.goto(`${base}/workspace/${workspaceId}/w/${scratchId}`, { waitUntil: 'load' })
          await page.waitForSelector('.react-flow__node', { timeout: 60000 })
          await page.waitForTimeout(800)
          await shot('editeur')
          return `${await page.locator('.react-flow__node').count()} blocs`
        })
        await step('éditeur : glisser-déposer d’un bloc depuis la barre d’outils', async () => {
          const before = await page.locator('.react-flow__node').count()
          const item = page.locator('[draggable=true]', { hasText: /^Condition$/ }).first()
          await item.waitFor({ timeout: 15000 })
          const pane = page.locator('.react-flow__pane').first()
          const box = await pane.boundingBox()
          await item.dragTo(pane, { targetPosition: { x: Math.max(60, box.width * 0.3), y: Math.max(60, box.height * 0.75) } })
          await page.waitForTimeout(1200)
          const after = await page.locator('.react-flow__node').count()
          if (after !== before + 1) throw new Error(`blocs : ${before} → ${after}`)
          return `${before} → ${after}`
        })
        await step(`éditeur : annuler (${mod}+Z) puis rétablir (${mod}+Maj+Z)`, async () => {
          const count = () => page.locator('.react-flow__node').count()
          const withBlock = await count()
          const paneBox = await page.locator('.react-flow__pane').first().boundingBox()
          await page.mouse.click(paneBox.x + paneBox.width * 0.1, paneBox.y + paneBox.height * 0.15)
          await page.keyboard.press(`${mod}+z`)
          await page.waitForTimeout(700)
          const undone = await count()
          if (undone !== withBlock - 1) throw new Error(`annuler : ${withBlock} → ${undone}`)
          await page.keyboard.press(`${mod}+Shift+z`)
          await page.waitForTimeout(700)
          const redone = await count()
          if (redone !== withBlock) throw new Error(`rétablir : ${undone} → ${redone}`)
          await page.keyboard.press(`${mod}+z`)
          await page.waitForTimeout(500)
          return `${withBlock} → ${undone} → ${redone}`
        })
        await page.request.delete(`${base}/api/workflows/${scratchId}`, { headers: { Origin: base } }).catch(() => {})
        await step(`raccourci de recherche (${mod}+K)`, async () => {
          await page.goto(`${base}/workspace/${workspaceId}/home`, { waitUntil: 'load' })
          await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
          await page.locator('body').click({ position: { x: 700, y: 400 } })
          await page.keyboard.press(`${mod}+k`)
          const dialog = page.locator('[role=dialog], [cmdk-root], [data-search-modal]').first()
          await dialog.waitFor({ state: 'visible', timeout: 8000 })
          await shot('recherche')
          await page.keyboard.press('Escape')
          const other = mac ? 'Control' : 'Meta'
          await page.keyboard.press(`${other}+k`)
          await page.waitForTimeout(500)
          const wrongOpens = await page.locator('[role=dialog], [cmdk-root], [data-search-modal]').first().isVisible().catch(() => false)
          if (wrongOpens) throw new Error(`${other}+K ouvre aussi la recherche`)
          return `${mod}+K ouvre la recherche, ${other}+K non`
        })
      }

      if (profile === 'mobile') {
        await step('mobile : ouverture d’un workflow (lecture seule)', async () => {
          await page.goto(`${base}/workspace/${workspaceId}/w`, { waitUntil: 'load' })
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
          await page.waitForTimeout(1500)
          const extra = await overflow()
          if (extra > 1) throw new Error(`débordement horizontal de ${extra} px`)
          await shot('editeur-mobile')
          return `${await page.locator('.react-flow__node').count()} blocs visibles`
        })
      }

      let chat = null
      if (profile === 'bureau' || browserName !== 'firefox') {
        await step('chat public : création, page, bulle /embed.js sur un site tiers', async () => {
          const headers = { Origin: base, 'Content-Type': 'application/json' }
          const created = await page.request.post(`${base}/api/workflows`, {
            headers,
            data: { name: `Navigateurs ${Date.now().toString(36)}`, workspaceId },
          })
          if (!created.ok()) throw new Error(`création du workflow : HTTP ${created.status()}`)
          const body = await created.json()
          const workflowId = body.id ?? body.workflow?.id ?? body.data?.id
          const rand = () => Math.random().toString(16).slice(2, 18).padEnd(16, '0')
          const start = rand()
          const block = rand()
          const sub = (id, type, value) => ({ id, type, value })
          const state = await page.request.put(`${base}/api/workflows/${workflowId}/state`, {
            headers,
            data: {
              blocks: {
                [start]: { id: start, type: 'start_trigger', name: 'Start', position: { x: 0, y: 0 }, enabled: true, subBlocks: { inputFormat: sub('inputFormat', 'input-format', []) }, outputs: {} },
                [block]: { id: block, type: 'agent', name: 'Agent', position: { x: 420, y: 0 }, enabled: true, subBlocks: { messages: sub('messages', 'messages-input', [{ role: 'system', content: 'Réponds en une phrase.' }, { role: 'user', content: '<start.input>' }]), model: sub('model', 'combobox', 'vllm/nexora-default'), tools: sub('tools', 'tool-input', []) }, outputs: {} },
              },
              edges: [{ id: rand(), source: start, target: block, sourceHandle: 'source', targetHandle: 'target' }],
              loops: {},
              parallels: {},
            },
          })
          if (!state.ok()) throw new Error(`état du workflow : HTTP ${state.status()}`)
          const deploy = await page.request.post(`${base}/api/workflows/${workflowId}/deploy`, { headers, data: {} })
          if (!deploy.ok()) throw new Error(`déploiement : HTTP ${deploy.status()}`)
          const identifier = `nav-${Math.random().toString(16).slice(2, 8)}`
          const published = await page.request.post(`${base}/api/chat`, {
            headers,
            data: { workflowId, identifier, title: 'Navigateurs', authType: 'public', customizations: { primaryColor: '#1f2937', welcomeMessage: 'Bonjour' }, outputConfigs: [{ blockId: block, path: 'content' }] },
          })
          if (!published.ok()) throw new Error(`publication du chat : HTTP ${published.status()}`)
          chat = { workflowId, identifier }

          await page.goto(`${base}/chat/${identifier}`, { waitUntil: 'load' })
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
          const input = page.locator('textarea, input[type=text]').first()
          await input.waitFor({ state: 'visible', timeout: 15000 })
          await input.fill('Bonjour')
          if ((await input.inputValue()) !== 'Bonjour') throw new Error('le champ du chat ne prend pas la saisie')
          const extra = await overflow()
          if (profile === 'mobile' && extra > 1) throw new Error(`débordement horizontal de ${extra} px`)
          await shot('chat-public')

          const site = await startThirdPartySite(identifier)
          const siteUrl = `http://127.0.0.1:${site.address().port}/`
          const sitePage = await context.newPage()
          const siteNotes = []
          sitePage.on('console', (m) => ['error'].includes(m.type()) && !IGNORED_CONSOLE.some((r) => r.test(m.text())) && siteNotes.push(m.text().slice(0, 200)))
          try {
            await sitePage.goto(siteUrl, { waitUntil: 'load' })
            const bubble = sitePage.locator('button[aria-label], button').last()
            await bubble.waitFor({ state: 'visible', timeout: 15000 })
            await bubble.click()
            const frame = sitePage.locator('iframe').first()
            await frame.waitFor({ state: 'attached', timeout: 15000 })
            const frameHandle = await frame.elementHandle()
            const content = await frameHandle.contentFrame()
            await content.waitForSelector('textarea, input[type=text]', { timeout: 20000 })
            await sitePage.screenshot({ path: path.join(shotsDir, `${browserName}-${profile}${mac ? '-mac' : ''}-embed.png`) })
          } finally {
            await sitePage.close()
            site.close()
          }
          if (siteNotes.length) throw new Error(`console du site tiers : ${siteNotes.join(' ; ')}`)
          return `chat /chat/${identifier} et bulle intégrée affichés`
        })
        if (chat) {
          await page.request
            .delete(`${base}/api/workflows/${chat.workflowId}`, { headers: { Origin: base } })
            .catch(() => {})
        }
      }

      await step('indices de performance de l’accueil', async () => {
        await page.goto(`${base}/workspace/${workspaceId}/home`, { waitUntil: 'load' })
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
        const metrics = await page.evaluate(
          () =>
            new Promise((resolve) => {
              let cls = 0
              let lcp = null
              try {
                new PerformanceObserver((list) => {
                  for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value
                }).observe({ type: 'layout-shift', buffered: true })
                new PerformanceObserver((list) => {
                  const entries = list.getEntries()
                  lcp = entries[entries.length - 1].startTime
                }).observe({ type: 'largest-contentful-paint', buffered: true })
              } catch {}
              setTimeout(() => resolve({ cls: Number(cls.toFixed(3)), lcp: lcp && Math.round(lcp) }), 800)
            })
        )
        return `CLS ${metrics.cls}${metrics.lcp ? `, LCP ${metrics.lcp} ms` : ''}`
      })

      await browser.close()
    }
  }
}

const steps = report.runs.flatMap((r) => r.etapes)
report.resume = {
  etapes: steps.length,
  ok: steps.filter((e) => e.ok).length,
  echecs: steps.filter((e) => !e.ok).length,
  nonVerifies: report.runs.filter((r) => r.nonVerifie).map((r) => r.label),
}
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(`\n${report.resume.ok}/${report.resume.etapes} étapes réussies, ${report.resume.echecs} échec(s), non vérifiés : ${report.resume.nonVerifies.join(', ') || 'aucun'}`)
process.exit(report.resume.echecs ? 1 : 0)
