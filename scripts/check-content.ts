/**
 * npm run content:check -- [--lang=zh|ja|ko|all]   (por defecto: all)
 * Valida el contenido del curso, la gramática y las lecturas de cada idioma:
 *  - JSON con la forma esperada, ids únicos, referencias a gramática existentes
 *  - frases y vocabulario escritos en la escritura meta, con lectura y español
 *  - ejercicios de huecos con la respuesta entre las opciones; preguntas con índice válido
 *  - vocabulario controlado: los diálogos solo usan caracteres ya enseñados (aviso)
 *  - chino: pinyin coherente con la semilla / pinyin-pro y número de sílabas (scripts/data/zh.check.ts)
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { GrammarPoint, Unit, Lesson, LessonStep } from "../lib/course/types";

type Lang = "zh" | "ja" | "ko";
const ROOT = path.resolve(import.meta.dirname, "..");
const arg = process.argv.find((a) => a.startsWith("--lang="))?.slice(7) ?? "all";
const LANGS: Lang[] = arg === "all" ? ["zh", "ja", "ko"] : [arg as Lang];

const SCRIPT: Record<Lang, RegExp> = {
  zh: /[一-鿿]/,
  ja: /[぀-ヿ一-鿿]/,
  ko: /[가-힯]/,
};
/** Caracteres que cuentan para el vocabulario controlado (los que se enseñan uno a uno) */
const COUNTED: Record<Lang, RegExp> = { zh: /[一-鿿]/, ja: /[一-鿿]/, ko: /[가-힯]/ };
const SEED_FILE: Record<Lang, string> = { zh: "hsk1_vocab.json", ja: "ja_n5_vocab.json", ko: "ko_topik1_vocab.json" };
const NAMES: Record<Lang, string[]> = {
  zh: ["雨果", "安娜", "王明", "李老师", "大卫", "李", "王", "明", "安", "娜", "滴滴", "微信", "支付宝", "上海", "北京", "西班牙", "中国", "马德里", "巴塞罗那", "英国", "美国", "法国", "德国", "日本", "交通大学", "上海交通大学"],
  ja: [],
  ko: [],
};

interface Issue {
  level: "error" | "warn";
  where: string;
  msg: string;
}

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

