/**
 * Validación del temario v2 del chino (content/zh/curriculum) y de los apuntes vivos (content/zh/living).
 * Errores (bloquean): forma del JSON, plantilla de lección, esqueleto (huecos aún no enseñados), mínimos de
 * ejercicios, respuestas fuera de rango, secciones de apuntes vivos que apuntan a lecciones inexistentes.
 * Avisos: pinyin distinto de pinyin-pro, caracteres usados antes de enseñarse, destinos de la migración sin lección.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pinyin } from "pinyin-pro";
import type { Lesson, LessonStep, Sentence } from "../../lib/course/types";
import { checkSentence, joinZh, type SkeletonSentence } from "../../lib/course/skeleton";
import { LESSON_MAP } from "../../lib/course/migration";
import { checkLivingNotes, type LivingNote } from "../../lib/notes/living-model";
import { syllablesOf } from "../../lib/languages/zh/pinyin/tones";
import { zhSentenceIssue } from "./zh.check";

export interface CurriculumIssue {
  level: "error" | "warn";
  where: string;
  msg: string;
}

/** Plantilla (docs/TEMARIO.md §6): pasos obligatorios en este orden relativo (puede haber otros intercalados). */
export const TEMPLATE_A: LessonStep["type"][] = [
  "objective",
  "vocab",
  "phonetics-drill",
  "char-of-day",
  "skeleton",
  "dialogue",
  "exercises",
  "sentence-builder",
  "listen-speak",
  "reading",
  "notes-growth",
];
export const TEMPLATE_E0: LessonStep["type"][] = [
  "objective",
  "vocab",
  "phonetics-drill",
  "char-of-day",
  "exercises",
  "listen-speak",
  "notes-growth",
];

const HAN = /[一-鿿]/;
const NAMES = [
  "雨果",
  "安娜",
  "王明",
  "李老师",
  "大卫",
  "小李",
  "小王",
  "李",
  "王",
  "明",
  "安",
  "娜",
  "张",
  "刘",
  "陈",
  "滴滴",
  "微信",
  "支付宝",
  "淘宝",
  "抖音",
  "上海",
  "北京",
  "西安",
  "西班牙",
  "中国",
  "马德里",
  "巴塞罗那",
  "交通大学",
  "上海交通大学",
];

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ü/g, "v");
/** Lecturas válidas que pinyin-pro no siempre elige (polifonía, variantes, tono de la partícula). */
const ALT: Record<string, string[]> = {
  谁: ["shéi", "shuí"],
  数: ["shǔ", "shù"],
  喂: ["wéi", "wèi"],
  好: ["hǎo", "hào"],
  漂: ["piào", "piāo", "piǎo"],
  重: ["zhòng", "chóng"],
  假: ["jià", "jiǎ"],
  还: ["hái", "huán"],
  了: ["le", "liǎo"],
  饭: ["fàn"],
  得: ["de", "dé", "děi"],
  地: ["de", "dì"],
  着: ["zhe", "zháo", "zhuó"],
  长: ["cháng", "zhǎng"],
  行: ["xíng", "háng"],
  觉: ["jué", "jiào"],
  都: ["dōu", "dū"],
  和: ["hé", "huo", "hú", "huó"],
  为: ["wèi", "wéi"],
  只: ["zhǐ", "zhī"],
  便: ["pián", "biàn"],
  教: ["jiāo", "jiào"],
  少: ["shǎo", "shào"],
  当: ["dāng", "dàng"],
  差: ["chà", "chā", "chāi"],
  种: ["zhǒng", "zhòng"],
  空: ["kōng", "kòng"],
  乐: ["lè", "yuè"],
  干: ["gàn", "gān"],
  发: ["fā", "fà"],
  头: ["tóu", "tou"],
};

/** Compara el pinyin escrito con pinyin-pro sílaba a sílaba (sin contar mayúsculas, espacios ni puntuación). */
export function pinyinMismatch(zh: string, py: string): string | null {
  // 不 / 一 sueltos (p. ej. en un hueco del esqueleto): su tono depende de la sílaba siguiente
  if (/^[不一]$/.test(zh.replace(/[^一-鿿]/g, ""))) return null;
  const mine = syllablesOf(py.toLowerCase());
  const hz = Array.from(zh.replace(/[^一-鿿〇]/g, ""));
  const ref = pinyin(hz.join("").replace(/〇/g, "零"), { type: "array", toneSandhi: true });
  if (mine.length !== ref.length) return null; // lo cuenta zhSentenceIssue
  // mismas letras y tildes aunque el troceador haya partido distinto (fàn|guǎn frente a fàng|uǎn)
  if (mine.join("") === ref.join("")) return null;
  const diffs: string[] = [];
  mine.forEach((s, i) => {
    const r = ref[i];
    if (s === r) return;
    if (hz[i] === "一" || hz[i] === "不") return; // su tono depende del contexto (yī/yí/yì, bù/bú)
    if (ALT[hz[i]]?.some((a) => strip(a) === strip(s))) return;
    // tono neutro (sin marca) frente a tono pleno: aviso suave solo si cambia la sílaba
    if (strip(s) !== strip(r)) diffs.push(`${s}≠${r}`);
    else if (/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(s)) diffs.push(`${s}≠${r}`);
  });
  return diffs.length ? `«${zh}»: ${diffs.slice(0, 4).join(", ")}` : null;
}

