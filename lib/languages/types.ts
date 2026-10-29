/**
 * Contrato de un paquete de idioma. El núcleo de la app (rutas, motor de ejercicios, SRS,
 * flashcards, lectura, vídeos, estadísticas, Anki) solo conoce esta interfaz; cada idioma la
 * implementa en lib/languages/{zh,ja,ko}/index.ts y se carga de forma diferida desde el registro.
 *
 * Convención de nombres heredada del modelo de datos: `hanzi` = forma escrita en la lengua meta
 * (hanzi / kanji+kana / hangul) y `pinyin` = lectura (pinyin / kana / romanización). Los tipos nuevos
 * usan `text` y `reading`.
 */
import type { ComponentType } from "react";
import type { Word, CardType } from "@/lib/db/schema";
import type { Exercise, ExerciseType, Pool, PoolSentence, PoolWord } from "@/lib/exercises/types";
import type { DictEntry, SearchResult } from "@/lib/dictionary/types";
import type { Lexicon } from "@/lib/segment";
import type { GrammarPoint, Lesson, Unit } from "@/lib/course/types";
import type { GradedReading } from "@/lib/readings/types";
import type { Article, Resource } from "@/lib/study-hall/types";
import type { CuratedVideoMeta } from "@/lib/videos/types";

export type Lang = "zh" | "ja" | "ko";
export type Bcp47 = "zh-CN" | "ja-JP" | "ko-KR";

export interface ScriptInfo {
  id: string; // hanzi | hiragana | katakana | kanji | hangul | hanja
  name: string; // nombre en español
  native: string;
  description: string;
}

export interface LangMeta {
  id: Lang;
  bcp47: Bcp47;
  names: { native: string; es: string; adjective: string }; // 中文 / Chino / chino
  emblem: string; // carácter del sello de la marca: 学 / 学 / 학
  brand: { native: string; latin: string; tagline: string }; // 学伴 Xuébàn · tu compañero de chino
  sealUser: string; // 雨果 / ウーゴ / 우고
  scripts: ScriptInfo[];
  cssClass: string; // clase base del texto meta: zh | ja | ko
}

/* ------------------------------ Texto y lectura ------------------------------ */

/** Trozo de un token con su lectura (ruby). `cls` = clase de prosodia (tone-3, pitch-h…). */
export interface RubySegment {
  text: string;
  reading?: string; // vacío → sin ruby (kana, puntuación)
  cls?: string;
  title?: string; // p. ej. «sandhi tonal»
}

export interface AnalyzedToken {
  text: string;
  isWord: boolean;
  start: number; // índice en code points
  segments: RubySegment[];
  reading?: string; // lectura completa del token (pinyin con espacios, kana, romanización)
  lemma?: string; // forma de diccionario (食べました → 食べる; 먹었어요 → 먹다)
  pos?: string; // categoría gramatical (del analizador)
  accent?: number | null; // ja: posición del acento tonal (0 = heiban)
  pronunciation?: string; // ko: pronunciación real ([한구거])
  note?: string;
}

export interface TextAnalysis {
  tokens: AnalyzedToken[];
}

export interface ReadingAidOption {
  id: string; // romaji | pitch | pronunciation
  label: string;
  description: string;
  default: boolean;
}

export interface ReadingAidConfig {
  /** Etiqueta corta del botón global (拼音 / ふりがな / 로마자) */
  label: string;
  /** Qué muestra el ruby */
  name: string; // «Pinyin», «Furigana», «Romanización»
  modes: { show: string; unknown: string; hide: string };
  options: ReadingAidOption[];
  /** Interruptor de escritura alternativa (繁 / かな / 漢) */
  altScript?: { glyph: string; label: string; description: string };
  /** Ayudas de teclado: escribir la lectura y escribir texto en la lengua meta */
  inputHint?: { reading: string; text: string };
  /** Mensaje que anima a prescindir de la ayuda (rōmaji / romanización) */
  weanMessage?: string;
}

export interface ReadingDiffItem {
  unit: string; // sílaba / mora / sílaba hangul esperada
  got: string;
  ok: boolean;
  partial: boolean; // zh: solo falla el tono
}

/* ------------------------------ Prosodia ------------------------------ */

export interface ProsodyItem {
  id: string;
  name: string;
  description: string;
  tip: string; // comparación con el español
  example: { text: string; reading: string; es: string };
  cls?: string;
}

