import { chromium } from 'playwright'
const WS = process.env.WS, EMAIL = process.env.EMAIL, PW = process.env.PW
const out = (n) => `/essais/${n}.png`
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, locale: 'fr-CA' })
const page = await ctx.newPage()
const log = []
page.on('response', (r) => { const u = r.url(); if (/oauth|\/api\/auth|workstudio-access|compte\/connexion/.test(u)) log.push(`${r.status()} ${u.replace(/(code|state|sig|token)=[^&]+/g, '$1=…').slice(0, 150)}`) })
await page.goto(`${WS}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(3000)
await page.screenshot({ path: out('sso-1-login-workstudio') })
const btn = page.getByRole('button', { name: /Nexora AI/i }).first()
console.log('bouton Nexora AI visible :', await btn.isVisible().catch(() => false))
await btn.click({ timeout: 15000 })
await page.waitForURL(/compte\/connexion/, { timeout: 60000 })
console.log('arrivé sur la connexion du site :', page.url().replace(/(sig|exp)=[^&]+/g, '$1=…').slice(0, 160))
await page.screenshot({ path: out('sso-2-connexion-site') })
await page.fill('#email', EMAIL)
await page.fill('#password', PW)
await Promise.all([
  page.waitForURL((u) => u.toString().startsWith(WS), { timeout: 90000 }),
  page.locator('form button[type=submit]').click(),
])
await page.waitForTimeout(8000)
console.log('retour WorkStudio :', page.url().replace(/(code|state)=[^&]+/g, '$1=…').slice(0, 160))
await page.screenshot({ path: out('sso-3-apres-connexion') })
console.log('titre :', await page.title())
console.log(log.join('\n'))
await browser.close()
