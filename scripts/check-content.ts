/**
 * npm run content:check
 * Valida el contenido del curso y la gramática:
 *  - JSON con la forma esperada, ids únicos, referencias a gramática existentes
 *  - vocabulario controlado: cada diálogo/lectura solo usa palabras ya enseñadas (o nombres propios)
 *  - pinyin de cada palabra de vocabulario coherente con pinyin-pro (avisa si difiere)
 *  - frases: pinyin "py" con el mismo número de sílabas que caracteres
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pinyin } from "pinyin-pro";
import { normalizePinyin, syllablesOf } from "../lib/pinyin/tones";
import type { GrammarPoint, Unit, Lesson, LessonStep } from "../lib/course/types";

const ROOT = path.resolve(import.meta.dirname, "..");
const HANZI = /[一-鿿]/;
const NAMES = new Set(["雨果", "安娜", "王明", "李老师", "大卫", "李", "王", "明", "安", "娜", "滴滴", "微信", "支付宝", "上海", "北京", "西班牙", "中国", "马德里", "巴塞罗那", "英国", "美国", "法国", "德国", "日本", "交通大学", "上海交通大学", "A", "B"]);

interface Issue {
  level: "error" | "warn";
  where: string;
  msg: string;
}
const issues: Issue[] = [];
const err = (where: string, msg: string) => issues.push({ level: "error", where, msg });
const warn = (where: string, msg: string) => issues.push({ level: "warn", where, msg });

const grammar = JSON.parse(readFileSync(path.join(ROOT, "content", "grammar.json"), "utf8")) as GrammarPoint[];
const grammarIds = new Set(grammar.map((g) => g.id));
const seed = JSON.parse(readFileSync(path.join(ROOT, "content", "seed", "hsk1_vocab.json"), "utf8")) as { words: { hanzi: string; pinyin: string }[] };
const seedPinyin = new Map(seed.words.map((w) => [w.hanzi, w.pinyin]));

const unitFiles = readdirSync(path.join(ROOT, "content", "course")).filter((f) => f.endsWith(".json"));
const units: Unit[] = unitFiles.map((f) => {
  try {
    return JSON.parse(readFileSync(path.join(ROOT, "content", "course", f), "utf8")) as Unit;
  } catch (e) {
    err(f, `JSON inválido: ${(e as Error).message}`);
    return null as unknown as Unit;
  }
}).filter(Boolean);
units.sort((a, b) => a.order - b.order);

/* ----- gramática ----- */
for (const g of grammar) {
  const w = `grammar/${g.id}`;
  if (g.examples.length < 4) warn(w, `solo ${g.examples.length} ejemplos (se recomiendan 5+)`);
  for (const e of [...g.examples, ...(g.practice.order ?? []), ...(g.practice.translate ?? [])]) checkSentence(w, e.zh, e.py);
  for (const f of g.practice.fill ?? []) {
    if (!f.zh.includes("＿")) err(w, `fill sin hueco ＿: ${f.zh}`);
    if (!f.options.includes(f.answer)) err(w, `fill: la respuesta «${f.answer}» no está en las opciones`);
  }
  for (const r of g.related ?? []) if (!grammarIds.has(r)) warn(w, `related desconocido: ${r}`);
}

/* ----- unidades ----- */
const known = new Set<string>(NAMES);
const lessonIds = new Set<string>();
const unitIds = new Set<string>();
function lexiconHas(word: string): boolean {
  return known.has(word);
}
function segmentKnown(text: string): { unknown: string[] } {
  // máxima coincidencia con el vocabulario conocido; lo que no case → caracteres sueltos
  const chars = Array.from(text.replace(/[^一-鿿]/g, ""));
  const unknown: string[] = [];
  let i = 0;
  while (i < chars.length) {
    let found = "";
    for (let len = Math.min(6, chars.length - i); len >= 1; len--) {
      const cand = chars.slice(i, i + len).join("");
      if (lexiconHas(cand)) {
        found = cand;
        break;
      }
    }
    if (found) i += found.length;
    else {
      // intenta también si el carácter forma parte de una palabra conocida (p. ej. 们, 老 en 老师) → se tolera
      const ch = chars[i];
      const partOfKnown = Array.from(known).some((w) => w.includes(ch));
      if (!partOfKnown) unknown.push(ch);
      i++;
    }
  }
  return { unknown };
}