export interface MinimalPair {
  a: { text: string; reading: string; es: string };
  b: { text: string; reading: string; es: string };
  c?: { text: string; reading: string; es: string };
  feature: string; // qué distingue el par
}

export interface ProsodyModule {
  kind: "tones" | "pitch" | "phonology";
  name: string; // «Tonos», «Acento tonal», «Reglas fonológicas»
  items: ProsodyItem[];
  legend: { cls: string; label: string }[]; // colores de prosodia
  minimalPairs: MinimalPair[];
  /** Describe la prosodia de una palabra para explicaciones («nǐ hǎo = 3.º + 3.º», «heiban», «연음»). */
  describe(text: string, reading: string): string;
}

/* ------------------------------ Escritura ------------------------------ */

export interface CharacterInfo {
  char: string;
  readings: string[];
  meaning?: string; // español si existe, si no inglés
  meaningEn?: string;
  strokes?: number;
  radical?: string;
  components: string[];
  level?: string; // «HSK 1», «N5», «TOPIK 1», «jōyō 1.º»
  extra?: Record<string, unknown>;
}

export interface CharacterModule {
  name: string; // «Caracteres», «Kanji y kana», «Hangul y hanja»
  isChar(ch: string): boolean; // carácter de la escritura meta que se estudia como tal
  charsOf(text: string): string[];
  load(): Promise<void>;
  loaded(): boolean;
  info(ch: string): CharacterInfo | undefined;
  similarSets: string[][];
  components(ch: string): string[];
  allComponents: string[];
  radicalMeaning?(r: string): string | undefined;
  allRadicals?: string[];
  /** Caracteres (meta) de una lista de palabras: para «caracteres conocidos» */
  levelChars?(level: string): string[];
}

export interface StrokeProvider {
  kind: "hanzi-writer" | "kanjivg" | "jamo";
  /** URL local de los datos de trazos del carácter (formato hanzi-writer: strokes + medians) */
  url(ch: string): string;
  /** Respaldo remoto (CDN) si no hay datos locales */
  fallbackUrl?(ch: string): string;
  /** Cargador propio (p. ej. trazos de hangul compuestos en tiempo real) */
  load?(ch: string): Promise<unknown | null>;
  /** Nombre de la cuadrícula de escritura: tianzige | renshucho | hangul */
  grid: "tianzige" | "renshucho" | "hangul";
}

/* ------------------------------ Datos ------------------------------ */

export type DictStatus = "idle" | "loading" | "ready" | "error";

export interface DictionaryProvider {
  name: string; // «CC-CEDICT», «JMdict», «KRDict / Wiktionary»
  load(): Promise<void>;
  loadFull?(): Promise<void>;
  status(): DictStatus;
  error(): string | undefined;
  entryCount(): number;
  subscribe(cb: () => void): () => void;
  lookup(word: string): DictEntry[];
  lookupFirst(word: string): DictEntry | undefined;
  search(query: string, limit?: number): SearchResult[];
  lexicon(): Lexicon | undefined;
  setUserWords(words: Word[]): void;
  userWord(text: string): Word | undefined;
  wordsContaining?(ch: string, limit?: number): DictEntry[];
  /** Entradas de un nivel («1», «N5», «TOPIK1») */
  entriesByLevel?(level: string): DictEntry[];
  /** Etiqueta de nivel de una entrada para la UI */
  levelLabel(e: DictEntry): string | undefined;
  /** Enlaces externos para la ficha de palabra */
  externalLinks(word: string): { name: string; url: string }[];
}

export interface ExampleProvider {
  load(): Promise<void>;
  /** Pares (texto meta, español) que contienen la palabra */
  find(word: string, limit?: number): { text: string; es: string }[];
}

export interface FrequencyProvider {
  rank(word: string): number | undefined; // 1 = más frecuente
}

/* ------------------------------ Currículo y examen ------------------------------ */

export interface ExamLevel {
  id: string; // "1", "N5", "TOPIK1"
  label: string; // «HSK 1», «N5», «TOPIK I · nivel 1»
  description: string;
  words?: number;
}

export interface ExamSectionDef {
  id: string;
  name: string; // español
  native: string; // 听力 / 聴解 / 듣기
  questions: number;
  minutes: number;
  parts: string[];
}