function sentencesOfStep(st: LessonStep): { s: Sentence | null; sk?: SkeletonSentence }[] {
  switch (st.type) {
    case "dialogue":
      return st.lines.map((s) => ({ s }));
    case "objective":
      return st.canSay.map((s) => ({ s }));
    case "listen-speak":
      return [
        ...st.shadowing.map((s) => ({ s })),
        ...(st.respond ?? []).flatMap((r) => [{ s: r.q }, { s: r.model }]),
      ];
    case "skeleton":
      return [...st.sentences, ...(st.negative ?? []), ...(st.question ?? [])].map((sk) => ({
        s: null,
        sk,
      }));
    case "sentence-builder":
      return st.items.map((it) => ({ s: null, sk: it.sentence }));
    default:
      return [];
  }
}

export function checkCurriculum(root: string): {
  issues: CurriculumIssue[];
  summary: string;
  lessonIds: Set<string>;
} {
  const issues: CurriculumIssue[] = [];
  const err = (where: string, msg: string) =>
    issues.push({ level: "error", where: `zh/curriculum/${where}`, msg });
  const warn = (where: string, msg: string) =>
    issues.push({ level: "warn", where: `zh/curriculum/${where}`, msg });
  const dir = path.join(root, "content", "zh", "curriculum");
  const lessonIds = new Set<string>();
  if (!existsSync(path.join(dir, "units.json")))
    return { issues, summary: "sin temario v2", lessonIds };
  const units = JSON.parse(readFileSync(path.join(dir, "units.json"), "utf8")) as { id: string }[];
  const unitIds = new Set(units.map((u) => u.id));
  const files = existsSync(path.join(dir, "lessons"))
    ? readdirSync(path.join(dir, "lessons")).filter((f) => f.endsWith(".json"))
    : [];
  const lessons: Lesson[] = [];
  for (const f of files) {
    try {
      const l = JSON.parse(readFileSync(path.join(dir, "lessons", f), "utf8")) as Lesson;
      if (l.id !== f.replace(/\.json$/, ""))
        err(f, `id «${l.id}» no coincide con el nombre del archivo`);
      lessons.push(l);
      lessonIds.add(l.id);
    } catch (e) {
      err(f, `JSON inválido: ${(e as Error).message}`);
    }
  }
  // orden del temario para el vocabulario controlado
  const rank = (id: string) => {
    const m = id.match(/^(e0|a1|a2|b1)-(?:u(\d+)-l(\d+)|(\d+|cp))$/);
    if (!m) return 1e9;
    const stage = { e0: 0, a1: 1, a2: 2, b1: 3 }[m[1] as "e0"] * 1e6;
    if (m[4]) return stage + (m[4] === "cp" ? 99 : Number(m[4]));
    return stage + Number(m[2]) * 100 + Number(m[3]);
  };
  lessons.sort((a, b) => rank(a.id) - rank(b.id));
  const known = new Set<string>(NAMES.flatMap((n) => Array.from(n)));
  let nEx = 0;
  for (const l of lessons) {
    const w = l.id;
    const unit = l.id.startsWith("e0-") ? "e0" : l.id.replace(/-l\d+$/, "");
    if (!unitIds.has(unit)) err(w, `unidad «${unit}» no está en units.json`);
    if (!l.title || !l.goal) err(w, "falta título u objetivo");
    if (!(l.minutes >= 8 && l.minutes <= 20)) warn(w, `duración ${l.minutes} min (objetivo 10–15)`);
    if (l.reviewed !== false) warn(w, "reviewed debería ser false hasta validarlo con el profesor");
    const isCp = /-cp$/.test(l.id);
    const isE0 = l.id.startsWith("e0-");
    const nVocab = l.vocab?.length ?? 0;
    if (!isCp) {
      if (isE0 && (nVocab < 5 || nVocab > 10))
        err(w, `vocabulario: ${nVocab} palabras (Etapa 0: 5–8)`);
      if (!isE0 && (nVocab < 8 || nVocab > 14)) err(w, `vocabulario: ${nVocab} palabras (8–14)`);
      // plantilla
      const tpl = isE0 ? TEMPLATE_E0 : TEMPLATE_A;
      const types = l.steps.map((s) => s.type);
      let pos = -1;
      for (const t of tpl) {
        const at = types.indexOf(t, pos + 1);
        if (at < 0)
          err(w, types.includes(t) ? `paso «${t}» fuera de orden` : `falta el paso «${t}»`);
        else pos = at;
      }
    }
    const vocabSet = new Set(l.vocab.map((v) => v.hanzi));
    for (const v of l.vocab) {
      if (!HAN.test(v.hanzi) || !v.pinyin || !v.es)
        err(w, `palabra incompleta: ${JSON.stringify(v)}`);
      const z = pinyinMismatch(v.hanzi, v.pinyin);
      if (z) warn(w, `pinyin de palabra ${z}`);
    }
    const lessonChars = new Set<string>([...known, ...l.vocab.flatMap((v) => Array.from(v.hanzi))]);
    for (const st of l.steps) {
      if (st.type === "vocab")
        for (const x of st.words)
          if (!vocabSet.has(x)) err(w, `vocab: «${x}» no está en lesson.vocab`);
      if (st.type === "exercises") {
        nEx += st.count ?? 0;
        if (!isCp && !isE0 && (st.count ?? 0) < 12)
          err(w, `ejercicios: ${st.count ?? 0} (mínimo 12)`);
        if (isE0 && (st.count ?? 0) < 8)
          err(w, `ejercicios: ${st.count ?? 0} (mínimo 8 en la Etapa 0)`);
      }
      if (st.type === "phonetics-drill") {
        if (st.items.length < 3) err(w, "pronunciación: mínimo 3 ítems");
        for (const it of st.items)
          if (it.answer < 0 || it.answer >= it.options.length)
            err(w, `pronunciación: respuesta fuera de rango (${it.audio})`);
      }
      if (st.type === "char-of-day" && (!st.chars.length || st.chars.some((c) => !HAN.test(c))))
        err(w, "carácter del día vacío o no chino");
      if (st.type === "skeleton") {
        const n = st.sentences.length + (st.negative?.length ?? 0) + (st.question?.length ?? 0);
        if (n < 6) err(w, `esqueleto «${st.title}»: ${n} ejemplos (mínimo 6)`);
        if (!st.negative?.length) err(w, `esqueleto «${st.title}»: falta la negativa`);
        if (!st.question?.length) err(w, `esqueleto «${st.title}»: falta la pregunta`);
        if (!st.mistakes?.length) warn(w, `esqueleto «${st.title}»: sin errores típicos`);
        if (!st.focus.length) err(w, `esqueleto «${st.title}»: sin hueco resaltado (focus)`);
      }
      if (st.type === "sentence-builder" && st.items.length < 3)
        err(w, "Construye la frase: mínimo 3 frases");
      if (st.type === "reading")
        for (const q of st.questions)
          if (q.answer < 0 || q.answer >= q.options.length)
            err(w, `lectura: respuesta fuera de rango (${q.q})`);
      for (const { s, sk } of sentencesOfStep(st)) {
        if (sk) {
          for (const p of checkSentence(sk, { at: l.id }))
            err(w, `[${st.type}] «${joinZh(sk)}»: ${p}`);
          for (const f of Object.values(sk.slots))
            if (f?.py) {
              const z = zhSentenceIssue(f.zh, f.py) ?? pinyinMismatch(f.zh, f.py);
              if (z) warn(w, `[${st.type}] ${z}`);
            }
        }
        const zh = s?.zh ?? (sk ? joinZh(sk) : "");
        if (s) {
          const z = zhSentenceIssue(s.zh, s.py) ?? (s.py ? pinyinMismatch(s.zh, s.py) : null);
          if (z) warn(w, `[${st.type}] ${z}`);
        }
        const unseen = Array.from(
          new Set(Array.from(zh).filter((c) => HAN.test(c) && !lessonChars.has(c))),
        );
        if (unseen.length)
          warn(w, `[${st.type}] caracteres aún no vistos en «${zh}»: ${unseen.join("")}`);
      }
    }
    for (const c of lessonChars) known.add(c);
  }
  // destinos de la migración
  const missingTargets = Array.from(new Set(Object.values(LESSON_MAP).flat())).filter(
    (id) => !lessonIds.has(id),
  );
  if (lessons.length && missingTargets.length)
    warn(
      "migración",
      `${missingTargets.length} lecciones de destino aún sin escribir: ${missingTargets.slice(0, 12).join(", ")}${missingTargets.length > 12 ? "…" : ""}`,
    );
  // apuntes vivos
  const livingDir = path.join(root, "content", "zh", "living");
  let nLiving = 0;
  if (existsSync(livingDir)) {
    const notes = readdirSync(livingDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(path.join(livingDir, f), "utf8")) as LivingNote);
    nLiving = notes.length;
    for (const p of checkLivingNotes(notes, lessonIds))
      issues.push({ level: "error", where: "zh/living", msg: p });
    for (const n of notes)
      for (const s of n.sections)
        for (const sk of s.skeleton?.sentences ?? [])
          for (const p of checkSentence(sk, { at: s.unlockedBy }))
            issues.push({
              level: "error",
              where: `zh/living/${n.id}/${s.id}`,
              msg: `«${joinZh(sk)}»: ${p}`,
            });
  }
  const done = units.filter((u) =>
    lessons.some((l) => (l.id.startsWith("e0-") ? "e0" : l.id.replace(/-l\d+$/, "")) === u.id),
  ).length;
  return {
    issues,
    lessonIds,
    summary: `${lessons.length} lecciones en ${done}/${units.length} unidades · ${nEx} ejercicios programados · ${nLiving} apuntes vivos`,
  };
}