function checkSentence(where: string, zh: string, py?: string) {
  if (!HANZI.test(zh)) err(where, `frase sin hanzi: ${zh}`);
  if (/[,.?!]/.test(zh) && !/[A-Za-z0-9]/.test(zh)) warn(where, `puntuación occidental en chino: ${zh}`);
  if (py) {
    // 儿 final de erhua (哪儿/点儿) no forma sílaba propia
    const nChars = Array.from(zh).filter((c) => HANZI.test(c)).length - (zh.match(/[一-鿿]儿/g)?.length ?? 0) * (/r/.test(py.replace(/[^a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜs]/g, "")) ? 1 : 0);
    const nSyl = syllablesOf(py).length;
    if (nChars !== nSyl) warn(where, `«${zh}»: ${nChars} hanzi pero ${nSyl} sílabas en «${py}»`);
  }
}

for (const u of units) {
  const w = `unit/${u.id}`;
  if (unitIds.has(u.id)) err(w, "id de unidad duplicado");
  unitIds.add(u.id);
  if (!u.lessons?.length) err(w, "sin lecciones");
  for (const l of u.lessons as Lesson[]) {
    const lw = `${u.id}/${l.id}`;
    if (lessonIds.has(l.id)) err(lw, "id de lección duplicado");
    lessonIds.add(l.id);
    if (!l.goal) warn(lw, "sin objetivo (goal)");
    if (!l.vocab?.length) warn(lw, "sin vocabulario");
    // vocabulario: comprobar pinyin
    for (const v of l.vocab ?? []) {
      if (!HANZI.test(v.hanzi)) err(lw, `vocab sin hanzi: ${JSON.stringify(v)}`);
      if (!v.pinyin) err(lw, `vocab sin pinyin: ${v.hanzi}`);
      if (!v.es) err(lw, `vocab sin español: ${v.hanzi}`);
      const sp = seedPinyin.get(v.hanzi);
      if (sp && normalizePinyin(sp) !== normalizePinyin(v.pinyin)) warn(lw, `pinyin de ${v.hanzi} «${v.pinyin}» difiere de la semilla «${sp}»`);
      if (!sp) {
        const auto = pinyin(v.hanzi, { toneType: "symbol", type: "string", nonZh: "removed" });
        if (normalizePinyin(auto) !== normalizePinyin(v.pinyin)) warn(lw, `pinyin de ${v.hanzi} «${v.pinyin}» ≠ pinyin-pro «${auto}» (revisar polifonía/tono neutro)`);
      }
      known.add(v.hanzi);
    }
    const steps = (l.steps ?? []) as LessonStep[];
    if (!steps.some((s) => s.type === "exercises")) warn(lw, "sin paso de ejercicios");
    for (const s of steps) {
      if (s.type === "grammar" && !grammarIds.has(s.id)) err(lw, `gramática desconocida: ${s.id}`);
      if (s.type === "dialogue") {
        for (const line of s.lines) {
          checkSentence(lw, line.zh, line.py);
          const { unknown } = segmentKnown(line.zh);
          if (unknown.length) warn(lw, `diálogo usa caracteres no enseñados aún: ${unknown.join(" ")} en «${line.zh}»`);
        }
      }
      if (s.type === "reading") {
        const { unknown } = segmentKnown(s.text);
        if (unknown.length) warn(lw, `lectura usa caracteres no enseñados: ${unknown.join(" ")}`);
        const n = Array.from(s.text).filter((c) => HANZI.test(c)).length;
        if (n < 40) warn(lw, `lectura muy corta (${n} caracteres)`);
        for (const q of s.questions) if (q.answer < 0 || q.answer >= q.options.length) err(lw, `pregunta con índice de respuesta inválido: ${q.q}`);
      }
    }
    if (l.reviewed) warn(lw, "marcada como revisada (reviewed:true)");
  }
}

const errors = issues.filter((i) => i.level === "error");
const warns = issues.filter((i) => i.level === "warn");
for (const i of issues) console.log(`${i.level === "error" ? "✗" : "⚠"} [${i.where}] ${i.msg}`);
console.log(`\n${units.length} unidades · ${lessonIds.size} lecciones · ${grammar.length} puntos de gramática · ${known.size - NAMES.size} palabras enseñadas`);
console.log(`${errors.length} errores · ${warns.length} avisos`);
process.exit(errors.length ? 1 : 0);