export interface ExamPart {
  name: string;
  exercises: Exercise[];
}
export interface ExamSection {
  id: string;
  name: string;
  native: string;
  minutes: number;
  parts: ExamPart[];
}

export interface ExamDefinition {
  id: "HSK" | "JLPT" | "TOPIK";
  name: string;
  officialUrl: string;
  levels: ExamLevel[];
  /** Nivel del simulacro y del curso de primer nivel */
  firstLevel: string;
  sections: ExamSectionDef[];
  totalQuestions: number;
  totalMinutes: number;
  scoring: string; // texto: cómo se puntúa y aprueba
  passRule(sectionCorrect: number[]): { passed: boolean; score: number; max: number; detail: string };
  source: string;
  notes?: string; // p. ej. «sin lista oficial de vocabulario»
  buildMock(seed: number, extraWords?: PoolWord[]): ExamSection[];
}

export interface CurriculumIndex {
  units: Unit[];
  unitById(id: string): Unit | undefined;
  lessonById(id: string): { unit: Unit; lesson: Lesson; index: number } | undefined;
  nextLesson(id: string): { unit: Unit; lesson: Lesson } | undefined;
  vocabUpTo(lessonId: string): Map<string, PoolWord>;
  sentencesOf(lesson: Lesson): PoolSentence[];
  lessonPool(lesson: Lesson, extra?: PoolWord[]): Pool;
  splitSentences(text: string): string[];
  /** Título del nivel del curso: «HSK 1», «N5», «TOPIK I» */
  levelTitle: string;
}

export interface GrammarIndex {
  points: GrammarPoint[];
  byId(id: string): GrammarPoint | undefined;
  pool(g: GrammarPoint, allWords: PoolWord[]): Pool;
  /** Detección por reglas de puntos de gramática en una frase (breakdown de vídeos/lecturas) */
  detect(text: string): string[];
}

export interface ConjugationForm {
  id: string; // masu | te | past | negative …
  name: string; // español
  native: string; // ます形 / 아요체
  level: string;
  description: string;
}

export interface MorphologyModule {
  name: string; // «Conjugación»
  forms: ConjugationForm[];
  /** Clases de palabra conjugable (godan/ichidan/irregular; regular/ㅂ불규칙…) */
  classes: { id: string; name: string; description: string }[];
  classOf(word: string, hint?: string): string | undefined;
  conjugate(word: string, form: string, cls?: string): string | undefined;
  /** Lema de una forma conjugada (si se puede) */
  lemma?(form: string): string | undefined;
  /** Palabras del nivel con su clase, para los ejercicios */
  lexicon: { word: string; reading: string; es: string; cls: string }[];
  /** Explicaciones de irregularidades */
  notes: { title: string; markdown: string }[];
}

export interface PolitenessLevel {
  id: string;
  name: string;
  native: string;
  description: string;
  examples: { text: string; reading: string; es: string }[];
}

export interface PolitenessModule {
  name: string;
  levels: PolitenessLevel[];
  markdown: string; // explicación general
}

export interface Counter {
  counter: string; // 个 / 本 / 개
  reading: string;
  es: string; // «genérico», «libros»…
  examples: { text: string; reading: string; es: string }[];
  nouns?: string[]; // nombres típicos
  note?: string; // cambios de sonido (いっぽん…), numerales nativos/sino
}

export interface CounterModule {
  name: string; // «Clasificadores», «Contadores», «Clasificadores (단위 명사)»
  native: string;
  counters: Counter[];
  /** Clasificador(es) de una palabra */
  of(word: string): string[] | undefined;
  hint(counter: string): string | undefined;
  markdown?: string;
}

/* ------------------------------ Ejercicios ------------------------------ */

export type RNG = () => number;

