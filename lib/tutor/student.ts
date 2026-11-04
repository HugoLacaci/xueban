"use client";
/**
 * Modelo del alumno (local): palabras conocidas (mazo y FSRS), errores frecuentes (错题本), nivel, objetivos y unidad
 * actual. Se resume en el contexto del tutor; editable y desactivable desde Ajustes.
 */
import { db, knownWordSet } from "@/lib/db";
import { getActiveLang, getActivePackOrNull } from "@/lib/languages/registry";
import { useSettings } from "@/lib/settings";
import { getProgressMap, nextRecommended } from "@/lib/course/progress";
import { studentContext, type StudentModel } from "./prompts";

export async function buildStudentModel(): Promise<StudentModel & { summary: string }> {
  const lang = getActiveLang();
  const s = useSettings.getState().settings;
  const mem = s.tutorMemory ?? { notes: "", goals: "", disabled: false };
  const pack = getActivePackOrNull();
  const known = await knownWordSet(lang);
  const deck = await db.words.where("lang").equals(lang).toArray();
  const deckWords = deck.map((w) => w.hanzi);
  const errors = await db.notes.where("[lang+type]").equals([lang, "error"]).toArray();
  const byRule = new Map<string, number>();
  for (const e of errors) {
    const key = String(e.fields.ruleId || e.fields.errorType || "otro");
    byRule.set(key, (byRule.get(key) ?? 0) + Number(e.fields.times ?? 1));
  }
  const frequentErrors = Array.from(byRule.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, n]) => {
      const g = pack?.grammar.byId(k);
      return `${g ? g.title : k} (${n}×)`;
    });
  let unit: string | undefined;
  try {
    const next = nextRecommended(await getProgressMap());
    const u = next ? pack?.curriculum.unitById(next.unitId) : undefined;
    unit = u ? u.title : undefined;
  } catch {
    unit = undefined;
  }
  const levelLabel = s.langs[lang]?.level === "zero" ? "cero (empieza)" : s.langs[lang]?.level === "hsk1" ? "HSK 1 aprobado" : s.langs[lang]?.level === "hsk2" ? "HSK 2" : "principiante (prepara HSK 1)";
  const model: StudentModel = {
    level: levelLabel,
    goals: mem.goals || s.langs[lang]?.goal || "",
    unit,
    knownWords: (known.size ? Array.from(known) : deckWords).slice(0, 120),
    knownCount: known.size || deckWords.length,
    frequentErrors,
    notes: mem.notes,
  };
  const summary = mem.disabled ? "Modelo del alumno desactivado: el tutor solo sabe que eres principiante." : studentContext(model);
  return { ...model, summary };
}
