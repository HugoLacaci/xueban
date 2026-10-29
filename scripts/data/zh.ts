/**
 * npm run data:build
 * Descarga y procesa los datos abiertos a JSON compacto en public/data/:
 *  - CC-CEDICT (CC BY-SA 4.0) + complete-hsk-vocabulary (MIT) + frecuencia jieba (MIT) → cedict-core.json / cedict-full.json
 *  - Make Me a Hanzi (Arphic PL / LGPL) → hanzi.json (descomposición, radical, etimología, trazos)
 *  - hanzi-writer-data (Arphic PL) → public/data/zh/hanzi/<char>.json (orden de trazos offline) + medians.json (reconocimiento de escritura)
 *  - Tatoeba cmn–spa (CC BY 2.0 FR) → tatoeba.json
 *  - Listas HSK (2.0 / 3.0) → hsk.json
 * Las descargas se cachean en .cache/data/. Reejecutar es seguro.
 */
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import path from "node:path";
import unbzip2 from "unbzip2-stream";
import * as OpenCC from "opencc-js";
import { parseCedictLine } from "../../lib/languages/zh/parse";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CACHE = path.join(ROOT, ".cache", "data");
const OUT = path.join(ROOT, "public", "data", "zh");
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

const SOURCES = {
  cedict: "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz",
  hsk: "https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.min.json",
  mmah: "https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt",
  jieba: "https://raw.githubusercontent.com/fxsjy/jieba/master/jieba/dict.txt",
  tatoebaCmn: "https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences.tsv.bz2",
  tatoebaSpa: "https://downloads.tatoeba.org/exports/per_language/spa/spa_sentences.tsv.bz2",
  tatoebaLinks: "https://downloads.tatoeba.org/exports/per_language/cmn/cmn-spa_links.tsv.bz2",
};

async function download(url: string, file: string): Promise<string> {
  const dest = path.join(CACHE, file);
  if (existsSync(dest)) return dest;
  console.log("↓", url);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Descarga fallida ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return dest;
}

async function gunzipToText(file: string): Promise<string> {
  const out = file.replace(/\.gz$/, "");
  if (!existsSync(out)) await pipeline(createReadStream(file), createGunzip(), createWriteStream(out));
  return readFileSync(out, "utf8");
}

async function bunzipToText(file: string): Promise<string> {
  const out = file.replace(/\.bz2$/, "");
  if (!existsSync(out)) await pipeline(createReadStream(file), unbzip2(), createWriteStream(out));
  return readFileSync(out, "utf8");
}

const toSimp = OpenCC.Converter({ from: "tw", to: "cn" });
const splitLines = (t: string) => t.split(/\r?\n/);

/* ----------------------------- HSK ----------------------------- */
interface HskWord {
  s: string;
  r: string;
  l: string[]; // t1 (HSK 3.0 examen), n1 (estándar 2021), o1 (HSK 2.0)
  q: number;
  p: string[];
  f: { t: string; i: { y: string; n: string }; m: string[]; c: string[] }[];
}

function levelOf(l: string[], prefix: string): number | undefined {
  const lv = l.filter((x) => x.startsWith(prefix)).map((x) => Number(x.slice(1)));
  return lv.length ? Math.min(...lv) : undefined;
}

/* ----------------------------- CEDICT ----------------------------- */
type Compact = [string, string, string, string[], number?, number?, number?, string[]?, string[]?];

interface Entry {
  s: string;
  t: string;
  p: string;
  en: string[];
  hsk?: number;
  hsk2?: number;
  freq?: number;
  pos?: string[];
  cl?: string[];
}

