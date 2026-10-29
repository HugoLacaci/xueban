/**
 * npm run data:build -- --lang=ja
 * Datos abiertos del japonés → public/data/ja/:
 *  - JMdict (EDRDG, CC BY-SA 4.0) vía jmdict-simplified (eng + spa) → dict-core.json / dict-full.json
 *  - KANJIDIC2 + KRADFILE/RADKFILE (EDRDG, CC BY-SA 4.0) → kanji.json, radk.json
 *  - KanjiVG (CC BY-SA 3.0) → strokes/<char>.json (kanji y kana; formato {size, strokes, medians})
 *  - Kanjium (CC BY-SA 4.0) → acento tonal fusionado en el diccionario y la semilla
 *  - Listas JLPT comunitarias (elzup/jlpt-word-list, MIT; derivadas de J. Waller) → jlpt.json
 *  - Tatoeba jpn–spa (CC BY 2.0 FR) → tatoeba.json
 *  - kuromoji (IPADIC) → kuromoji/*.dat.gz (copiado de node_modules/@sglkc/kuromoji)
 *  - Semilla: content/ja/seed/parts/*.json → content/ja/seed/ja_n5_vocab.json (lecturas, rōmaji, acento, kanji)
 */
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import unbzip2 from "unbzip2-stream";
import JSZip from "jszip";
import { svgPathProperties } from "svg-path-properties";
import * as wanakana from "wanakana";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CACHE = path.join(ROOT, ".cache", "data", "ja");
const OUT = path.join(ROOT, "public", "data", "ja");
const SEED_DIR = path.join(ROOT, "content", "ja", "seed");
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

const REL = "3.6.2%2B20261026175559";
const JS = `https://github.com/scriptin/jmdict-simplified/releases/download/${REL}`;
export const SOURCES = {
  jmdictEng: `${JS}/jmdict-eng-${REL}.json.zip`,
  jmdictSpa: `${JS}/jmdict-spa-${REL}.json.zip`,
  kanjidic: `${JS}/kanjidic2-all-${REL}.json.zip`,
  kradfile: `${JS}/kradfile-${REL}.json.zip`,
  radkfile: `${JS}/radkfile-${REL}.json.zip`,
  kanjivg: "https://github.com/KanjiVG/kanjivg/releases/download/r20260714/kanjivg-20260714-main.zip",
  kanjium: "https://raw.githubusercontent.com/mifunetoshiro/kanjium/master/data/source_files/raw/accents.txt",
  jlpt: (n: number) => `https://raw.githubusercontent.com/elzup/jlpt-word-list/master/src/n${n}.csv`,
  freq: "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/ja/ja_50k.txt",
  tatoebaJpn: "https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences.tsv.bz2",
  tatoebaSpa: "https://downloads.tatoeba.org/exports/per_language/spa/spa_sentences.tsv.bz2",
  tatoebaLinks: "https://downloads.tatoeba.org/exports/per_language/jpn/jpn-spa_links.tsv.bz2",
};

async function download(url: string, file: string): Promise<string> {
  const dest = path.join(CACHE, file);
  if (existsSync(dest)) return dest;
  console.log("↓", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Descarga fallida ${url}: ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

async function zipJson<T>(url: string, file: string): Promise<T> {
  const zip = await JSZip.loadAsync(readFileSync(await download(url, file)));
  const name = Object.keys(zip.files).find((n) => n.endsWith(".json"))!;
  return JSON.parse(await zip.files[name].async("string")) as T;
}

async function bunzip(url: string, file: string): Promise<string> {
  const src = await download(url, file);
  const out = src.replace(/\.bz2$/, "");
  if (!existsSync(out)) await pipeline(createReadStream(src), unbzip2(), createWriteStream(out));
  return readFileSync(out, "utf8");
}

const lines = (t: string) => t.split(/\r?\n/);
const toHira = (s: string) => wanakana.toHiragana(s, { passRomaji: true });

/* ------------------------------ CSV (listas JLPT) ------------------------------ */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of lines(text)) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}

