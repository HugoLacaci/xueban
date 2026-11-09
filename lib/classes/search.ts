/**
 * Utilidades puras de los paquetes de clase (sin Dexie ni React): fechas, huellas de contenido, comparación de
 * respuestas, Markdown de exportación y buscador en todas las clases («¿en qué clase explicó 了?»).
 */
import type { ClassPackage } from "./package-schema";

/* Ids estables de lo importado (ver lib/classes/import.ts). */
/** n: posición en el paquete (1…); en paquetes duplicados, «<archivo>-<n>». */
export const exerciseId = (noteId: string, n: number | string) => `${noteId}:ex:${n}`;
export const livingAddId = (noteId: string, n: number) => `${noteId}:living:${n}`;
export const clipAssetId = (noteId: string, file: string) => `${noteId}:clip:${file}`;
export const classSetId = (noteId: string) => `${noteId}:set`;

/** «2026-10-03» → «03/10». */
export function ddmm(date: string): string {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

/** Segundos → «12:34» o «1:02:03». */
export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** 1536 → «1,5 kB»; 3 400 000 → «3,2 MB». */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["kB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString("es-ES", { maximumFractionDigits: v < 10 ? 1 : 0 })} ${units[i]}`;
}

/** JSON con las claves ordenadas (para que la huella no dependa del orden). */
function stable(v: unknown): string {
  if (v === undefined) return "null";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
    .join(",")}}`;
}

/** Huella (FNV-1a de 2×32 bits) de un valor JSON. */
export function contentHash(v: unknown): string {
  const s = stable(v);
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

/** Normaliza una frase para compararla: sin espacios ni puntuación. */
export function normalizeZh(s: string): string {
  return s.replace(/[\s\p{P}\p{S}]/gu, "");
}

/** ¿Mi respuesta en clase es distinta de todas las correcciones del profesor? */
export function answerDiffers(mine: string | undefined, answers: string[]): boolean {
  if (!mine?.trim()) return false;
  const m = normalizeZh(mine);
  return !answers.some((a) => normalizeZh(a) === m);
}

/** Hora del archivo fuente («2026-10-07_1603.opus» → «1603»). */
export function sourceTime(pkg: Pick<ClassPackage, "source">): string | undefined {
  return (pkg.source.file.match(/_(\d{4})(?:\D|$)/) ?? pkg.source.transcript.match(/_(\d{4})(?:\D|$)/))?.[1];
}

/** Markdown legible de toda la clase (copia de exportación y texto para el buscador general de apuntes). */
export function classMarkdown(pkg: ClassPackage, exclude: ReadonlySet<string> = new Set()): string {
  const out: string[] = [`> ${pkg.summary}`];
  const vocab = pkg.vocab.filter((v) => !exclude.has(`word:${v.hanzi}`));
  if (vocab.length) out.push("## Vocabulario", ...vocab.map((v) => `- **${v.hanzi}** ${v.pinyin ?? ""} — ${v.es}`));
  const gram = pkg.grammar.filter((_, i) => !exclude.has(`grammar:${i}`));
  if (gram.length) out.push("## Estructuras", ...gram.map((g) => `### ${g.title}\n\n\`${g.pattern}\`\n\n${g.explanationEs}${g.examples.length ? `\n\n${g.examples.map((e) => `- ${e.zh} — ${e.es}`).join("\n")}` : ""}`));
  if (pkg.phrases.length) out.push("## Frases", ...pkg.phrases.map((p) => `- ${p.zh} — ${p.es}`));
  if (pkg.teacherTips.length) out.push("## Trucos del profesor", ...pkg.teacherTips.map((t) => `- ${t.text}`));
  if (pkg.myDoubts.length) out.push("## Mis dudas", ...pkg.myDoubts.map((d) => `- **${d.q}** ${d.a ?? ""}`));
  if (pkg.homework) out.push("## Deberes", pkg.homework);
  return out.join("\n\n");
}

/* ------------------------------------------------------------------ buscador */

export type ClassHitKind = "summary" | "topic" | "grammar" | "vocab" | "phrase" | "tip" | "doubt" | "exercise";

export interface ClassHit {
  noteId: string;
  classDate: string;
  title: string;
  kind: ClassHitKind;
  text: string;
  t?: number;
  clip?: string;
}

const STOP = new Set("a al como con cual cuando cuándo de del dijo donde dónde el en es explico explicó explica habló hablo la las lo los me mi para por que qué se sobre su un una vi vimos clase clases profesor profe".split(" "));

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Términos de una consulta: si lleva chino, solo los trozos en chino; si no, las palabras con contenido. */
export function queryTerms(q: string): string[] {
  const han = q.match(/[㐀-鿿]+/g);
  if (han?.length) return han;
  return fold(q)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

const KIND_RANK: Record<ClassHitKind, number> = { grammar: 0, tip: 1, exercise: 2, doubt: 3, vocab: 4, phrase: 5, topic: 6, summary: 7 };

/** Busca en todas las clases. Devuelve los fragmentos que contienen todos los términos (la gramática primero). */
export function searchClasses(classes: { noteId: string; pkg: ClassPackage }[], q: string, limit = 40): ClassHit[] {
  const terms = queryTerms(q);
  if (!terms.length) return [];
  const hits: ClassHit[] = [];
  for (const { noteId, pkg } of classes) {
    const base = { noteId, classDate: pkg.classDate, title: pkg.title };
    const push = (kind: ClassHitKind, text: string, t?: number, clip?: string) => {
      const f = fold(text);
      if (terms.every((w) => f.includes(fold(w)))) hits.push({ ...base, kind, text, t, clip });
    };
    push("summary", pkg.summary);
    for (const t of pkg.topics) push("topic", t);
    for (const g of pkg.grammar) push("grammar", `${g.title} · ${g.pattern} — ${g.explanationEs}${g.teacherSaid ? ` «${g.teacherSaid}»` : ""} ${g.examples.map((e) => e.zh).join(" ")}`, g.t, g.clip);
    for (const v of pkg.vocab) push("vocab", `${v.hanzi} ${v.pinyin ?? ""} — ${v.es}${v.example ? ` · ${v.example.zh}` : ""}`, v.t, v.clip);
    for (const p of pkg.phrases) push("phrase", `${p.zh} — ${p.es}`, p.t, p.clip);
    for (const t of pkg.teacherTips) push("tip", t.text, t.t, t.clip);
    for (const d of pkg.myDoubts) push("doubt", `${d.q} ${d.a ?? ""}`, d.t);
    for (const e of pkg.exercises) push("exercise", `${e.es} → ${e.teacherAnswer.join(" / ")}${e.explanationEs ? ` (${e.explanationEs})` : ""}`, e.t, e.clip);
  }
  return hits.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || b.classDate.localeCompare(a.classDate)).slice(0, limit);
}
