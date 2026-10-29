/** Paquete de idioma: chino mandarín (simplificado). */
import type { ExampleProvider, FrequencyProvider, LanguagePack, ExamDefinition } from "@/lib/languages/types";
import { LANG_META } from "@/lib/languages/registry";
import { withBase } from "@/lib/base-path";
import type { CuratedVideoMeta } from "@/lib/videos/types";
import { analyzeZh, colorizePinyin, readingOfZh } from "./text";
import { hasHanzi, isHanzi } from "./pinyin/convert";
import { numberedToMarked } from "./pinyin/tones";
import { zhProsody } from "./prosody";
import { zhCharacters, zhCounters, zhStrokes } from "./characters";
import { zhDictionary } from "./dict-provider";
import { lookupFirst, getLexicon, loadHsk } from "./dictionary";
import { segment } from "@/lib/segment";
import { ARTICLES, CATEGORY_META, READINGS, RESOURCES, SEED, curriculum, grammar } from "./content";
import { zhAdapters } from "./exercises";
import { zhAnki } from "./anki";
import { zhTheme } from "./theme";
import { zhUI } from "./ui";
import { buildHsk1Exam, HSK1_STRUCTURE } from "./exam";
import { TONES, TONE_PAIRS, SPANISH_ERRORS, BASIC_STROKES, STROKE_RULES, SYLLABLES, INITIALS, FINALS } from "./data/pronunciation";

let tatoeba: { text: string; es: string }[] | undefined;
let tatoebaLoading: Promise<void> | undefined;
const examples: ExampleProvider = {
  load: async () => {
    if (tatoeba) return;
    if (!tatoebaLoading) {
      tatoebaLoading = fetch(withBase("/data/zh/tatoeba.json"))
        .then((r) => (r.ok ? (r.json() as Promise<[string, string][]>) : []))
        .then((rows) => {
          tatoeba = rows.map(([text, es]) => ({ text, es }));
        })
        .catch(() => {
          tatoeba = [];
        });
    }
    await tatoebaLoading;
  },
  find: (word, limit = 10) => (tatoeba ?? []).filter((e) => e.text.includes(word)).sort((a, b) => a.text.length - b.text.length).slice(0, limit),
};

const frequency: FrequencyProvider = { rank: (w) => lookupFirst(w)?.freq };

const exam: ExamDefinition = {
  id: "HSK",
  name: "HSK (汉语水平考试)",
  officialUrl: "https://www.chinesetest.cn",
  levels: [
    { id: "1", label: "HSK 1", description: "300 palabras (HSK 3.0) · 150 (HSK 2.0)", words: 300 },
    { id: "2", label: "HSK 2", description: "600 palabras acumuladas", words: 600 },
    { id: "3", label: "HSK 3", description: "900 palabras acumuladas", words: 900 },
    { id: "4", label: "HSK 4", description: "1 200 palabras", words: 1200 },
    { id: "5", label: "HSK 5", description: "1 500 palabras", words: 1500 },
    { id: "6", label: "HSK 6", description: "1 800 palabras", words: 1800 },
    { id: "7", label: "HSK 7–9", description: "5 636 palabras", words: 5636 },
  ],
  firstLevel: "1",
  sections: [
    { id: "listening", name: "Comprensión auditiva", native: "听力", questions: HSK1_STRUCTURE.listening.questions, minutes: HSK1_STRUCTURE.listening.minutes, parts: HSK1_STRUCTURE.listening.parts },
    { id: "reading", name: "Comprensión lectora", native: "阅读", questions: HSK1_STRUCTURE.reading.questions, minutes: HSK1_STRUCTURE.reading.minutes, parts: HSK1_STRUCTURE.reading.parts },
  ],
  totalQuestions: HSK1_STRUCTURE.totalQuestions,
  totalMinutes: HSK1_STRUCTURE.totalMinutes,
  scoring: "40 preguntas, 1 punto cada una. Se considera aprobado a partir del 60 % (24/40), como en el examen oficial (120/200).",
  passRule(correct) {
    const score = correct.reduce((a, b) => a + b, 0);
    return { passed: score >= 24, score, max: 40, detail: `听力 ${correct[0] ?? 0}/20 · 阅读 ${correct[1] ?? 0}/20` };
  },
  source: HSK1_STRUCTURE.source,
  buildMock: (seed, extra) => buildHsk1Exam(seed, extra).map((s) => ({ id: s.id, name: s.title, native: s.id === "listening" ? "听力" : "阅读", minutes: s.minutes, parts: s.parts.map((p) => ({ name: p.title, exercises: p.exercises })) })),
};

