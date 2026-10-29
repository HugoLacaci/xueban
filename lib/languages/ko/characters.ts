/** Jamo (forma, sonido, posición en el bloque), hanja (훈음, Wiktionary) y clasificadores 단위 명사. */
import type { CharacterModule, CounterModule, StrokeProvider } from "@/lib/languages/types";
import { withBase } from "@/lib/base-path";
import { decompose, isHangul, isHangulJamo } from "./phonology";
import { hangulStrokeData, BASIC_CONSONANTS, BASIC_VOWELS, COMPOUND_VOWELS, TENSE_CONSONANTS } from "./strokes";

export interface JamoInfo {
  jamo: string;
  name: string; // 기역, 니은…
  romanInitial: string;
  romanFinal: string;
  sound: string; // descripción en español
  kind: "consonante" | "vocal";
  type?: "lisa" | "aspirada" | "tensa" | "nasal" | "líquida" | "silenciosa";
  mnemonic: string;
}

export const JAMO: JamoInfo[] = [
  { jamo: "ㄱ", name: "기역", romanInitial: "g", romanFinal: "k", sound: "Entre «g» y «k» suave; final sin soltar aire.", kind: "consonante", type: "lisa", mnemonic: "La raíz de la lengua tocando el velo del paladar (diseño original de 1446)." },
  { jamo: "ㄴ", name: "니은", romanInitial: "n", romanFinal: "n", sound: "«n» española.", kind: "consonante", type: "nasal", mnemonic: "La punta de la lengua tocando los dientes de arriba." },
  { jamo: "ㄷ", name: "디귿", romanInitial: "d", romanFinal: "t", sound: "Entre «d» y «t» suave.", kind: "consonante", type: "lisa", mnemonic: "ㄴ con un tejadillo: la lengua se apoya más fuerte." },
  { jamo: "ㄹ", name: "리을", romanInitial: "r", romanFinal: "l", sound: "Entre vocales, «r» suave (pero); al final, «l».", kind: "consonante", type: "líquida", mnemonic: "Una lengua que se enrosca: zigzag de ida y vuelta." },
  { jamo: "ㅁ", name: "미음", romanInitial: "m", romanFinal: "m", sound: "«m».", kind: "consonante", type: "nasal", mnemonic: "La boca cerrada: un cuadrado." },
  { jamo: "ㅂ", name: "비읍", romanInitial: "b", romanFinal: "p", sound: "Entre «b» y «p» suave.", kind: "consonante", type: "lisa", mnemonic: "ㅁ con dos orejas: los labios que se abren." },
  { jamo: "ㅅ", name: "시옷", romanInitial: "s", romanFinal: "t", sound: "«s» (ante ㅣ suena casi «sh»).", kind: "consonante", type: "lisa", mnemonic: "Un diente: el aire silba entre los dientes." },
  { jamo: "ㅇ", name: "이응", romanInitial: "", romanFinal: "ng", sound: "Muda al principio; al final «ng» de «tango».", kind: "consonante", type: "silenciosa", mnemonic: "La garganta abierta: un círculo." },
  { jamo: "ㅈ", name: "지읒", romanInitial: "j", romanFinal: "t", sound: "Entre «ch» suave y «y» de «yo» enfático.", kind: "consonante", type: "lisa", mnemonic: "ㅅ con techo." },
  { jamo: "ㅊ", name: "치읓", romanInitial: "ch", romanFinal: "t", sound: "«ch» con golpe de aire.", kind: "consonante", type: "aspirada", mnemonic: "ㅈ con un trazo extra = más aire." },
  { jamo: "ㅋ", name: "키읔", romanInitial: "k", romanFinal: "k", sound: "«k» con golpe de aire.", kind: "consonante", type: "aspirada", mnemonic: "ㄱ con una raya: más aire." },
  { jamo: "ㅌ", name: "티읕", romanInitial: "t", romanFinal: "t", sound: "«t» con golpe de aire.", kind: "consonante", type: "aspirada", mnemonic: "ㄷ con una raya: más aire." },
  { jamo: "ㅍ", name: "피읖", romanInitial: "p", romanFinal: "p", sound: "«p» con golpe de aire.", kind: "consonante", type: "aspirada", mnemonic: "ㅂ tumbado y abierto: los labios sueltan aire." },
  { jamo: "ㅎ", name: "히읗", romanInitial: "h", romanFinal: "t", sound: "«h» inglesa suave (no «j» española).", kind: "consonante", type: "aspirada", mnemonic: "Una persona con sombrero soplando." },
  { jamo: "ㄲ", name: "쌍기역", romanInitial: "kk", romanFinal: "k", sound: "«k» tensa, sin aire, garganta apretada.", kind: "consonante", type: "tensa", mnemonic: "Dos ㄱ: el doble de tensión." },
  { jamo: "ㄸ", name: "쌍디귿", romanInitial: "tt", romanFinal: "", sound: "«t» tensa sin aire.", kind: "consonante", type: "tensa", mnemonic: "Dos ㄷ." },
  { jamo: "ㅃ", name: "쌍비읍", romanInitial: "pp", romanFinal: "", sound: "«p» tensa sin aire.", kind: "consonante", type: "tensa", mnemonic: "Dos ㅂ." },
  { jamo: "ㅆ", name: "쌍시옷", romanInitial: "ss", romanFinal: "t", sound: "«s» tensa, siseante.", kind: "consonante", type: "tensa", mnemonic: "Dos ㅅ." },
  { jamo: "ㅉ", name: "쌍지읒", romanInitial: "jj", romanFinal: "", sound: "«ch» tensa sin aire.", kind: "consonante", type: "tensa", mnemonic: "Dos ㅈ." },
  { jamo: "ㅏ", name: "아", romanInitial: "a", romanFinal: "", sound: "«a».", kind: "vocal", mnemonic: "Vertical con la rayita hacia fuera (la «persona» mira al sol)." },
  { jamo: "ㅑ", name: "야", romanInitial: "ya", romanFinal: "", sound: "«ya».", kind: "vocal", mnemonic: "Dos rayitas = una «y» delante." },
  { jamo: "ㅓ", name: "어", romanInitial: "eo", romanFinal: "", sound: "«o» muy abierta, casi «a» de «la» con la boca redonda.", kind: "vocal", mnemonic: "La rayita hacia dentro: sonido más oscuro." },
  { jamo: "ㅕ", name: "여", romanInitial: "yeo", romanFinal: "", sound: "«yo» abierto.", kind: "vocal", mnemonic: "ㅓ con una «y»." },
  { jamo: "ㅗ", name: "오", romanInitial: "o", romanFinal: "", sound: "«o» cerrada, labios redondos.", kind: "vocal", mnemonic: "Horizontal con la rayita arriba (hacia el cielo)." },
  { jamo: "ㅛ", name: "요", romanInitial: "yo", romanFinal: "", sound: "«yo».", kind: "vocal", mnemonic: "ㅗ con una «y»." },
  { jamo: "ㅜ", name: "우", romanInitial: "u", romanFinal: "", sound: "«u».", kind: "vocal", mnemonic: "La rayita hacia abajo (a la tierra)." },
  { jamo: "ㅠ", name: "유", romanInitial: "yu", romanFinal: "", sound: "«yu».", kind: "vocal", mnemonic: "ㅜ con una «y»." },
  { jamo: "ㅡ", name: "으", romanInitial: "eu", romanFinal: "", sound: "«u» con los labios estirados en sonrisa.", kind: "vocal", mnemonic: "Una línea plana: la tierra; labios planos." },
  { jamo: "ㅣ", name: "이", romanInitial: "i", romanFinal: "", sound: "«i».", kind: "vocal", mnemonic: "Una persona de pie." },
  { jamo: "ㅐ", name: "애", romanInitial: "ae", romanFinal: "", sound: "«e» abierta (hoy casi igual que ㅔ).", kind: "vocal", mnemonic: "ㅏ + ㅣ." },
  { jamo: "ㅔ", name: "에", romanInitial: "e", romanFinal: "", sound: "«e».", kind: "vocal", mnemonic: "ㅓ + ㅣ." },
  { jamo: "ㅒ", name: "얘", romanInitial: "yae", romanFinal: "", sound: "«ye».", kind: "vocal", mnemonic: "ㅑ + ㅣ." },
  { jamo: "ㅖ", name: "예", romanInitial: "ye", romanFinal: "", sound: "«ye».", kind: "vocal", mnemonic: "ㅕ + ㅣ." },
  { jamo: "ㅘ", name: "와", romanInitial: "wa", romanFinal: "", sound: "«ua».", kind: "vocal", mnemonic: "ㅗ + ㅏ." },
  { jamo: "ㅙ", name: "왜", romanInitial: "wae", romanFinal: "", sound: "«ue».", kind: "vocal", mnemonic: "ㅗ + ㅐ." },
  { jamo: "ㅚ", name: "외", romanInitial: "oe", romanFinal: "", sound: "«ue» (hoy).", kind: "vocal", mnemonic: "ㅗ + ㅣ." },
  { jamo: "ㅝ", name: "워", romanInitial: "wo", romanFinal: "", sound: "«uo».", kind: "vocal", mnemonic: "ㅜ + ㅓ." },
  { jamo: "ㅞ", name: "웨", romanInitial: "we", romanFinal: "", sound: "«ue».", kind: "vocal", mnemonic: "ㅜ + ㅔ." },
  { jamo: "ㅟ", name: "위", romanInitial: "wi", romanFinal: "", sound: "«ui».", kind: "vocal", mnemonic: "ㅜ + ㅣ." },
  { jamo: "ㅢ", name: "의", romanInitial: "ui", romanFinal: "", sound: "«ɯi» deslizado (como partícula 의 suena «e»).", kind: "vocal", mnemonic: "ㅡ + ㅣ." },
];
export const jamoInfo = (j: string) => JAMO.find((x) => x.jamo === j);

