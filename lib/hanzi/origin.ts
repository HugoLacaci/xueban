"use client";
/**
 * Origen y memorización de los hanzi: formas antiguas (Wikimedia Commons, con créditos), pictogramas animados
 * (dibujos propios), palabras clave de componentes (lista propia editable), generador de mnemotecnias y método
 * de la «película» para pinyin y tono (asignaciones del usuario). Carga diferida y tolerante a datos ausentes.
 */
import { withBase } from "@/lib/base-path";
import { db } from "@/lib/db";
import {
  getCharInfo,
  componentsOf,
  charsWithComponent,
  lookupFirst,
} from "@/lib/languages/zh/dictionary";
import { syllablesOf, toneOf, stripTones } from "@/lib/languages/zh/pinyin/tones";
import { wordPinyin } from "@/lib/languages/zh/pinyin/convert";

export type Stage = "oracle" | "bronze" | "bigseal" | "seal" | "clerical" | "kaishu";
export const STAGE_INFO: Record<Stage, { zh: string; es: string; when: string }> = {
  oracle: { zh: "甲骨文", es: "hueso oracular", when: "c. 1250–1050 a. C." },
  bronze: { zh: "金文", es: "bronce", when: "c. 1050–250 a. C." },
  bigseal: { zh: "大篆", es: "sello grande", when: "c. 800–250 a. C." },
  seal: { zh: "小篆", es: "sello pequeño", when: "c. 220 a. C. (Qin)" },
  clerical: { zh: "隶书", es: "clerical", when: "Han, c. 200 a. C.–200 d. C." },
  kaishu: { zh: "楷书", es: "regular", when: "desde c. 200 d. C." },
};

export interface GlyphCredit {
  file: string;
  url: string;
  license: string;
  licenseUrl?: string;
  author: string;
  stage: string;
}
export interface GlyphIndex {
  generatedAt: string;
  chars: Record<string, { stages: string[]; normalized?: string[]; credits: GlyphCredit[] }>;
}

let glyphIndex: Promise<GlyphIndex | null> | undefined;
export function loadGlyphIndex(): Promise<GlyphIndex | null> {
  if (!glyphIndex)
    glyphIndex = fetch(withBase("/data/zh/glyphs/index.json"))
      .then((r) => (r.ok ? (r.json() as Promise<GlyphIndex>) : null))
      .catch(() => null);
  return glyphIndex;
}
/** URL del glifo; `normalized` → versión 0 0 100 100 de `npm run glyphs:normalize` (mismo tamaño visual). */
export function glyphUrl(ch: string, stage: string, normalized = false): string {
  return withBase(
    `/data/zh/glyphs/${encodeURIComponent(ch)}/${stage}${normalized ? ".n" : ""}.svg`,
  );
}

export interface Pictogram {
  c: string;
  pinyin: string;
  es: string;
  type: string;
  story: string;
  drawing: string;
  oracle?: string;
  components?: string[];
}
let pictograms: Promise<Pictogram[]> | undefined;
export function loadPictograms(): Promise<Pictogram[]> {
  if (!pictograms)
    pictograms = import("@/content/zh/pictograms.json")
      .then((m) => (m.default ?? m) as Pictogram[])
      .catch(() => []);
  return pictograms;
}

export interface ComponentKeyword {
  c: string;
  keyword: string;
  pinyin: string;
  es: string;
  kind: "radical" | "phonetic" | "both" | "shape";
  examples: string[];
}
let keywords: Promise<ComponentKeyword[]> | undefined;
export function loadComponentKeywords(): Promise<ComponentKeyword[]> {
  if (!keywords)
    keywords = import("@/content/zh/components-keywords.json")
      .then((m) => (m.default ?? m) as ComponentKeyword[])
      .catch(() => []);
  return keywords;
}

/** Palabras clave del usuario (sobrescriben las de la lista): settings «hanzi:keywords». */
export async function userKeywords(): Promise<Record<string, string>> {
  const row = await db.settings.get("hanzi:keywords");
  return (row?.value as Record<string, string>) ?? {};
}
export async function setUserKeyword(c: string, keyword: string): Promise<void> {
  const cur = await userKeywords();
  if (keyword.trim()) cur[c] = keyword.trim();
  else delete cur[c];
  await db.settings.put({ key: "hanzi:keywords", value: cur, updatedAt: Date.now() });
}

