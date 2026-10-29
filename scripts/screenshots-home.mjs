// node scripts/screenshots-home.mjs [--out=design/screenshots/after] [--base=http://localhost:3000] [--only=uno,tres,nuevo] [--sizes=1440,390]
// Capturas de la portada (/?elegir=1, «inicio») en tres estados sembrados en IndexedDB:
//   uno   → 1 idioma activo (japonés) con progreso
//   tres  → 3 idiomas activos con progreso distinto
//   nuevo → recién terminado el onboarding (3 idiomas, sin progreso)
// Tamaños: 1440×900, 1920×1080, 834×1194 (tablet), 390×844 y 360×740 (móvil); claro y oscuro.
// Además audita el atributo lang (todo texto CJK debe tener un antepasado con lang=zh/ja/ko).
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const OUT = arg("out", "design/screenshots/after");
const BASE = arg("base", "http://localhost:3000");
const ONLY = arg("only", "uno,tres,nuevo").split(",");
const SIZES_ARG = arg("sizes", "");

const SIZES = [
  ["1440", { width: 1440, height: 900 }, false],
  ["1920", { width: 1920, height: 1080 }, false],
  ["tablet", { width: 834, height: 1194 }, true],
  ["390", { width: 390, height: 844 }, true],
  ["360", { width: 360, height: 740 }, true],
].filter(([n]) => !SIZES_ARG || SIZES_ARG.split(",").includes(n));

const STATES = {
  uno: { langs: ["ja"], progress: { ja: { known: 120, due: 12, days: 9, minutes: 22 } } },
  tres: {
    langs: ["zh", "ja", "ko"],
    progress: {
      zh: { known: 180, due: 23, days: 14, minutes: 25 },
      ja: { known: 64, due: 9, days: 5, minutes: 15 },
      ko: { known: 21, due: 4, days: 2, minutes: 8 },
    },
  },
  nuevo: { langs: ["zh", "ja", "ko"], progress: {} },
};

/** Siembra ajustes y progreso directamente en IndexedDB (xueban). */
async function seed(page, state) {
  // visitar cada idioma crea su semilla de palabras y tarjetas
  await page.goto(`${BASE}/bienvenida`);
  await page.waitForTimeout(1500);
  for (const l of ["zh", "ja", "ko"]) {
    await page.goto(`${BASE}/${l}`, { waitUntil: "networkidle" });
    // espera a que la semilla de tarjetas de este idioma exista
    await page.waitForFunction(async (lang) => {
      const open = indexedDB.open("xueban");
      await new Promise((r) => (open.onsuccess = r));
      const db = open.result;
      const tx = db.transaction("cards", "readonly");
      const req = tx.objectStore("cards").index("lang").count(lang);
      const n = await new Promise((r) => (req.onsuccess = () => r(req.result)));
      db.close();
      return n > 100;
    }, l, { timeout: 30000, polling: 500 });
    // y a que la siembra termine del todo (el recuento deja de cambiar)
    let prev = -1;
    for (let i = 0; i < 20; i++) {
      const n = await page.evaluate(async (lang) => {
        const open = indexedDB.open("xueban");
        await new Promise((r) => (open.onsuccess = r));
        const db = open.result;
        const req = db.transaction("cards", "readonly").objectStore("cards").index("lang").count(lang);
        const c = await new Promise((r) => (req.onsuccess = () => r(req.result)));
        db.close();
        return c;
      }, l);
      if (n === prev) break;
      prev = n;
      await page.waitForTimeout(1200);
    }
  }
  await page.evaluate(async ({ state }) => {
    const open = indexedDB.open("xueban");
    await new Promise((r) => (open.onsuccess = r));
    const db = open.result;
    const tx = db.transaction(["settings", "cards", "daily"], "readwrite");
    const st = tx.objectStore("settings");
    const get = st.get("main");
    await new Promise((r) => (get.onsuccess = r));
    const v = get.result?.value ?? {};
    v.onboardingDone = true;
    v.name = "Hugo";
    v.activeLangs = state.langs;
    v.lastLang = state.langs[0];
    v.dailyGoalMinutes = 45;
    for (const l of ["zh", "ja", "ko"]) if (v.langs?.[l]) v.langs[l].active = state.langs.includes(l);
    st.put({ key: "main", value: v, updatedAt: Date.now() });
    // progreso: tarjetas conocidas y vencidas, minutos por día
    const cards = tx.objectStore("cards");
    const all = cards.getAll();
    await new Promise((r) => (all.onsuccess = r));
    const now = Date.now();
    const byLang = {};
    for (const c of all.result) (byLang[c.lang] ??= []).push(c);
    for (const [l, p] of Object.entries(state.progress)) {
      const list = (byLang[l] ?? []).filter((c) => c.type === "recognition");
      list.slice(0, p.known).forEach((c, i) => {
        cards.put({ ...c, state: 2, stability: 8, reps: 4, last_review: now - 86400000, due: i < p.due ? now - 3600000 : now + 5 * 86400000 });
      });
    }
    const daily = tx.objectStore("daily");
    for (const [l, p] of Object.entries(state.progress)) {
      for (let i = 0; i < p.days; i++) {
        const d = new Date(now - i * 86400000);
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        daily.put({ id: `${l}:${date}`, lang: l, date, minutes: i === 0 ? p.minutes : 20 + ((i * 7) % 15), reviews: 30, newWords: 7, exercises: 20, correct: 16, updatedAt: now });
      }
    }
    await new Promise((r) => (tx.oncomplete = r));
  }, { state });
}

const audit = {};
const browser = await chromium.launch();
fs.mkdirSync(OUT, { recursive: true });
for (const stateName of ONLY) {
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme, locale: "es-ES" });
    const page = await ctx.newPage();
    await seed(page, STATES[stateName]);
    for (const [size, viewport, mobile] of SIZES) {
      await page.setViewportSize(viewport);
      try {
        await page.goto(`${BASE}/?elegir=1`, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForTimeout(2200);
        const file = path.join(OUT, `inicio-${stateName}-${size}-${theme}.png`);
        await page.screenshot({ path: file, fullPage: mobile });
        if (theme === "light") {
          const bad = await page.evaluate(() => {
            const re = /[぀-ヿ㐀-鿿가-힯]/;
            const out = [];
            const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            while (w.nextNode()) {
              const n = w.currentNode;
              if (!re.test(n.textContent ?? "")) continue;
              const el = n.parentElement;
              if (!el || el.closest("script,style,noscript,[aria-hidden=true]")) continue;
              const lang = el.closest("[lang]")?.getAttribute("lang") ?? "";
              if (!/^(zh|ja|ko)/.test(lang)) out.push((n.textContent ?? "").trim().slice(0, 40));
            }
            return out;
          });
          if (bad.length) audit[`${stateName}-${size}`] = bad;
        }
        process.stdout.write(`✓ ${stateName} ${size} ${theme}\n`);
      } catch (e) {
        process.stdout.write(`✗ ${stateName} ${size} ${theme}: ${e.message.split("\n")[0]}\n`);
      }
    }
    await ctx.close();
  }
}
await browser.close();
const n = Object.values(audit).reduce((a, x) => a + x.length, 0);
console.log(n ? `✗ atributo lang: ${n} textos sin lang ${JSON.stringify(audit).slice(0, 400)}` : "✓ atributo lang: todo el texto meta lleva lang");
