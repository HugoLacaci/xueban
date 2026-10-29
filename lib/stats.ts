"use client";
import { db, todayKey, type DailyStat, type Lang } from "@/lib/db";
import { getActiveLang } from "@/lib/languages/registry";
import { LANGS } from "@/lib/languages/registry";

export interface TodaySummary {
  lang: Lang;
  dueCards: number;
  newAvailable: number;
  wordsTotal: number;
  wordsKnown: number;
  wordsLearning: number;
  charsKnown: number;
  minutesToday: number;
  minutesWeek: number;
  streak: number;
  reviewsToday: number;
  daily: DailyStat[];
}

function streakOf(byDate: Map<string, { minutes: number; reviews: number; exercises: number; newWords: number }>): number {
  let streak = 0;
  const d = new Date();
  const active = (k: string) => {
    const s = byDate.get(k);
    return Boolean(s && (s.minutes > 0 || s.reviews > 0 || s.exercises > 0 || s.newWords > 0));
  };
  if (!active(todayKey(d))) d.setDate(d.getDate() - 1);
  while (active(todayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Suma estadísticas diarias por fecha (para la racha global). */
function mergeDaily(rows: DailyStat[]): Map<string, { minutes: number; reviews: number; exercises: number; newWords: number }> {
  const m = new Map<string, { minutes: number; reviews: number; exercises: number; newWords: number }>();
  for (const r of rows) {
    const cur = m.get(r.date) ?? { minutes: 0, reviews: 0, exercises: 0, newWords: 0 };
    cur.minutes += r.minutes;
    cur.reviews += r.reviews;
    cur.exercises += r.exercises;
    cur.newWords += r.newWords;
    m.set(r.date, cur);
  }
  return m;
}

export async function todaySummary(lang: Lang = getActiveLang()): Promise<TodaySummary> {
  const now = Date.now();
  const [cards, words, chars, daily] = await Promise.all([
    db.cards.where("lang").equals(lang).toArray(),
    db.words.where("lang").equals(lang).count(),
    db.charStates.where("lang").equals(lang).filter((c) => c.known).count(),
    db.daily.where("lang").equals(lang).toArray(),
  ]);
  let due = 0;
  let newAvail = 0;
  const known = new Set<string>();
  const learning = new Set<string>();
  for (const c of cards) {
    if (c.suspended) continue;
    if (c.state === 0) newAvail++;
    else if (c.due <= now) due++;
    if (c.state === 2 && c.stability >= 1) known.add(c.wordId);
    else if (c.reps > 0) learning.add(c.wordId);
  }
  for (const w of learning) if (known.has(w)) learning.delete(w);
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const today = todayKey();
  const minutesToday = byDate.get(today)?.minutes ?? 0;
  let minutesWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    minutesWeek += byDate.get(todayKey(d))?.minutes ?? 0;
  }
  const streak = streakOf(mergeDaily(daily));
  const knownChars = new Set<string>();
  const wordRows = await db.words.bulkGet(Array.from(known));
  for (const w of wordRows) if (w) for (const ch of w.hanzi) knownChars.add(ch);
  return {
    lang,
    dueCards: due,
    newAvailable: newAvail,
    wordsTotal: words,
    wordsKnown: known.size,
    wordsLearning: learning.size,
    charsKnown: Math.max(chars, knownChars.size),
    minutesToday,
    minutesWeek,
    streak,
    reviewsToday: byDate.get(today)?.reviews ?? 0,
    daily: daily.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export interface GlobalSummary {
  minutesToday: number;
  minutesTotal: number;
  streak: number;
  perLang: Record<Lang, { due: number; wordsKnown: number; wordsTotal: number; minutesWeek: number; streak: number }>;
}

/** Resumen de todos los idiomas (panel /me). */
export async function globalSummary(langs: Lang[] = LANGS): Promise<GlobalSummary> {
  const all = await db.daily.toArray();
  const merged = mergeDaily(all);
  const today = todayKey();
  const perLang = {} as GlobalSummary["perLang"];
  for (const l of langs) {
    const s = await todaySummary(l);
    perLang[l] = { due: s.dueCards, wordsKnown: s.wordsKnown, wordsTotal: s.wordsTotal, minutesWeek: s.minutesWeek, streak: s.streak };
  }
  return {
    minutesToday: merged.get(today)?.minutes ?? 0,
    minutesTotal: all.reduce((a, r) => a + r.minutes, 0),
    streak: streakOf(merged),
    perLang,
  };
}

/** Previsión de repasos en los próximos n días (idioma activo). */
export async function reviewForecast(days = 30, lang: Lang = getActiveLang()): Promise<{ date: string; count: number }[]> {
  const cards = await db.cards.where("[lang+state]").anyOf([[lang, 1], [lang, 2], [lang, 3]]).toArray();
  const out: { date: string; count: number }[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const from = d.getTime();
    const to = from + 86400000;
    const count = cards.filter((c) => (i === 0 ? c.due < to : c.due >= from && c.due < to)).length;
    out.push({ date: todayKey(d), count });
  }
  return out;
}
