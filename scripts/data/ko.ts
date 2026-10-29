/**
 * npm run data:build -- --lang=ko
 * Datos abiertos del coreano → public/data/ko/:
 *  - Wiktionary (kaikki.org, CC BY-SA / GFDL) → dict-core.json / dict-full.json (palabras, hanja, glosas en inglés)
 *    y hanja.json (훈음: significado + lectura de cada hanja)
 *  - KRDict / 한국어기초사전 (NIKL, CC BY-SA 2.0 KR): si hay KRDICT_API_KEY en .env.local, añade la
 *    traducción al español de las palabras del núcleo (trans_lang=4) con caché en .cache/data/ko/krdict/
 *  - Lista de vocabulario para aprendices (NIKL, KOGL tipo 1) → niveles A/B/C → topik.json
 *  - Tatoeba kor–spa (CC BY 2.0 FR) → tatoeba.json
 *  - FrequencyWords (OpenSubtitles, CC BY-SA 4.0) → frecuencia
 *  - Semilla: content/ko/seed/parts/*.json → content/ko/seed/ko_topik1_vocab.json (romanización y pronunciación real)
 * Trazos de jamo: propios (lib/languages/ko/strokes.ts); no existe un conjunto abierto tipo KanjiVG.
 */
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createInterface } from "node:readline";
import path from "node:path";
import unbzip2 from "unbzip2-stream";
import { pronounce, romanizeRR } from "../../lib/languages/ko/phonology";
import { guessIrregular } from "../../lib/languages/ko/conjugation";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CACHE = path.join(ROOT, ".cache", "data", "ko");
const OUT = path.join(ROOT, "public", "data", "ko");
const SEED_DIR = path.join(ROOT, "content", "ko", "seed");
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

export const SOURCES = {
  kaikki: "https://kaikki.org/dictionary/Korean/kaikki.org-dictionary-Korean.jsonl",
  nikl: "https://www.korean.go.kr/common/download.do?file_path=etcData&c_file_name=b73a8438-4713-4436-8481-ec26fd0dce2a_0.txt&o_file_name=x.txt",
  freq: "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ko/ko_50k.txt",
  tatoebaKor: "https://downloads.tatoeba.org/exports/per_language/kor/kor_sentences.tsv.bz2",
  tatoebaSpa: "https://downloads.tatoeba.org/exports/per_language/spa/spa_sentences.tsv.bz2",
  tatoebaLinks: "https://downloads.tatoeba.org/exports/per_language/kor/kor-spa_links.tsv.bz2",
  krdictApi: "https://krdict.korean.go.kr/api/search",
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

async function bunzip(url: string, file: string): Promise<string> {
  const src = await download(url, file);
  const out = src.replace(/\.bz2$/, "");
  if (!existsSync(out)) await pipeline(createReadStream(src), unbzip2(), createWriteStream(out));
  return readFileSync(out, "utf8");
}

const lines = (t: string) => t.split(/\r?\n/);

/** Lista NIKL (EUC-KR): rango, palabra, categoría, hanja/nota, nivel A/B/C */
async function loadNikl(): Promise<Map<string, { level: string; hanja: string; pos: string }>> {
  const file = await download(SOURCES.nikl, "nikl.txt");
  const text = new TextDecoder("euc-kr").decode(readFileSync(file));
  const m = new Map<string, { level: string; hanja: string; pos: string }>();
  for (const l of lines(text).slice(1)) {
    const [, word, pos, hanja, level] = l.split("\t");
    if (!word || !level) continue;
    const w = word.replace(/\d+$/, "");
    const prev = m.get(w);
    if (!prev || level.trim() < prev.level) m.set(w, { level: level.trim(), hanja: /^[一-鿿]+$/.test((hanja ?? "").replace(/-/g, "")) ? hanja.replace(/-/g, "") : "", pos });
  }
  return m;
}

const LEVEL_OF: Record<string, string> = { A: "TOPIK1", B: "TOPIK3", C: "TOPIK5" };

/** [s, p(romanización), en[], es, lv, freq, pos[], hanja, pron] */
export type KoCompact = [string, string, string[], string, string, number, string[], string, string];

interface Kaikki {
  word: string;
  pos: string;
  senses?: { glosses?: string[]; tags?: string[] }[];
  forms?: { form: string; tags?: string[]; roman?: string }[];
  etymology_text?: string;
}

const POS_ES: Record<string, string> = { noun: "nombre", verb: "verbo", adj: "adjetivo", adv: "adverbio", pron: "pronombre", num: "numeral", particle: "partícula", suffix: "sufijo", intj: "interjección", det: "determinante", counter: "contador", phrase: "expresión" };

async function krdictSpanish(words: string[]): Promise<Map<string, string>> {
  const key = process.env.KRDICT_API_KEY ?? readEnvKey();
  const out = new Map<string, string>();
  const cacheFile = path.join(CACHE, "krdict-es.json");
  const cache: Record<string, string> = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
  for (const [k, v] of Object.entries(cache)) out.set(k, v);
  if (!key) {
    console.log("· KRDict: sin KRDICT_API_KEY en .env.local → se usan las glosas de Wiktionary (inglés) y las traducciones de la semilla");
    return out;
  }
  let n = 0;
  for (const w of words) {
    if (cache[w] !== undefined || n >= 3000) continue;
    const url = `${SOURCES.krdictApi}?key=${key}&q=${encodeURIComponent(w)}&translated=y&trans_lang=4&num=10&advanced=y&method=exact`;
    try {
      const xml = await (await fetch(url)).text();
      const es = Array.from(xml.matchAll(/<trans_word><!\[CDATA\[([^\]]*)\]\]><\/trans_word>/g)).map((m) => m[1].trim()).filter(Boolean);
      cache[w] = Array.from(new Set(es)).slice(0, 4).join("; ");
      if (cache[w]) out.set(w, cache[w]);
    } catch {
      /* sin conexión: se reintentará */
    }
    n++;
    if (n % 200 === 0) writeFileSync(cacheFile, JSON.stringify(cache));
  }
  writeFileSync(cacheFile, JSON.stringify(cache));
  console.log("✓ KRDict: traducciones al español para", out.size, "palabras");
  return out;
}