/* ------------------------------ Kanjium ------------------------------ */
async function loadPitch(): Promise<Map<string, number[]>> {
  const text = readFileSync(await download(SOURCES.kanjium, "accents.txt"), "utf8");
  const m = new Map<string, number[]>();
  const byReading = new Map<string, Set<string>>();
  for (const l of lines(text)) {
    const [word, reading, acc] = l.split("\t");
    if (!word || acc === undefined) continue;
    const nums = acc
      .split(",")
      .map((x) => Number(x.replace(/[^\d]/g, "")))
      .filter((x) => !Number.isNaN(x));
    if (!nums.length) continue;
    const r = toHira(reading || word);
    const k = `${word}|${r}`;
    if (!m.has(k)) m.set(k, nums);
    const byR = byReading.get(r) ?? new Set<string>();
    byR.add(nums.join(","));
    byReading.set(r, byR);
  }
  // respaldo por lectura solo si todas las palabras con esa lectura comparten acento (evita 箸/橋)
  for (const [r, set] of byReading) if (set.size === 1) m.set(`|${r}`, [...set][0].split(",").map(Number));
  return m;
}

/* ------------------------------ JMdict ------------------------------ */
interface JmWord {
  id: string;
  kanji: { common: boolean; text: string; tags: string[] }[];
  kana: { common: boolean; text: string; tags: string[]; appliesToKanji: string[] }[];
  sense: { partOfSpeech: string[]; misc: string[]; gloss: { lang: string; text: string }[] }[];
}

/** Formato compacto: [s, p, en[], es, lv, freq, pos[], pitch[], alt[]] — alt = otras grafías/lecturas */
export type JaCompact = [string, string, string[], string, string, number, string[], number[], string[]];

function cleanEs(t: string): string {
  return t.replace(/\s*\(eng:[^)]*\)/g, "").trim();
}

async function buildDictionary(pitch: Map<string, number[]>, jlptWord: Map<string, string>, freq: Map<string, number>, seedWords: Set<string>) {
  const eng = await zipJson<{ words: JmWord[] }>(SOURCES.jmdictEng, "jmdict-eng.json.zip");
  const spa = await zipJson<{ words: JmWord[] }>(SOURCES.jmdictSpa, "jmdict-spa.json.zip");
  const esById = new Map<string, string>();
  for (const w of spa.words) {
    const glosses = w.sense.flatMap((s) => s.gloss.map((g) => cleanEs(g.text))).filter(Boolean);
    const uniq = new Map<string, string>();
    for (const g of glosses) if (!uniq.has(g.toLowerCase())) uniq.set(g.toLowerCase(), g);
    if (uniq.size) esById.set(w.id, Array.from(uniq.values()).slice(0, 4).join("; "));
  }
  const core: JaCompact[] = [];
  const full: JaCompact[] = [];
  for (const w of eng.words) {
    const kanjiForms = w.kanji.filter((k) => !k.tags.includes("sK") && !k.tags.includes("iK"));
    const kanaForms = w.kana.filter((k) => !k.tags.includes("sk") && !k.tags.includes("ik"));
    const usuallyKana = w.sense[0]?.misc.includes("uk");
    const s = (usuallyKana ? undefined : kanjiForms[0]?.text) ?? kanaForms[0]?.text ?? w.kana[0]?.text;
    if (!s) continue;
    const p = toHira(kanaForms[0]?.text ?? s);
    const alt = Array.from(new Set([...kanjiForms.map((k) => k.text), ...kanaForms.map((k) => k.text)])).filter((x) => x !== s);
    const en = w.sense.flatMap((x) => x.gloss.map((g) => g.text)).slice(0, 6);
    const pos = Array.from(new Set(w.sense.flatMap((x) => x.partOfSpeech))).slice(0, 4);
    const lvs = [jlptWord.get(`${s}|${p}`), ...[s, ...alt].map((x) => jlptWord.get(x))].filter(Boolean) as string[];
    const lv = lvs.sort((a, b) => Number(b.slice(1)) - Number(a.slice(1)))[0] ?? "";
    const common = w.kanji.some((k) => k.common) || w.kana.some((k) => k.common);
    const pt = pitch.get(`${kanjiForms[0]?.text ?? ""}|${p}`) ?? pitch.get(`${s}|${p}`) ?? pitch.get(`|${p}`) ?? [];
    const fr = freq.get(s) ?? freq.get(p) ?? 0;
    const row: JaCompact = [s, p, en, esById.get(w.id) ?? "", lv, fr, pos, pt, alt];
    if (common || lv || seedWords.has(s) || alt.some((a) => seedWords.has(a))) core.push(row);
    else full.push(row.slice(0, 4).concat(["", 0, pos.slice(0, 2), pt, alt.slice(0, 3)]) as JaCompact);
  }
  const rank = (r: JaCompact) => (r[4] ? 6 - Number(r[4].slice(1)) : 9) * 1e6 + (r[5] || 5e5);
  core.sort((a, b) => rank(a) - rank(b));
  return { core, full, esCount: esById.size };
}

