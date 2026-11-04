"use client";
/**
 * Capa 4 del motor de corrección: el tutor IA recibe la frase en español, la respuesta, las referencias y los
 * resultados de las capas 1–3, y devuelve JSON validado con zod. El pinyin nunca se toma del modelo (lo calcula la app).
 */
import { z } from "zod";
import { useSettings } from "@/lib/settings";
import type { CorrectionInput, CorrectionReport } from "@/lib/correction/types";
import { chat, extractJson, tutorConfigured } from "./providers";
import { PEDAGOGY } from "./prompts";

export const TutorCorrectionSchema = z.object({
  verdict: z.enum(["correct", "improvable", "wrong"]).optional(),
  score: z.number().min(0).max(100).optional(),
  corrected: z.string().optional(),
  alternatives: z
    .array(z.object({ zh: z.string(), es_literal: z.string().optional(), es: z.string().optional(), register: z.enum(["neutral", "colloquial", "formal"]).default("neutral"), note: z.string().optional() }))
    .max(5)
    .default([]),
  errors: z
    .array(z.object({ span: z.string().optional(), type: z.enum(["missing", "extra", "order", "char", "tone", "word", "grammar"]).default("word"), explanation_es: z.string(), rule_id: z.string().optional(), severity: z.enum(["error", "warn"]).optional() }))
    .max(8)
    .default([]),
  tip: z.string().optional(),
  extra_practice: z.array(z.object({ es: z.string(), zh: z.string() })).max(3).default([]),
});
export type TutorCorrection = z.infer<typeof TutorCorrectionSchema>;

export function buildCorrectorPrompt(input: CorrectionInput, partial: CorrectionReport): { system: string; user: string } {
  const system = `${PEDAGOGY}

Tarea: corregir una traducción del español al chino (nivel HSK 1–2). Devuelve SOLO un objeto JSON con esta forma exacta:
{"verdict":"correct|improvable|wrong","score":0-100,"corrected":"frase correcta en chino simplificado","alternatives":[{"zh":"…","es_literal":"traducción literal","es":"traducción natural","register":"neutral|colloquial|formal","note":"matiz"}],"errors":[{"span":"texto afectado tal como lo escribió el alumno","type":"missing|extra|order|char|tone|word|grammar","explanation_es":"explicación sencilla en español","rule_id":"id de regla si coincide","severity":"error|warn"}],"tip":"truco para no repetirlo","extra_practice":[{"es":"…","zh":"…"}]}
Reglas: no incluyas pinyin (lo calcula la app). Si el profesor ha dado una respuesta de referencia, respétala como forma correcta principal. No inventes reglas: si dudas, dilo en «note». 2–4 alternativas con registro distinto cuando existan. Explicaciones en español de España, cortas.`;
  const user = `Frase en español: «${input.es}»
Respuesta del alumno (${input.mode ?? "hanzi"}): «${input.answer}»${partial.answer && partial.answer !== input.answer ? ` (normalizada: «${partial.answer}»)` : ""}
Referencias del profesor: ${input.references?.length ? input.references.map((r) => `«${r}»`).join(" · ") : "ninguna"}
${input.hint ? `Pista del ejercicio: ${input.hint}\n` : ""}Resultado de las reglas verificadas (capas 1–3), que prevalecen sobre tu opinión:
- veredicto provisional: ${partial.verdict}, nota ${partial.score}
- errores detectados: ${partial.errors.length ? partial.errors.map((e) => `[${e.type}${e.ruleId ? `:${e.ruleId}` : ""}] ${e.explanation}`).join(" | ") : "ninguno"}
Devuelve el JSON.`;
  return { system, user };
}

/** Convierte la salida validada del modelo a la forma parcial de CorrectionReport. */
export function toPartialReport(t: TutorCorrection): Partial<CorrectionReport> {
  return {
    verdict: t.verdict,
    score: t.score,
    corrected: t.corrected,
    alternatives: t.alternatives.map((a) => ({ zh: a.zh, es_literal: a.es_literal, es: a.es, register: a.register, note: a.note })),
    errors: t.errors.map((e) => ({ type: e.type, span: e.span ? { from: 0, to: 0, text: e.span } : undefined, explanation: e.explanation_es, ruleId: e.rule_id, severity: e.severity ?? "error", source: "tutor" as const })),
    tip: t.tip,
    extraPractice: t.extra_practice.map((x) => ({ es: x.es, zh: x.zh })),
  };
}

/** Función de capa 4 para lib/correction (inyectable; devuelve null si el tutor no está configurado o falla). */
export async function tutorCorrector(input: CorrectionInput, partial: CorrectionReport): Promise<Partial<CorrectionReport> | null> {
  const t = useSettings.getState().settings.tutor;
  if (!tutorConfigured(t) || !t.correct) return null;
  const { system, user } = buildCorrectorPrompt(input, partial);
  const r = await chat(t, [{ role: "system", content: system }, { role: "user", content: user }], { json: true, temperature: 0.2, maxTokens: 900 });
  const parsed = TutorCorrectionSchema.safeParse(extractJson(r.text));
  if (!parsed.success) throw new Error(`JSON del tutor inválido: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`);
  return toPartialReport(parsed.data);
}
