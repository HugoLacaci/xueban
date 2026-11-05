/**
 * Capturas del temario v2 (revisión visual): Etapa 0 (tabla de pinyin, esquema de tonos, reglas), una lección
 * completa (paso a paso), un apunte vivo antes y después de desbloquear, el esqueleto en móvil, el mapa por etapas,
 * la ficha resumen y el visor de evolución. Escritorio y móvil, claro y oscuro → design/screenshots/temario-*.png
 * Uso: node scripts/shots-temario.mjs [base]   (por defecto http://localhost:3100, p. ej. `next start -p 3100`)
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3100";
const out = path.resolve(import.meta.dirname, "..", "design", "screenshots");
mkdirSync(out, { recursive: true });

async function unlock(page, lessonIds) {
  await page.evaluate(async (ids) => {
    await new Promise((res, rej) => {
      const req = indexedDB.open("xueban");
      req.onerror = () => rej(req.error);
      req.onsuccess = () => {
        const tx = req.result.transaction("lessonProgress", "readwrite");
        const st = tx.objectStore("lessonProgress");
        const now = Date.now();
        for (const id of ids) st.put({ lessonId: id, lang: "zh", unitId: id.replace(/-l\d+$/, ""), status: "completed", attempts: 1, score: 0.9, completedAt: now, updatedAt: now });
        tx.oncomplete = () => res(true);
        tx.onerror = () => rej(tx.error);
      };
    });
  }, lessonIds);
}

async function step(page, name) {
  const b = page.getByRole("button", { name }).first();
  if (await b.count()) {
    await b.click();
    await page.waitForTimeout(900);
  }
}

const browser = await chromium.launch();
for (const [vp, opts] of [
  ["desktop", { viewport: { width: 1280, height: 900 } }],
  ["mobile", devices["Pixel 7"]],
]) {
  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({ ...opts, colorScheme: scheme, locale: "es-ES" });
    const page = await ctx.newPage();
    const shot = async (name, full = true) => page.screenshot({ path: path.join(out, `temario-${name}-${vp}-${scheme}.png`), fullPage: full });
    await page.goto(base + "/bienvenida");
    await page.waitForTimeout(1500);
    const skip = page.getByText("Saltar y usar valores por defecto");
    if (await skip.count()) await skip.click();
    await page.waitForTimeout(800);

    // mapa por etapas
    await page.goto(base + "/zh/aprender");
    await page.waitForTimeout(2500);
    await shot("mapa", false);
    // Etapa 0
    await page.goto(base + "/zh/aprender/leccion/e0-09");
    await page.waitForTimeout(2500);
    await step(page, /Tabla de pinyin/);
    await shot("e0-tabla-pinyin");
    await page.goto(base + "/zh/aprender/leccion/e0-10");
    await page.waitForTimeout(2500);
    await step(page, /Esquema de los tonos/);
    await shot("e0-esquema-tonos");
    await page.goto(base + "/zh/aprender/leccion/e0-07");
    await page.waitForTimeout(2500);
    await step(page, /Reglas del pinyin/);
    await shot("e0-reglas-pinyin");
    // lección completa (a1-u08-l1): objetivo, pronunciación, carácter del día, esqueleto, construye la frase, apuntes
    await page.goto(base + "/zh/aprender/leccion/a1-u08-l1");
    await page.waitForTimeout(3000);
    await shot("leccion-1-objetivo");
    await step(page, /^Pronunciación/);
    await shot("leccion-2-pronunciacion");
    await step(page, /Carácter del día/);
    await page.waitForTimeout(1500);
    await shot("leccion-3-caracter");
    const sk = page.locator("ol[aria-label='Pasos de la lección'] button").nth(4);
    if (await sk.count()) {
      await sk.click();
      await page.waitForTimeout(1200);
    }
    await shot("leccion-4-esqueleto");
    await step(page, /Construye la frase/);
    await shot("leccion-5-construye");
    await step(page, /Tus apuntes/);
    await shot("leccion-6-apuntes");
    // apunte vivo antes y después
    await page.goto(base + "/zh/apuntes/vivos?n=adjetivos");
    await page.waitForTimeout(2500);
    await shot("apunte-vivo-antes");
    await unlock(page, ["a1-u08-l1", "a1-u08-l2", "a1-u08-l3"]);
    await page.goto(base + "/zh/apuntes/vivos?n=adjetivos");
    await page.waitForTimeout(2500);
    await shot("apunte-vivo-despues");
    await page.goto(base + "/zh/apuntes/vivos");
    await page.waitForTimeout(2000);
    await shot("apuntes-vivos-indice", false);
    // ficha resumen
    await page.goto(base + "/zh/aprender/ficha?u=a1-u08");
    await page.waitForTimeout(2500);
    await shot("ficha-resumen", false);
    // visor de evolución (ficha de 马)
    await page.goto(base + "/zh/caracteres?q=" + encodeURIComponent("马"));
    await page.waitForTimeout(3500);
    const v = page.locator("[data-origin-viewer]").first();
    if (await v.count()) await v.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await shot("visor-evolucion", false);
    await ctx.close();
  }
}
await browser.close();
console.log("capturas en", out);