/* ------------------------------ KANJIDIC2 + KRADFILE ------------------------------ */
interface KdChar {
  literal: string;
  radicals: { type: string; value: number }[];
  misc: { grade: number | null; strokeCounts: number[]; frequency: number | null; jlptLevel: number | null };
  readingMeaning: { groups: { readings: { type: string; value: string }[]; meanings: { lang: string; value: string }[] }[]; nanori: string[] } | null;
}

async function buildKanji(): Promise<{ chars: Set<string>; byJlpt: Record<string, string[]> }> {
  const kd = await zipJson<{ characters: KdChar[] }>(SOURCES.kanjidic, "kanjidic2-all.json.zip");
  const krad = await zipJson<{ kanji: Record<string, string[]> }>(SOURCES.kradfile, "kradfile.json.zip");
  const radk = await zipJson<{ radicals: Record<string, { strokeCount: number; kanji: string[] }> }>(SOURCES.radkfile, "radkfile.json.zip");
  const out: Record<string, unknown> = {};
  const chars = new Set<string>();
  // JLPT antiguo (4 niveles) → N5…N1 orientativo: 4→N5, 3→N4, 2→N3/N2, 1→N1
  const byJlpt: Record<string, string[]> = { N5: [], N4: [], N3: [], N1: [] };
  for (const c of kd.characters) {
    const g = c.readingMeaning?.groups[0];
    if (!g) continue;
    const isCore = c.misc.grade || c.misc.jlptLevel || (c.misc.frequency && c.misc.frequency <= 2500);
    if (!isCore) continue;
    const on = g.readings.filter((r) => r.type === "ja_on").map((r) => r.value);
    const kun = g.readings.filter((r) => r.type === "ja_kun").map((r) => r.value);
    const es = g.meanings.filter((m) => m.lang === "es").map((m) => m.value);
    const en = g.meanings.filter((m) => m.lang === "en").map((m) => m.value);
    const jlpt = c.misc.jlptLevel ? (["", "N1", "N3", "N4", "N5"][c.misc.jlptLevel] ?? "") : "";
    out[c.literal] = {
      on,
      kun,
      es: es.slice(0, 5),
      en: en.slice(0, 5),
      s: c.misc.strokeCounts[0],
      g: c.misc.grade ?? 0,
      j: jlpt,
      f: c.misc.frequency ?? 0,
      r: c.radicals.find((r) => r.type === "classical")?.value ?? 0,
      c: krad.kanji[c.literal] ?? [],
    };
    chars.add(c.literal);
    if (jlpt) byJlpt[jlpt].push(c.literal);
  }
  for (const k of Object.keys(byJlpt)) byJlpt[k].sort((a, b) => ((out[a] as { f: number }).f || 9999) - ((out[b] as { f: number }).f || 9999));
  writeFileSync(path.join(OUT, "kanji.json"), JSON.stringify(out));
  // buscador por componentes (estilo jisho): componente → nº de trazos + kanji (solo los del núcleo)
  const radOut: Record<string, [number, string]> = {};
  for (const [r, v] of Object.entries(radk.radicals)) radOut[r] = [v.strokeCount, v.kanji.filter((k) => chars.has(k)).join("")];
  writeFileSync(path.join(OUT, "radk.json"), JSON.stringify(radOut));
  console.log("✓ kanji.json", chars.size, "kanji · radk.json", Object.keys(radOut).length, "componentes");
  return { chars, byJlpt };
}

/* ------------------------------ KanjiVG ------------------------------ */
const KANA = (() => {
  const s: string[] = [];
  for (let c = 0x3041; c <= 0x3096; c++) s.push(String.fromCodePoint(c));
  for (let c = 0x30a1; c <= 0x30fa; c++) s.push(String.fromCodePoint(c));
  s.push("ー");
  return s;
})();

