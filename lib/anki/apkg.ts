"use client";
/**
 * Exportación .apkg sin Anki (sql.js + JSZip), con el mismo modelo que Chino_HSK1_Hugo.apkg,
 * y exportación CSV. Formato: collection.anki2 (esquema legado v11) + media.
 */
import JSZip from "jszip";
import type { Word } from "@/lib/db";
import { seedCategoryNames } from "@/lib/db/repo";
import { CSS, DECK_HSK1, DECK_MINE, FIELDS, MODEL_ID, MODEL_NAME, TEMPLATES } from "./model";
import { tagsFor, wordToFields } from "./sync";

const SCHEMA = `
CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null);
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);
CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
`;

function guidFor(s: string): string {
  // mismo esquema que genanki.guid_for: sha256 → base91 de 8 bytes; aquí usamos un hash FNV-1a extendido (estable)
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 ^= s.charCodeAt(i);
    h1 = Math.imul(h1, 16777619) >>> 0;
    h2 ^= s.charCodeAt(i) * 31;
    h2 = Math.imul(h2, 2246822519) >>> 0;
  }
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~";
  let out = "";
  let n = h1 * 4294967296 + h2;
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(n % chars.length)];
    n = Math.floor(n / chars.length);
  }
  return out;
}

function checksum(s: string): number {
  // Anki usa los primeros 8 hex de sha1 del primer campo; aproximamos con FNV (solo se usa para detectar duplicados)
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function buildApkg(words: Word[]): Promise<Blob> {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({ locateFile: (f: string) => `/${f}` });
  const sqldb = new SQL.Database();
  sqldb.run(SCHEMA);
  const now = Math.floor(Date.now() / 1000);
  const names = seedCategoryNames();
  const deckNames = new Map<string, number>();
  const deckIdFor = (w: Word) => {
    const idx = names.indexOf(w.category);
    const name = w.source === "seed" && idx >= 0 ? `${DECK_HSK1}::${String(idx + 1).padStart(2, "0")} ${w.category}` : DECK_MINE;
    if (!deckNames.has(name)) deckNames.set(name, 1782026200 + deckNames.size + 1);
    return deckNames.get(name)!;
  };
  words.forEach(deckIdFor);
  const decks: Record<string, unknown> = {
    "1": { id: 1, name: "Default", desc: "", mod: now, usn: -1, collapsed: false, newToday: [0, 0], revToday: [0, 0], lrnToday: [0, 0], timeToday: [0, 0], dyn: 0, extendNew: 0, extendRev: 0, conf: 1 },
  };
  for (const [name, id] of deckNames) {
    decks[String(id)] = { id, name, desc: "", mod: now, usn: -1, collapsed: false, newToday: [0, 0], revToday: [0, 0], lrnToday: [0, 0], timeToday: [0, 0], dyn: 0, extendNew: 0, extendRev: 0, conf: 1 };
  }
  const model = {
    id: MODEL_ID,
    name: MODEL_NAME,
    type: 0,
    mod: now,
    usn: -1,
    sortf: 0,
    did: 1,
    tmpls: TEMPLATES.map((t, i) => ({ name: t.Name, ord: i, qfmt: t.Front, afmt: t.Back, bqfmt: "", bafmt: "", did: null, bfont: "", bsize: 0 })),
    flds: FIELDS.map((f, i) => ({ name: f, ord: i, sticky: false, rtl: false, font: "Arial", size: 20, media: [] })),
    css: CSS,
    latexPre: "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
    latexPost: "\\end{document}",
    latexsvg: false,
    req: [
      [0, "any", [0]],
      [1, "all", [14]],
      [2, "any", [0]],
    ],
    tags: [],
    vers: [],
  };
  const conf = { nextPos: 1, estTimes: true, activeDecks: [1], sortType: "noteFld", timeLim: 0, sortBackwards: false, addToCur: true, curDeck: 1, newBury: true, newSpread: 0, dueCounts: true, curModel: String(MODEL_ID), collapseTime: 1200 };
  const dconf = {
    "1": { id: 1, name: "Default", replayq: true, lapse: { leechFails: 8, minInt: 1, delays: [10], leechAction: 0, mult: 0 }, rev: { perDay: 200, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, ease4: 1.3, bury: true, minSpace: 1 }, timer: 0, maxTaken: 60, usn: -1, new: { perDay: 20, delays: [1, 10], separate: true, ints: [1, 4, 7], initialFactor: 2500, bury: true, order: 1 }, mod: 0, autoplay: true },
  };
  sqldb.run("INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, '{}')", [now, now, now * 1000, JSON.stringify(conf), JSON.stringify({ [String(MODEL_ID)]: model }), JSON.stringify(decks), JSON.stringify(dconf)]);

  let noteId = Date.now();
  let cardId = noteId + 1;
  for (const w of words) {
    const fields = wordToFields(w);
    const flds = FIELDS.map((f) => fields[f]).join("\x1f");
    const tags = ` ${tagsFor(w).join(" ")} `;
    const nid = noteId++;
    sqldb.run("INSERT INTO notes VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')", [nid, guidFor(w.id), MODEL_ID, now, tags, flds, fields.Hanzi, checksum(fields.Hanzi)]);
    const did = deckIdFor(w);
    const ords = w.createProduction ? [0, 1, 2] : [0, 2];
    for (const ord of ords) {
      sqldb.run("INSERT INTO cards VALUES (?, ?, ?, ?, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')", [cardId++, nid, did, ord, now, nid % 1000000]);
    }
  }
  const data = sqldb.export();
  sqldb.close();
  const zip = new JSZip();
  zip.file("collection.anki2", data);
  zip.file("media", "{}");
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export async function downloadApkg(words: Word[]) {
  const blob = await buildApkg(words);
  triggerDownload(blob, `Xueban_${new Date().toISOString().slice(0, 10)}.apkg`);
}

export function buildCsv(words: Word[]): string {
  const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
  const header = [...FIELDS, "Tags"].join(",");
  const rows = words.map((w) => {
    const f = wordToFields(w);
    return [...FIELDS.map((k) => esc(f[k])), esc(tagsFor(w).join(" "))].join(",");
  });
  return "\ufeff" + [header, ...rows].join("\n");
}

export async function downloadCsv(words: Word[]) {
  triggerDownload(new Blob([buildCsv(words)], { type: "text/csv;charset=utf-8" }), `Xueban_${new Date().toISOString().slice(0, 10)}.csv`);
}

function triggerDownload(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