async function checkLang(lang: Lang): Promise<Issue[]> {
  const issues: Issue[] = [];
  const err = (where: string, msg: string) => issues.push({ level: "error", where: `${lang}/${where}`, msg });
  const warn = (where: string, msg: string) => issues.push({ level: "warn", where: `${lang}/${where}`, msg });
  const dir = path.join(ROOT, "content", lang);
  const zh = lang === "zh" ? await import("./data/zh.check") : null;
  const TARGET = SCRIPT[lang];

  const gRaw = readJson<GrammarPoint[] | { points: GrammarPoint[] }>(path.join(dir, "grammar.json"));
  const grammar = Array.isArray(gRaw) ? gRaw : gRaw.points;
  const grammarIds = new Set<string>();
  const seedRaw = readJson<{ words: { hanzi?: string; word?: string; pinyin?: string; reading?: string }[] } | { hanzi?: string; word?: string }[]>(path.join(dir, "seed", SEED_FILE[lang]));
  const seedWords = (Array.isArray(seedRaw) ? seedRaw : seedRaw.words) as { hanzi?: string; word?: string; pinyin?: string; reading?: string }[];
  const seedReading = new Map(seedWords.map((w) => [w.hanzi ?? w.word ?? "", w.pinyin ?? w.reading ?? ""]));

  function checkSentence(where: string, text: string, reading?: string) {
    if (!TARGET.test(text)) err(where, `frase sin escritura meta: ${text}`);
    const z = zh?.zhSentenceIssue(text, reading);
    if (z) warn(where, z);
  }

  /* ----- gramática ----- */
  for (const g of grammar) {
    const w = `grammar/${g.id}`;
    if (grammarIds.has(g.id)) err(w, "id duplicado");
    grammarIds.add(g.id);
    if (!g.explanation) err(w, "sin explicación");
    if ((g.examples?.length ?? 0) < 4) warn(w, `solo ${g.examples?.length ?? 0} ejemplos (se recomiendan 5+)`);
    for (const e of [...(g.examples ?? []), ...(g.practice?.order ?? []), ...(g.practice?.translate ?? [])]) {
      checkSentence(w, e.zh, e.py);
      if (!e.es) warn(w, `ejemplo sin español: ${e.zh}`);
    }
    for (const f of g.practice?.fill ?? []) {
      if (!f.zh.includes("＿")) err(w, `fill sin hueco ＿: ${f.zh}`);
      if (!f.options.includes(f.answer)) err(w, `fill: la respuesta «${f.answer}» no está en las opciones`);
    }
  }
  for (const g of grammar) for (const r of g.related ?? []) if (!grammarIds.has(r)) warn(`grammar/${g.id}`, `related desconocido: ${r}`);

  /* ----- unidades ----- */
  const known = new Set<string>(NAMES[lang]);
  const lessonIds = new Set<string>();
  const unitIds = new Set<string>();
  const knownChar = (ch: string) => known.has(ch) || Array.from(known).some((w) => w.includes(ch));
  const unitFiles = readdirSync(path.join(dir, "course")).filter((f) => f.endsWith(".json"));
  const units = unitFiles
    .map((f) => {
      try {
        return readJson<Unit>(path.join(dir, "course", f));
      } catch (e) {
        err(f, `JSON inválido: ${(e as Error).message}`);
        return null;
      }
    })
    .filter((u): u is Unit => Boolean(u))
    .sort((a, b) => a.order - b.order);

  for (const u of units) {
    const w = `unit/${u.id}`;
    if (unitIds.has(u.id)) err(w, "id de unidad duplicado");
    unitIds.add(u.id);
    if (!u.lessons?.length) err(w, "sin lecciones");
    for (const l of (u.lessons ?? []) as Lesson[]) {
      const lw = `${u.id}/${l.id}`;
      if (lessonIds.has(l.id)) err(lw, "id de lección duplicado");
      lessonIds.add(l.id);
      if (!l.goal) warn(lw, "sin objetivo (goal)");
      if (!l.vocab?.length && u.level !== 0) warn(lw, "sin vocabulario");
      for (const v of l.vocab ?? []) {
        if (!TARGET.test(v.hanzi)) err(lw, `vocab sin escritura meta: ${JSON.stringify(v)}`);
        if (!v.pinyin) err(lw, `vocab sin lectura: ${v.hanzi}`);
        if (!v.es) err(lw, `vocab sin español: ${v.hanzi}`);
        const z = zh?.zhReadingIssue(v.hanzi, v.pinyin, seedReading.get(v.hanzi));
        if (z) warn(lw, z);
        known.add(v.hanzi);
      }
      const steps = (l.steps ?? []) as LessonStep[];
      if (!steps.some((s) => s.type === "exercises") && u.level !== 0) warn(lw, "sin paso de ejercicios");
      for (const s of steps) {
        if (s.type === "grammar" && !grammarIds.has(s.id)) err(lw, `gramática desconocida: ${s.id}`);
        if (s.type === "dialogue") {
          for (const line of s.lines) {
            checkSentence(lw, line.zh, line.py);
            const unknown = Array.from(line.zh).filter((c) => COUNTED[lang].test(c) && !knownChar(c));
            if (unknown.length && u.level !== 0) warn(lw, `diálogo usa caracteres no enseñados aún: ${[...new Set(unknown)].join(" ")} en «${line.zh}»`);
          }
        }
        if (s.type === "reading") {
          for (const q of s.questions) if (q.answer < 0 || q.answer >= q.options.length) err(lw, `pregunta con índice de respuesta inválido: ${q.q}`);
        }
      }
      if (l.reviewed) warn(lw, "marcada como revisada (reviewed:true)");
    }
  }

  /* ----- lecturas graduadas ----- */
  const rPath = path.join(dir, "readings", "readings.json");
  let nReadings = 0;
  if (existsSync(rPath)) {
    const rRaw = readJson<{ id: string; text: string; es: string; questions: { q: string; options: string[]; answer: number }[] }[] | { readings: never[] }>(rPath);
    const readings = Array.isArray(rRaw) ? rRaw : rRaw.readings;
    nReadings = readings.length;
    const ids = new Set<string>();
    for (const r of readings) {
      const w = `reading/${r.id}`;
      if (ids.has(r.id)) err(w, "id duplicado");
      ids.add(r.id);
      if (!TARGET.test(r.text)) err(w, "texto sin escritura meta");
      if (!r.es) err(w, "sin traducción");
      for (const q of r.questions ?? []) if (q.answer < 0 || q.answer >= q.options.length) err(w, `pregunta con índice inválido: ${q.q}`);
    }
  } else err("readings", "falta readings/readings.json");

  console.log(`\n[${lang}] ${units.length} unidades · ${lessonIds.size} lecciones · ${grammar.length} puntos de gramática · ${nReadings} lecturas · ${known.size - NAMES[lang].length} palabras enseñadas`);
  return issues;
}

async function main() {
const all: Issue[] = [];
for (const l of LANGS) all.push(...(await checkLang(l)));
const errors = all.filter((i) => i.level === "error");
const warns = all.filter((i) => i.level === "warn");
const verbose = process.argv.includes("--verbose");
for (const i of all) if (i.level === "error" || verbose) console.log(`${i.level === "error" ? "✗" : "⚠"} [${i.where}] ${i.msg}`);
console.log(`\n${errors.length} errores · ${warns.length} avisos${verbose ? "" : " (usa --verbose para ver los avisos)"}`);
process.exit(errors.length ? 1 : 0);
}
void main();
