/**
 * Conjugación coreana del nivel TOPIK I: 해요체 (-아요/어요), 합니다체 (-습니다/ㅂ니다), pasado (-았/었어요),
 * futuro (-(으)ㄹ 거예요), negación (안), -고 싶어요, -(으)세요, conectores (-고, -지만, -아서, -(으)니까,
 * -(으)면), -(으)ㄹ 수 있어요, -(으)ㄹ까요 y 반말, con los irregulares ㅂ, ㄷ, ㅅ, 르, ㅎ, 으 y ㄹ.
 */
import { compose, decompose } from "./phonology";

export type Irregular = null | "ㅂ" | "ㄷ" | "ㅅ" | "르" | "ㅎ" | "으" | "ㄹ";

export interface KoFormDef {
  id: string;
  name: string;
  native: string;
  level: "TOPIK1" | "TOPIK2";
  description: string;
}

export const KO_FORMS: KoFormDef[] = [
  { id: "ayo", name: "Presente cortés", native: "-아요/어요", level: "TOPIK1", description: "Estilo 해요체: el estándar cotidiano educado (먹어요 «como»)." },
  { id: "seumnida", name: "Presente formal", native: "-습니다/ㅂ니다", level: "TOPIK1", description: "합니다체: noticias, presentaciones, ejército, anuncios (먹습니다)." },
  { id: "past", name: "Pasado cortés", native: "-았/었어요", level: "TOPIK1", description: "먹었어요 «comí»." },
  { id: "future", name: "Futuro / intención", native: "-(으)ㄹ 거예요", level: "TOPIK1", description: "먹을 거예요 «voy a comer»." },
  { id: "neg", name: "Negación con 안", native: "안 -아요/어요", level: "TOPIK1", description: "안 먹어요 «no como» (하다-verbos: 공부 안 해요)." },
  { id: "want", name: "Querer", native: "-고 싶어요", level: "TOPIK1", description: "먹고 싶어요 «quiero comer»." },
  { id: "please", name: "Petición cortés", native: "-(으)세요", level: "TOPIK1", description: "드세요 / 앉으세요 «siéntese, por favor»; también honorífico." },
  { id: "and", name: "Y (conector)", native: "-고", level: "TOPIK1", description: "먹고 «como y…»." },
  { id: "but", name: "Pero", native: "-지만", level: "TOPIK1", description: "먹지만 «como, pero…»." },
  { id: "so", name: "Porque / y luego", native: "-아서/어서", level: "TOPIK1", description: "먹어서 «como…, así que»." },
  { id: "because", name: "Porque (razón)", native: "-(으)니까", level: "TOPIK1", description: "먹으니까 «como…, (así que)»." },
  { id: "if", name: "Si (condición)", native: "-(으)면", level: "TOPIK1", description: "먹으면 «si como»." },
  { id: "can", name: "Poder", native: "-(으)ㄹ 수 있어요", level: "TOPIK1", description: "먹을 수 있어요 «puedo comer»." },
  { id: "shall", name: "¿…? (propuesta)", native: "-(으)ㄹ까요?", level: "TOPIK1", description: "먹을까요? «¿comemos?»." },
  { id: "banmal", name: "Informal (반말)", native: "-아/어", level: "TOPIK1", description: "먹어 «como» (con amigos íntimos)." },
];

const lastSyl = (stem: string) => decompose(Array.from(stem).pop() ?? "");
const replaceLast = (stem: string, ch: string) => Array.from(stem).slice(0, -1).join("") + ch;

/** Infinitivo → raíz (먹다 → 먹). */
export function stemOf(verb: string): string {
  return verb.replace(/다$/, "");
}

/** ¿Vocal «brillante» (ㅏ/ㅗ) en la última sílaba? */
function bright(stem: string): boolean {
  const s = lastSyl(stem);
  return Boolean(s && (s.jung === "ㅏ" || s.jung === "ㅗ" || s.jung === "ㅑ"));
}