async function buildStrokes(chars: Set<string>, mediansFor: Set<string>): Promise<number> {
  const medOut: Record<string, number[][][]> = {};
  const zip = await JSZip.loadAsync(readFileSync(await download(SOURCES.kanjivg, "kanjivg-main.zip")));
  const dest = path.join(OUT, "strokes");
  mkdirSync(dest, { recursive: true });
  const want = new Set([...KANA, ...chars]);
  let n = 0;
  for (const ch of want) {
    const hex = ch.codePointAt(0)!.toString(16).padStart(5, "0");
    const f = zip.files[`kanji/${hex}.svg`];
    if (!f) continue;
    const svg = await f.async("string");
    const strokes = Array.from(svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)).map((m) => m[1]);
    if (!strokes.length) continue;
    const medians = strokes.map((d) => {
      const p = new svgPathProperties(d);
      const len = p.getTotalLength();
      return Array.from({ length: 8 }, (_, i) => {
        const pt = p.getPointAtLength((len * i) / 7);
        return [Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10];
      });
    });
    writeFileSync(path.join(dest, `${ch}.json`), JSON.stringify({ size: 109, width: 5.5, strokes, medians }));
    if (mediansFor.has(ch)) medOut[ch] = medians.map((m) => m.map(([x, y]) => [Math.round((x / 109) * 100) / 100, Math.round((y / 109) * 100) / 100]));
    n++;
  }
  writeFileSync(path.join(OUT, "medians.json"), JSON.stringify(medOut));
  console.log("✓ medians.json", Object.keys(medOut).length, "caracteres para el reconocimiento de escritura");
  console.log("✓ trazos KanjiVG:", n, "caracteres (kanji + kana)");
  return n;
}

/* ------------------------------ Tatoeba ------------------------------ */
async function buildTatoeba(): Promise<number> {
  const jpn = await bunzip(SOURCES.tatoebaJpn, "jpn_sentences.tsv.bz2");
  const spaPath = path.join(ROOT, ".cache", "data", "spa_sentences.tsv");
  const spa = existsSync(spaPath) ? readFileSync(spaPath, "utf8") : await bunzip(SOURCES.tatoebaSpa, "spa_sentences.tsv.bz2");
  const links = await bunzip(SOURCES.tatoebaLinks, "jpn-spa_links.tsv.bz2");
  const jm = new Map<string, string>();
  for (const l of lines(jpn)) {
    const [id, , text] = l.split("\t");
    if (id && text) jm.set(id, text.trim());
  }
  const sm = new Map<string, string>();
  for (const l of lines(spa)) {
    const [id, , text] = l.split("\t");
    if (id && text) sm.set(id, text.trim());
  }
  const pairs: [string, string][] = [];
  const seen = new Set<string>();
  for (const l of lines(links)) {
    const [a, b] = l.split("\t");
    const ja = jm.get(a?.trim());
    const es = sm.get(b?.trim());
    if (!ja || !es || Array.from(ja).length > 45) continue;
    const k = ja + "|" + es;
    if (seen.has(k)) continue;
    seen.add(k);
    pairs.push([ja, es]);
  }
  pairs.sort((x, y) => x[0].length - y[0].length);
  writeFileSync(path.join(OUT, "tatoeba.json"), JSON.stringify(pairs));
  console.log("✓ tatoeba.json", pairs.length, "pares jpn–spa");
  return pairs.length;
}

/* ------------------------------ Semilla ------------------------------ */
interface SeedPart {
  word: string;
  reading: string;
  meaning: string;
  category: string;
  word_type: string;
  example: string;
  example_reading: string;
  example_translation: string;
}