const norm = (x: string) => x.toLowerCase().replace(/[\s'’]/g, "").replace(/ü/g, "v");

async function buildDictionary(): Promise<{ core: Entry[]; full: Entry[]; hskWords: HskWord[]; chars: Set<string> }> {
  const cedictText = await gunzipToText(await download(SOURCES.cedict, "cedict.txt.gz"));
  const hskWords = JSON.parse(readFileSync(await download(SOURCES.hsk, "complete.min.json"), "utf8")) as HskWord[];
  const jiebaText = readFileSync(await download(SOURCES.jieba, "jieba-dict.txt"), "utf8");

  // frecuencia: rango por frecuencia jieba (1 = más frecuente)
  const jieba: { w: string; f: number }[] = [];
  for (const line of splitLines(jiebaText)) {
    const [w, f] = line.trim().split(/\s+/);
    if (w && f) jieba.push({ w, f: Number(f) });
  }
  jieba.sort((a, b) => b.f - a.f);
  const rank = new Map<string, number>();
  jieba.forEach((x, i) => {
    if (!rank.has(x.w)) rank.set(x.w, i + 1);
  });

  const entries: Entry[] = [];
  const bySimp = new Map<string, Entry[]>();
  for (const raw of splitLines(cedictText)) {
    const parsed = parseCedictLine(raw);
    if (!parsed) continue;
    const e: Entry = { s: parsed.simp, t: parsed.trad === parsed.simp ? "" : parsed.trad, p: parsed.pinyin, en: parsed.defs };
    if (parsed.cl?.length) e.cl = parsed.cl;
    const r = rank.get(parsed.simp);
    if (r) e.freq = r;
    entries.push(e);
    const arr = bySimp.get(parsed.simp) ?? [];
    arr.push(e);
    bySimp.set(parsed.simp, arr);
  }

  // Asociar datos HSK a la lectura/acepción correcta (东西 dōngxi "cosa" ≠ dōng xī "este y oeste"):
  // puntúa por coincidencia de significados y de pinyin; si nada coincide, a todas las lecturas.
  for (const h of hskWords) {
    const cands = bySimp.get(h.s);
    const f = h.f[0];
    if (!cands) {
      entries.push({ s: h.s, t: f.t === h.s ? "" : f.t, p: f.i.y, en: f.m, hsk: levelOf(h.l, "t") ?? levelOf(h.l, "n"), hsk2: levelOf(h.l, "o"), pos: h.p, cl: f.c?.length ? f.c : undefined, freq: rank.get(h.s) });
      continue;
    }
    // El dataset lista todas las lecturas (formas) de la palabra: asociamos el nivel a cada lectura
    // que coincida por pinyin o, si no, por significado; si nada coincide, a todas.
    const targets = new Set<Entry>();
    for (const form of h.f) {
      const hp = norm(form?.i?.y ?? "");
      const hm = (form?.m ?? []).map((x) => x.toLowerCase());
      let matched = cands.filter((e) => norm(e.p) === hp);
      if (!matched.length) matched = cands.filter((e) => hm.some((m) => e.en.some((d) => d.toLowerCase() === m || d.toLowerCase().includes(m))));
      if (!matched.length) matched = cands;
      for (const e of matched) {
        targets.add(e);
        if (form?.c?.length && !e.cl) e.cl = form.c;
      }
    }
    for (const e of targets) {
      e.hsk = levelOf(h.l, "t") ?? levelOf(h.l, "n");
      e.hsk2 = levelOf(h.l, "o");
      e.pos = h.p?.length ? h.p : undefined;
    }
  }

  entries.sort((a, b) => (a.hsk ?? 99) - (b.hsk ?? 99) || (a.freq ?? 1e9) - (b.freq ?? 1e9) || a.s.length - b.s.length);
  const isCore = (e: Entry) =>
    Boolean(e.hsk || e.hsk2) ||
    (e.freq !== undefined && e.freq <= 40000) ||
    (Array.from(e.s).length === 1 && !e.en.every((d) => /surname|variant|used in/.test(d)));
  const core = entries.filter(isCore);
  const full = entries.filter((e) => !isCore(e));
  const chars = new Set<string>();
  for (const e of core) for (const ch of e.s) if (/[一-鿿]/.test(ch)) chars.add(ch);
  return { core, full, hskWords, chars };
}

function toCompact(e: Entry): Compact {
  const c: Compact = [e.s, e.t, e.p, e.en];
  if (e.hsk || e.hsk2 || e.freq || e.pos || e.cl) c.push(e.hsk ?? 0, e.hsk2 ?? 0, e.freq ?? 0);
  if (e.pos || e.cl) c.push(e.pos ?? [], e.cl ?? []);
  return c;
}

/* ----------------------------- Make Me a Hanzi ----------------------------- */
interface Mmah {
  character: string;
  definition?: string;
  pinyin: string[];
  decomposition: string;
  radical: string;
  etymology?: { type: string; hint?: string; phonetic?: string; semantic?: string };
  matches: (number[] | null)[];
}

async function buildHanzi(): Promise<Map<string, Mmah>> {
  const text = readFileSync(await download(SOURCES.mmah, "mmah-dictionary.txt"), "utf8");
  const map = new Map<string, Mmah>();
  for (const line of splitLines(text)) {
    if (!line.trim()) continue;
    const o = JSON.parse(line) as Mmah;
    map.set(o.character, o);
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of map) {
    out[k] = {
      definition: v.definition,
      pinyin: v.pinyin,
      decomposition: v.decomposition,
      radical: v.radical,
      etymology: v.etymology,
      strokes: v.matches.length,
    };
  }
  writeFileSync(path.join(OUT, "hanzi.json"), JSON.stringify(out));
  console.log("✓ hanzi.json", map.size, "caracteres");
  return map;
}

function copyStrokeData(chars: Set<string>) {
  const src = path.join(ROOT, "node_modules", "hanzi-writer-data");
  const dest = path.join(OUT, "hanzi");
  mkdirSync(dest, { recursive: true });
  let n = 0;
  const available = new Set(readdirSync(src).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)));
  for (const ch of chars) {
    if (!available.has(ch)) continue;
    const to = path.join(dest, `${ch}.json`);
    if (!existsSync(to)) copyFileSync(path.join(src, `${ch}.json`), to);
    n++;
  }
  console.log("✓ trazos hanzi-writer:", n, "caracteres en public/data/hanzi/");
}

