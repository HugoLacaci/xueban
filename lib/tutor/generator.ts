"use client";
/**
 * Generador de ejercicios del tutor: pide JSON al modelo, lo valida con zod y con el validador de contenido
 * (hanzi presentes, pinyin calculado por la app, vocabulario dentro del nivel o de la semilla) y lo convierte
 * en ejercicios del motor. Lo que no cumple se descarta y se explica.
 */
import { z } from "zod";
import { useSettings } from "@/lib/settings";
import { getActivePack } from "@/lib/languages/registry";
import { lookupFirst } from "@/lib/dictionary/service";
import { useKnowledge } from "@/lib/knowledge";
import type { Exercise } from "@/lib/exercises/types";
import { shuffle } from "@/lib/utils";
import { chat, extractJson } from "./providers";
import { generatorPrompt } from "./prompts";
import { buildStudentModel } from "./student";

const Item = z.discriminatedUnion("type", [
  z.object({ type: z.literal("fill-blank"), zh: z.string(), answer: z.string(), options: z.array(z.string()).min(2).max(5), es: z.string().optional(), explain: z.string().optional() }),
  z.object({ type: z.literal("translate-free"), es: z.string(), answers: z.array(z.string()).min(1).max(4), explain: z.string().optional() }),
  z.object({ type: z.literal("order-words"), zh: z.string(), es: z.string().optional(), explain: z.string().optional() }),
]);
const Items = z.array(Item).min(1).max(12);

const HAN = /[㐀-鿿]/;

/** Valida vocabulario: cada carácter debe estar en el diccionario y (aviso) en el nivel ≤ 3 o en el mazo. */
function vocabIssue(zh: string): string | null {
  const deck = useKnowledge.getState().deck;
  const pack = getActivePack();
  const words = pack.segment(zh.replace(/[＿，。！？、]/g, ""));
  for (const w of words) {
    if (!HAN.test(w)) continue;
    if (deck.has(w)) continue;
    const e = lookupFirst(w);
    if (!e) return `«${w}» no está en el diccionario`;
    if (e.hsk && e.hsk > 3) return `«${w}» es HSK ${e.hsk} (demasiado alto)`;
  }
  return null;
}

export async function generateExercises(source: string): Promise<{ exercises: Exercise[]; rejected: string[] }> {
  const t = useSettings.getState().settings.tutor;
  const student = (await buildStudentModel()).summary;
  const r = await chat(t, [{ role: "system", content: generatorPrompt(student, source, "mezcla") }, { role: "user", content: "Genera los ejercicios en JSON." }], { json: true, temperature: 0.5, maxTokens: 1500 });
  let raw: unknown;
  try {
    raw = extractJson(r.text);
  } catch {
    // puede ser un array suelto
    const m = r.text.match(/\[[\s\S]*\]/);
    raw = m ? JSON.parse(m[0]) : [];
  }
  const arr = Array.isArray(raw) ? raw : (raw as { exercises?: unknown[]; items?: unknown[] }).exercises ?? (raw as { items?: unknown[] }).items ?? [];
  const parsed = Items.safeParse(arr);
  if (!parsed.success) return { exercises: [], rejected: [`JSON inválido: ${parsed.error.issues[0]?.message ?? "forma desconocida"}`] };
  const pack = getActivePack();
  const out: Exercise[] = [];
  const rejected: string[] = [];
  parsed.data.forEach((it, i) => {
    const id = `tutor-${Date.now().toString(36)}-${i}`;
    if (it.type === "fill-blank") {
      if (!it.zh.includes("＿") && !it.zh.includes("__")) return rejected.push(`hueco sin ＿: ${it.zh}`);
      const zh = it.zh.replace(/_{2,}/g, "＿＿");
      if (!it.options.includes(it.answer)) it.options.push(it.answer);
      const v = vocabIssue(zh.replace(/＿+/, it.answer));
      if (v) return rejected.push(v);
      out.push({ id, type: "fill-blank", skill: "grammar", itemId: id, itemKind: "sentence", prompt: "Elige la palabra que completa la frase", zh, answer: it.answer, options: shuffle(it.options), es: it.es ?? "", pinyin: pack.reading(zh.replace(/＿+/, it.answer)), explain: it.explain });
    } else if (it.type === "translate-free") {
      const bad = it.answers.map(vocabIssue).find(Boolean);
      if (bad) return rejected.push(bad);
      out.push({ id, type: "translate-free", skill: "writing", itemId: id, itemKind: "sentence", prompt: "Traduce al chino", es: it.es, answers: it.answers, pinyin: pack.reading(it.answers[0]), explain: it.explain });
    } else {
      const v = vocabIssue(it.zh);
      if (v) return rejected.push(v);
      const tiles = pack.exerciseAdapters.tiles(it.zh.replace(/[，。！？、]/g, ""));
      if (tiles.length < 3) return rejected.push(`frase demasiado corta: ${it.zh}`);
      let sh = shuffle(tiles);
      if (sh.join("") === tiles.join("")) sh = [...sh.slice(1), sh[0]];
      out.push({ id, type: "order-words", skill: "grammar", itemId: id, itemKind: "sentence", prompt: "Ordena las fichas", tiles: sh, answer: tiles, zh: it.zh, es: it.es ?? "", pinyin: pack.reading(it.zh), explain: it.explain });
    }
  });
  return { exercises: out, rejected };
}