/** Detección de irregulares por terminación (con lista de regulares frecuentes que «parecen» irregulares). */
export function guessIrregular(verb: string): Irregular {
  const st = stemOf(verb);
  const s = lastSyl(st);
  if (!s) return null;
  if (/(입|잡|좁|씹|접|뽑|굽|업)$/.test(st) && !/^(굽)$/.test(st)) return null;
  if (s.jong === "ㅂ") return "ㅂ";
  if (s.jong === "ㄷ" && /(듣|걷|묻|싣|깨닫)$/.test(st)) return "ㄷ";
  if (s.jong === "ㅅ" && /(낫|짓|붓|긋|잇)$/.test(st)) return "ㅅ";
  if (/르$/.test(st) && !/(치르|따르)$/.test(st)) return "르";
  if (s.jong === "ㅎ" && !/(좋|놓|넣|낳)$/.test(st)) return "ㅎ";
  if (s.jong === "ㄹ") return "ㄹ";
  if (!s.jong && s.jung === "ㅡ") return "으";
  return null;
}

/** Forma -아/어 (base del presente, pasado, -아서…). */
export function aEo(verb: string, irr: Irregular = guessIrregular(verb)): string {
  const st = stemOf(verb);
  if (verb.endsWith("하다")) return st.slice(0, -1) + "해";
  if (verb === "이다") return "이어";
  const s = lastSyl(st)!;
  switch (irr) {
    case "ㅂ": {
      const base = replaceLast(st, compose({ ...s, jong: "" }));
      return /^(돕|곱)$/.test(st) ? base + "와" : base + "워";
    }
    case "ㄷ":
      return replaceLast(st, compose({ ...s, jong: "ㄹ" })) + (bright(st) ? "아" : "어");
    case "ㅅ":
      return replaceLast(st, compose({ ...s, jong: "" })) + (bright(st) ? "아" : "어");
    case "르": {
      const chars = Array.from(st);
      const prev = decompose(chars[chars.length - 2] ?? "");
      if (!prev) return st + "러";
      const head = chars.slice(0, -2).join("") + compose({ ...prev, jong: "ㄹ" });
      return head + (prev.jung === "ㅏ" || prev.jung === "ㅗ" ? "라" : "러");
    }
    case "ㅎ": {
      // 그렇다 → 그래, 빨갛다 → 빨개, 하얗다 → 하얘
      const v = s.jung === "ㅑ" ? "ㅒ" : "ㅐ";
      return replaceLast(st, compose({ ...s, jung: v, jong: "" }));
    }
    case "으": {
      const chars = Array.from(st);
      const prev = decompose(chars[chars.length - 2] ?? "");
      const brightPrev = prev && (prev.jung === "ㅏ" || prev.jung === "ㅗ");
      return replaceLast(st, compose({ ...s, jung: brightPrev ? "ㅏ" : "ㅓ" }));
    }
  }
  // regulares (incluida ㄹ): contracción vocálica si no hay batchim
  if (s.jong) return st + (bright(st) ? "아" : "어");
  const c = (jung: string) => replaceLast(st, compose({ ...s, jung }));
  switch (s.jung) {
    case "ㅏ":
    case "ㅓ":
    case "ㅐ":
    case "ㅔ":
    case "ㅕ":
      return st; // 가 → 가, 서 → 서, 내 → 내
    case "ㅗ":
      return c("ㅘ");
    case "ㅜ":
      return c("ㅝ");
    case "ㅣ":
      return c("ㅕ");
    case "ㅚ":
      return c("ㅙ");
    case "ㅡ":
      return c("ㅓ");
  }
  return st + "어";
}

/** ¿La raíz «necesita 으»? (termina en consonante distinta de ㄹ, considerando irregulares) */
function needsEu(st: string, irr: Irregular): boolean {
  const s = lastSyl(st);
  if (!s?.jong) return false;
  if (s.jong === "ㄹ") return false;
  if (irr === "ㅎ") return false;
  return true;
}