let hanja: Record<string, [string, string]> | undefined;
let topik: { words: Record<string, string[]> } | undefined;
let loading: Promise<void> | undefined;
export async function loadHanja() {
  if (hanja) return;
  loading ??= (async () => {
    const [h, t] = await Promise.all([fetch(withBase("/data/ko/hanja.json")), fetch(withBase("/data/ko/topik.json"))]);
    hanja = h.ok ? await h.json() : {};
    topik = t.ok ? await t.json() : { words: {} };
  })();
  await loading;
}
export const hanjaInfo = (c: string) => hanja?.[c];
export const topikData = () => topik;

export const SIMILAR_KO: string[][] = [
  ["ㅂ", "ㅍ"],
  ["ㅓ", "ㅏ"],
  ["ㅐ", "ㅔ"],
  ["ㅗ", "ㅜ"],
  ["ㄱ", "ㅋ", "ㄲ"],
  ["ㄷ", "ㅌ", "ㄸ"],
  ["ㅂ", "ㅍ", "ㅃ"],
  ["ㅈ", "ㅊ", "ㅉ"],
  ["ㅅ", "ㅆ"],
  ["을", "올", "울"],
  ["어", "오", "우"],
  ["달", "탈", "딸"],
  ["불", "풀", "뿔"],
  ["자", "차", "짜"],
];