function readEnvKey(): string | undefined {
  const f = path.join(ROOT, ".env.local");
  if (!existsSync(f)) return undefined;
  return readFileSync(f, "utf8").match(/^KRDICT_API_KEY=(.+)$/m)?.[1]?.trim();
}

async function buildDictionary(nikl: Map<string, { level: string; hanja: string; pos: string }>, freq: Map<string, number>, seedWords: Map<string, string>) {
  const file = await download(SOURCES.kaikki, "kaikki-ko.jsonl");
  const byWord = new Map<string, { en: string[]; pos: string[]; hanja: string }>();
  const hanja: Record<string, [string, string]> = {}; // 犬 → ["개", "견"]
  const rl = createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const e = JSON.parse(line) as Kaikki;
    if (e.pos === "character") {
      const eh = e.forms?.find((f) => f.tags?.includes("eumhun"));
      if (eh && /^[一-鿿]$/.test(e.word)) {
        const parts = eh.form.split(/\s+/);
        if (parts.length >= 2 && !hanja[e.word]) hanja[e.word] = [parts.slice(0, -1).join(" "), parts[parts.length - 1]];
      }
      continue;
    }
    if (!/[가-힣]/.test(e.word)) continue;
    const glosses = (e.senses ?? []).filter((s) => !(s.tags ?? []).some((t) => /vulgar|slang|offensive|derogatory/.test(t))).flatMap((s) => s.glosses ?? []).filter((g) => !/^(alternative form|romanization|hanja form)/i.test(g));
    if (!glosses.length) continue;
    const h = e.forms?.find((f) => f.tags?.includes("hanja"))?.form ?? "";
    const cur = byWord.get(e.word) ?? { en: [], pos: [], hanja: "" };
    for (const g of glosses) if (cur.en.length < 6 && !cur.en.includes(g)) cur.en.push(g);
    if (!cur.pos.includes(POS_ES[e.pos] ?? e.pos)) cur.pos.push(POS_ES[e.pos] ?? e.pos);
    if (!cur.hanja && /^[一-鿿]+$/.test(h)) cur.hanja = h;
    byWord.set(e.word, cur);
  }
  // KRDict (opcional) para las palabras de la lista NIKL
  const es = await krdictSpanish(Array.from(nikl.keys()));
  const core: KoCompact[] = [];
  const full: KoCompact[] = [];
  const all = new Set<string>([...byWord.keys(), ...nikl.keys()]);
  for (const w of all) {
    const k = byWord.get(w);
    const n = nikl.get(w);
    if (!k && !n) continue;
    const lv = n ? (LEVEL_OF[n.level] ?? "") : "";
    const fr = freq.get(w) ?? 0;
    const row: KoCompact = [w, romanizeRR(w), k?.en ?? [], es.get(w) ?? seedWords.get(w) ?? "", lv, fr, k?.pos ?? [], k?.hanja || n?.hanja || "", pronounce(w).pron];
    if (lv || (fr && fr <= 30000) || seedWords.has(w)) core.push(row);
    else full.push(row);
  }
  const rank = (r: KoCompact) => (r[4] ? Number(r[4].slice(5)) : 9) * 1e6 + (r[5] || 5e5);
  core.sort((a, b) => rank(a) - rank(b));
  writeFileSync(path.join(OUT, "hanja.json"), JSON.stringify(hanja));
  console.log("✓ hanja.json", Object.keys(hanja).length, "hanja con 훈음");
  return { core, full };
}