async function loadVideoIndex(): Promise<CuratedVideoMeta[]> {
  try {
    const res = await fetch(withBase("/videos/zh/index.json"));
    return res.ok ? ((await res.json()) as CuratedVideoMeta[]) : [];
  } catch {
    return [];
  }
}

const pack: LanguagePack = {
  meta: LANG_META.zh,
  id: "zh",
  bcp47: "zh-CN",
  analyze: analyzeZh,
  segment: (text) => segment(text, getLexicon()).map((t) => t.text),
  reading: readingOfZh,
  romanize: (text, reading) => reading ?? readingOfZh(text),
  normalizeInput: numberedToMarked,
  altScript(text) {
    // tradicional palabra a palabra con CC-CEDICT (si el diccionario está cargado)
    return segment(text, getLexicon())
      .map((t) => (t.isWord ? (lookupFirst(t.text)?.t ?? t.text) : t.text))
      .join("");
  },
  isTargetChar: isHanzi,
  hasTargetText: hasHanzi,
  readingAid: {
    label: "拼音",
    name: "Pinyin",
    modes: { show: "Pinyin visible", unknown: "Pinyin solo en palabras nuevas", hide: "Pinyin oculto" },
    options: [],
    inputHint: { reading: "Tonos con números (1–4, 5 = neutro) o con tildes · ü = v", text: "Sin teclado chino: Windows → Configuración → Hora e idioma → Idioma → Agregar → Chino (simplificado) → Microsoft Pinyin." },
    altScript: { glyph: "繁", label: "Caracteres tradicionales", description: "Muestra la forma tradicional (Taiwán, Hong Kong) como dato secundario." },
  },
  colorizeReading: colorizePinyin,
  prosody: zhProsody,
  characters: zhCharacters,
  strokeData: zhStrokes,
  dictionary: zhDictionary,
  examples,
  frequency,
  exam,
  async levelLists(variant) {
    const h = await loadHsk();
    const key = variant === "2.0" ? "2.0" : "3.0";
    const lab = (lv: string) => `HSK ${lv === "7" ? "7–9" : lv}`;
    return {
      title: `HSK ${key}`,
      words: Object.entries(h.words[key]).map(([level, list]) => ({ level, label: lab(level), list })),
      chars: Object.entries(h.chars[key]).map(([level, list]) => ({ level, label: lab(level), list })),
    };
  },
  curriculum,
  grammar,
  readings: READINGS,
  articles: ARTICLES,
  resources: RESOURCES,
  loadVideoIndex,
  counters: zhCounters,
  exerciseAdapters: zhAdapters,
  tts: { voicePrefs: [/xiaoxiao|yunxi|yunyang|xiaoyi/i, /huihui|kangkang|yaoyao/i], edgeTtsVoices: ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural"], rateDefault: 0.9 },
  asr: { locale: "zh-CN" },
  anki: zhAnki,
  theme: zhTheme,
  ui: zhUI,
  seed: SEED,
  categories: CATEGORY_META,
  data: { TONES, TONE_PAIRS, SPANISH_ERRORS, BASIC_STROKES, STROKE_RULES, SYLLABLES, INITIALS, FINALS },
  credits: [
    { name: "CC-CEDICT", use: "Diccionario chino–inglés (≈125 000 entradas)", license: "CC BY-SA 4.0", url: "https://www.mdbg.net/chinese/dictionary?page=cc-cedict" },
    { name: "complete-hsk-vocabulary (drkameleon)", use: "Listas HSK 2.0 y 3.0, frecuencia, radical, POS, clasificadores", license: "MIT", url: "https://github.com/drkameleon/complete-hsk-vocabulary" },
    { name: "Make Me a Hanzi (skishore)", use: "Descomposición, radical, etimología y número de trazos", license: "Arphic Public License / LGPL", url: "https://github.com/skishore/makemeahanzi" },
    { name: "hanzi-writer y hanzi-writer-data", use: "Animación, quiz de escritura y datos de trazos", license: "MIT (código) / Arphic PL (datos)", url: "https://hanziwriter.org" },
    { name: "Tatoeba (pares cmn–spa)", use: "Frases de ejemplo chino–español", license: "CC BY 2.0 FR", url: "https://tatoeba.org" },
    { name: "jieba (dict.txt)", use: "Frecuencia de palabras", license: "MIT", url: "https://github.com/fxsjy/jieba" },
    { name: "汉考国际 · 新版HSK（1-6级）考试结构与样题示例", use: "Estructura del simulacro HSK 1", license: "Documento público (solo estructura)", url: "https://www.chinesetest.cn" },
  ],
};

export default pack;
