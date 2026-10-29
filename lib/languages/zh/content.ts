/** Contenido estático del paquete chino: curso, gramática, lecturas, artículos, recursos y semilla. */
import type { GrammarPoint, Unit } from "@/lib/course/types";
import type { GradedReading } from "@/lib/readings/types";
import type { Article, Resource } from "@/lib/study-hall/types";
import type { SeedData, SeedWord } from "@/lib/languages/types";
import { buildCurriculum } from "@/lib/languages/core/curriculum";
import grammarJson from "@/content/zh/grammar.json";
import readingsJson from "@/content/zh/readings/readings.json";
import articlesJson from "@/content/zh/articles.json";
import resourcesJson from "@/content/zh/resources.json";
import seedJson from "@/content/zh/seed/hsk1_vocab.json";
import u0Pron from "@/content/zh/course/u0-pronunciacion.json";
import u0Chars from "@/content/zh/course/u0-caracteres.json";
import u01 from "@/content/zh/course/u01-saludos.json";
import u02 from "@/content/zh/course/u02-numeros.json";
import u03 from "@/content/zh/course/u03-familia.json";
import u04 from "@/content/zh/course/u04-tiempo.json";
import u05 from "@/content/zh/course/u05-comida.json";
import u06 from "@/content/zh/course/u06-compras.json";
import u07 from "@/content/zh/course/u07-lugares.json";
import u08 from "@/content/zh/course/u08-transporte.json";
import u09 from "@/content/zh/course/u09-escuela.json";
import u10 from "@/content/zh/course/u10-clima.json";
import u11 from "@/content/zh/course/u11-salud.json";
import u12 from "@/content/zh/course/u12-ocio.json";
import u13 from "@/content/zh/course/u13-rutina.json";
import u14 from "@/content/zh/course/u14-telefono.json";

export const UNITS: Unit[] = ([u0Pron, u0Chars, u01, u02, u03, u04, u05, u06, u07, u08, u09, u10, u11, u12, u13, u14] as Unit[]).sort((a, b) => a.order - b.order);
export const GRAMMAR: GrammarPoint[] = grammarJson as GrammarPoint[];
export const READINGS: GradedReading[] = readingsJson as GradedReading[];
export const ARTICLES: Article[] = articlesJson as Article[];
export const RESOURCES: Resource[] = (resourcesJson as Resource[]).filter((r) => r.verified);

export const SEED: SeedData = {
  version: 1,
  source: (seedJson as { source: string }).source,
  levelTag: "HSK1",
  words: (seedJson as { words: SeedWord[] }).words.map((w) => ({ ...w, lang: "zh" as const })),
};

export const CATEGORY_META: Record<string, { color: string; icon: string }> = {
  "Saludos y expresiones": { color: "#c0392b", icon: "Hand" },
  Pronombres: { color: "#8e44ad", icon: "Users" },
  "Números y cantidades": { color: "#1f6fd0", icon: "Hash" },
  Preguntas: { color: "#d35400", icon: "CircleHelp" },
  Clasificadores: { color: "#16a085", icon: "Boxes" },
  "Tiempo y fechas": { color: "#2980b9", icon: "CalendarDays" },
  Adjetivos: { color: "#e67e22", icon: "Sparkles" },
  "Familia y personas": { color: "#c2185b", icon: "Baby" },
  "Escuela y trabajo": { color: "#2e8b57", icon: "GraduationCap" },
  "Comida y bebida": { color: "#b8860b", icon: "Utensils" },
  "Casa y objetos": { color: "#7f8c8d", icon: "Home" },
  Lugares: { color: "#27ae60", icon: "MapPin" },
  Transporte: { color: "#34495e", icon: "TrainFront" },
  "Posición y dirección": { color: "#0097a7", icon: "Compass" },
  "Partículas y gramática": { color: "#6d4c41", icon: "Puzzle" },
  "Verbos básicos": { color: "#c0392b", icon: "Zap" },
  Adverbios: { color: "#5d6d7e", icon: "ArrowUpRight" },
  Ocio: { color: "#e91e63", icon: "Music" },
  Animales: { color: "#795548", icon: "Cat" },
  "Tiempo atmosférico": { color: "#03a9f4", icon: "CloudSun" },
  Salud: { color: "#f44336", icon: "HeartPulse" },
  Clase: { color: "#2f8f6f", icon: "NotebookPen" },
};

/** Reglas sencillas de detección de gramática HSK 1–3 (ids de content/zh/grammar.json). */
const RULES: { id: string; test: (zh: string) => boolean }[] = [
  { id: "ma", test: (s) => /吗[？?]/.test(s) },
  { id: "ne", test: (s) => /呢[？?。]/.test(s) },
  { id: "ba", test: (s) => /吧[。！!]/.test(s) },
  { id: "shi", test: (s) => /(^|[^不])是(?!不是)/.test(s) && !/是……的|是.{1,8}的$/.test(s) },
  { id: "bu-mei", test: (s) => /没(有|去|来|看|吃|说|听|买|做)|不(是|去|来|喜欢|想|要|会|能|好|太)/.test(s) },
  { id: "you", test: (s) => /(^|[^没])有/.test(s) },
  { id: "zai", test: (s) => /在/.test(s) },
  { id: "le", test: (s) => /了/.test(s) },
  { id: "modal-verbs", test: (s) => /会|能|可以|想|要/.test(s) },
  { id: "measure-words", test: (s) => /[一二两三四五六七八九十几这那哪][个本块件口杯瓶只岁张条位辆家次些]/.test(s) },
  { id: "de", test: (s) => /的/.test(s) },
  { id: "question-words", test: (s) => /什么|谁|哪儿|哪里|哪|几|多少|怎么样|怎么/.test(s) },
  { id: "tai-le", test: (s) => /太.{1,4}了|不太/.test(s) },
  { id: "hen-adj", test: (s) => /很|非常|真/.test(s) },
  { id: "ye-dou", test: (s) => /也|都/.test(s) },
  { id: "he", test: (s) => /和/.test(s) },
  { id: "lai-qu", test: (s) => /来|去|回/.test(s) },
  { id: "yidianr-youdianr", test: (s) => /一点儿|有点儿|一点|有点/.test(s) },
  { id: "reduplication", test: (s) => /(看看|听听|试试|坐坐|走走|玩玩|说说|想想|问问)/.test(s) },
  { id: "yixia", test: (s) => /一下/.test(s) },
  { id: "shi-de", test: (s) => /是.{1,10}的[。？?]/.test(s) },
  { id: "qing", test: (s) => /请/.test(s) },
  { id: "gei", test: (s) => /给/.test(s) },
  { id: "complements", test: (s) => /看见|听见|听懂|看懂|做完|吃完|得很|得真/.test(s) },
  { id: "mei", test: (s) => /每/.test(s) },
  { id: "dates-time", test: (s) => /[一二三四五六七八九十]+(点|月|号|日|年)|星期/.test(s) },
  { id: "price-age", test: (s) => /多少钱|几岁|多大|块钱|块/.test(s) },
  { id: "numbers", test: (s) => /两|[一二三四五六七八九]十|百/.test(s) },
  { id: "demonstratives", test: (s) => /这|那|哪/.test(s) },
];

export function detectGrammar(text: string, max = 4): string[] {
  const out: string[] = [];
  for (const r of RULES) {
    if (r.test(text)) out.push(r.id);
    if (out.length >= max) break;
  }
  return out;
}

export const { curriculum, grammar } = buildCurriculum({ units: UNITS, grammar: GRAMMAR, levelTitle: "HSK 1", idPrefix: "course-", detect: detectGrammar });
