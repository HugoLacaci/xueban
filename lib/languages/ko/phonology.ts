/**
 * Pronunciación real (표준 발음) y romanización revisada (국어의 로마자 표기법) del coreano,
 * aplicando las reglas fonológicas estándar entre sílabas:
 *  연음 (encadenamiento), ㅎ 탈락, 격음화 (aspiración), 구개음화 (palatalización), neutralización de
 *  finales, 비음화 (nasalización), 유음화 (lateralización), 경음화 (tensión) y ㅎ débil.
 * Devuelve también qué reglas se aplicaron (para explicarlas en la interfaz).
 */

const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const JUNG = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

export interface Syl {
  cho: string;
  jung: string;
  jong: string;
}

export const isHangulSyllable = (c: string) => {
  const n = c.charCodeAt(0);
  return n >= 0xac00 && n <= 0xd7a3;
};
export const isHangulJamo = (c: string) => /[ㄱ-ㆎᄀ-ᇿ]/.test(c);
export const isHangul = (c: string) => isHangulSyllable(c) || isHangulJamo(c);

export function decompose(c: string): Syl | null {
  if (!isHangulSyllable(c)) return null;
  const n = c.charCodeAt(0) - 0xac00;
  return { cho: CHO[Math.floor(n / 588)], jung: JUNG[Math.floor((n % 588) / 28)], jong: JONG[n % 28] };
}

export function compose(s: Syl): string {
  const ci = CHO.indexOf(s.cho);
  const vi = JUNG.indexOf(s.jung);
  const ji = JONG.indexOf(s.jong);
  if (ci < 0 || vi < 0 || ji < 0) return s.cho + s.jung + s.jong;
  return String.fromCharCode(0xac00 + ci * 588 + vi * 28 + ji);
}

/** Final doble → [la que se queda, la que pasa a la sílaba siguiente] */
const DOUBLE: Record<string, [string, string]> = { ㄳ: ["ㄱ", "ㅅ"], ㄵ: ["ㄴ", "ㅈ"], ㄶ: ["ㄴ", "ㅎ"], ㄺ: ["ㄹ", "ㄱ"], ㄻ: ["ㄹ", "ㅁ"], ㄼ: ["ㄹ", "ㅂ"], ㄽ: ["ㄹ", "ㅅ"], ㄾ: ["ㄹ", "ㅌ"], ㄿ: ["ㄹ", "ㅍ"], ㅀ: ["ㄹ", "ㅎ"], ㅄ: ["ㅂ", "ㅅ"] };
/** Simplificación de finales dobles ante consonante o al final */
const DOUBLE_SIMPLE: Record<string, string> = { ㄳ: "ㄱ", ㄵ: "ㄴ", ㄶ: "ㄴ", ㄺ: "ㄱ", ㄻ: "ㅁ", ㄼ: "ㄹ", ㄽ: "ㄹ", ㄾ: "ㄹ", ㄿ: "ㅂ", ㅀ: "ㄹ", ㅄ: "ㅂ" };
/** Neutralización: las 7 finales que se pronuncian [ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅇ] */
const NEUTRAL: Record<string, string> = { ㄲ: "ㄱ", ㅋ: "ㄱ", ㅅ: "ㄷ", ㅆ: "ㄷ", ㅈ: "ㄷ", ㅊ: "ㄷ", ㅌ: "ㄷ", ㅎ: "ㄷ", ㅍ: "ㅂ" };
const ASPIRATE: Record<string, string> = { ㄱ: "ㅋ", ㄷ: "ㅌ", ㅂ: "ㅍ", ㅈ: "ㅊ" };
const TENSE: Record<string, string> = { ㄱ: "ㄲ", ㄷ: "ㄸ", ㅂ: "ㅃ", ㅅ: "ㅆ", ㅈ: "ㅉ" };

export type RuleId = "yeoneum" | "h-drop" | "gyeogeum" | "gugaeeum" | "neutral" | "bieum" | "yuseum" | "gyeongeum" | "h-weak";

