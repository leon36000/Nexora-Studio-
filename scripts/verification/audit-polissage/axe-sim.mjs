import { chromium } from "playwright"
import AxeBuilder from "@axe-core/playwright"
const WS = process.env.WS, WSID = process.env.WSID
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, locale: "fr-CA", storageState: "/essais/state.json" })
const page = await ctx.newPage()
const tokens = { "--text-muted": "#686868", "--text-placeholder": "#707070", "--badge-success-text": "#166534", "--badge-error-text": "#b91c1c", "--badge-blue-secondary-text": "#075985", "--badge-purple-text": "#6d28d9", "--badge-orange-text": "#9a3412", "--badge-amber-text": "#854d0e", "--badge-teal-text": "#115e59", "--badge-cyan-text": "#0e7490", "--badge-pink-text": "#9d174d" }
for (const p of process.env.P.split(",")) {
  await page.goto(`${WS}/workspace/${WSID}/${p}`, { waitUntil: "domcontentloaded" })
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(1500)
  await page.evaluate((tokens) => {
    for (const [k, v] of Object.entries(tokens)) document.documentElement.style.setProperty(k, v)
    document.querySelectorAll("div[aria-haspopup=menu][style*=fixed]").forEach((e) => { e.setAttribute("role", "button"); e.setAttribute("aria-hidden", "true") })
    document.querySelectorAll("[role=tree]").forEach((e) => e.setAttribute("role", "group"))
    document.querySelectorAll("[role=separator][tabindex=\"0\"]").forEach((e) => e.setAttribute("tabindex", "-1"))
    const sw = document.querySelector("button[aria-label=\"Changer d’espace de travail\"]"); if (sw) sw.setAttribute("aria-label", sw.innerText.trim() + " : changer d’espace de travail")
    document.querySelectorAll("button[aria-label^=\"Marquer «\"]").forEach((b) => b.setAttribute("aria-label", "Marquer comme fait : x"))
    document.querySelectorAll("a[aria-label^=\"Ouvrir \"]").forEach((a) => { a.removeAttribute("aria-label") })
  }, tokens)
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
  console.log("==", p, res.violations.map((v) => `${v.id}[${v.impact}]:${v.nodes.length}`).join(" ") || "aucune")
  for (const v of res.violations) for (const n of v.nodes.slice(0, 2)) console.log("   ", v.id, n.html.slice(0, 150).replace(/\n/g, " "))
}
await browser.close()