/** Raíz ante -(으)… : ㅂ→우, ㄷ→ㄹ, ㅅ→∅, ㅎ→∅ */
function euStem(st: string, irr: Irregular): string {
  const s = lastSyl(st)!;
  if (irr === "ㅂ") return replaceLast(st, compose({ ...s, jong: "" })) + "우";
  if (irr === "ㄷ") return replaceLast(st, compose({ ...s, jong: "ㄹ" })) + "으";
  if (irr === "ㅅ") return replaceLast(st, compose({ ...s, jong: "" })) + "으";
  if (irr === "ㅎ") return replaceLast(st, compose({ ...s, jong: "" }));
  return needsEu(st, irr) ? st + "으" : st;
}

/** Añade un final de sílaba (ㄹ, ㄴ, ㅂ) a la última sílaba abierta: 가 + ㄹ → 갈 */
function addJong(base: string, jong: string): string {
  const s = lastSyl(base);
  if (!s || s.jong) return base;
  return replaceLast(base, compose({ ...s, jong }));
}

export function conjugateKo(verb: string, form: string, irrIn?: Irregular): string | undefined {
  const irr = irrIn === undefined ? guessIrregular(verb) : irrIn;
  const st = stemOf(verb);
  if (!verb.endsWith("다")) return undefined;
  const ae = aEo(verb, irr);
  const isRieul = irr === "ㄹ";
  const dropL = (x: string) => (isRieul ? replaceLast(x, compose({ ...lastSyl(x)!, jong: "" })) : x);
  switch (form) {
    case "ayo":
      if (verb === "이다") return "이에요";
      return `${ae}요`;
    case "banmal":
      return ae;
    case "seumnida": {
      if (isRieul) return `${addJong(dropL(st), "ㅂ")}니다`;
      const s = lastSyl(st);
      return s?.jong ? `${st}습니다` : `${addJong(st, "ㅂ")}니다`;
    }
    case "past": {
      const base = ae;
      const s = lastSyl(base)!;
      // 해 → 했, 가 → 갔, 마셔 → 마셨
      if (!s.jong && /[ㅏㅐㅓㅔㅕㅘㅝㅙㅒ]/.test(s.jung) && !/(아|어)$/.test(base)) return `${replaceLast(base, compose({ ...s, jong: "ㅆ" }))}어요`;
      return `${base.replace(/아$/, "았").replace(/어$/, "었")}어요`;
    }
    case "future":
      if (isRieul) return `${st} 거예요`;
      return `${addJong(euStem(st, irr), "ㄹ")} 거예요`;
    case "neg":
      if (verb.endsWith("하다") && verb.length > 2) return `${st.slice(0, -1)} 안 해요`;
      return `안 ${ae}요`;
    case "want":
      return `${st}고 싶어요`;
    case "please":
      if (isRieul) return `${dropL(st)}세요`;
      return `${euStem(st, irr)}세요`;
    case "and":
      return `${st}고`;
    case "but":
      return `${st}지만`;
    case "so":
      return `${ae}서`;
    case "because":
      if (isRieul) return `${dropL(st)}니까`;
      return `${euStem(st, irr)}니까`;
    case "if":
      if (isRieul) return `${st}면`;
      return `${euStem(st, irr)}면`;
    case "can":
      if (isRieul) return `${st} 수 있어요`;
      return `${addJong(euStem(st, irr), "ㄹ")} 수 있어요`;
    case "shall":
      if (isRieul) return `${st}까요?`;
      return `${addJong(euStem(st, irr), "ㄹ")}까요?`;
  }
  return undefined;
}

/** Irregularidades especiales de verbos honoríficos frecuentes (-(으)세요). */
export const HONORIFIC_SPECIAL: Record<string, string> = { 먹다: "드세요", 마시다: "드세요", 자다: "주무세요", 있다: "계세요", 말하다: "말씀하세요" };