/* ----------------------------- Medianas para reconocimiento de escritura ----------------------------- */
function resample(pts: number[][], n: number): number[][] {
  if (pts.length === 1) return Array.from({ length: n }, () => pts[0]);
  const total = pts.slice(1).reduce((acc, p, i) => acc + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  const step = total / (n - 1);
  const res: number[][] = [pts[0]];
  let acc = 0;
  let i = 0;
  let cur = pts[0];
  while (res.length < n && i < pts.length - 1) {
    const next = pts[i + 1];
    const d = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
    if (acc + d >= step) {
      const t = (step - acc) / d;
      cur = [cur[0] + (next[0] - cur[0]) * t, cur[1] + (next[1] - cur[1]) * t];
      res.push(cur);
      acc = 0;
    } else {
      acc += d;
      cur = next;
      i++;
    }
  }
  while (res.length < n) res.push(pts[pts.length - 1]);
  return res;
}

/** Medianas de trazos de los caracteres HSK 3.0 niveles 1–4 + HSK 2.0 1–4, normalizadas a 0–1, 8 puntos por trazo. */
function buildMedians(hsk: { chars: Record<string, Record<number, string[]>> }) {
  const src = path.join(ROOT, "node_modules", "hanzi-writer-data");
  const chars = new Set<string>();
  for (const key of ["3.0", "2.0"]) for (const lv of [1, 2, 3, 4]) for (const c of hsk.chars[key]?.[lv] ?? []) chars.add(c);
  const out: Record<string, number[][][]> = {};
  for (const ch of chars) {
    const f = path.join(src, `${ch}.json`);
    if (!existsSync(f)) continue;
    const data = JSON.parse(readFileSync(f, "utf8")) as { medians: number[][][] };
    // hanzi-writer: sistema de 1024 unidades, eje Y invertido y desplazado (-124 … 900)
    out[ch] = data.medians.map((m) => resample(m, 8).map(([x, y]) => [Math.round((x / 1024) * 100) / 100, Math.round(((900 - y) / 1024) * 100) / 100]));
  }
  writeFileSync(path.join(OUT, "medians.json"), JSON.stringify(out));
  console.log("✓ medians.json", Object.keys(out).length, "caracteres para reconocimiento de escritura");
}

/* ----------------------------- Tatoeba ----------------------------- */
async function buildTatoeba(): Promise<number> {
  const cmn = await bunzipToText(await download(SOURCES.tatoebaCmn, "cmn_sentences.tsv.bz2"));
  const spa = await bunzipToText(await download(SOURCES.tatoebaSpa, "spa_sentences.tsv.bz2"));
  const links = await bunzipToText(await download(SOURCES.tatoebaLinks, "cmn-spa_links.tsv.bz2"));
  const cmnMap = new Map<string, string>();
  for (const line of splitLines(cmn)) {
    const [id, , text] = line.split("\t");
    if (id && text) cmnMap.set(id, text.trim());
  }
  const spaMap = new Map<string, string>();
  for (const line of splitLines(spa)) {
    const [id, , text] = line.split("\t");
    if (id && text) spaMap.set(id, text.trim());
  }
  const pairs: [string, string][] = [];
  const seen = new Set<string>();
  for (const line of splitLines(links)) {
    const [a, b] = line.split("\t");
    const zh = cmnMap.get(a?.trim());
    const es = spaMap.get(b?.trim());
    if (!zh || !es) continue;
    const simp = toSimp(zh);
    if (Array.from(simp).length > 40) continue;
    const key = simp + "|" + es;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push([simp, es]);
  }
  pairs.sort((x, y) => x[0].length - y[0].length);
  writeFileSync(path.join(OUT, "tatoeba.json"), JSON.stringify(pairs));
  console.log("✓ tatoeba.json", pairs.length, "pares cmn–spa");
  return pairs.length;
}

/* ----------------------------- HSK lists ----------------------------- */
function buildHskLists(hskWords: HskWord[]) {
  const lists: Record<string, Record<number, string[]>> = { "3.0": {}, "2.0": {}, std: {} };
  for (const w of hskWords) {
    const t = levelOf(w.l, "t");
    const o = levelOf(w.l, "o");
    const n = levelOf(w.l, "n");
    if (t) (lists["3.0"][t] ??= []).push(w.s);
    if (o) (lists["2.0"][o] ??= []).push(w.s);
    if (n) (lists.std[n] ??= []).push(w.s);
  }
  const chars: Record<string, Record<number, string[]>> = { "3.0": {}, "2.0": {} };
  for (const key of ["3.0", "2.0"] as const) {
    const seen = new Set<string>();
    for (const lv of Object.keys(lists[key])
      .map(Number)
      .sort((a, b) => a - b)) {
      const set = new Set<string>();
      for (const w of lists[key][lv]) for (const ch of w) if (/[一-鿿]/.test(ch) && !seen.has(ch)) set.add(ch);
      for (const c of set) seen.add(c);
      chars[key][lv] = Array.from(set);
    }
  }
  writeFileSync(path.join(OUT, "hsk.json"), JSON.stringify({ words: lists, chars }));
  const summary = Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([l, ws]) => [l, ws.length]))]));
  console.log("✓ hsk.json", JSON.stringify(summary));
  return { lists, chars };
}