async function buildTatoeba(): Promise<number> {
  const kor = await bunzip(SOURCES.tatoebaKor, "kor_sentences.tsv.bz2");
  const spaPath = path.join(ROOT, ".cache", "data", "spa_sentences.tsv");
  const spa = existsSync(spaPath) ? readFileSync(spaPath, "utf8") : await bunzip(SOURCES.tatoebaSpa, "spa_sentences.tsv.bz2");
  const links = await bunzip(SOURCES.tatoebaLinks, "kor-spa_links.tsv.bz2");
  const km = new Map<string, string>();
  for (const l of lines(kor)) {
    const [id, , t] = l.split("\t");
    if (id && t) km.set(id, t.trim());
  }
  const sm = new Map<string, string>();
  for (const l of lines(spa)) {
    const [id, , t] = l.split("\t");
    if (id && t) sm.set(id, t.trim());
  }
  const pairs: [string, string][] = [];
  for (const l of lines(links)) {
    const [a, b] = l.split("\t");
    const k = km.get(a?.trim());
    const e = sm.get(b?.trim());
    if (k && e && Array.from(k).length <= 60) pairs.push([k, e]);
  }
  pairs.sort((x, y) => x[0].length - y[0].length);
  writeFileSync(path.join(OUT, "tatoeba.json"), JSON.stringify(pairs));
  console.log("✓ tatoeba.json", pairs.length, "pares kor–spa (corpus pequeño)");
  return pairs.length;
}

interface SeedPart {
  word: string;
  meaning: string;
  category: string;
  word_type: string;
  irregular: string | null;
  hanja: string;
  example: string;
  example_translation: string;
}

function buildSeed(): Map<string, string> {
  const dir = path.join(SEED_DIR, "parts");
  const map = new Map<string, string>();
  if (!existsSync(dir)) return map;
  const rows: SeedPart[] = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as SeedPart[]);
  const seen = new Set<string>();
  const words = [];
  for (const r of rows) {
    const id = `ko-t1-${r.word}`;
    if (seen.has(id)) continue;
    seen.add(id);
    map.set(r.word, r.meaning);
    const isVerb = r.word_type === "verb" || r.word_type === "adjective";
    words.push({
      id,
      hanzi: r.word,
      pinyin: romanizeRR(r.word),
      romanization: romanizeRR(r.word),
      meaning: r.meaning,
      category: r.category,
      example: r.example,
      example_pinyin: romanizeRR(r.example),
      example_translation: r.example_translation,
      traditional: r.hanja || "",
      radical: "",
      frequency: 0,
      hsk: ["TOPIK1"],
      level: 1,
      lang: "ko",
      reviewed: false,
      extra: { hanja: r.hanja || "", pronunciation: pronounce(r.word).pron, rules: pronounce(r.word).rules, irregular: isVerb ? (r.irregular ?? guessIrregular(r.word)) : null, word_type: r.word_type },
    });
  }
  writeFileSync(path.join(SEED_DIR, "ko_topik1_vocab.json"), JSON.stringify({ version: 1, source: "Lista de vocabulario para aprendices del NIKL (한국어 학습용 어휘 목록, nivel A; KOGL tipo 1) · traducción, categoría y ejemplos propios en español · romanización y pronunciación calculadas", levelTag: "TOPIK1", words }, null, 1));
  console.log("✓ ko_topik1_vocab.json", words.length, "palabras");
  return map;
}

export async function main() {
  const nikl = await loadNikl();
  const freq = new Map<string, number>();
  lines(readFileSync(await download(SOURCES.freq, "ko_50k.txt"), "utf8")).forEach((l, i) => {
    const w = l.split(" ")[0];
    if (w && !freq.has(w)) freq.set(w, i + 1);
  });
  const seed = buildSeed();
  const { core, full } = await buildDictionary(nikl, freq, seed);
  writeFileSync(path.join(OUT, "dict-core.json"), JSON.stringify(core));
  writeFileSync(path.join(OUT, "dict-full.json"), JSON.stringify(full));
  console.log("✓ dict-core.json", core.length, "· dict-full.json", full.length);
  const levels: Record<string, string[]> = { TOPIK1: [], TOPIK3: [], TOPIK5: [] };
  for (const [w, v] of nikl) levels[LEVEL_OF[v.level]]?.push(w);
  writeFileSync(path.join(OUT, "topik.json"), JSON.stringify({ words: levels }));
  const tatoeba = await buildTatoeba();
  writeFileSync(path.join(OUT, "meta.json"), JSON.stringify({ builtAt: new Date().toISOString(), counts: { core: core.length, full: full.length, tatoeba, seed: seed.size }, sources: SOURCES }, null, 2));
  console.log("✓ Listo. Archivos en public/data/ko/");
}

export default main;
