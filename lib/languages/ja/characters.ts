/** Kanji (KANJIDIC2 + KRADFILE) y kana; trazos de KanjiVG; contadores 助数詞. */
import type { CharacterModule, CounterModule, StrokeProvider } from "@/lib/languages/types";
import { withBase } from "@/lib/base-path";
import { isJapaneseChar, isKana, isKanji, KANA_LIST, SIMILAR_SETS, toRomaji } from "./kana";

interface KanjiRow {
  on: string[];
  kun: string[];
  es: string[];
  en: string[];
  s: number;
  g: number;
  j: string;
  f: number;
  r: number;
  c: string[];
}

let kanji: Record<string, KanjiRow> | undefined;
let radk: Record<string, [number, string]> | undefined;
let jlpt: { words: Record<string, string[]>; kanji: Record<string, string[]> } | undefined;
let loading: Promise<void> | undefined;

export async function loadKanji(): Promise<void> {
  if (kanji) return;
  if (!loading) {
    loading = (async () => {
      const [k, r, j] = await Promise.all([fetch(withBase("/data/ja/kanji.json")), fetch(withBase("/data/ja/radk.json")), fetch(withBase("/data/ja/jlpt.json"))]);
      kanji = k.ok ? ((await k.json()) as Record<string, KanjiRow>) : {};
      radk = r.ok ? ((await r.json()) as Record<string, [number, string]>) : {};
      jlpt = j.ok ? await j.json() : { words: {}, kanji: {} };
    })();
  }
  await loading;
}

export const kanjiInfo = (c: string): KanjiRow | undefined => kanji?.[c];
export const radkTable = () => radk ?? {};
export const jlptData = () => jlpt;

/** Nombre de los 214 radicales clásicos no se incluye: usamos los componentes de KRADFILE (estilo jisho). */
export const jaCharacters: CharacterModule = {
  name: "Kana y kanji",
  isChar: isJapaneseChar,
  charsOf: (text) => Array.from(text).filter(isJapaneseChar),
  load: loadKanji,
  loaded: () => Boolean(kanji),
  info(ch) {
    if (isKana(ch)) {
      const k = KANA_LIST.find((x) => x.kana === ch);
      return { char: ch, readings: [k?.romaji ?? toRomaji(ch)], meaning: k ? `${k.script === "hiragana" ? "hiragana" : "katakana"} «${k.romaji}»` : undefined, components: [], level: "kana" };
    }
    const k = kanji?.[ch];
    if (!k) return undefined;
    return {
      char: ch,
      readings: [...k.on, ...k.kun],
      meaning: k.es.join(", ") || undefined,
      meaningEn: k.en.join(", "),
      strokes: k.s,
      radical: k.c[0],
      components: k.c.filter((c) => c !== ch),
      level: k.j ? `JLPT ${k.j}` : k.g ? `jōyō ${k.g <= 6 ? `${k.g}.º` : "secundaria"}` : undefined,
      extra: { on: k.on, kun: k.kun, grade: k.g, freq: k.f, jlpt: k.j, es: k.es, en: k.en },
    };
  },
  similarSets: SIMILAR_SETS,
  components: (ch) => kanji?.[ch]?.c.filter((c) => c !== ch) ?? [],
  allComponents: ["亻", "氵", "口", "女", "子", "日", "月", "木", "土", "心", "言", "辶", "扌", "艹", "宀", "門", "馬", "又", "力", "大", "小", "山", "火", "田", "目", "耳", "手", "車", "貝", "金", "糸", "食", "人", "十", "一"],
  radicalMeaning: (r) => kanji?.[r]?.es[0] ?? kanji?.[r]?.en[0],
  allRadicals: ["亻", "氵", "口", "女", "子", "日", "月", "木", "土", "心", "言", "扌", "艹", "宀", "門", "金", "糸", "食", "車", "貝"],
  levelChars: (level) => jlpt?.kanji[level] ?? [],
};

export const jaStrokes: StrokeProvider = {
  kind: "kanjivg",
  url: (ch) => withBase(`/data/ja/strokes/${encodeURIComponent(ch)}.json`),
  grid: "renshucho",
};

export { isKanji };

/* ------------------------------ Contadores ------------------------------ */


