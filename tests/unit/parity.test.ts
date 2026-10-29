/**
 * Test de paridad entre idiomas (sección 7 del plan multiidioma).
 * Falla si un paquete no cumple una capacidad obligatoria o el contenido mínimo, y genera docs/PARITY.md.
 *
 * Los datos de /public se sirven leyendo del disco (fetch simulado), igual que los cargaría el navegador.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { activateLang, LANGS } from "@/lib/languages/registry";
import type { Lang, LanguagePack } from "@/lib/languages/types";
import { COMMON_EXERCISE_TYPES, type ExerciseType, type Pool, type PoolSentence, type PoolWord } from "@/lib/exercises/types";
import { generateSession } from "@/lib/exercises/generators";
import { seededRandom } from "@/lib/utils";
import { readingQuestionsToExercises } from "@/lib/exercises/build";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PUBLIC = path.join(ROOT, "public");

// ---- fetch simulado: /data/..., /videos/... → public/ ----
const realFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    if (/^https?:/.test(url)) return realFetch(input);
    const file = path.join(PUBLIC, decodeURIComponent(url.split("?")[0]));
    if (!existsSync(file)) return new Response("not found", { status: 404 });
    const buf = readFileSync(file);
    return new Response(buf, { status: 200 });
  }) as typeof fetch;
});

type Check = { id: string; label: string; run(p: LanguagePack): Promise<true | string> | true | string };

const REQUIRED_TOKENS = ["paper", "paper-raised", "paper-sunk", "ink", "ink-soft", "ink-faint", "line", "cinnabar", "celadon", "indigo", "gold", "danger", "seal", "tone-1", "tone-2", "tone-3", "tone-4"];

function cssBlocks(file: string, selectorStart: string): string {
  const css = readFileSync(path.join(ROOT, file), "utf8");
  let out = "";
  let i = css.indexOf(selectorStart);
  while (i >= 0) {
    const open = css.indexOf("{", i);
    const close = css.indexOf("}", open);
    out += css.slice(open, close);
    i = css.indexOf(selectorStart, close);
  }
  return out;
}

function themeTokens(lang: Lang): { light: string; dark: string } {
  // cada piel se aplica a <html data-lang> y a cualquier contenedor [data-skin] (portada de idiomas)
  if (lang === "zh") {
    // el chino usa los tokens base; --seal se define en themes.css como alias de --cinnabar
    const common = cssBlocks("styles/themes.css", `[data-skin="zh"] { --seal`);
    return { light: cssBlocks("styles/tokens.css", ':root,\n[data-skin="zh"] {') + common, dark: cssBlocks("styles/tokens.css", ':root[data-theme="dark"] [data-skin="zh"] {') + common };
  }
  return { light: cssBlocks("styles/themes.css", `\n[data-skin="${lang}"] {`), dark: cssBlocks("styles/themes.css", `:root[data-theme="dark"] [data-skin="${lang}"] {`) };
}

function seedPool(p: LanguagePack): Pool {
  const words: PoolWord[] = p.seed.words.map((w) => ({ id: w.id, hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, category: w.category, example: w.example, examplePinyin: w.example_pinyin, exampleTranslation: w.example_translation, radical: w.radical, cl: p.counters.of(w.hanzi) }));
  const sentences: PoolSentence[] = [];
  for (const u of p.curriculum.units) for (const l of u.lessons) sentences.push(...p.curriculum.sentencesOf(l));
  for (const w of p.seed.words.slice(0, 200)) if (w.example) sentences.push({ zh: w.example, py: w.example_pinyin, es: w.example_translation });
  return { words, allWords: words, sentences };
}

const typesFor = (p: LanguagePack): ExerciseType[] => [...COMMON_EXERCISE_TYPES, ...(p.id === "zh" ? [] : (["conjugation", "particle"] as ExerciseType[]))];

const CHECKS: Check[] = [
  { id: "analyze", label: "Análisis de texto con lectura (ruby)", run: (p) => { const ex = p.seed.words.find((w) => w.example && /[一-鿿가-힯]/.test(w.example))!.example; const t = p.analyze(ex).tokens; return t.some((x) => x.isWord && x.segments.some((s) => s.reading)) || "sin lecturas"; } },
  { id: "readingAid", label: "Interruptor de ayuda de lectura (3 modos + opciones)", run: (p) => (p.readingAid.label && p.readingAid.modes.show && p.readingAid.modes.unknown && p.readingAid.modes.hide ? true : "faltan modos") },
  { id: "altScript", label: "Escritura alternativa (繁 / かな / 漢)", run: (p) => (p.readingAid.altScript ? true : "sin altScript") },
  { id: "romanize", label: "Romanización / lectura automática", run: (p) => (p.reading(p.seed.words[0].hanzi).length > 0 ? true : "lectura vacía") },
  { id: "prosody", label: "Prosodia (tonos / acento / reglas) y pares mínimos", run: (p) => (p.prosody.items.length > 0 && (p.prosody.minimalPairs?.length ?? 0) >= 3 ? true : "menos de 3 pares mínimos") },
  { id: "characters", label: "Módulo de caracteres (info, parecidos, componentes)", run: async (p) => { await p.characters.load(); const ch = p.characters.charsOf(p.seed.words.map((w) => w.hanzi).join(""))[0]; return p.characters.similarSets.length > 0 && Boolean(ch && p.characters.info(ch)) ? true : "sin info o parecidos"; } },
  { id: "strokes", label: "Orden de trazos (animación + quiz)", run: (p) => (p.strokeData.kind && (p.strokeData.url.length > 0 || typeof p.strokeData.load === "function") ? true : "sin proveedor de trazos") },
  { id: "dictionary", label: "Diccionario resuelve el 100 % de la semilla", run: async (p) => { await p.dictionary.load(); const miss = p.seed.words.filter((w) => !p.dictionary.lookupFirst(w.hanzi)); return miss.length === 0 || `${miss.length} sin resolver (${miss.slice(0, 5).map((w) => w.hanzi).join(", ")})`; } },
  { id: "dictSearch", label: "Búsqueda (escritura, lectura, español)", run: (p) => { const w = p.seed.words[5]; return p.dictionary.search(w.hanzi).length > 0 && p.dictionary.search(w.pinyin).length > 0 && p.dictionary.search(w.meaning.split(/[,;(]/)[0].trim()).length > 0 ? true : "búsqueda vacía"; } },
  { id: "examples", label: "Frases de ejemplo (Tatoeba)", run: async (p) => { await p.examples.load(); const found = p.seed.words.slice(0, 50).some((w) => p.examples.find(w.hanzi, 1).length > 0); return found || "sin ejemplos"; } },
  { id: "exam", label: "Simulacro del examen oficial (secciones, tiempos, puntuación)", run: (p) => { const m = p.exam.buildMock(1); const n = m.reduce((a, s) => a + s.parts.reduce((b, x) => b + x.exercises.length, 0), 0); const r = p.exam.passRule(m.map(() => 0)); return p.exam.sections.length >= 2 && n >= 20 && r.max > 0 ? true : `simulacro con ${n} preguntas`; } },
  { id: "levelLists", label: "Listas por nivel", run: async (p) => ((await p.levelLists()).words.length > 0 ? true : "sin listas") },
  { id: "unit0", label: "Unidad 0 de escritura y pronunciación", run: (p) => (p.curriculum.units.some((u) => u.level === 0 && u.lessons.length >= 3) ? true : "sin unidad 0") },
  { id: "units", label: "14 unidades temáticas", run: (p) => { const n = p.curriculum.units.filter((u) => u.level !== 0).length; return n >= 14 || `${n} unidades`; } },
  { id: "lessons", label: "Lecciones completas (vocabulario + ejercicios)", run: (p) => { const bad = p.curriculum.units.filter((u) => u.level !== 0).flatMap((u) => u.lessons).filter((l) => !l.steps.some((s) => s.type === "exercises")); return bad.length === 0 || `${bad.length} lecciones sin ejercicios`; } },
  { id: "grammar", label: "Gramática del primer nivel (≥ 30 puntos con ejemplos)", run: (p) => { const pts = p.grammar.points; const bad = pts.filter((g) => !g.examples?.length); return pts.length >= 30 && bad.length === 0 ? true : `${pts.length} puntos, ${bad.length} sin ejemplos`; } },
  { id: "readings", label: "≥ 30 lecturas graduadas en la escritura del idioma", run: (p) => { const wrong = p.readings.filter((r) => !p.hasTargetText(r.text) || (p.id !== "ko" && /[가-힯]/.test(r.text)) || (p.id !== "zh" && !r.id.startsWith(`${p.id}-`))); return (p.readings.length >= 30 && wrong.length === 0) || `${p.readings.length} lecturas, ${wrong.length} en otro idioma (${wrong.slice(0, 3).map((r) => r.id).join(", ")})`; } },
  { id: "studyHall", label: "Study Hall: artículos y recursos", run: (p) => (p.articles.length >= 10 && p.resources.length >= 5 ? true : `${p.articles.length} artículos, ${p.resources.length} recursos`) },
  { id: "videos", label: "≥ 10 vídeos analizados con subtítulos", run: (p) => { const f = path.join(PUBLIC, "videos", p.id, "index.json"); if (!existsSync(f)) return "sin índice"; const idx = JSON.parse(readFileSync(f, "utf8")) as { id: string }[]; const ok = idx.filter((v) => existsSync(path.join(PUBLIC, "videos", p.id, `${v.id}.json`))); return ok.length >= 10 || `${ok.length} vídeos`; } },
  { id: "exercises", label: "Todos los tipos de ejercicio se generan desde la semilla", run: (p) => { const pool = seedPool(p); const ctx = { adapters: p.exerciseAdapters, segmenter: (s: string) => p.exerciseAdapters.tiles(s), speechAvailable: true }; const fromReadings = new Set<ExerciseType>(p.readings.slice(0, 10).flatMap((r) => readingQuestionsToExercises(r.text, r.es, r.questions as never, r.id).map((e) => e.type)));
    const fail = typesFor(p).filter((t) => {
      if ((t === "comprehension" || t === "reading-tf") && fromReadings.has(t)) return false; for (let seed = 1; seed <= 4; seed++) if (generateSession(pool, 4, [t], seededRandom(seed * 97), ctx).some((e) => e.type === t)) return false; return true; }); return fail.length === 0 || `fallan: ${fail.join(", ")}`; } },
  { id: "counters", label: "Clasificadores / contadores", run: (p) => (p.counters.counters.length >= 5 ? true : "menos de 5") },
  { id: "morphology", label: "Conjugación (ja/ko)", run: (p) => (p.id === "zh" ? true : p.morphology && p.morphology.forms.length >= 8 && p.morphology.conjugate(p.morphology.lexicon[0].word, p.morphology.forms[0].id, p.morphology.lexicon[0].cls) ? true : "sin conjugación") },
  { id: "politeness", label: "Cortesía / niveles de habla", run: (p) => (p.id === "zh" || (p.politeness && p.politeness.levels.length >= 2) ? true : "sin módulo") },
  { id: "input", label: "Entrada de texto (pinyin / kana / hangul)", run: (p) => (p.ui.ReadingInput && p.normalizeInput("a") !== undefined ? true : "sin entrada") },
  { id: "speech", label: "TTS y reconocimiento de voz del idioma", run: (p) => (p.tts.voicePrefs.length && p.tts.edgeTtsVoices.length && p.asr.locale === p.bcp47 ? true : "sin voces") },
  { id: "anki", label: "Tipo de nota de Anki (reconocimiento, producción, escucha)", run: (p) => { const w = p.seed.words[0]; const word = { ...w, id: w.id, lang: p.id, examplePinyin: w.example_pinyin, exampleTranslation: w.example_translation, tags: [], hsk: w.hsk, source: "seed", createdAt: 0, updatedAt: 0 } as never; const f = p.anki.toFields(word); const missing = p.anki.fields.filter((k) => !(k in f)); return p.anki.templates.length >= 3 && missing.length === 0 && p.anki.fields.includes(p.anki.keyField) ? true : `faltan campos: ${missing.join(", ")}`; } },
  { id: "theme", label: "Tema con todos los tokens (claro y oscuro)", run: (p) => { const t = themeTokens(p.id); const miss = REQUIRED_TOKENS.filter((k) => !t.light.includes(`--${k}:`) || !t.dark.includes(`--${k}:`)); return miss.length === 0 || `faltan: ${miss.join(", ")}`; } },
  { id: "ornaments", label: "Ornamentos propios (paisaje, rama, forma diaria) y prohibiciones", run: (p) => (p.theme.ornaments.Landscape && p.theme.ornaments.Branch && p.theme.ornaments.DailyShape && p.theme.prohibited.length > 0 ? true : "faltan ornamentos") },
  { id: "ui", label: "Páginas propias (caracteres, ficha, módulos de la unidad 0)", run: (p) => (p.ui.CharactersPage && p.ui.CharacterDetail && Object.keys(p.ui.modules).length > 0 ? true : "faltan páginas") },
  { id: "seed", label: "Semilla ≥ 300 palabras en las 21 categorías", run: (p) => { const cats = new Set(p.seed.words.map((w) => w.category)); return p.seed.words.length >= 300 && cats.size >= 21 ? true : `${p.seed.words.length} palabras, ${cats.size} categorías`; } },
  { id: "credits", label: "Créditos y licencias de los datos", run: (p) => p.credits.length >= 5 || `${p.credits.length}` },
];

const results: Record<string, Record<Lang, true | string>> = {};

describe("paridad entre idiomas", () => {
  for (const lang of LANGS) {
    describe(lang, () => {
      let pack: LanguagePack;
      beforeAll(async () => {
        pack = await activateLang(lang);
        await pack.dictionary.load();
        // como en la app: las palabras del mazo (semilla) se registran en el diccionario
        pack.dictionary.setUserWords(pack.seed.words.map((w) => ({ ...w, lang, examplePinyin: w.example_pinyin, exampleTranslation: w.example_translation, tags: [], source: "seed", createdAt: 0, updatedAt: 0 })) as never);
      }, 60000);
      for (const c of CHECKS) {
        it(c.label, async () => {
          let r: true | string;
          try {
            r = await c.run(pack);
          } catch (e) {
            r = `error: ${(e as Error).message}`;
          }
          (results[c.id] ??= {} as Record<Lang, true | string>)[lang] = r;
          expect(r, `${lang} · ${c.label}`).toBe(true);
        }, 60000);
      }
    });
  }
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  await activateLang("zh");
  const cell = (r: true | string | undefined) => (r === true ? "✅" : r === undefined ? "—" : `❌ ${r}`);
  const rows = CHECKS.map((c) => `| ${c.label} | ${LANGS.map((l) => cell(results[c.id]?.[l])).join(" | ")} |`);
  const ok = CHECKS.every((c) => LANGS.every((l) => results[c.id]?.[l] === true));
  const md = [
    "# Paridad entre idiomas",
    "",
    "Generado automáticamente por `tests/unit/parity.test.ts` (`npm test`). No editar a mano.",
    "",
    `Estado: ${ok ? "✅ todas las capacidades obligatorias en los tres idiomas" : "❌ hay capacidades pendientes"}.`,
    "",
    "| Capacidad | 中文 Chino | 日本語 Japonés | 한국어 Coreano |",
    "|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
  writeFileSync(path.join(ROOT, "docs", "PARITY.md"), md);
});
