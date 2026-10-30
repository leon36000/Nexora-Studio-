import { chromium } from "playwright"
import AxeBuilder from "@axe-core/playwright"
import fs from "node:fs"
const WS = process.env.WS, WSID = process.env.WSID, VP = process.env.VP || "desktop", TAG = process.env.TAG || "d"
const AXE = process.env.AXE === "1", SHOT = process.env.SHOT !== "0", STATE = process.env.STATE || "/essais/state.json"
const pages = JSON.parse(fs.readFileSync(process.env.PAGES || "/essais/pages.json", "utf8"))
const sizes = { desktop: { width: 1360, height: 860 }, mobile: { width: 390, height: 844 }, tablet: { width: 768, height: 1024 } }
const browser = await chromium.launch()
const opts = { viewport: sizes[VP], locale: "fr-CA", storageState: STATE }
if (VP === "mobile") { opts.isMobile = true; opts.hasTouch = true; opts.deviceScaleFactor = 2 }
const ctx = await browser.newContext(opts)
const report = []
fs.mkdirSync(`/essais/out/${TAG}`, { recursive: true })
for (const p of pages) {
  const page = await ctx.newPage()
  const errs = [], bad = []
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.type() + ": " + m.text().slice(0, 220)) })
  page.on("pageerror", (e) => errs.push("pageerror: " + String(e).slice(0, 220)))
  page.on("response", (r) => { if (r.status() >= 400) bad.push(r.status() + " " + r.request().method() + " " + r.url().replace(WS, "").slice(0, 140)) })
  const url = p.startsWith("http") ? p : p.startsWith("/") ? WS + p.replace("{W}", WSID) : `${WS}/workspace/${WSID}/${p}`
  const name = p.replace(/[^a-z0-9]+/gi, "_").slice(0, 60)
  const rec = { page: p }
  const t0 = Date.now()
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 })
    rec.status = resp?.status()
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(1200)
    rec.ms = Date.now() - t0
    rec.finalUrl = page.url().replace(WS, "")
    rec.overflowX = await page.evaluate(() => { const d = document.documentElement; return d.scrollWidth - window.innerWidth })
    rec.text = (await page.locator("body").innerText().catch(() => "")).replace(/[ \t]+/g, " ")
    fs.writeFileSync(`/essais/out/${TAG}/${name}.txt`, rec.text)
    rec.small = await page.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll("button, a[href], [role=button], [role=menuitem], input, select, textarea, [role=tab]")) {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
        if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || cs.display === "none") continue
        if (r.bottom < 0 || r.top > innerHeight + 4000) continue
        const af = getComputedStyle(el, "::after"); const afOk = af.content !== "none" && af.position === "absolute" && parseFloat(af.height) >= 44 && (parseFloat(af.width) >= 44 || af.width.endsWith("%") || r.width >= 44)
        if (afOk) continue
        if (r.width < 44 || r.height < 44) out.push(`${Math.round(r.width)}x${Math.round(r.height)} ${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || "").trim().slice(0, 40)}"`)
      }
      return out
    })
    rec.unnamed = await page.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=switch], [role=checkbox], [role=combobox]")) {
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue
        const n = (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.innerText || el.getAttribute("title") || el.getAttribute("placeholder") || (el.labels && el.labels[0]?.innerText) || "").trim()
        if (!n) out.push(el.outerHTML.slice(0, 140))
      }
      return out
    })
    rec.links = await page.evaluate(() => [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.href))].filter((h) => !h.startsWith(location.origin)).slice(0, 20))
    if (AXE) {
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
      rec.axe = res.violations.filter((v) => ["critical", "serious"].includes(v.impact)).map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, ex: v.nodes.slice(0, 2).map((n) => n.html.slice(0, 160)), tgt: v.nodes.slice(0, 2).map((n) => n.target.join(" ")) }))
    }
    if (SHOT) await page.screenshot({ path: `/essais/out/${TAG}/${name}.png` })
  } catch (e) { rec.error = String(e).slice(0, 200) }
  rec.errs = [...new Set(errs)]; rec.bad = [...new Set(bad)]
  report.push(rec)
  console.log(`${rec.status} ${rec.ms}ms ${p} -> ${rec.finalUrl} overflow=${rec.overflowX} errs=${rec.errs?.length} bad=${rec.bad?.length} small=${rec.small?.length} unnamed=${rec.unnamed?.length}${rec.axe ? " axe=" + rec.axe.length : ""}${rec.error ? " ERROR " + rec.error : ""}`)
  await page.close()
}
fs.writeFileSync(`/essais/out/${TAG}/report.json`, JSON.stringify(report, null, 1))
await browser.close()