export const RULE_INFO: Record<RuleId, { native: string; name: string; description: string; cls: string }> = {
  yeoneum: { native: "연음", name: "Encadenamiento", description: "La consonante final pasa a la sílaba siguiente si esta empieza por vocal (ㅇ muda): 음악 → [으막].", cls: "tone-1" },
  "h-drop": { native: "ㅎ 탈락", name: "ㅎ que desaparece", description: "La ㅎ final ante vocal no se pronuncia: 좋아요 → [조아요].", cls: "tone-1" },
  gyeogeum: { native: "격음화", name: "Aspiración", description: "ㅎ junto a ㄱ/ㄷ/ㅂ/ㅈ las convierte en ㅋ/ㅌ/ㅍ/ㅊ: 좋다 → [조타], 축하 → [추카].", cls: "tone-4" },
  gugaeeum: { native: "구개음화", name: "Palatalización", description: "ㄷ/ㅌ final + 이 suenan [지]/[치]: 같이 → [가치].", cls: "tone-4" },
  neutral: { native: "받침 중화", name: "Neutralización de finales", description: "Las finales solo suenan como [ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅇ]: 꽃 → [꼳], 부엌 → [부억].", cls: "tone-5" },
  bieum: { native: "비음화", name: "Nasalización", description: "[ㄱ ㄷ ㅂ] ante ㄴ/ㅁ se vuelven [ㅇ ㄴ ㅁ]: 합니다 → [함니다], 한국말 → [한궁말].", cls: "tone-3" },
  yuseum: { native: "유음화", name: "Lateralización", description: "ㄴ junto a ㄹ se pronuncia [ㄹ]: 신라 → [실라], 설날 → [설랄].", cls: "tone-3" },
  gyeongeum: { native: "경음화", name: "Tensión", description: "Tras [ㄱ ㄷ ㅂ], ㄱ/ㄷ/ㅂ/ㅅ/ㅈ se vuelven tensas: 학교 → [학꾜], 식당 → [식땅].", cls: "tone-2" },
  "h-weak": { native: "ㅎ 약화", name: "ㅎ débil", description: "Entre sonoras (ㄴ ㄹ ㅁ ㅇ o vocal) la ㅎ se debilita al hablar rápido: 전화 → [저놔] (coloquial).", cls: "tone-5" },
};

export interface PronResult {
  /** Pronunciación estándar en hangul (con tensión) */
  pron: string;
  /** Forma sin marcar la tensión (base de la romanización revisada) */
  pronNoTense: string;
  rules: RuleId[];
  /** Regla aplicada en cada sílaba (para colorear) */
  perSyllable: (RuleId | null)[];
}

/**
 * Pronunciación de una palabra o frase. Trabaja dentro de cada palabra (separada por espacios),
 * que es donde se aplican las reglas en la pronunciación cuidada.
 */
export function pronounce(text: string): PronResult {
  const parts = text.split(/(\s+)/);
  const out: PronResult = { pron: "", pronNoTense: "", rules: [], perSyllable: [] };
  for (const part of parts) {
    if (!part || /^\s+$/.test(part)) {
      out.pron += part;
      out.pronNoTense += part;
      for (const _ of Array.from(part)) out.perSyllable.push(null);
      continue;
    }
    const r = pronounceWord(part);
    out.pron += r.pron;
    out.pronNoTense += r.pronNoTense;
    out.perSyllable.push(...r.perSyllable);
    for (const x of r.rules) if (!out.rules.includes(x)) out.rules.push(x);
  }
  return out;
}

