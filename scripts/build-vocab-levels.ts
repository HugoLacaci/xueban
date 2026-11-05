/**
 * npm run vocab:levels → content/zh/seed/zh_vocab_levels.json
 * Vocabulario del temario v2 por niveles: cada palabra del vocabulario de las lecciones (content/zh/curriculum/lessons)
 * con su nivel HSK 3.0 (std, GF 0025—2021) y 2.0, o «Extra»; categoría temática; clasificador (CC-CEDICT);
 * ejemplo sacado de la propia lección (con pinyin y traducción); y la unidad y lección en que se introduce.
 * Identificadores: los de la semilla HSK 1 se conservan (WebID de Anki); las nuevas usan «hsk-<hanzi>».
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Lesson, Sentence } from "../lib/course/types";
import { joinPy, joinZh } from "../lib/course/skeleton";
import { UNIT_CATEGORY } from "../lib/hanzi/vocab-categories";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = <T>(p: string): T => JSON.parse(readFileSync(path.join(ROOT, p), "utf8")) as T;

interface SeedWord {
  id: string;
  hanzi: string;
  category: string;
  [k: string]: unknown;
}

export interface LevelWord {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  category: string;
  classifier?: string[];
  example: string;
  example_pinyin: string;
  example_translation: string;
  /** "HSK3.0" + nivel std, "HSK2.0" si está en la lista antigua, o "Extra" */
  hsk: string[];
  /** nivel std 1–3 (0 = extra / superior) */
  level: number;
  hsk20?: number;
  unit: string;
  lesson: string;
  traditional?: string;
}

const rank = (id: string) => {
  const m = id.match(/^(e0|a1|a2|b1)-(?:u(\d+)-l(\d+)|(\d+|cp))$/);
  if (!m) return 1e9;
  const st = { e0: 0, a1: 1, a2: 2, b1: 3 }[m[1] as "e0"] * 1e6;
  return m[4] ? st + (m[4] === "cp" ? 99 : Number(m[4])) : st + Number(m[2]) * 100 + Number(m[3]);
};

function sentencesOf(l: Lesson): Sentence[] {
  const out: Sentence[] = [];
  for (const st of l.steps) {
    if (st.type === "dialogue") out.push(...st.lines);
    if (st.type === "objective") out.push(...st.canSay);
    if (st.type === "listen-speak") out.push(...st.shadowing);
    if (st.type === "skeleton")
      for (const sk of [...st.sentences, ...(st.negative ?? []), ...(st.question ?? [])])
        out.push({ zh: joinZh(sk), py: joinPy(sk), es: sk.es });
  }
  return out.filter((s) => s.zh && s.py && s.es);
}

function main() {
  const dir = path.join(ROOT, "content", "zh", "curriculum", "lessons");
  const lessons = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Lesson)
    .sort((a, b) => rank(a.id) - rank(b.id));
  const seed = read<{ words: SeedWord[] }>("content/zh/seed/hsk1_vocab.json").words;
  const seedBy = new Map(seed.map((w) => [w.hanzi, w]));
  const hskPath = path.join(ROOT, "public", "data", "zh", "hsk.json");
  const hsk = existsSync(hskPath)
    ? (JSON.parse(readFileSync(hskPath, "utf8")) as {
        words: Record<string, Record<string, string[]>>;
      })
    : null;
  const std = new Map<string, number>();
  const old = new Map<string, number>();
  if (hsk) {
    for (const [lv, ws] of Object.entries(hsk.words.std))
      for (const w of ws) if (!std.has(w)) std.set(w, Number(lv));
    for (const [lv, ws] of Object.entries(hsk.words["2.0"]))
      for (const w of ws) if (!old.has(w)) old.set(w, Number(lv));
  }
  const cedictPath = path.join(ROOT, "public", "data", "zh", "cedict-core.json");
  const cl = new Map<string, { trad: string; cl: string[] }>();
  if (existsSync(cedictPath))
    for (const e of JSON.parse(readFileSync(cedictPath, "utf8")) as unknown[][])
      if (!cl.has(e[0] as string))
        cl.set(e[0] as string, { trad: e[1] as string, cl: (e[8] as string[]) ?? [] });

  const out: LevelWord[] = [];
  const seen = new Set<string>();
  for (const l of lessons) {
    const unit = l.id.startsWith("e0-") ? "e0" : l.id.replace(/-l\d+$/, "");
    const sents = sentencesOf(l);
    for (const v of l.vocab) {
      if (seen.has(v.hanzi)) continue;
      seen.add(v.hanzi);
      const sw = seedBy.get(v.hanzi);
      const lv = std.get(v.hanzi) ?? 0;
      const isExtra = (l.extraVocab ?? []).includes(v.hanzi) || lv === 0;
      const ex = sents
        .filter((s) => s.zh.includes(v.hanzi) && s.zh !== v.hanzi)
        .sort((a, b) => a.zh.length - b.zh.length)[0];
      const c = cl.get(v.hanzi);
      out.push({
        id: sw?.id ?? `hsk-${v.hanzi}`,
        hanzi: v.hanzi,
        pinyin: v.pinyin,
        meaning: v.es,
        category: sw?.category ?? UNIT_CATEGORY[unit] ?? "Expresiones útiles",
        ...(c?.cl.length ? { classifier: c.cl } : {}),
        example: ex?.zh ?? "",
        example_pinyin: ex?.py ?? "",
        example_translation: ex?.es ?? "",
        hsk: isExtra ? ["Extra"] : ["HSK3.0", ...(old.has(v.hanzi) ? ["HSK2.0"] : [])],
        level: isExtra ? 0 : lv,
        ...(old.has(v.hanzi) ? { hsk20: old.get(v.hanzi) } : {}),
        unit,
        lesson: l.id,
        ...(c?.trad && c.trad !== v.hanzi ? { traditional: c.trad } : {}),
      });
    }
  }
  const cats: string[] = [];
  for (const w of seed) if (!cats.includes(w.category)) cats.push(w.category);
  const added: string[] = [];
  for (const w of out)
    if (!cats.includes(w.category) && !added.includes(w.category)) added.push(w.category);
  writeFileSync(
    path.join(ROOT, "content", "zh", "seed", "zh_vocab_levels.json"),
    JSON.stringify(
      {
        version: 1,
        source: "Lecciones del temario v2 + GF 0025—2021 (std) + CC-CEDICT (clasificadores)",
        categories: [...cats, ...added],
        words: out,
      },
      null,
      1,
    ),
  );
  const byLv = [1, 2, 3, 0].map(
    (lv) => `${lv || "extra"}: ${out.filter((w) => w.level === lv).length}`,
  );
  console.log(
    `zh_vocab_levels.json · ${out.length} palabras (${byLv.join(", ")}) · ${out.filter((w) => w.example).length} con ejemplo · ${out.filter((w) => w.classifier).length} con clasificador · ${added.length} categorías nuevas: ${added.join(", ")}`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
