"use client";
/**
 * Sesiones «tipo Duolingo» a partir de los bancos: 12–20 ejercicios mezclados, dificultad adaptativa (los ítems
 * fallados vuelven más; las rachas de aciertos suben el nivel), sin vidas, y repaso final de los fallos.
 */
import { db } from "@/lib/db";
import { getActiveLang } from "@/lib/languages/registry";
import { seededRandom, shuffle } from "@/lib/utils";
import { bankItemToExercises, GRAMMAR_BANKS, LISTENING_BANK_TYPES, loadBank, loadUnitBank, SPEAKING_BANK_TYPES, UNIT_BANKS, type Bank, type BankItem } from "./bank";
import type { Exercise, ExerciseType } from "./types";
import { bankTypeToEngine } from "./bank";

export interface BankSessionOptions {
  /** Fuente: unidades, puntos de gramática o todo */
  units?: string[];
  grammarIds?: string[];
  /** Filtro por tipos del banco (p. ej. solo listening) */
  bankTypes?: string[];
  engineTypes?: ExerciseType[];
  count?: number;
  seed?: number;
  /** Nivel máximo (1–3); se eleva con las rachas */
  maxLevel?: number;
  /** Solo ítems fallados antes */
  mistakesOnly?: boolean;
  speechAvailable?: boolean;
}

interface Weighted {
  item: BankItem;
  bank: Bank;
  weight: number;
}

/** Peso por historial: fallos recientes ×3, nunca intentado ×1.5, acertado recientemente ×0.4. */
async function weightsFor(items: { item: BankItem; bank: Bank }[]): Promise<Weighted[]> {
  const lang = getActiveLang();
  const recent = await db.exerciseAttempts.where("[lang+at]").between([lang, Date.now() - 30 * 86400000], [lang, Infinity]).toArray();
  const byItem = new Map<string, { ok: number; fail: number; last: number; lastOk: boolean }>();
  for (const a of recent) {
    const cur = byItem.get(a.itemId) ?? { ok: 0, fail: 0, last: 0, lastOk: false };
    if (a.correct) cur.ok++;
    else cur.fail++;
    if (a.at > cur.last) {
      cur.last = a.at;
      cur.lastOk = a.correct;
    }
    byItem.set(a.itemId, cur);
  }
  return items.map(({ item, bank }) => {
    const h = byItem.get(item.id);
    let w = 1;
    if (!h) w = 1.5;
    else if (h.fail > 0 && !h.lastOk) w = 3 + h.fail * 0.5;
    else if (h.lastOk && Date.now() - h.last < 2 * 86400000) w = 0.4;
    else w = 1;
    return { item, bank, weight: w };
  });
}

function pickWeighted(list: Weighted[], n: number, rng: () => number): Weighted[] {
  const pool = list.slice();
  const out: Weighted[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((a, x) => a + x.weight, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx].weight;
      if (r <= 0) break;
    }
    out.push(...pool.splice(Math.min(idx, pool.length - 1), 1));
  }
  return out;
}

/** Nivel actual del alumno por racha: 10 aciertos seguidos en los últimos intentos suben un nivel (máx. 3). */
export async function currentLevel(): Promise<number> {
  const lang = getActiveLang();
  const last = await db.exerciseAttempts.where("[lang+at]").between([lang, 0], [lang, Infinity]).reverse().limit(40).toArray();
  let streak = 0;
  for (const a of last) {
    if (a.correct) streak++;
    else break;
  }
  const accuracy = last.length ? last.filter((a) => a.correct).length / last.length : 0;
  if (streak >= 10 || (last.length >= 30 && accuracy >= 0.85)) return 3;
  if (streak >= 5 || (last.length >= 15 && accuracy >= 0.7)) return 2;
  return 1;
}