export const koCharacters: CharacterModule = {
  name: "Hangul y hanja",
  isChar: (c) => isHangul(c),
  charsOf: (text) => Array.from(text).filter(isHangul),
  load: loadHanja,
  loaded: () => Boolean(hanja),
  info(ch) {
    if (isHangulJamo(ch)) {
      const j = jamoInfo(ch);
      return j ? { char: ch, readings: [j.romanInitial, j.romanFinal].filter(Boolean), meaning: `${j.name} · ${j.sound}`, components: [], level: j.kind, extra: { ...j } } : undefined;
    }
    const s = decompose(ch);
    if (s) return { char: ch, readings: [], meaning: `${s.cho} + ${s.jung}${s.jong ? ` + ${s.jong}` : ""}`, components: [s.cho, s.jung, ...(s.jong ? [s.jong] : [])], level: "sílaba", extra: { ...s } };
    const h = hanja?.[ch];
    if (h) return { char: ch, readings: [h[1]], meaning: `${h[0]} (훈) · ${h[1]} (음)`, components: [], level: "hanja", extra: { hun: h[0], eum: h[1] } };
    return undefined;
  },
  similarSets: SIMILAR_KO,
  components: (ch) => {
    const s = decompose(ch);
    return s ? [s.cho, s.jung, ...(s.jong ? [s.jong] : [])] : [];
  },
  allComponents: [...BASIC_CONSONANTS, ...TENSE_CONSONANTS, ...BASIC_VOWELS, ...COMPOUND_VOWELS],
  levelChars: () => [...BASIC_CONSONANTS, ...TENSE_CONSONANTS, ...BASIC_VOWELS, ...COMPOUND_VOWELS],
};