function pronounceWord(word: string): PronResult {
  const chars = Array.from(word);
  const syl: (Syl | null)[] = chars.map(decompose);
  const rules: RuleId[] = [];
  const per: (RuleId | null)[] = chars.map(() => null);
  const mark = (i: number, r: RuleId) => {
    if (!rules.includes(r)) rules.push(r);
    if (per[i] === null) per[i] = r;
  };
  const tenseAt = new Set<number>();
  for (let i = 0; i < syl.length; i++) {
    const a = syl[i];
    const b = syl[i + 1];
    if (!a) continue;
    if (!b) {
      // final de palabra: neutralizar
      if (a.jong) {
        const s = DOUBLE_SIMPLE[a.jong] ?? NEUTRAL[a.jong] ?? a.jong;
        if (s !== a.jong) {
          a.jong = s;
          mark(i, "neutral");
        }
      }
      continue;
    }
    if (!a.jong) {
      // ㅎ débil entre vocal y ㅎ
      if (b.cho === "ㅎ") mark(i + 1, "h-weak");
      continue;
    }
    // 1) ㅎ final
    if (a.jong === "ㅎ" || a.jong === "ㄶ" || a.jong === "ㅀ") {
      const rest = a.jong === "ㅎ" ? "" : a.jong === "ㄶ" ? "ㄴ" : "ㄹ";
      if (b.cho === "ㅇ") {
        a.jong = "";
        if (rest) b.cho = rest;
        mark(i, "h-drop");
        continue;
      }
      if (ASPIRATE[b.cho]) {
        b.cho = ASPIRATE[b.cho];
        a.jong = rest;
        mark(i + 1, "gyeogeum");
        continue;
      }
      if (b.cho === "ㅅ") {
        a.jong = rest;
        b.cho = "ㅆ";
        mark(i + 1, "gyeongeum");
        continue;
      }
      if (b.cho === "ㄴ") {
        a.jong = rest ? (rest === "ㄹ" ? "ㄹ" : "ㄴ") : "ㄴ";
        if (rest === "ㄹ") b.cho = "ㄹ";
        mark(i, rest === "ㄹ" ? "yuseum" : "bieum");
        continue;
      }
    }
    // 2) ㄱ/ㄷ/ㅂ/ㅈ final + ㅎ → aspiración
    if (b.cho === "ㅎ") {
      const base = DOUBLE[a.jong]?.[1] && ["ㄺ", "ㄼ"].includes(a.jong) ? DOUBLE[a.jong][1] : NEUTRAL[a.jong] ?? a.jong;
      const head = base === "ㄷ" && ["ㅅ", "ㅈ", "ㅊ"].includes(a.jong) ? "ㄷ" : base;
      if (ASPIRATE[head]) {
        b.cho = ASPIRATE[head];
        a.jong = ["ㄺ", "ㄼ"].includes(a.jong) ? "ㄹ" : "";
        mark(i + 1, "gyeogeum");
        continue;
      }
      if (["ㄴ", "ㄹ", "ㅁ", "ㅇ"].includes(a.jong)) mark(i + 1, "h-weak");
    }
    // 3) 구개음화: ㄷ/ㅌ + 이
    if ((a.jong === "ㄷ" || a.jong === "ㅌ" || a.jong === "ㄾ") && b.cho === "ㅇ" && b.jung === "ㅣ") {
      b.cho = a.jong === "ㄷ" ? "ㅈ" : "ㅊ";
      a.jong = a.jong === "ㄾ" ? "ㄹ" : "";
      mark(i + 1, "gugaeeum");
      continue;
    }
    // 4) 연음
    if (b.cho === "ㅇ" && a.jong !== "ㅇ") {
      if (DOUBLE[a.jong]) {
        const [stay, move] = DOUBLE[a.jong];
        a.jong = stay;
        b.cho = move === "ㅅ" ? "ㅆ" : move;
      } else {
        b.cho = a.jong;
        a.jong = "";
      }
      mark(i + 1, "yeoneum");
      continue;
    }
    // 5) finales dobles y neutralización ante consonante
    const before = a.jong;
    let fin = DOUBLE_SIMPLE[a.jong] ?? a.jong;
    if (a.jong === "ㄺ" && b.cho === "ㄱ") fin = "ㄹ"; // 읽고 → [일꼬]
    if (a.jong === "ㄼ" && chars[i] === "밟") fin = "ㅂ";
    fin = NEUTRAL[fin] ?? fin;
    if (fin !== before) mark(i, "neutral");
    a.jong = fin;
    // 6) 비음화
    if (["ㄴ", "ㅁ"].includes(b.cho) && ["ㄱ", "ㄷ", "ㅂ"].includes(a.jong)) {
      a.jong = { ㄱ: "ㅇ", ㄷ: "ㄴ", ㅂ: "ㅁ" }[a.jong]!;
      mark(i, "bieum");
      continue;
    }
    if (b.cho === "ㄹ") {
      if (a.jong === "ㄴ" && !/^(의견|생산)/.test(word)) {
        a.jong = "ㄹ";
        mark(i, "yuseum");
        continue;
      }
      if (["ㅁ", "ㅇ"].includes(a.jong)) {
        b.cho = "ㄴ";
        mark(i + 1, "bieum");
        continue;
      }
      if (["ㄱ", "ㅂ"].includes(a.jong)) {
        b.cho = "ㄴ";
        a.jong = a.jong === "ㄱ" ? "ㅇ" : "ㅁ";
        mark(i, "bieum");
        continue;
      }
    }
    if (a.jong === "ㄹ" && b.cho === "ㄴ") {
      b.cho = "ㄹ";
      mark(i + 1, "yuseum");
      continue;
    }
    // 7) 경음화 tras [ㄱ ㄷ ㅂ]
    if (["ㄱ", "ㄷ", "ㅂ"].includes(a.jong) && TENSE[b.cho]) {
      tenseAt.add(i + 1);
      mark(i + 1, "gyeongeum");
    }
  }
  const noTense = syl.map((s, i) => (s ? compose(s) : chars[i])).join("");
  const tense = syl
    .map((s, i) => {
      if (!s) return chars[i];
      if (tenseAt.has(i) && TENSE[s.cho]) return compose({ ...s, cho: TENSE[s.cho] });
      return compose(s);
    })
    .join("");
  return { pron: tense, pronNoTense: noTense, rules, perSyllable: per };
}

