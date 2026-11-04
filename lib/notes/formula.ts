/**
 * Generador de ejemplos a partir de una fórmula gramatical: rellena los huecos (sujeto, tiempo, lugar, verbo,
 * objeto, adjetivo, número + clasificador) con palabras del mazo del usuario. Lógica pura (chino).
 */
import type { FormulaPart } from "./templates";
import { seededRandom } from "@/lib/utils";

export interface VocabWord {
  hanzi: string;
  pinyin: string;
  meaning: string;
  category?: string;
  known?: boolean;
}

/** Candidatos por hueco: listas de respaldo (HSK 1) + palabras del mazo por categoría. */
const FALLBACK: Record<string, { zh: string; es: string }[]> = {
  subject: [
    { zh: "我", es: "yo" },
    { zh: "你", es: "tú" },
    { zh: "他", es: "él" },
    { zh: "她", es: "ella" },
    { zh: "我们", es: "nosotros" },
    { zh: "老师", es: "el profesor" },
    { zh: "我朋友", es: "mi amigo" },
    { zh: "妈妈", es: "mamá" },
  ],
  time: [
    { zh: "今天", es: "hoy" },
    { zh: "明天", es: "mañana" },
    { zh: "现在", es: "ahora" },
    { zh: "早上", es: "por la mañana" },
    { zh: "晚上", es: "por la noche" },
    { zh: "星期一", es: "el lunes" },
    { zh: "下午", es: "por la tarde" },
  ],
  place: [
    { zh: "在家", es: "en casa" },
    { zh: "在学校", es: "en la escuela" },
    { zh: "在北京", es: "en Pekín" },
    { zh: "在饭馆", es: "en el restaurante" },
    { zh: "在商店", es: "en la tienda" },
    { zh: "在医院", es: "en el hospital" },
  ],
  verb: [
    { zh: "吃", es: "comer" },
    { zh: "喝", es: "beber" },
    { zh: "看", es: "ver" },
    { zh: "买", es: "comprar" },
    { zh: "学习", es: "estudiar" },
    { zh: "去", es: "ir a" },
    { zh: "喜欢", es: "gustar" },
    { zh: "做", es: "hacer" },
  ],
  object: [
    { zh: "米饭", es: "arroz" },
    { zh: "茶", es: "té" },
    { zh: "书", es: "un libro" },
    { zh: "电影", es: "una película" },
    { zh: "中文", es: "chino" },
    { zh: "水果", es: "fruta" },
    { zh: "咖啡", es: "café" },
  ],
  adjective: [
    { zh: "高兴", es: "contento" },
    { zh: "忙", es: "ocupado" },
    { zh: "好", es: "bien" },
    { zh: "大", es: "grande" },
    { zh: "漂亮", es: "bonito" },
    { zh: "热", es: "caluroso" },
    { zh: "冷", es: "frío" },
  ],
  number: [
    { zh: "一", es: "un" },
    { zh: "两", es: "dos" },
    { zh: "三", es: "tres" },
    { zh: "五", es: "cinco" },
  ],
  measure: [
    { zh: "个", es: "" },
    { zh: "本", es: "" },
    { zh: "杯", es: "" },
  ],
  adverb: [
    { zh: "很", es: "muy" },
    { zh: "也", es: "también" },
    { zh: "都", es: "todos" },
    { zh: "不", es: "no" },
  ],
  question: [
    { zh: "什么", es: "qué" },
    { zh: "谁", es: "quién" },
    { zh: "哪儿", es: "dónde" },
    { zh: "几", es: "cuántos" },
  ],
};

const CATEGORY_FOR_ROLE: Record<string, string[]> = {
  subject: ["Pronombres", "Familia y personas"],
  time: ["Tiempo y fechas"],
  place: ["Lugares"],
  verb: ["Verbos básicos"],
  object: ["Comida y bebida", "Casa y objetos", "Ocio"],
  adjective: ["Adjetivos"],
  number: ["Números y cantidades"],
};

/** ¿La ficha es un hueco (nombre de función) o una palabra fija (在, 了, 吗…)? */
function isSlot(p: FormulaPart): boolean {
  const t = p.text.trim();
  if (!t) return true;
  if (/[一-鿿]/.test(t)) return false; // texto chino fijo
  return true; // «Sujeto», «lugar», «V», «O»…
}

const VERB_ONLY = /^(吃|喝|看|买|学习|去|喜欢|做|听|说|读|写|来|坐|住|工作|睡觉|打电话|认识|叫|有|是|在|想|要|会|能)$/;

export function fillFormula(parts: FormulaPart[], vocab: VocabWord[], n = 3, seed = 1): { zh: string; es: string }[] {
  const rng = seededRandom(seed * 7919);
  const pool = (role: string): { zh: string; es: string }[] => {
    const cats = CATEGORY_FOR_ROLE[role] ?? [];
    const fromDeck = vocab
      .filter((w) => w.known && cats.includes(w.category ?? "") && w.hanzi.length <= 3)
      .filter((w) => (role === "verb" ? VERB_ONLY.test(w.hanzi) : true))
      .map((w) => ({ zh: role === "place" && !w.hanzi.startsWith("在") ? `在${w.hanzi}` : w.hanzi, es: w.meaning.split(/[;,(]/)[0].trim() }));
    const fb = FALLBACK[role] ?? [];
    return fromDeck.length >= 3 ? fromDeck : [...fromDeck, ...fb];
  };
  const out: { zh: string; es: string }[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < n && guard++ < n * 6) {
    let zh = "";
    const es: string[] = [];
    for (const p of parts) {
      if (!isSlot(p)) {
        zh += p.text.trim();
        continue;
      }
      const c = pool(p.role);
      if (!c.length) {
        zh += `[${p.text || p.role}]`;
        continue;
      }
      const pick = c[Math.floor(rng() * c.length)];
      zh += pick.zh;
      if (pick.es) es.push(pick.es);
    }
    if (!zh || seen.has(zh)) continue;
    seen.add(zh);
    out.push({ zh: /[。？！]$/.test(zh) ? zh : zh + "。", es: es.join(" · ") });
  }
  return out;
}