export const koStrokes: StrokeProvider = {
  kind: "jamo",
  url: (ch) => withBase(`/data/ja/strokes/${encodeURIComponent(ch)}.json`),
  async load(ch) {
    if (/[一-鿿]/.test(ch)) {
      // hanja: se reutilizan los trazos de KanjiVG
      try {
        const r = await fetch(withBase(`/data/ja/strokes/${encodeURIComponent(ch)}.json`));
        return r.ok ? await r.json() : null;
      } catch {
        return null;
      }
    }
    return hangulStrokeData(ch);
  },
  grid: "hangul",
};

/* ------------------------------ Clasificadores ------------------------------ */

export const NATIVE_NUMBERS = ["하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
export const NATIVE_ATTR = ["한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
export const SINO_NUMBERS = ["일", "이", "삼", "사", "오", "육", "칠", "팔", "구", "십"];

export const KO_COUNTERS: { counter: string; es: string; system: "nativo" | "sino"; nouns: string[]; note?: string }[] = [
  { counter: "개", es: "cosas en general", system: "nativo", nouns: ["사과", "가방", "의자"] },
  { counter: "명", es: "personas", system: "nativo", nouns: ["학생", "친구", "사람"] },
  { counter: "분", es: "personas (honorífico)", system: "nativo", nouns: ["선생님", "손님"] },
  { counter: "마리", es: "animales", system: "nativo", nouns: ["고양이", "개", "새"] },
  { counter: "권", es: "libros, cuadernos", system: "nativo", nouns: ["책", "공책"] },
  { counter: "잔", es: "vasos, tazas", system: "nativo", nouns: ["커피", "물", "맥주"] },
  { counter: "병", es: "botellas", system: "nativo", nouns: ["물", "소주"] },
  { counter: "장", es: "hojas, billetes, fotos", system: "nativo", nouns: ["종이", "표", "사진"] },
  { counter: "대", es: "vehículos y máquinas", system: "nativo", nouns: ["차", "자전거", "컴퓨터"] },
  { counter: "살", es: "años de edad", system: "nativo", nouns: ["나이"] },
  { counter: "시", es: "hora (en punto)", system: "nativo", nouns: ["시간"], note: "La hora con nativos (세 시), los minutos con sino-coreanos (삼십 분)." },
  { counter: "번", es: "veces (nativo) / número (sino)", system: "nativo", nouns: ["번"], note: "두 번 = dos veces; 이 번 = el número 2 (autobús, línea)." },
  { counter: "분", es: "minutos", system: "sino", nouns: ["시간"] },
  { counter: "원", es: "wones", system: "sino", nouns: ["돈"], note: "만 원 = 10 000 wones: el coreano cuenta por miríadas (만)." },
  { counter: "층", es: "pisos", system: "sino", nouns: ["건물"] },
  { counter: "월", es: "mes (nombre del mes)", system: "sino", nouns: ["달"], note: "6月 = 유월 y 10月 = 시월 (irregulares)." },
  { counter: "일", es: "día del mes", system: "sino", nouns: ["날짜"] },
  { counter: "년", es: "año", system: "sino", nouns: ["해"] },
];

const NOUN_COUNTER = new Map<string, string>();
for (const c of KO_COUNTERS) for (const n of c.nouns) if (!NOUN_COUNTER.has(n)) NOUN_COUNTER.set(n, c.counter);

export const koCounters: CounterModule = {
  name: "Clasificadores",
  native: "단위 명사",
  counters: KO_COUNTERS.map((c) => ({ counter: c.counter, reading: c.counter, es: c.es, nouns: c.nouns, note: c.note ?? (c.system === "nativo" ? "Con números nativos (한, 두, 세…)." : "Con números sino-coreanos (일, 이, 삼…)."), examples: (c.system === "nativo" ? NATIVE_ATTR : SINO_NUMBERS).slice(0, 3).map((n, i) => ({ text: `${n} ${c.counter}`, reading: "", es: String(i + 1) })) })),
  of: (w) => {
    const c = NOUN_COUNTER.get(w);
    return c ? [c] : undefined;
  },
  hint: (c) => KO_COUNTERS.find((x) => x.counter === c)?.es,
  markdown: "El coreano tiene **dos sistemas de números**: los **nativos** (하나, 둘, 셋… que delante de un clasificador pierden la final: 한, 두, 세, 네, y 스물 → 스무) para contar cosas, personas, horas y edad, y los **sino-coreanos** (일, 이, 삼…) para dinero, minutos, fechas, pisos y teléfonos. El orden es *Nombre + número + clasificador*: 사과 두 개 «dos manzanas».",
};
