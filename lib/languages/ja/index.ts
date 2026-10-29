/** Paquete de idioma: japonés. */
import type { ExampleProvider, FrequencyProvider, LanguagePack, MorphologyModule, PolitenessModule, ProsodyModule } from "@/lib/languages/types";
import { LANG_META } from "@/lib/languages/registry";
import { withBase } from "@/lib/base-path";
import type { CuratedVideoMeta } from "@/lib/videos/types";
import * as wanakana from "wanakana";
import { analyzeJa, segmentJa, warmAnalyzer } from "./analyzer";
import { hasJapanese, isJapaneseChar, isKanji, moras, toHiragana } from "./kana";
import { jaDictionary, lookupFirstJa } from "./dictionary";
import { jaCharacters, jaCounters, jaStrokes, loadKanji, jlptData } from "./characters";
import { ARTICLES, CATEGORY_META, READINGS, RESOURCES, SEED, curriculum, grammar } from "./content";
import { jaAdapters } from "./exercises";
import { jaExam } from "./exam";
import { jaAnki } from "./anki";
import { jaTheme } from "./theme";
import { jaUI } from "./ui";
import { CLASS_INFO, conjugate, deinflect, FORMS, guessClass, type WordClass } from "./conjugation";
import { describePitch, PATTERN_INFO, PITCH_PAIRS } from "./pitch";

let tatoeba: { text: string; es: string }[] | undefined;
let tLoading: Promise<void> | undefined;
const examples: ExampleProvider = {
  load: async () => {
    if (tatoeba) return;
    tLoading ??= fetch(withBase("/data/ja/tatoeba.json"))
      .then((r) => (r.ok ? (r.json() as Promise<[string, string][]>) : []))
      .then((rows) => {
        tatoeba = rows.map(([text, es]) => ({ text, es }));
      })
      .catch(() => {
        tatoeba = [];
      });
    await tLoading;
  },
  find: (w, limit = 10) => (tatoeba ?? []).filter((e) => e.text.includes(w)).slice(0, limit),
};

const frequency: FrequencyProvider = { rank: (w) => lookupFirstJa(w)?.freq };

const prosody: ProsodyModule = {
  kind: "pitch",
  name: "Acento tonal",
  items: (Object.keys(PATTERN_INFO) as (keyof typeof PATTERN_INFO)[]).map((k, i) => ({
    id: k,
    name: `${PATTERN_INFO[k].native} ${PATTERN_INFO[k].name}`,
    description: PATTERN_INFO[k].description,
    tip: ["Como una nota que sube y se queda: sakura.", "Golpe arriba al principio y cae: néko.", "Sube, se mantiene y baja dentro de la palabra: tamágo.", "Sube y baja justo en la partícula: yamá ga."][i],
    example: [{ text: "桜", reading: "さくら", es: "cerezo" }, { text: "猫", reading: "ねこ", es: "gato" }, { text: "卵", reading: "たまご", es: "huevo" }, { text: "山", reading: "やま", es: "montaña" }][i],
    cls: i === 0 ? "tone-1" : "tone-2",
  })),
  legend: [
    { cls: "tone-1", label: "mora baja (L)" },
    { cls: "tone-2", label: "mora alta (H) / bajada" },
  ],
  minimalPairs: [
    ...PITCH_PAIRS.map((p) => ({ a: { text: p.a.text, reading: p.a.reading, es: p.a.es }, b: { text: p.b.text, reading: p.b.reading, es: p.b.es }, feature: "acento tonal" })),
    { a: { text: "おばさん", reading: "おばさん", es: "tía" }, b: { text: "おばあさん", reading: "おばあさん", es: "abuela" }, feature: "vocal larga" },
    { a: { text: "来て", reading: "きて", es: "ven" }, b: { text: "切手", reading: "きって", es: "sello" }, feature: "っ (consonante doble)" },
  ],
  describe(text, reading) {
    const e = lookupFirstJa(text);
    const acc = (e?.extra?.pitch as number[] | undefined)?.[0];
    return describePitch(toHiragana(e?.p ?? reading), acc);
  },
};

