import { chromium } from "playwright"
const WS = process.env.WS, EMAIL = process.env.EMAIL, PW = process.env.PW
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, locale: "fr-CA" })
const page = await ctx.newPage()
await page.goto(`${WS}/login`, { waitUntil: "domcontentloaded", timeout: 60000 })
await page.getByRole("button", { name: /Nexora AI/i }).first().click()
await page.waitForURL(/compte\/connexion/, { timeout: 60000 })
await page.fill("#email", EMAIL); await page.fill("#password", PW)
await Promise.all([page.waitForURL((u) => u.toString().startsWith(WS), { timeout: 90000 }), page.locator("form button[type=submit]").click()])
await page.waitForTimeout(5000)
const m = page.url().match(/workspace\/([0-9a-f-]+)/); const id = m && m[1]
console.log("workspace", id)
const txt = async (n) => (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, n)
for (const [name, path] of [["logs", `/workspace/${id}/logs`], ["models", `/workspace/${id}/settings/models`], ["home", `/workspace/${id}/home`]]) {
  await page.goto(`${WS}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 }); await page.waitForTimeout(5000)
  await page.screenshot({ path: `/essais/journaux-${name}.png` })
  console.log(`== ${name}:`, await txt(700))
}
await page.setViewportSize({ width: 375, height: 812 })
await page.goto(`${WS}/workspace/${id}/settings/models`, { waitUntil: "domcontentloaded", timeout: 60000 }); await page.waitForTimeout(5000)
await page.screenshot({ path: "/essais/journaux-models-mobile.png" })
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
console.log("mobile overflow horizontal:", overflow)
await browser.close()