/** Lema probable de una forma conjugada (먹었어요 → 먹다). Heurístico; se valida contra el diccionario. */
export function lemmaCandidatesKo(form: string): string[] {
  const out = new Set<string>();
  const f = form.replace(/[.?!,]$/, "");
  const ENDINGS = ["었어요", "았어요", "였어요", "했어요", "어요", "아요", "해요", "습니다", "ㅂ니다", "었습니다", "았습니다", "고 싶어요", "고", "지만", "어서", "아서", "으세요", "세요", "으면", "면", "으니까", "니까", "을 거예요", "ㄹ 거예요", "어", "아", "었다", "았다", "는다", "ㄴ다", "다"];
  for (const e of ENDINGS) {
    if (!f.endsWith(e) || f.length <= e.length) continue;
    const st = f.slice(0, -e.length);
    out.add(`${st}다`);
    if (e === "해요" || e === "했어요") out.add(`${st}하다`);
  }
  // contracciones: 가요 → 가다, 와요 → 오다, 마셔요 → 마시다, 줘요 → 주다, 돼요 → 되다
  const chars = Array.from(f.replace(/(요|어요|았어요|었어요)$/, ""));
  const last = decompose(chars[chars.length - 1] ?? "");
  if (last) {
    const head = chars.slice(0, -1).join("");
    const back: Record<string, string> = { ㅘ: "ㅗ", ㅝ: "ㅜ", ㅕ: "ㅣ", ㅙ: "ㅚ", ㅓ: "ㅡ" };
    if (back[last.jung]) out.add(`${head}${compose({ ...last, jung: back[last.jung], jong: "" })}다`);
    out.add(`${head}${compose({ ...last, jong: "" })}다`);
    if (last.jong === "ㅆ") out.add(`${head}${compose({ ...last, jong: "" })}다`);
  }
  return Array.from(out);
}

export const KO_IRREGULAR_INFO: { id: Exclude<Irregular, null>; name: string; description: string; examples: string[] }[] = [
  { id: "ㅂ", name: "Irregular ㅂ", description: "La ㅂ final se convierte en 우 ante vocal: 춥다 → 추워요, 쉽다 → 쉬워요 (돕다/곱다 → 도와요). Regulares: 입다, 잡다, 좁다.", examples: ["춥다", "덥다", "어렵다", "돕다"] },
  { id: "ㄷ", name: "Irregular ㄷ", description: "La ㄷ final se convierte en ㄹ ante vocal: 듣다 → 들어요, 걷다 → 걸어요. Regulares: 받다, 닫다, 믿다.", examples: ["듣다", "걷다", "묻다"] },
  { id: "ㅅ", name: "Irregular ㅅ", description: "La ㅅ final desaparece ante vocal: 낫다 → 나아요, 짓다 → 지어요. Regulares: 웃다, 씻다, 벗다.", examples: ["낫다", "짓다"] },
  { id: "르", name: "Irregular 르", description: "르 + 아/어 → ㄹ라/ㄹ러: 모르다 → 몰라요, 부르다 → 불러요, 빠르다 → 빨라요.", examples: ["모르다", "부르다", "빠르다", "다르다"] },
  { id: "ㅎ", name: "Irregular ㅎ", description: "Adjetivos de color y 그렇다/이렇다: la ㅎ cae y la vocal se vuelve ㅐ: 그렇다 → 그래요, 빨갛다 → 빨개요. Regulares: 좋다, 놓다, 넣다.", examples: ["그렇다", "빨갛다", "노랗다"] },
  { id: "으", name: "Eliminación de ㅡ", description: "La ㅡ final desaparece ante 아/어: 쓰다 → 써요, 바쁘다 → 바빠요, 크다 → 커요.", examples: ["쓰다", "바쁘다", "크다", "예쁘다"] },
  { id: "ㄹ", name: "Eliminación de ㄹ", description: "La ㄹ final cae ante ㄴ, ㅂ, ㅅ: 살다 → 사세요, 삽니다; 만들다 → 만드세요; y no se añade 으: 살면.", examples: ["살다", "만들다", "알다", "놀다"] },
];