function buildSeed(pitch: Map<string, number[]>, kanji: Record<string, { es: string[]; en: string[] }>): number {
  const dir = path.join(SEED_DIR, "parts");
  if (!existsSync(dir)) {
    console.log("· semilla: aún no hay content/ja/seed/parts");
    return 0;
  }
  const rows: SeedPart[] = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as SeedPart[]);
  const seen = new Set<string>();
  const words = [];
  for (const r of rows) {
    const id = `ja-n5-${r.word}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const reading = r.reading || toHira(r.word);
    const pt = pitch.get(`${r.word}|${toHira(reading)}`) ?? pitch.get(`|${toHira(reading)}`);
    const kanjiBreakdown = Array.from(r.word)
      .filter((c) => /[一-鿿]/.test(c))
      .map((c) => ({ kanji: c, meaning: kanji[c]?.es?.[0] ?? kanji[c]?.en?.[0] ?? "" }));
    words.push({
      id,
      hanzi: r.word,
      pinyin: reading,
      romanization: wanakana.toRomaji(reading),
      meaning: r.meaning,
      category: r.category,
      example: r.example,
      example_pinyin: r.example_reading,
      example_translation: r.example_translation,
      traditional: reading !== r.word ? reading : "",
      radical: "",
      frequency: 0,
      hsk: ["N5"],
      level: 5,
      lang: "ja",
      reviewed: false,
      extra: { kanji_breakdown: kanjiBreakdown, pitch_accent: pt?.[0] ?? null, pitch_all: pt ?? [], word_type: r.word_type },
    });
  }
  writeFileSync(path.join(SEED_DIR, "ja_n5_vocab.json"), JSON.stringify({ version: 1, source: "Lista JLPT N5 comunitaria (elzup/jlpt-word-list, MIT; basada en Jonathan Waller) · traducción, categoría y ejemplos propios en español · acento: Kanjium (CC BY-SA 4.0)", levelTag: "N5", words }, null, 1));
  const noPitch = words.filter((w) => w.extra.pitch_accent === null).length;
  console.log("✓ ja_n5_vocab.json", words.length, "palabras ·", noPitch, "sin acento en Kanjium");
  return words.length;
}

/* ------------------------------ main ------------------------------ */
export async function main() {
  const pitch = await loadPitch();
  const jlptWord = new Map<string, string>();
  const jlptLists: Record<string, string[]> = {};
  for (const n of [5, 4, 3, 2, 1]) {
    const rows = parseCsv(readFileSync(await download(SOURCES.jlpt(n), `n${n}.csv`), "utf8")).slice(1);
    const lv = `N${n}`;
    jlptLists[lv] = [];
    for (const [expr, reading] of rows) {
      if (!expr) continue;
      const w = expr.split(/[;；]/)[0].trim();
      if (!jlptWord.has(w)) jlptWord.set(w, lv);
      if (reading && !jlptWord.has(`${w}|${toHira(reading)}`)) jlptWord.set(`${w}|${toHira(reading)}`, lv);
      jlptLists[lv].push(w);
    }
  }
  const freq = new Map<string, number>();
  lines(readFileSync(await download(SOURCES.freq, "ja_50k.txt"), "utf8")).forEach((l, i) => {
    const w = l.split(" ")[0];
    if (w && !freq.has(w)) freq.set(w, i + 1);
  });
  const { chars, byJlpt } = await buildKanji();
  const kanjiData = JSON.parse(readFileSync(path.join(OUT, "kanji.json"), "utf8"));
  const seedCount = buildSeed(pitch, kanjiData);
  const seedWords = new Set<string>();
  if (seedCount) for (const w of JSON.parse(readFileSync(path.join(SEED_DIR, "ja_n5_vocab.json"), "utf8")).words) seedWords.add(w.hanzi);
  const { core, full, esCount } = await buildDictionary(pitch, jlptWord, freq, seedWords);
  writeFileSync(path.join(OUT, "dict-core.json"), JSON.stringify(core));
  writeFileSync(path.join(OUT, "dict-full.json"), JSON.stringify(full));
  console.log("✓ dict-core.json", core.length, "· dict-full.json", full.length, "· entradas con español", esCount);
  writeFileSync(path.join(OUT, "jlpt.json"), JSON.stringify({ words: jlptLists, kanji: byJlpt }));
  const medSet = new Set<string>([...KANA, ...byJlpt.N5, ...byJlpt.N4, ...byJlpt.N3]);
  const strokes = await buildStrokes(chars, medSet);
  const tatoeba = await buildTatoeba();
  // kuromoji: diccionario IPADIC para el analizador del navegador
  const kdir = path.join(ROOT, "node_modules", "@sglkc", "kuromoji", "dict");
  const kout = path.join(OUT, "kuromoji");
  mkdirSync(kout, { recursive: true });
  for (const f of readdirSync(kdir)) copyFileSync(path.join(kdir, f), path.join(kout, f));
  writeFileSync(path.join(OUT, "meta.json"), JSON.stringify({ builtAt: new Date().toISOString(), counts: { core: core.length, full: full.length, kanji: chars.size, strokes, tatoeba, seed: seedCount }, sources: { ...SOURCES, jlpt: SOURCES.jlpt(5) } }, null, 2));
  console.log("✓ Listo. Archivos en public/data/ja/");
}

export default main;