export async function loadBanksFor(opts: BankSessionOptions): Promise<Bank[]> {
  const ids: string[] = [];
  const units: string[] = [];
  if (opts.units?.length) units.push(...opts.units.map((u) => (u.startsWith("u0-") ? "u0" : u)));
  if (opts.grammarIds?.length) ids.push(...opts.grammarIds.map((g) => `g-${g}`));
  if (!ids.length && !units.length) ids.push(...UNIT_BANKS, "a1-u04", "a1-u08");
  // unidades del temario v2: banco propio o, si no existe, el antiguo equivalente
  const banks = await Promise.all([...Array.from(new Set(ids)).map(loadBank), ...Array.from(new Set(units)).map(loadUnitBank)]);
  return banks.filter((b): b is Bank => Boolean(b));
}

/** Construye una sesión adaptativa. Devuelve [] si no hay bancos. */
export async function bankSession(opts: BankSessionOptions = {}): Promise<Exercise[]> {
  const rng = seededRandom((opts.seed ?? Date.now()) % 2147483647);
  const banks = await loadBanksFor(opts);
  if (!banks.length) return [];
  const level = opts.maxLevel ?? (await currentLevel());
  let items = banks.flatMap((bank) => bank.items.map((item) => ({ item, bank })));
  if (opts.bankTypes?.length) items = items.filter((x) => opts.bankTypes!.includes(x.item.type));
  if (opts.engineTypes?.length) items = items.filter((x) => opts.engineTypes!.includes(bankTypeToEngine(x.item.type) as ExerciseType));
  if (opts.speechAvailable === false) items = items.filter((x) => !SPEAKING_BANK_TYPES.includes(x.item.type));
  items = items.filter((x) => (x.item.level ?? 1) <= level);
  if (opts.mistakesOnly) {
    const lang = getActiveLang();
    const failed = new Set((await db.exerciseAttempts.where("lang").equals(lang).filter((a) => !a.correct).toArray()).map((a) => a.itemId));
    items = items.filter((x) => failed.has(x.item.id));
  }
  if (!items.length) return [];
  const weighted = await weightsFor(items);
  const count = opts.count ?? 15;
  const picked = pickWeighted(weighted, count * 2, rng);
  // mezcla de tipos: nunca dos iguales seguidos si se puede
  const exercises: Exercise[] = [];
  const seenTypes: string[] = [];
  for (const w of picked) {
    const exs = bankItemToExercises(w.item, w.bank, rng).filter((e) => !(e as { needsTiles?: boolean }).needsTiles);
    if (!exs.length) continue;
    const e = exs[0];
    if (seenTypes[seenTypes.length - 1] === e.type && picked.length > count) continue;
    exercises.push(e);
    seenTypes.push(e.type);
    if (exercises.length >= count) break;
  }
  return exercises;
}

/** Tipos de banco disponibles (para el selector «por tipo»). */
export const BANK_TYPE_GROUPS: { id: string; label: string; types: string[] }[] = [
  { id: "listening", label: "Escuchar", types: LISTENING_BANK_TYPES },
  { id: "speaking", label: "Hablar", types: SPEAKING_BANK_TYPES },
  { id: "dialogue", label: "Diálogos", types: ["dialogue-complete", "dialogue-order", "dialogue-who", "situation"] },
  { id: "grammar", label: "Gramática", types: ["find-error", "transform", "build-question", "fill-blank", "order-words", "cloze"] },
  { id: "translate", label: "Traducir", types: ["translate-bank", "translate-free"] },
  { id: "reading", label: "Leer", types: ["reading", "choose-meaning", "choose-character", "matching"] },
  { id: "characters", label: "Caracteres", types: ["build-character", "radical-meaning", "pinyin-input"] },
  { id: "speed", label: "Velocidad", types: ["speed-pinyin-hanzi", "speed-match"] },
  { id: "tones", label: "Tonos", types: ["tone-pair", "tone-sandhi", "dictation-pinyin"] },
];

export { UNIT_BANKS, GRAMMAR_BANKS };