/** Mnemotecnia sugerida automáticamente a partir de las palabras clave de los componentes. */
export function suggestMnemonic(
  ch: string,
  kw: Map<string, string>,
  meaning?: string,
): { parts: { c: string; keyword: string }[]; text: string } {
  const comps = componentsOf(ch).filter((c) => c !== ch);
  const parts = comps.map((c) => ({
    c,
    keyword: kw.get(c) ?? lookupFirst(c)?.es?.split(/[;,(]/)[0].trim() ?? c,
  }));
  const info = getCharInfo(ch);
  const ety = info?.etymology;
  const m = meaning ?? lookupFirst(ch)?.es?.split(/[;,(]/)[0].trim() ?? "";
  if (!parts.length)
    return { parts, text: `${ch} se dibuja de una pieza: fíjate en su forma y piensa en «${m}».` };
  if (parts.length === 1)
    return { parts, text: `${ch} («${m}») lleva ${parts[0].c} (${parts[0].keyword}).` };
  const [a, b, ...rest] = parts;
  const phonetic =
    ety?.type === "pictophonetic" && ety.phonetic
      ? parts.find((p) => p.c === ety.phonetic)
      : undefined;
  const semantic =
    ety?.type === "pictophonetic" && ety.semantic
      ? parts.find((p) => p.c === ety.semantic)
      : undefined;
  if (phonetic && semantic)
    return {
      parts,
      text: `${ch} («${m}»): ${semantic.c} (${semantic.keyword}) da el significado y ${phonetic.c} (${phonetic.keyword}, se lee ${wordPinyin(phonetic.c)}) da el sonido. Imagina «${semantic.keyword}» con «${phonetic.keyword}» y pronuncia ${wordPinyin(ch)}.`,
    };
  return {
    parts,
    text: `${ch} («${m}»): ${a.keyword} + ${b.keyword}${rest.length ? " + " + rest.map((p) => p.keyword).join(" + ") : ""}. Inventa una escena con esas imágenes que termine en «${m}».`,
  };
}

/** Familias: caracteres que comparten radical o componente fonético (red navegable). */
export function familyOf(
  ch: string,
  pool?: Set<string>,
): {
  byRadical: { key: string; chars: string[] };
  byPhonetic?: { key: string; chars: string[] };
  components: { c: string; chars: string[] }[];
} {
  const info = getCharInfo(ch);
  const radical = info?.radical ?? "";
  const ety = info?.etymology;
  const byRadical = {
    key: radical,
    chars: radical ? charsWithComponent(radical, pool, 30).filter((c) => c !== ch) : [],
  };
  const byPhonetic = ety?.phonetic
    ? {
        key: ety.phonetic,
        chars: charsWithComponent(ety.phonetic, pool, 30).filter((c) => c !== ch),
      }
    : undefined;
  const components = componentsOf(ch)
    .filter((c) => c !== ch && c !== radical && c !== ety?.phonetic)
    .map((c) => ({ c, chars: charsWithComponent(c, pool, 20).filter((x) => x !== ch) }))
    .filter((x) => x.chars.length);
  return { byRadical, byPhonetic, components };
}

/* ------------------------------------------------------------------ método de la «película» (pinyin + tono) */

export const INITIALS = [
  "b",
  "p",
  "m",
  "f",
  "d",
  "t",
  "n",
  "l",
  "g",
  "k",
  "h",
  "j",
  "q",
  "x",
  "zh",
  "ch",
  "sh",
  "r",
  "z",
  "c",
  "s",
  "y",
  "w",
  "∅",
];
export const FINALS = [
  "a",
  "o",
  "e",
  "i",
  "u",
  "ü",
  "ai",
  "ei",
  "ao",
  "ou",
  "an",
  "en",
  "ang",
  "eng",
  "ong",
  "er",
  "ia",
  "ie",
  "iao",
  "iu",
  "ian",
  "in",
  "iang",
  "ing",
  "iong",
  "ua",
  "uo",
  "uai",
  "ui",
  "uan",
  "un",
  "uang",
  "ueng",
  "üe",
  "üan",
  "ün",
];
export const TONE_ROOMS: Record<number, string> = {
  1: "la entrada (todo alto y plano)",
  2: "la escalera (subiendo)",
  3: "el sótano (abajo, se hunde)",
  4: "el balcón (cae de golpe)",
  5: "el pasillo (de paso, sin tono)",
};

export interface PalaceAssignments {
  actors: Record<string, string>; // inicial → actor (persona)
  sets: Record<string, string>; // final → escenario (lugar)
  rooms: Record<number, string>; // tono → habitación
}
export async function loadPalace(): Promise<PalaceAssignments> {
  const row = await db.settings.get("hanzi:palace");
  const v = (row?.value as Partial<PalaceAssignments>) ?? {};
  return {
    actors: v.actors ?? {},
    sets: v.sets ?? {},
    rooms: {
      1: TONE_ROOMS[1],
      2: TONE_ROOMS[2],
      3: TONE_ROOMS[3],
      4: TONE_ROOMS[4],
      5: TONE_ROOMS[5],
      ...(v.rooms ?? {}),
    },
  };
}
export async function savePalace(p: PalaceAssignments): Promise<void> {
  await db.settings.put({ key: "hanzi:palace", value: p, updatedAt: Date.now() });
}

/** Separa una sílaba de pinyin en inicial y final (sin tono). */
export function splitSyllable(syl: string): { initial: string; final: string; tone: number } {
  const base = stripTones(syl).toLowerCase().replace(/v/g, "ü");
  const tone = toneOf(syl);
  const m = base.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?(.*)$/);
  let initial = m?.[1] ?? "";
  let final = m?.[2] ?? base;
  if (!initial) initial = "∅";
  // ju/qu/xu/yu → ü
  if (/^[jqxy]$/.test(initial) && /^u/.test(final)) final = final.replace(/^u/, "ü");
  return { initial, final, tone };
}

/** «Película» de una palabra: por cada sílaba, actor (inicial) en escenario (final) en la habitación (tono). */
export function movieFor(
  zhWord: string,
  p: PalaceAssignments,
): { hanzi: string; syllable: string; actor?: string; set?: string; room: string }[] {
  const syls = syllablesOf(wordPinyin(zhWord));
  const chars = Array.from(zhWord);
  return syls.map((s, i) => {
    const { initial, final, tone } = splitSyllable(s);
    return {
      hanzi: chars[i] ?? "",
      syllable: s,
      actor: p.actors[initial],
      set: p.sets[final],
      room: p.rooms[tone] ?? TONE_ROOMS[5],
    };
  });
}

/** Pares de caracteres parecidos (para el comparador), con la diferencia explicada. */
export const SIMILAR_PAIRS: { chars: string[]; es: string[]; diff: string }[] = [
  {
    chars: ["己", "已", "巳"],
    es: ["uno mismo", "ya", "serpiente (hora 9–11)"],
    diff: "El trazo vertical de la izquierda: 己 abierto arriba, 已 medio cerrado, 巳 cerrado del todo.",
  },
  {
    chars: ["未", "末"],
    es: ["todavía no", "final"],
    diff: "未: el trazo de arriba es más corto; 末: el de arriba es más largo (el «extremo»).",
  },
  {
    chars: ["土", "士"],
    es: ["tierra", "erudito / soldado"],
    diff: "土: el trazo de abajo es el más largo (la tierra); 士: el de arriba es el más largo.",
  },
  {
    chars: ["人", "入"],
    es: ["persona", "entrar"],
    diff: "人: el trazo izquierdo (撇) sobresale por arriba; 入: el derecho (捺) sobresale por arriba.",
  },
  {
    chars: ["大", "太", "犬"],
    es: ["grande", "demasiado", "perro"],
    diff: "大 sin punto; 太 con punto abajo; 犬 con punto arriba a la derecha.",
  },
  {
    chars: ["买", "卖"],
    es: ["comprar", "vender"],
    diff: "卖 = 十 + 买: vender es «comprar con algo encima» (lo que se saca a la venta).",
  },
  {
    chars: ["午", "牛"],
    es: ["mediodía", "vaca"],
    diff: "牛: el trazo vertical sobresale por arriba (los cuernos); 午: no sobresale.",
  },
  {
    chars: ["天", "夫"],
    es: ["cielo / día", "marido"],
    diff: "天: el trazo vertical no sobresale del trazo de arriba; 夫: sí sobresale.",
  },
  {
    chars: ["日", "曰"],
    es: ["sol / día", "decir (clásico)"],
    diff: "日 es alto y estrecho; 曰 es ancho y bajo, y el trazo central no toca la derecha.",
  },
  {
    chars: ["九", "力"],
    es: ["nueve", "fuerza"],
    diff: "九: el gancho sale hacia la derecha con curva; 力: el trazo recto cruza el gancho.",
  },
  {
    chars: ["千", "干"],
    es: ["mil", "seco / hacer"],
    diff: "千: el trazo de arriba es un 撇 inclinado; 干: dos trazos horizontales rectos.",
  },
  {
    chars: ["石", "右"],
    es: ["piedra", "derecha"],
    diff: "右: el 口 está bajo el 撇 largo; 石: el 口 cuelga del trazo horizontal.",
  },
  {
    chars: ["见", "贝"],
    es: ["ver", "concha / dinero"],
    diff: "见 termina en gancho hacia arriba (las piernas); 贝 termina en dos puntos.",
  },
  {
    chars: ["我", "找"],
    es: ["yo", "buscar"],
    diff: "找 lleva 扌 (mano) a la izquierda; 我 lleva 手 integrado con un trazo más.",
  },
  {
    chars: ["住", "往"],
    es: ["vivir", "hacia"],
    diff: "住 lleva 亻 (persona); 往 lleva 彳 (paso, dos trazos).",
  },
  {
    chars: ["你", "您"],
    es: ["tú", "usted"],
    diff: "您 = 你 + 心: «tú con corazón», es decir, con respeto.",
  },
  {
    chars: ["他", "她", "它"],
    es: ["él", "ella", "ello (cosa/animal)"],
    diff: "亻 persona (él), 女 mujer (ella), 宀 techo (cosa). Suenan igual: tā.",
  },
  {
    chars: ["在", "再"],
    es: ["estar en", "otra vez"],
    diff: "在 lleva 土 dentro (un lugar); 再 es como un marco con un trazo horizontal extra. Suenan igual: zài.",
  },
  {
    chars: ["的", "白"],
    es: ["de (partícula)", "blanco"],
    diff: "的 = 白 + 勺. Si falta la parte derecha, es «blanco».",
  },
  {
    chars: ["儿", "几"],
    es: ["hijo / sufijo -r", "cuántos"],
    diff: "几: el trazo derecho tiene gancho y el izquierdo es corto; 儿: dos trazos abiertos, sin «techo».",
  },
];
