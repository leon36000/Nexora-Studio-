import { chromium } from "playwright"
import fs from "node:fs"
const WS = process.env.WS, WSID = process.env.WSID
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, locale: "fr-CA", storageState: "/essais/state.json" })
const page = await ctx.newPage()
for (const p of (process.env.P || "home").split(",")) {
  await page.goto(`${WS}/workspace/${WSID}/${p}`, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(3000)
  const seen = []
  let prev = ""
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press("Tab")
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return { none: true }
      const cs = getComputedStyle(el), r = el.getBoundingClientRect()
      const name = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || el.getAttribute("placeholder") || "").trim().slice(0, 40).replace(/\n/g, " ")
      // compare with unfocused: check outline or box-shadow or ring
      const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0
      const shadow = cs.boxShadow && cs.boxShadow !== "none"
      return { tag: el.tagName.toLowerCase(), role: el.getAttribute("role"), name, outline, shadow: !!shadow, bg: cs.backgroundColor, w: Math.round(r.width), h: Math.round(r.height), vis: r.width > 0 && r.bottom > 0 && r.top < innerHeight, fv: el.matches(":focus-visible") }
    })
    seen.push(info)
  }
  console.log("==", p)
  for (const [i, s] of seen.entries()) console.log(i, s.none ? "(body)" : `${s.tag}${s.role ? "[" + s.role + "]" : ""} "${s.name}" ${s.w}x${s.h} outline=${s.outline} shadow=${s.shadow} fv=${s.fv} vis=${s.vis}`)
  await page.screenshot({ path: `/essais/out/kbd-${p.replace(/\W/g, "_")}.png` })
}
await browser.close()
