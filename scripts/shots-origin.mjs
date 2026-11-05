/**
 * Capturas del visor «Origen y evolución» (ficha de 马, pestaña Origen y un artículo) en escritorio/móvil y claro/oscuro.
 * Uso: node scripts/shots-origin.mjs <etiqueta> [base]   → design/screenshots/origin-<etiqueta>-*.png
 * Requiere el servidor (npm run dev) arrancado.
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const tag = process.argv[2] ?? "after";
const base = process.argv[3] ?? "http://localhost:3000";
const out = path.resolve(import.meta.dirname, "..", "design", "screenshots");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const [vp, opts] of [
  ["desktop", { viewport: { width: 1280, height: 900 } }],
  ["mobile", devices["Pixel 7"]],
]) {
  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({ ...opts, colorScheme: scheme, locale: "es-ES" });
    const page = await ctx.newPage();
    await page.goto(base + "/bienvenida");
    await page.waitForTimeout(1500);
    const skip = page.getByText("Saltar y usar valores por defecto");
    if (await skip.count()) await skip.click();
    await page.waitForTimeout(800);
    // ficha de 马
    await page.goto(base + "/zh/caracteres?q=" + encodeURIComponent("马"));
    await page.waitForTimeout(3500);
    const sec = page.locator("[data-origin-viewer]").first().or(page.getByRole("dialog").getByText("Origen y evolución")).first();
    if (await sec.count()) await sec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, `origin-${tag}-ficha-${vp}-${scheme}.png`) });
    // pestaña Origen
    await page.goto(base + "/zh/caracteres");
    await page.waitForTimeout(2500);
    const tab = page.getByRole("tab", { name: /Origen/ });
    if (await tab.count()) {
      await tab.click();
      await page.waitForTimeout(1500);
      const gal = page.getByText(/Pictogramas/).first();
      if (await gal.count()) await gal.scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(out, `origin-${tag}-pestana-${vp}-${scheme}.png`) });
    }
    await ctx.close();
  }
}
await browser.close();
console.log("capturas en", out);