/* ------------------------------ Romanización revisada ------------------------------ */

const R_CHO: Record<string, string> = { ㄱ: "g", ㄲ: "kk", ㄴ: "n", ㄷ: "d", ㄸ: "tt", ㄹ: "r", ㅁ: "m", ㅂ: "b", ㅃ: "pp", ㅅ: "s", ㅆ: "ss", ㅇ: "", ㅈ: "j", ㅉ: "jj", ㅊ: "ch", ㅋ: "k", ㅌ: "t", ㅍ: "p", ㅎ: "h" };
const R_JUNG: Record<string, string> = { ㅏ: "a", ㅐ: "ae", ㅑ: "ya", ㅒ: "yae", ㅓ: "eo", ㅔ: "e", ㅕ: "yeo", ㅖ: "ye", ㅗ: "o", ㅘ: "wa", ㅙ: "wae", ㅚ: "oe", ㅛ: "yo", ㅜ: "u", ㅝ: "wo", ㅞ: "we", ㅟ: "wi", ㅠ: "yu", ㅡ: "eu", ㅢ: "ui", ㅣ: "i" };
const R_JONG: Record<string, string> = { "": "", ㄱ: "k", ㄴ: "n", ㄷ: "t", ㄹ: "l", ㅁ: "m", ㅂ: "p", ㅇ: "ng" };

/** Romanización revisada: se aplica sobre la pronunciación sin tensión (como manda la norma). */
export function romanizeRR(text: string): string {
  const { pronNoTense } = pronounce(text);
  let out = "";
  const chars = Array.from(pronNoTense);
  for (let i = 0; i < chars.length; i++) {
    const s = decompose(chars[i]);
    if (!s) {
      out += chars[i];
      continue;
    }
    const prev = decompose(chars[i - 1] ?? "");
    let cho = R_CHO[s.cho];
    // ㄹ inicial de sílaba tras ㄹ final → l (ㄹㄹ = ll)
    if (s.cho === "ㄹ" && prev?.jong === "ㄹ") cho = "l";
    const jong = R_JONG[s.jong] ?? "";
    out += cho + R_JUNG[s.jung] + jong;
  }
  return out;
}

/* ------------------------------ Utilidades de jamo ------------------------------ */

/** Consonante inicial (초성) de cada sílaba: 한국 → ㅎㄱ */
export function choseong(text: string): string {
  return Array.from(text)
    .map((c) => decompose(c)?.cho ?? (isHangulJamo(c) ? c : ""))
    .join("");
}

export function hasBatchim(word: string): boolean {
  const last = Array.from(word.trim()).pop() ?? "";
  return Boolean(decompose(last)?.jong);
}

/** Partícula según batchim: 이/가, 은/는, 을/를, 와/과, (으)로 (con la excepción de ㄹ). */
export function josa(word: string, pair: "이/가" | "은/는" | "을/를" | "와/과" | "으로/로" | "이에요/예요" | "아/야"): string {
  const last = decompose(Array.from(word.trim()).pop() ?? "");
  const has = Boolean(last?.jong);
  const [withB, without] = pair.split("/");
  if (pair === "으로/로") return word + (has && last?.jong !== "ㄹ" ? "으로" : "로");
  return word + (has ? withB : without);
}