const morphology: MorphologyModule = {
  name: "Conjugación",
  forms: FORMS.map((f) => ({ id: f.id, name: f.name, native: f.native, level: f.level, description: f.description })),
  classes: CLASS_INFO,
  classOf: (w, hint) => guessClass(w, hint),
  conjugate: (w, form, cls) => conjugate(w, form, (cls ?? guessClass(w)) as WordClass),
  lemma: (form) => deinflect(form)[0],
  lexicon: SEED.words.filter((w) => ["godan", "ichidan", "suru", "kuru", "i-adj", "na-adj"].includes(String(w.extra?.word_type))).map((w) => ({ word: w.hanzi, reading: w.pinyin, es: w.meaning, cls: String(w.extra?.word_type) })),
  notes: [{ title: "Irregularidades N5", markdown: "行く → 行って · ある → ない · いい → よくない · する / 来る irregulares · 帰る, 入る, 知る… son godan." }],
};

const politeness: PolitenessModule = {
  name: "Cortesía (keigo)",
  levels: [
    { id: "plain", name: "Llano", native: "普通体", description: "Familia y amigos.", examples: [{ text: "食べる？", reading: "たべる？", es: "¿Comes?" }] },
    { id: "teinei", name: "Cortés", native: "丁寧語", description: "です・ます: el estándar del N5.", examples: [{ text: "食べますか。", reading: "たべますか。", es: "¿Come usted?" }] },
    { id: "sonkei", name: "Respetuoso", native: "尊敬語", description: "Eleva al otro (N3+).", examples: [{ text: "召し上がりますか。", reading: "めしあがりますか。", es: "¿Gusta usted comer?" }] },
    { id: "kenjo", name: "Humilde", native: "謙譲語", description: "Rebaja lo propio (N3+).", examples: [{ text: "いただきます。", reading: "いただきます。", es: "Recibo (antes de comer)." }] },
  ],
  markdown: "En japonés la forma del verbo cambia según con quién hablas. En el N5 se trabaja el estilo です・ます; el keigo completo llega en N3–N2.",
};

async function loadVideoIndex(): Promise<CuratedVideoMeta[]> {
  try {
    const res = await fetch(withBase("/videos/ja/index.json"));
    return res.ok ? ((await res.json()) as CuratedVideoMeta[]) : [];
  } catch {
    return [];
  }
}

