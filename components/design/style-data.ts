/** Datos de muestra de la guía de estilo por idioma (nombres de color, familias, ejemplos). */
import type { Lang } from "@/lib/languages/types";

export interface StyleData {
  colors: Record<string, { native: string; name: string }>;
  families: [string, string, string][]; // clase, etiqueta, muestra
  tiles: string[];
  card1: { word: string; reading: string; meaning: string; example: string; exampleReading: string; exampleTranslation: string };
  card2: { word: string; reading: string; meaning: string };
  seals: { brand: string; user: string; done: string; level: string; ok: string };
  divider: string;
  grid: string;
  empty: { text: string; reading: string; es: string };
  tagline: string;
}

export const STYLE_DATA: Record<Lang, StyleData> = {
  zh: {
    colors: {
      paper: { native: "宣纸", name: "xuānzhǐ" }, "paper-raised": { native: "月白", name: "yuèbái" }, "paper-sunk": { native: "缃色", name: "xiāngsè" }, line: { native: "素", name: "sù" },
      ink: { native: "墨", name: "mò" }, "ink-soft": { native: "淡墨", name: "dànmò" }, "ink-faint": { native: "枯墨", name: "kūmò" }, cinnabar: { native: "朱砂", name: "zhūshā" },
      "cinnabar-ink": { native: "胭脂", name: "yānzhi" }, celadon: { native: "青瓷", name: "qīngcí" }, indigo: { native: "黛蓝", name: "dàilán" }, gold: { native: "赭金", name: "zhějīn" }, danger: { native: "绛", name: "jiàng" },
    },
    families: [
      ["zh", "Noto Sans SC · interfaz", "你好，我叫雨果。"],
      ["zh-serif", "Noto Serif SC · protagonista", "学而时习之，不亦说乎"],
      ["zh-kai", "LXGW WenKai · estudio / caligrafía", "千里之行，始于足下"],
      ["zh-display", "LXGW WenKai · sellos y marca (solo decorativo)", "学伴"],
    ],
    tiles: ["你好", "谢谢", "再见", "对不起"],
    card1: { word: "学", reading: "xué", meaning: "estudiar, aprender", example: "我学中文。", exampleReading: "Wǒ xué Zhōngwén.", exampleTranslation: "Estudio chino." },
    card2: { word: "朋友", reading: "péng you", meaning: "amigo/a" },
    seals: { brand: "学伴", user: "雨果", done: "完成", level: "HSK1", ok: "好" },
    divider: "第一课",
    grid: "永",
    empty: { text: "千里之行，始于足下", reading: "qiān lǐ zhī xíng, shǐ yú zú xià", es: "Un viaje de mil li empieza con un paso." },
    tagline: "宣纸与墨 · papel y tinta",
  },
  ja: {
    colors: {
      paper: { native: "生成り", name: "kinari" }, "paper-raised": { native: "白練", name: "shironeri" }, "paper-sunk": { native: "砂色", name: "sunairo" }, line: { native: "鼠", name: "nezumi" },
      ink: { native: "墨", name: "sumi" }, "ink-soft": { native: "薄墨", name: "usuzumi" }, "ink-faint": { native: "灰", name: "hai" }, cinnabar: { native: "藍", name: "ai (acento)" },
      "cinnabar-ink": { native: "紺", name: "kon" }, celadon: { native: "抹茶", name: "matcha" }, indigo: { native: "藍", name: "ai" }, gold: { native: "山吹", name: "yamabuki" }, danger: { native: "朱", name: "shu" },
    },
    families: [
      ["ja", "Noto Sans JP · interfaz", "こんにちは、ウーゴです。"],
      ["zh-serif", "Noto Serif JP · protagonista (明朝)", "継続は力なり"],
      ["zh-kai", "Klee One · libro de texto", "千里の道も一歩から"],
      ["zh-display", "Zen Old Mincho · sellos y marca", "学伴"],
    ],
    tiles: ["こんにちは", "ありがとう", "さようなら", "すみません"],
    card1: { word: "学校", reading: "がっこう", meaning: "escuela", example: "毎日学校に行きます。", exampleReading: "まいにち がっこう に いきます。", exampleTranslation: "Voy a la escuela todos los días." },
    card2: { word: "友だち", reading: "ともだち", meaning: "amigo/a" },
    seals: { brand: "学伴", user: "ウーゴ", done: "完了", level: "N5", ok: "良" },
    divider: "第一課",
    grid: "永",
    empty: { text: "継続は力なり", reading: "けいぞく は ちから なり", es: "La constancia es fuerza." },
    tagline: "和紙と藍 · washi e índigo",
  },
  ko: {
    colors: {
      paper: { native: "한지", name: "hanji" }, "paper-raised": { native: "백색", name: "baeksaek" }, "paper-sunk": { native: "미색", name: "misaek" }, line: { native: "회색", name: "hoesaek" },
      ink: { native: "먹", name: "meok" }, "ink-soft": { native: "옅은 먹", name: "yeoteun meok" }, "ink-faint": { native: "잿빛", name: "jaetbit" }, cinnabar: { native: "청", name: "cheong (acento)" },
      "cinnabar-ink": { native: "짙은 청", name: "jiteun cheong" }, celadon: { native: "청자", name: "cheongja" }, indigo: { native: "청", name: "cheong" }, gold: { native: "황", name: "hwang" }, danger: { native: "적", name: "jeok" },
    },
    families: [
      ["ko", "Noto Sans KR · interfaz", "안녕하세요, 우고예요."],
      ["zh-serif", "Noto Serif KR · protagonista", "시작이 반이다"],
      ["zh-kai", "Gowun Dodum · acento manuscrito", "천 리 길도 한 걸음부터"],
      ["zh-display", "Gowun Batang · sellos y marca", "학반"],
    ],
    tiles: ["안녕하세요", "감사합니다", "안녕히 가세요", "죄송합니다"],
    card1: { word: "학교", reading: "hakgyo", meaning: "escuela", example: "매일 학교에 가요.", exampleReading: "maeil hakgyoe gayo.", exampleTranslation: "Voy a la escuela todos los días." },
    card2: { word: "친구", reading: "chingu", meaning: "amigo/a" },
    seals: { brand: "학반", user: "우고", done: "완료", level: "TOPIK", ok: "좋" },
    divider: "제1과",
    grid: "한",
    empty: { text: "시작이 반이다", reading: "sijagi banida", es: "Empezar es la mitad del camino." },
    tagline: "한지와 오방색 · hanji y cinco colores",
  },
};
