/**
 * Simulacro a partir de un banco de preguntas (content/{lang}/exam.json): elige al azar las preguntas
 * de cada sección respetando el número oficial de preguntas y las agrupa por partes (mondai / 유형).
 */
import type { ExamSection, ExamSectionDef } from "@/lib/languages/types";
import type { MultipleChoiceExercise } from "@/lib/exercises/types";
import { seededRandom, shuffle } from "@/lib/utils";

export interface BankQuestion {
  id?: string;
  part: string;
  prompt: string;
  text?: string;
  lines?: { s: string; t: string }[];
  options: string[];
  answer: number;
  es?: string;
  explain?: string;
}

export interface SectionPlan {
  def: ExamSectionDef;
  /** claves del banco que alimentan la sección (p. ej. ["vocab"] o ["grammar","reading"]) */
  banks: string[];
  skill: "listening" | "reading";
  /** número de preguntas de cada banco (si no, reparto proporcional hasta def.questions) */
  take?: Record<string, number>;
}

export function buildFromBank(bank: Record<string, unknown[]>, plans: SectionPlan[], seed: number): ExamSection[] {
  const rng = seededRandom(seed);
  let n = 0;
  return plans.map((plan) => {
    const pools = plan.banks.map((b) => ({ b, qs: shuffle((bank[b] ?? []) as BankQuestion[], rng) }));
    const total = plan.def.questions;
    const chosen: BankQuestion[] = [];
    for (const { b, qs } of pools) {
      const want = plan.take?.[b] ?? Math.ceil(total / pools.length);
      chosen.push(...qs.slice(0, want));
    }
    const qs = chosen.slice(0, total);
    const byPart = new Map<string, MultipleChoiceExercise[]>();
    for (const q of qs) {
      const listening = plan.skill === "listening";
      const audio = q.lines?.length ? q.lines.map((l) => l.t).join("　") : listening ? q.text : undefined;
      const ex: MultipleChoiceExercise = {
        id: `exam-${plan.def.id}-${n++}`,
        type: listening ? "listen-choose" : "comprehension",
        skill: plan.skill,
        itemId: q.id ?? `${plan.def.id}-${n}`,
        itemKind: "sentence",
        prompt: q.prompt,
        display: listening ? { audio } : q.text ? { dialogue: [{ zh: q.text, es: q.es ?? "" }] } : {},
        options: q.options.map((o) => ({ text: o, zh: /[぀-ヿ一-鿿가-힯]/.test(o) })),
        answer: q.answer,
        explain: [q.explain, listening && q.lines ? `Guion: ${q.lines.map((l) => `${l.s}: ${l.t}`).join(" / ")}` : "", q.es && listening ? `(${q.es})` : ""].filter(Boolean).join(" "),
      };
      const arr = byPart.get(q.part) ?? [];
      arr.push(ex);
      byPart.set(q.part, arr);
    }
    const parts = Array.from(byPart.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "ja"))
      .map(([name, exercises]) => ({ name, exercises }));
    return { id: plan.def.id, name: plan.def.name, native: plan.def.native, minutes: plan.def.minutes, parts };
  });
}
