// node scripts/screenshots.mjs [--lang=zh,ja,ko] [--out=design/screenshots] [--only=hoy,aprender] [--base=http://localhost:3000]
// Recorre la app en cada idioma con Playwright: escritorio y móvil, claro y oscuro.
// Además audita el atributo lang: ningún texto en chino/japonés/coreano puede pintarse sin un antepasado
// con lang=zh-*/ja-*/ko-* (informe en <out>/lang-audit.json; --audit-only para no hacer capturas).
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const LANGS = arg("lang", "zh,ja,ko").split(",");
const OUT = arg("out", "design/screenshots");
const BASE = arg("base", "http://localhost:3000");
const ONLY = arg("only", "")?.split(",").filter(Boolean);
const AUDIT_ONLY = process.argv.includes("--audit-only");
const audit = {};

const SAMPLE = { zh: { q: "学", lesson: "u01-l1", reading: "r01" }, ja: { q: "食べる", lesson: "ja-u01-l1", reading: "ja-r01" }, ko: { q: "먹다", lesson: "ko-u01-l1", reading: "ko-r01" } };

const ROUTES = (l) => [
  ...(l === LANGS[0] ? [["inicio", "/?elegir=1"]] : []), // portada «Tres puertas» (estados sembrados: npm run screenshots:home)
  ["hoy", `/${l}`],
  ["aprender", `/${l}/aprender`],
  ["leccion", `/${l}/aprender/leccion/${SAMPLE[l].lesson}`],
  ["gramatica", `/${l}/aprender/gramatica`],
  ["practicar", `/${l}/practicar`],
  ["simulacro", `/${l}/practicar/simulacro`],
  ["flashcards", `/${l}/flashcards`],
  ["repasar", `/${l}/flashcards/repasar`],
  ["diccionario", `/${l}/diccionario?q=${encodeURIComponent(SAMPLE[l].q)}`],
  ["caracteres", `/${l}/caracteres`],
  ["lectura", `/${l}/lectura`],
  ["lectura-texto", `/${l}/lectura/${SAMPLE[l].reading}`],
  ["videos", `/${l}/videos`],
  ["study-hall", `/${l}/study-hall`],
  ["progreso", `/${l}/progreso`],
  ["ajustes", `/${l}/ajustes`],
  ["design", `/design?lang=${l}`],
  ...(l === "zh" ? [] : [["conjugacion", `/${l}/aprender/conjugacion`]]),
  ["contadores", `/${l}/aprender/contadores`],
  ["cortesia", `/${l}/aprender/cortesia`],
  ["me", `/me?lang=${l}`],
  ["creditos", `/creditos?lang=${l}`],
  ["como-aprender", `/como-aprender?lang=${l}`],
];

const MODES = [
  ["desktop-light", { viewport: { width: 1366, height: 900 }, colorScheme: "light" }],
  ["desktop-dark", { viewport: { width: 1366, height: 900 }, colorScheme: "dark" }],
  ["mobile-light", { ...devices["Pixel 7"], colorScheme: "light" }],
  ["mobile-dark", { ...devices["Pixel 7"], colorScheme: "dark" }],
];

async function prepare(page, langs) {
  await page.goto(`${BASE}/bienvenida`);
  await page.waitForTimeout(1500);
  // activa los idiomas que se van a fotografiar y salta el onboarding
  await page.evaluate(async (langs) => {
    const open = indexedDB.open("xueban");
    await new Promise((r) => (open.onsuccess = r));
    const db = open.result;
    const tx = db.transaction("settings", "readwrite");
    const st = tx.objectStore("settings");
    const get = st.get("main");
    await new Promise((r) => (get.onsuccess = r));
    const v = get.result?.value ?? {};
    v.onboardingDone = true;
    v.activeLangs = langs;
    v.lastLang = langs[0];
    st.put({ key: "main", value: v, updatedAt: Date.now() });
    await new Promise((r) => (tx.oncomplete = r));
  }, langs);
}

const browser = await chromium.launch();
for (const [mode, opts] of AUDIT_ONLY ? MODES.slice(0, 1) : MODES) {
  const ctx = await browser.newContext({ ...opts, locale: "es-ES" });
  const page = await ctx.newPage();
  await prepare(page, LANGS);
  for (const l of LANGS) {
    const dir = path.join(OUT, l);
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, url] of ROUTES(l)) {
      if (ONLY.length && !ONLY.includes(name)) continue;
      try {
        await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForTimeout(1800);
        if (mode === "desktop-light") {
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
              if (!/^(zh|ja|ko)/.test(lang)) out.push(`${(n.textContent ?? "").trim().slice(0, 40)} <${el.tagName.toLowerCase()} class="${(el.className?.baseVal ?? el.className ?? "").toString().slice(0, 60)}">`);
            }
            return out;
          });
          if (bad.length) (audit[l] ??= {})[name] = bad;
        }
        if (!AUDIT_ONLY) await page.screenshot({ path: path.join(dir, `${name}--${mode}.png`), fullPage: true });
        process.stdout.write(`✓ ${l} ${name} ${mode}\n`);
      } catch (e) {
        process.stdout.write(`✗ ${l} ${name} ${mode}: ${e.message.split("\n")[0]}\n`);
      }
    }
  }
  await ctx.close();
}
await browser.close();
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "lang-audit.json"), JSON.stringify(audit, null, 1));
const nBad = Object.values(audit).reduce((a, r) => a + Object.values(r).reduce((b, x) => b + x.length, 0), 0);
console.log(nBad ? `✗ atributo lang: ${nBad} textos sin lang (ver ${path.join(OUT, "lang-audit.json")})` : "✓ atributo lang: todo el texto meta lleva lang");
if (nBad && process.argv.includes("--strict")) process.exit(1);