export interface ExerciseAdapters {
  /** Tipos disponibles en este idioma (los 20 comunes + propios). */
  types: ExerciseType[];
  labels: Partial<Record<ExerciseType, string>>;
  readingInput(w: PoolWord): Exercise | null; // pinyin-input
  prosodyChoice(pool: Pool, w: PoolWord, rng: RNG): Exercise | null; // tone-choice
  prosodyPair(pool: Pool, rng: RNG): Exercise | null; // tone-pair
  similar(pool: Pool, w: PoolWord, rng: RNG): Exercise | null; // similar-characters
  component(pool: Pool, w: PoolWord, rng: RNG): Exercise | null; // component
  buildCharacter(pool: Pool, w: PoolWord, rng: RNG): Exercise | null; // build-character
  classifier(pool: Pool, w: PoolWord, rng: RNG): Exercise | null; // classifier
  writing(w: PoolWord): Exercise | null; // writing
  conjugation?(pool: Pool, rng: RNG): Exercise | null;
  particle?(pool: Pool, s: PoolSentence, rng: RNG): Exercise | null;
  /** Fichas de una frase (segmentación) para ordenar/construir */
  tiles(text: string): string[];
  /** Comparación de lecturas escritas por el usuario (pinyin / kana / hangul) */
  readingEquals(user: string, expected: string, opts?: { lenient?: boolean }): boolean;
  readingDiff(user: string, expected: string): ReadingDiffItem[];
  /** Explicación del error de lectura «casi correcto» (zh: tono; ja: vocal larga/っ; ko: …) */
  explainPartial?(wrong: ReadingDiffItem[]): string;
  /** Normaliza texto meta para comparar (dictado, construir frase) */
  normalizeText(s: string): string;
  /** Normaliza lo que teclea el usuario (ni3→nǐ, romaji→kana, jamo→sílabas) */
  normalizeInput(input: string): string;
}

/* ------------------------------ Anki ------------------------------ */

export interface AnkiTemplate {
  Name: string;
  Front: string;
  Back: string;
}

export interface AnkiModelSpec {
  modelName: string;
  modelId: number;
  deckRoot: string;
  deckMine: string;
  deckLevel: string; // «中文 Chino::HSK 1»
  fields: readonly string[];
  keyField: string; // campo con la forma escrita (Hanzi / Palabra)
  css: string;
  templates: AnkiTemplate[];
  req: unknown[][];
  ordToType: Record<number, CardType>;
  cardOrds(w: Word): number[];
  toFields(w: Word): Record<string, string>;
  fromFields(fields: Record<string, { value: string }>, tags: string[], noteId: number, mod: number | undefined, existing?: Word): Word;
  tags(w: Word): string[];
  deckFor(w: Word, categoryNames: string[]): string;
  /** Prefijo de los ids de palabras propias: «mine-» (zh, compatibilidad) | «mine-ja-» */
  minePrefix: string;
  apkgFileName: string;
}

/* ------------------------------ Tema ------------------------------ */

export interface OrnamentProps {
  className?: string;
  seed?: number;
}

export interface LanguageTheme {
  id: string; // xuanzhi | washi | hanji
  name: string; // «宣纸与墨», «和紙と藍», «한지와 오방색»
  nameEs: string;
  description: string;
  /** Clases de fuente del texto meta: sans | serif | display (caligráfica/escolar) */
  fontClasses: { sans: string; serif: string; display: string };
  fontOptions: { id: string; label: string; cls: string }[];
  /** Clases de next/font con las variables CSS de las fuentes del idioma (se añaden a <html>) */
  fontVars?: string;
  /** Colores de tema para theme-color (claro, oscuro) */
  themeColor: { light: string; dark: string };
  seal: { shape: "square" | "round"; brandText: string };
  ornaments: {
    Landscape: ComponentType<OrnamentProps & { phase?: string; height?: number; layers?: number }>;
    Branch: ComponentType<{ progress: number; className?: string; label?: string }>;
    Lattice: ComponentType<OrnamentProps & { opacity?: number; size?: number; variant?: string }>;
    DailyShape: ComponentType<{ progress: number; size?: number; className?: string; label?: string }>;
    Pattern?: ComponentType<OrnamentProps & { opacity?: number; variant?: string }>;
  };
  motifs: string[];
  prohibited: string[];
}

/* ------------------------------ UI propia del idioma ------------------------------ */

export interface ReadingInputProps {
  value: string;
  onChange(v: string): void;
  onSubmit?(): void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
  /** Modo: reading (pinyin/kana/hangul de una palabra) | text (frase completa en escritura meta) */
  mode?: "reading" | "text";
}