const pack: LanguagePack = {
  meta: LANG_META.ja,
  id: "ja",
  bcp47: "ja-JP",
  analyze: (text) => analyzeJa(text),
  segment: segmentJa,
  reading: (text) => {
    const e = lookupFirstJa(text);
    if (e && (e.s === text || (e.extra?.alt as string[] | undefined)?.includes(text))) return e.p;
    return analyzeJa(text)
      .tokens.map((t) => t.reading ?? t.text)
      .join("");
  },
  romanize: (text, reading) => wanakana.toRomaji(reading ?? pack.reading(text)),
  normalizeInput: (s) => (/[a-zA-Z]/.test(s) ? wanakana.toKana(s, { IMEMode: true }) : s),
  altScript: (text, reading) => (Array.from(text).some(isKanji) ? toHiragana(reading ?? pack.reading(text)) : text),
  isTargetChar: isJapaneseChar,
  hasTargetText: hasJapanese,
  readingAid: {
    label: "ふりがな",
    name: "Furigana",
    modes: { show: "Furigana sobre todos los kanji", unknown: "Furigana solo en kanji no aprendidos", hide: "Furigana oculto" },
    options: [
      { id: "romaji", label: "Mostrar rōmaji", description: "Desactivado por defecto: lee kana cuanto antes. Úsalo solo las primeras semanas.", default: false },
      { id: "pitch", label: "Acento tonal", description: "Diagrama alto/bajo (estilo NHK/OJAD) en fichas, tarjetas y diccionario.", default: false },
    ],
    inputHint: { reading: "Teclea en rōmaji y se convierte en hiragana (n final = nn; mayúsculas = katakana).", text: "Sin teclado japonés: Windows → Configuración → Hora e idioma → Idioma → Agregar → Japonés → Microsoft IME. O teclea en rōmaji." },
    altScript: { glyph: "かな", label: "Solo kana", description: "Muestra las palabras en hiragana en lugar de kanji (útil al principio)." },
    weanMessage: "El rōmaji es una muleta: en dos semanas puedes leer hiragana y katakana. Apágalo en cuanto puedas.",
  },
  colorizeReading: (r) => [{ text: r }],
  prosody,
  characters: jaCharacters,
  strokeData: jaStrokes,
  dictionary: jaDictionary,
  examples,
  frequency,
  exam: jaExam,
  async levelLists() {
    await loadKanji();
    const d = jlptData();
    const lv = ["N5", "N4", "N3", "N2", "N1"];
    return {
      title: "JLPT (listas comunitarias)",
      words: lv.map((l) => ({ level: l, label: l, list: d?.words[l] ?? [] })),
      chars: ["N5", "N4", "N3", "N1"].map((l) => ({ level: l, label: `${l} (kanji)`, list: d?.kanji[l] ?? [] })),
    };
  },
  curriculum,
  grammar,
  readings: READINGS,
  articles: ARTICLES,
  resources: RESOURCES,
  loadVideoIndex,
  morphology,
  politeness,
  counters: jaCounters,
  exerciseAdapters: jaAdapters,
  tts: { voicePrefs: [/nanami|keita|aoi|daichi/i, /haruka|ayumi|ichiro/i, /kyoko|otoya/i], edgeTtsVoices: ["ja-JP-NanamiNeural", "ja-JP-KeitaNeural"], rateDefault: 0.9 },
  asr: { locale: "ja-JP" },
  anki: jaAnki,
  theme: jaTheme,
  ui: jaUI,
  seed: SEED,
  categories: CATEGORY_META,
  data: { moras },
  credits: [
    { name: "JMdict (EDRDG) vía jmdict-simplified", use: "Diccionario japonés (≈ 219 000 entradas; 34 000 con glosas en español)", license: "CC BY-SA 4.0 (EDRDG)", url: "https://www.edrdg.org/jmdict/j_jmdict.html" },
    { name: "KANJIDIC2 (EDRDG)", use: "Lecturas on/kun, significados (también en español), trazos, grado y nivel de 3 125 kanji", license: "CC BY-SA 4.0 (EDRDG)", url: "https://www.edrdg.org/wiki/index.php/KANJIDIC_Project" },
    { name: "KRADFILE / RADKFILE (EDRDG)", use: "Componentes de los kanji y búsqueda por radicales", license: "CC BY-SA 4.0 (EDRDG)", url: "https://www.edrdg.org/krad/kradinf.html" },
    { name: "KanjiVG (Ulrich Apel)", use: "Orden de trazos de kanji y kana (animación, práctica y reconocimiento de escritura)", license: "CC BY-SA 3.0", url: "http://kanjivg.tagaini.net" },
    { name: "Kanjium (mifunetoshiro)", use: "Acento tonal de 124 000 palabras", license: "CC BY-SA 4.0", url: "https://github.com/mifunetoshiro/kanjium" },
    { name: "jlpt-word-list (elzup), basada en las listas de Jonathan Waller", use: "Vocabulario por nivel JLPT (no existen listas oficiales desde 2010)", license: "MIT", url: "https://github.com/elzup/jlpt-word-list" },
    { name: "Tatoeba (pares jpn–spa)", use: "Frases de ejemplo japonés–español", license: "CC BY 2.0 FR", url: "https://tatoeba.org" },
    { name: "kuromoji.js (@sglkc/kuromoji) + IPADIC", use: "Análisis morfológico (lema, lectura, categoría) en un Web Worker", license: "Apache 2.0 / licencia IPADIC", url: "https://github.com/sglkc/kuromoji.js" },
    { name: "wanakana", use: "Conversión rōmaji ⇄ kana", license: "MIT", url: "https://github.com/WaniKani/WanaKana" },
    { name: "FrequencyWords (hermitdave, OpenSubtitles)", use: "Frecuencia de palabras", license: "CC BY-SA 4.0", url: "https://github.com/hermitdave/FrequencyWords" },
    { name: "jlpt.jp", use: "Estructura, tiempos y puntuación del simulacro N5", license: "Documento público (solo estructura)", url: "https://www.jlpt.jp" },
  ],
};

// precarga el analizador morfológico y los kanji en segundo plano: con la primera interacción o a los
// 15 s, en un momento ocioso (como el diccionario), para no bloquear la carga inicial de la página
if (typeof window !== "undefined") {
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    window.removeEventListener("pointerdown", start);
    window.removeEventListener("keydown", start);
    const idle = (cb: () => void) => ("requestIdleCallback" in window ? window.requestIdleCallback(() => cb()) : setTimeout(cb, 500));
    idle(() => {
      warmAnalyzer();
      void loadKanji();
    });
  };
  window.addEventListener("pointerdown", start, { passive: true });
  window.addEventListener("keydown", start, { passive: true });
  setTimeout(start, 15000);
}

export default pack;
