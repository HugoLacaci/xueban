/**
 * npm run curriculum:coverage → docs/COBERTURA.md
 * Cobertura del temario v2 frente al estándar HSK 3.0 (GF 0025—2021), niveles 1–3:
 *  - gramática: cada punto de content/zh/curriculum/grammar-standard.json con la unidad/lección donde se enseña, o «falta»;
 *  - vocabulario oficial (public/data/zh/hsk.json · words.std): lección de introducción (vocabulario de una lección),
 *    unidad planificada (vocab-plan.json) o «sin asignar»;
 *  - palabras usadas en frases antes de su lección de introducción.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Lesson } from "../lib/course/types";
import { joinZh } from "../lib/course/skeleton";

const ROOT = path.resolve(import.meta.dirname, "..");
const CUR = path.join(ROOT, "content", "zh", "curriculum");
const read = <T>(p: string, fb: T): T =>
  existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : fb;

interface GPoint {
  id: string;
  level: number;
  category?: string;
  zh: string;
  es: string;
  unit: string | null;
}
const grammar = read<{ points: GPoint[]; verified?: boolean; source?: string }>(
  path.join(CUR, "grammar-standard.json"),
  { points: [] },
);
const hsk = read<{ words: { std: Record<string, string[]> } } | null>(
  path.join(ROOT, "public", "data", "zh", "hsk.json"),
  null,
);
const plan = read<{ units: Record<string, { words: string[]; extra?: string[] }> }>(
  path.join(CUR, "vocab-plan.json"),
  { units: {} },
);
const units = read<{ id: string; title: string; stage: string }[]>(
  path.join(CUR, "units.json"),
  [],
);

const rank = (id: string) => {
  const m = id.match(/^(e0|a1|a2|b1)-(?:u(\d+)-l(\d+)|(\d+|cp))$/);
  if (!m) return 1e9;
  const stage = { e0: 0, a1: 1, a2: 2, b1: 3 }[m[1] as "e0"] * 1e6;
  return m[4]
    ? stage + (m[4] === "cp" ? 99 : Number(m[4]))
    : stage + Number(m[2]) * 100 + Number(m[3]);
};
const lessons: Lesson[] = existsSync(path.join(CUR, "lessons"))
  ? readdirSync(path.join(CUR, "lessons"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(path.join(CUR, "lessons", f), "utf8")) as Lesson)
      .sort((a, b) => rank(a.id) - rank(b.id))
  : [];
const unitOf = (id: string) => (id.startsWith("e0-") ? "e0" : id.replace(/-l\d+$/, ""));
const lessonsByUnit = new Map<string, string[]>();
for (const l of lessons)
  lessonsByUnit.set(unitOf(l.id), [...(lessonsByUnit.get(unitOf(l.id)) ?? []), l.id]);

// introducción de cada palabra: primera lección cuyo vocabulario la contiene
const intro = new Map<string, string>();
for (const l of lessons) for (const v of l.vocab) if (!intro.has(v.hanzi)) intro.set(v.hanzi, l.id);
const planned = new Map<string, string>();
for (const [u, x] of Object.entries(plan.units))
  for (const w of x.words) if (!planned.has(w)) planned.set(w, u);

// texto de cada lección (frases)
function lessonText(l: Lesson): string {
  const out: string[] = [];
  for (const st of l.steps) {
    if (st.type === "dialogue") out.push(...st.lines.map((x) => x.zh));
    if (st.type === "objective") out.push(...st.canSay.map((x) => x.zh));
    if (st.type === "listen-speak") out.push(...st.shadowing.map((x) => x.zh));
    if (st.type === "reading") out.push(st.text);
    if (st.type === "skeleton")
      out.push(...[...st.sentences, ...(st.negative ?? []), ...(st.question ?? [])].map(joinZh));
    if (st.type === "sentence-builder") out.push(...st.items.map((i) => joinZh(i.sentence)));
  }
  return out.join("\n");
}

const lines: string[] = [];
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10} %` : "—");
lines.push("# Cobertura del temario (HSK 3.0, niveles 1–3)", "");
lines.push(
  `> Generado por \`npm run curriculum:coverage\` el ${new Date().toISOString().slice(0, 10)}. ${lessons.length} lecciones escritas en ${lessonsByUnit.size} de ${units.length} unidades.`,
  "",
);

// ---- gramática
lines.push("## 1. Gramática", "");
if (!grammar.points.length)
  lines.push("_Falta `content/zh/curriculum/grammar-standard.json`._", "");
else {
  lines.push(
    `Fuente: ${grammar.source ?? "—"} · ${grammar.verified ? "**verificada**" : "**no cotejada con el PDF oficial** (fuente de terceros)"}`,
    "",
  );
  lines.push("| Nivel | Puntos | Con unidad | Con lecciones escritas |", "|---|---|---|---|");
  for (const lv of [1, 2, 3]) {
    const ps = grammar.points.filter((p) => p.level === lv);
    const withUnit = ps.filter((p) => p.unit);
    const written = ps.filter((p) => p.unit && lessonsByUnit.has(p.unit));
    lines.push(
      `| ${lv} | ${ps.length} | ${withUnit.length} (${pct(withUnit.length, ps.length)}) | ${written.length} (${pct(written.length, ps.length)}) |`,
    );
  }
  lines.push("");
  for (const lv of [1, 2, 3]) {
    lines.push(`### Nivel ${lv}`, "", "| Id | Punto | Unidad | Estado |", "|---|---|---|---|");
    for (const p of grammar.points.filter((x) => x.level === lv)) {
      const st = !p.unit
        ? "**falta**"
        : lessonsByUnit.has(p.unit)
          ? `✓ ${lessonsByUnit.get(p.unit)!.length} lecciones`
          : "planificada (sin lecciones)";
      lines.push(
        `| ${p.id} | ${p.zh.replace(/\|/g, "/")} — ${p.es.replace(/\|/g, "/")} | ${p.unit ?? "—"} | ${st} |`,
      );
    }
    lines.push("");
  }
}

// ---- vocabulario
lines.push("## 2. Vocabulario oficial", "");
const usedBefore: string[] = [];
if (!hsk) lines.push("_Falta public/data/zh/hsk.json (ejecuta `npm run data:build`)._", "");
else {
  lines.push(
    "| Nivel | Palabras | En una lección | Solo planificadas | Sin asignar |",
    "|---|---|---|---|---|",
  );
  const unassigned: Record<string, string[]> = {};
  for (const lv of ["1", "2", "3"]) {
    const ws = hsk.words.std[lv] ?? [];
    const inLesson = ws.filter((w) => intro.has(w));
    const onlyPlan = ws.filter((w) => !intro.has(w) && planned.has(w));
    unassigned[lv] = ws.filter((w) => !intro.has(w) && !planned.has(w));
    lines.push(
      `| ${lv} | ${ws.length} | ${inLesson.length} (${pct(inLesson.length, ws.length)}) | ${onlyPlan.length} | ${unassigned[lv].length} |`,
    );
  }
  lines.push("");
  for (const lv of ["1", "2", "3"]) {
    if (!unassigned[lv].length) continue;
    lines.push(
      `### Nivel ${lv}: sin asignar (${unassigned[lv].length})`,
      "",
      unassigned[lv].join(" · "),
      "",
    );
  }
  // palabras usadas antes de su introducción (≥ 2 caracteres para evitar falsos positivos)
  const all = new Set(
    ["1", "2", "3"].flatMap((lv) => hsk.words.std[lv] ?? []).filter((w) => [...w].length >= 2),
  );
  // palabras ya disponibles en cada lección (introducidas antes o en ella): sirven para no contar 关系 dentro de 没关系
  const introducedWords = [...intro.entries()].map(([w, at]) => ({ w, r: rank(at) }));
  const coveredByLonger = (txt: string, w: string, r: number) => {
    let i = txt.indexOf(w);
    while (i >= 0) {
      const inside = introducedWords.some(
        (x) =>
          x.r <= r &&
          x.w.length > w.length &&
          x.w.includes(w) &&
          [...Array(x.w.length - w.length + 1).keys()].some((k) => txt.startsWith(x.w, i - k)),
      );
      if (!inside) return false;
      i = txt.indexOf(w, i + 1);
    }
    return true;
  };
  for (const l of lessons) {
    const txt = lessonText(l);
    for (const w of all) {
      const at = intro.get(w);
      if (txt.includes(w) && (!at || rank(at) > rank(l.id)) && !coveredByLonger(txt, w, rank(l.id)))
        usedBefore.push(
          `${l.id}: ${w}${at ? ` (se introduce en ${at})` : " (no se introduce en ninguna lección)"}`,
        );
    }
  }
  lines.push(
    "### Palabras por lección (introducción)",
    "",
    "| Lección | Palabras nuevas |",
    "|---|---|",
  );
  for (const l of lessons) lines.push(`| ${l.id} | ${l.vocab.map((v) => v.hanzi).join(" ")} |`);
  lines.push("");
}
lines.push(
  "## 3. Palabras usadas antes de introducirse",
  "",
  "> Lista orientativa para revisar: el validador (`npm run content:check`) ya garantiza que no se usa ningún **carácter** antes de verlo. Aquí salen palabras oficiales que aparecen en el texto antes de su lección de introducción; muchas son composiciones transparentes de caracteres ya vistos (我们 = 我 + 们) o coincidencias dentro de otra palabra (个人 en 一个人), que no necesitan cambio.",
  "",
);
lines.push(
  usedBefore.length
    ? usedBefore
        .slice(0, 400)
        .map((x) => `- ${x}`)
        .join("\n") + (usedBefore.length > 400 ? `\n- … y ${usedBefore.length - 400} más` : "")
    : "Ninguna.",
  "",
);

writeFileSync(path.join(ROOT, "docs", "COBERTURA.md"), lines.join("\n"));
console.log(
  `docs/COBERTURA.md · ${lessons.length} lecciones · ${grammar.points.length} puntos de gramática · ${usedBefore.length} usos anticipados`,
);