export const JA_COUNTERS: { counter: string; reading: string; es: string; nouns: string[]; series: string[]; note?: string }[] = [
  { counter: "つ", reading: "つ", es: "cosas en general (1–10, numerales nativos)", nouns: ["りんご", "かばん", "質問"], series: ["ひとつ", "ふたつ", "みっつ", "よっつ", "いつつ", "むっつ", "ななつ", "やっつ", "ここのつ", "とお"], note: "Se usa cuando no sabes el contador. Del 11 en adelante se dice el número solo (十一)." },
  { counter: "人", reading: "にん", es: "personas", nouns: ["学生", "先生", "友達"], series: ["ひとり", "ふたり", "さんにん", "よにん", "ごにん", "ろくにん", "ななにん", "はちにん", "きゅうにん", "じゅうにん"], note: "1 y 2 son irregulares: ひとり, ふたり; 4 es よにん." },
  { counter: "本", reading: "ほん", es: "objetos largos y cilíndricos (lápices, botellas, paraguas)", nouns: ["ペン", "傘", "ビール"], series: ["いっぽん", "にほん", "さんぼん", "よんほん", "ごほん", "ろっぽん", "ななほん", "はっぽん", "きゅうほん", "じゅっぽん"], note: "Cambios de sonido: いっぽん, さんぼん, ろっぽん, はっぽん, じゅっぽん." },
  { counter: "枚", reading: "まい", es: "objetos planos y finos (papel, camisas, sellos, billetes)", nouns: ["紙", "切符", "シャツ"], series: ["いちまい", "にまい", "さんまい", "よんまい", "ごまい", "ろくまい", "ななまい", "はちまい", "きゅうまい", "じゅうまい"] },
  { counter: "匹", reading: "ひき", es: "animales pequeños (perros, gatos, peces)", nouns: ["犬", "猫", "魚"], series: ["いっぴき", "にひき", "さんびき", "よんひき", "ごひき", "ろっぴき", "ななひき", "はっぴき", "きゅうひき", "じゅっぴき"], note: "いっぴき, さんびき, ろっぴき, はっぴき, じゅっぴき." },
  { counter: "冊", reading: "さつ", es: "libros, cuadernos, revistas", nouns: ["本", "ノート", "雑誌"], series: ["いっさつ", "にさつ", "さんさつ", "よんさつ", "ごさつ", "ろくさつ", "ななさつ", "はっさつ", "きゅうさつ", "じゅっさつ"] },
  { counter: "台", reading: "だい", es: "máquinas y vehículos", nouns: ["車", "自転車", "パソコン"], series: ["いちだい", "にだい", "さんだい", "よんだい", "ごだい", "ろくだい", "ななだい", "はちだい", "きゅうだい", "じゅうだい"] },
  { counter: "杯", reading: "はい", es: "vasos, tazas, cuencos (bebida y comida servida)", nouns: ["コーヒー", "水", "ご飯"], series: ["いっぱい", "にはい", "さんばい", "よんはい", "ごはい", "ろっぱい", "ななはい", "はっぱい", "きゅうはい", "じゅっぱい"] },
  { counter: "個", reading: "こ", es: "objetos pequeños y compactos", nouns: ["卵", "りんご", "消しゴム"], series: ["いっこ", "にこ", "さんこ", "よんこ", "ごこ", "ろっこ", "ななこ", "はっこ", "きゅうこ", "じゅっこ"] },
  { counter: "歳", reading: "さい", es: "años de edad", nouns: ["子ども", "私"], series: ["いっさい", "にさい", "さんさい", "よんさい", "ごさい", "ろくさい", "ななさい", "はっさい", "きゅうさい", "じゅっさい"], note: "20 años: はたち." },
  { counter: "回", reading: "かい", es: "veces", nouns: ["練習", "旅行"], series: ["いっかい", "にかい", "さんかい", "よんかい", "ごかい", "ろっかい", "ななかい", "はっかい", "きゅうかい", "じゅっかい"] },
  { counter: "階", reading: "かい", es: "pisos de un edificio", nouns: ["ビル", "デパート"], series: ["いっかい", "にかい", "さんがい", "よんかい", "ごかい", "ろっかい", "ななかい", "はっかい", "きゅうかい", "じゅっかい"], note: "さんがい (3.º piso)." },
  { counter: "円", reading: "えん", es: "yenes", nouns: ["お金"], series: ["いちえん", "にえん", "さんえん", "よえん", "ごえん", "ろくえん", "ななえん", "はちえん", "きゅうえん", "じゅうえん"], note: "4 yenes: よえん." },
];

const NOUN_COUNTER = new Map<string, string>();
for (const c of JA_COUNTERS) for (const n of c.nouns) if (!NOUN_COUNTER.has(n)) NOUN_COUNTER.set(n, c.counter);
const EXTRA: Record<string, string> = { 鉛筆: "本", 傘: "本", 瓶: "本", 川: "本", 木: "本", 映画: "本", 写真: "枚", 皿: "枚", 切手: "枚", ハガキ: "枚", 鳥: "羽", 子ども: "人", 人: "人", 家族: "人", 兄弟: "人", 辞書: "冊", 教科書: "冊", 車: "台", テレビ: "台", 時計: "個", ケーキ: "個", お茶: "杯", 牛乳: "杯", 部屋: "つ", 椅子: "つ", 机: "つ" };
for (const [k, v] of Object.entries(EXTRA)) if (!NOUN_COUNTER.has(k)) NOUN_COUNTER.set(k, v);

export const jaCounters: CounterModule = {
  name: "Contadores",
  native: "助数詞",
  counters: JA_COUNTERS.map((c) => ({ counter: c.counter, reading: c.reading, es: c.es, nouns: c.nouns, note: c.note, examples: c.series.slice(0, 3).map((r, i) => ({ text: `${i + 1}${c.counter}`, reading: r, es: `${i + 1}` })) })),
  of: (w) => {
    const c = NOUN_COUNTER.get(w);
    return c ? [c] : undefined;
  },
  hint: (c) => JA_COUNTERS.find((x) => x.counter === c)?.es,
  markdown: "En japonés los números no van solos delante de los nombres: se cuenta con un **contador** (助数詞) según la forma del objeto. Ojo con los **cambios de sonido** con 1, 3, 6, 8 y 10 (いっぽん, さんぼん…). La construcción típica es *Nombre + を + número-contador + Verbo*: 「ペンを二本買いました」.",
};

/** Lectura de «número + contador» (1–10). */
export function counterReading(counter: string, n: number): string | undefined {
  return JA_COUNTERS.find((c) => c.counter === counter)?.series[n - 1];
}