/* ----------------------------- main ----------------------------- */
export async function main() {
  const { core, full, hskWords, chars } = await buildDictionary();
  writeFileSync(path.join(OUT, "cedict-core.json"), JSON.stringify(core.map(toCompact)));
  writeFileSync(path.join(OUT, "cedict-full.json"), JSON.stringify(full.map(toCompact)));
  console.log("✓ cedict-core.json", core.length, "entradas ·", "cedict-full.json", full.length, "entradas");
  const hanzi = await buildHanzi();
  const hsk = buildHskLists(hskWords);
  // trazos: caracteres de entradas core + HSK + componentes
  const strokeChars = new Set(chars);
  for (const lv of Object.values(hsk.chars["3.0"])) for (const c of lv) strokeChars.add(c);
  for (const [k, v] of hanzi) {
    if (strokeChars.has(k)) for (const c of v.decomposition) if (/[一-鿿⺀-⿟]/.test(c)) strokeChars.add(c);
  }
  copyStrokeData(strokeChars);
  buildMedians(hsk);
  const tatoeba = await buildTatoeba();
  writeFileSync(
    path.join(OUT, "meta.json"),
    JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        counts: { cedictCore: core.length, cedictFull: full.length, hanzi: hanzi.size, tatoeba, strokeChars: strokeChars.size },
        sources: SOURCES,
      },
      null,
      2,
    ),
  );
  console.log("✓ Listo. Archivos en public/data/zh/");
}

export default main;