export interface LanguageUI {
  CharactersPage: ComponentType;
  CharacterDetail: ComponentType<{ char: string; onNavigate?(q: string): void }>;
  /** Extras del diccionario (radical + trazos, dibujo, jamo inicial…) */
  DictionaryExtras?: ComponentType<{ onPick(query: string): void; onClose?(): void }>;
  /** Pasos especiales de las lecciones (Unidad 0, módulos propios) por id */
  modules: Record<string, ComponentType<{ params?: Record<string, unknown>; onFinish?(score: number): void }>>;
  ReadingInput: ComponentType<ReadingInputProps>;
  /** Visualización de la pronunciación (curva de tono / acento / forma de onda) */
  PronunciationView?: ComponentType<{ text: string; reading: string; samples?: Float32Array; sampleRate?: number; className?: string }>;
  /** «Carácter/palabra del día» del panel Hoy */
  ItemOfDay?: ComponentType<{ dayIndex: number }>;
  /** Módulos de la sección Aprender además del curso (conjugación, cortesía, contadores) */
  extraPages?: { href: string; title: string; native: string; description: string; icon: string; Component: ComponentType }[];
}

/* ------------------------------ Semilla ------------------------------ */

export interface SeedWord {
  id: string;
  hanzi: string; // forma escrita
  pinyin: string; // lectura
  romanization?: string;
  meaning: string;
  category: string;
  example: string;
  example_pinyin: string;
  example_translation: string;
  traditional?: string; // zh: tradicional · ja: forma solo kana · ko: hanja
  radical?: string;
  frequency?: number;
  hsk: string[]; // etiquetas de lista/nivel: HSK2.0, HSK3.0 | N5 | TOPIK1
  level: number;
  lang?: Lang;
  reviewed?: boolean;
  extra?: Record<string, unknown>;
}

export interface SeedData {
  version: number;
  source: string;
  words: SeedWord[];
  /** Etiqueta del nivel de la semilla para tags («HSK1», «N5», «TOPIK1») */
  levelTag: string;
}

/** Listas de palabras y caracteres por nivel de examen (progreso, caracteres, «nuevas» en vídeos). */
export interface LevelLists {
  title: string; // «HSK 3.0», «JLPT (listas comunitarias)», «TOPIK (NIKL)»
  words: { level: string; label: string; list: string[] }[];
  chars: { level: string; label: string; list: string[] }[];
}

/* ------------------------------ Paquete ------------------------------ */

export interface LanguagePack {
  meta: LangMeta;
  id: Lang;
  bcp47: Bcp47;

  // Texto
  analyze(text: string, opts?: { wordReadings?: Record<string, string> }): TextAnalysis;
  segment(text: string): string[];
  reading(text: string): string;
  romanize(text: string, reading?: string): string;
  normalizeInput(input: string): string;
  /** Convierte a la escritura alternativa (繁 / solo kana / con hanja). */
  altScript(text: string, reading?: string): string;
  isTargetChar(ch: string): boolean; // carácter de la escritura meta (hanzi / kana+kanji / hangul)
  hasTargetText(s: string): boolean;
  readingAid: ReadingAidConfig;
  /** Colorea una lectura (pinyin por sílabas; kana con acento; romanización sin color) */
  colorizeReading(reading: string): { text: string; cls?: string }[];

  prosody: ProsodyModule;
  characters: CharacterModule;
  strokeData: StrokeProvider;

  dictionary: DictionaryProvider;
  examples: ExampleProvider;
  frequency: FrequencyProvider;

  exam: ExamDefinition;
  /** Listas por nivel (carga diferida). `variant` = preferencia de lista (zh: "2.0" | "3.0") */
  levelLists(variant?: string): Promise<LevelLists>;
  curriculum: CurriculumIndex;
  grammar: GrammarIndex;
  readings: GradedReading[];
  articles: Article[];
  resources: Resource[];
  loadVideoIndex(): Promise<CuratedVideoMeta[]>;
  morphology?: MorphologyModule;
  politeness?: PolitenessModule;
  counters: CounterModule;

  exerciseAdapters: ExerciseAdapters;
  tts: { voicePrefs: RegExp[]; edgeTtsVoices: string[]; rateDefault: number };
  asr: { locale: Bcp47 };
  anki: AnkiModelSpec;
  theme: LanguageTheme;
  ui: LanguageUI;
  seed: SeedData;
  categories: Record<string, { color: string; icon: string }>;
  /** Datos de la Unidad 0 y módulos para los artículos/pasos (cada paquete decide la forma) */
  data: Record<string, unknown>;
  /** Créditos de datos de este idioma */
  credits: { name: string; use: string; license: string; url: string }[];
}
