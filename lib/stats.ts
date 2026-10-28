"use client";
import { db, todayKey, type DailyStat } from "@/lib/db";

export interface TodaySummary {
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

export async function todaySummary(): Promise<TodaySummary> {
  const now = Date.now();
  const [cards, words, chars, daily] = await Promise.all([db.cards.toArray(), db.words.count(), db.characters.filter((c) => c.known).count(), db.dailyStats.toArray()]);
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
  // racha: días consecutivos con actividad (hoy cuenta si hay algo; si no, se mira desde ayer)
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
  const knownChars = new Set<string>();
  const wordRows = await db.words.bulkGet(Array.from(known));
  for (const w of wordRows) if (w) for (const ch of w.hanzi) knownChars.add(ch);
  return {
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

/** Previsión de repasos en los próximos n días. */
export async function reviewForecast(days = 30): Promise<{ date: string; count: number }[]> {
  const cards = await db.cards.where("state").anyOf([1, 2, 3]).toArray();
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
