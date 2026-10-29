/**
 * Núcleo isomorfo (navegador y Node) de la exportación .apkg: genera collection.anki2 (esquema legado
 * v11) con el tipo de nota del idioma (AnkiModelSpec) y lo empaqueta con JSZip.
 * - Web: lib/anki/apkg.ts (sql.js cargado desde /public).
 * - Node: scripts/build-anki.ts (`npm run anki:build -- --lang=ja|ko`).
 */
import JSZip from "jszip";
import type { SqlJsStatic } from "sql.js";
import type { Word } from "@/lib/db/schema";
import type { AnkiModelSpec } from "@/lib/languages/types";

export interface ApkgContext {
  spec: AnkiModelSpec;
  categoryNames: string[];
}

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

/** GUID estable a partir del WebID (reimportar el mismo .apkg actualiza en vez de duplicar). */
export function guidFor(s: string): string {
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

/** SHA-1 (hex) síncrono, sin dependencias. */
function sha1Hex(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const len = bytes.length;
  const words = new Uint32Array((((len + 8) >> 6) + 1) * 16);
  for (let i = 0; i < len; i++) words[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
  words[len >> 2] |= 0x80 << (24 - (len % 4) * 8);
  words[words.length - 1] = len * 8;
  let h0 = 0x67452301,
    h1 = 0xefcdab89,
    h2 = 0x98badcfe,
    h3 = 0x10325476,
    h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) w[t] = words[i + t];
    for (let t = 16; t < 80; t++) w[t] = rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4;
    for (let t = 0; t < 80; t++) {
      const f = t < 20 ? (b & c) | (~b & d) : t < 40 ? b ^ c ^ d : t < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d;
      const k = t < 20 ? 0x5a827999 : t < 40 ? 0x6ed9eba1 : t < 60 ? 0x8f1bbcdc : 0xca62c1d6;
      const tmp = (rotl(a, 5) + f + e + k + w[t]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30) >>> 0;
      b = a;
      a = tmp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((x) => x.toString(16).padStart(8, "0")).join("");
}

/** Checksum de Anki: primeros 8 dígitos hex del SHA-1 del primer campo sin HTML. */
export function ankiChecksum(firstField: string): number {
  const stripped = firstField.replace(/<[^>]*>/g, "").replace(/\[sound:[^\]]+\]/g, "");
  return parseInt(sha1Hex(stripped).slice(0, 8), 16);
}

function deckObj(id: number, name: string, now: number) {
  return { id, name, desc: "", mod: now, usn: -1, collapsed: false, browserCollapsed: false, newToday: [0, 0], revToday: [0, 0], lrnToday: [0, 0], timeToday: [0, 0], dyn: 0, extendNew: 0, extendRev: 0, conf: 1 };
}

/** Construye collection.anki2 (bytes SQLite) con sql.js ya inicializado. */
export function buildCollection(SQL: SqlJsStatic, words: Word[], ctx: ApkgContext, nowMs = Date.now()): Uint8Array {
  const { spec, categoryNames } = ctx;
  const sqldb = new SQL.Database();
  sqldb.run(SCHEMA);
  const now = Math.floor(nowMs / 1000);

  // Mazos: los de deckFor + todos sus padres (A, A::B…) para que la jerarquía exista al importar.
  const deckNames = new Map<string, number>();
  const addDeck = (name: string) => {
    const parts = name.split("::");
    for (let i = 1; i <= parts.length; i++) {
      const n = parts.slice(0, i).join("::");
      if (!deckNames.has(n)) deckNames.set(n, spec.modelId + 100 + deckNames.size + 1);
    }
    return deckNames.get(name)!;
  };
  const deckIdFor = (w: Word) => addDeck(spec.deckFor(w, categoryNames));
  words.forEach(deckIdFor);
  const decks: Record<string, unknown> = { "1": deckObj(1, "Default", now) };
  for (const [name, id] of deckNames) decks[String(id)] = deckObj(id, name, now);

  const model = {
    id: spec.modelId,
    name: spec.modelName,
    type: 0,
    mod: now,
    usn: -1,
    sortf: 0,
    did: 1,
    tmpls: spec.templates.map((t, i) => ({ name: t.Name, ord: i, qfmt: t.Front, afmt: t.Back, bqfmt: "", bafmt: "", did: null, bfont: "", bsize: 0 })),
    flds: spec.fields.map((f, i) => ({ name: f, ord: i, sticky: false, rtl: false, font: "Arial", size: 20, media: [] })),
    css: spec.css,
    latexPre: "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
    latexPost: "\\end{document}",
    latexsvg: false,
    req: spec.req,
    tags: [],
    vers: [],
  };
  const conf = { nextPos: words.length + 1, estTimes: true, activeDecks: [1], sortType: "noteFld", timeLim: 0, sortBackwards: false, addToCur: true, curDeck: 1, newBury: true, newSpread: 0, dueCounts: true, curModel: String(spec.modelId), collapseTime: 1200 };
  const dconf = {
    "1": { id: 1, name: "Default", replayq: true, lapse: { leechFails: 8, minInt: 1, delays: [10], leechAction: 0, mult: 0 }, rev: { perDay: 200, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, ease4: 1.3, bury: true, minSpace: 1 }, timer: 0, maxTaken: 60, usn: -1, new: { perDay: 20, delays: [1, 10], separate: true, ints: [1, 4, 7], initialFactor: 2500, bury: true, order: 1 }, mod: 0, autoplay: true },
  };
  sqldb.run("INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, '{}')", [now, now, now * 1000, JSON.stringify(conf), JSON.stringify({ [String(spec.modelId)]: model }), JSON.stringify(decks), JSON.stringify(dconf)]);

  let noteId = nowMs;
  let cardId = noteId + 1;
  let pos = 0;
  for (const w of words) {
    const fields = spec.toFields(w);
    const values = spec.fields.map((f) => fields[f] ?? "");
    const flds = values.join("\x1f");
    const tags = ` ${spec.tags(w).join(" ")} `;
    const nid = noteId++;
    const sortField = values[0] ?? "";
    sqldb.run("INSERT INTO notes VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')", [nid, guidFor(w.id), spec.modelId, now, tags, flds, sortField, ankiChecksum(sortField)]);
    const did = deckIdFor(w);
    pos++;
    for (const ord of spec.cardOrds(w)) {
      sqldb.run("INSERT INTO cards VALUES (?, ?, ?, ?, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')", [cardId++, nid, did, ord, now, pos]);
    }
  }
  const data = sqldb.export();
  sqldb.close();
  return data;
}

/** Empaqueta collection.anki2 + media vacía en un zip .apkg. */
export function buildApkgZip(SQL: SqlJsStatic, words: Word[], ctx: ApkgContext, nowMs = Date.now()): JSZip {
  const zip = new JSZip();
  zip.file("collection.anki2", buildCollection(SQL, words, ctx, nowMs));
  zip.file("media", "{}");
  return zip;
}
