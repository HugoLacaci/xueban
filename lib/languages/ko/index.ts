/** Paquete de idioma: coreano. */
import type { ExampleProvider, FrequencyProvider, LanguagePack, MorphologyModule, PolitenessModule, ProsodyModule } from "@/lib/languages/types";
import { LANG_META } from "@/lib/languages/registry";
import { withBase } from "@/lib/base-path";
import type { CuratedVideoMeta } from "@/lib/videos/types";
import { useSettings } from "@/lib/settings";
import { analyzeKo, clearKoCache, segmentKo } from "./analyzer";
import { isHangul, pronounce, romanizeRR, RULE_INFO, type RuleId } from "./phonology";
import { koDictionary, lookupFirstKo } from "./dictionary";
import { koCharacters, koCounters, koStrokes, loadHanja, topikData } from "./characters";
import { ARTICLES, CATEGORY_META, READINGS, RESOURCES, SEED, curriculum, grammar } from "./content";
import { koAdapters } from "./exercises";
import { koExam } from "./exam";
import { koAnki } from "./anki";
import { koTheme } from "./theme";
import { koUI } from "./ui";
import { conjugateKo, guessIrregular, KO_FORMS, KO_IRREGULAR_INFO, lemmaCandidatesKo, type Irregular } from "./conjugation";

let tatoeba: { text: string; es: string }[] | undefined;
let tLoading: Promise<void> | undefined;
const examples: ExampleProvider = {
  load: async () => {
    if (tatoeba) return;
    tLoading ??= fetch(withBase("/data/ko/tatoeba.json"))
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

const frequency: FrequencyProvider = { rank: (w) => lookupFirstKo(w)?.freq };

const prosody: ProsodyModule = {
  kind: "phonology",
  name: "Reglas fonológicas",
  items: (Object.keys(RULE_INFO) as RuleId[]).map((r) => ({ id: r, name: `${RULE_INFO[r].native} · ${RULE_INFO[r].name}`, description: RULE_INFO[r].description, tip: "", example: { text: "", reading: "", es: "" }, cls: RULE_INFO[r].cls })),
  legend: [
    { cls: "tone-1", label: "연음 · encadenamiento" },
    { cls: "tone-2", label: "경음화 · tensión" },
    { cls: "tone-3", label: "비음화 / 유음화" },
    { cls: "tone-4", label: "격음화 / 구개음화" },
  ],
  minimalPairs: [
    { a: { text: "달", reading: "dal", es: "luna" }, b: { text: "탈", reading: "tal", es: "máscara" }, c: { text: "딸", reading: "ttal", es: "hija" }, feature: "lisa / aspirada / tensa" },
    { a: { text: "불", reading: "bul", es: "fuego" }, b: { text: "풀", reading: "pul", es: "hierba" }, c: { text: "뿔", reading: "ppul", es: "cuerno" }, feature: "lisa / aspirada / tensa" },
    { a: { text: "거리", reading: "geori", es: "calle" }, b: { text: "고리", reading: "gori", es: "anilla" }, feature: "ㅓ / ㅗ" },
    { a: { text: "개", reading: "gae", es: "perro" }, b: { text: "게", reading: "ge", es: "cangrejo" }, feature: "ㅐ / ㅔ" },
  ],
  describe(text) {
    const p = pronounce(text);
    return p.pron !== text ? `[${p.pron}] · ${p.rules.map((r) => RULE_INFO[r].native).join(", ")}` : "";
  },
};

const morphology: MorphologyModule = {
  name: "Conjugación",
  forms: KO_FORMS.map((f) => ({ id: f.id, name: f.name, native: f.native, level: f.level, description: f.description })),
  classes: [{ id: "regular", name: "Regulares", description: "Siguen -아요/어요 según la vocal." }, ...KO_IRREGULAR_INFO.map((i) => ({ id: i.id, name: i.name, description: i.description }))],
  classOf: (w) => guessIrregular(w) ?? "regular",
  conjugate: (w, form, cls) => conjugateKo(w, form, cls === "regular" ? null : (cls as Irregular | undefined)),
  lemma: (f) => lemmaCandidatesKo(f).find((c) => lookupFirstKo(c)),
  lexicon: SEED.words.filter((w) => w.hanzi.endsWith("다")).map((w) => ({ word: w.hanzi, reading: w.pinyin, es: w.meaning, cls: String(w.extra?.irregular ?? "regular") })),
  notes: KO_IRREGULAR_INFO.map((i) => ({ title: i.name, markdown: i.description })),
};

const politeness: PolitenessModule = {
  name: "Niveles de habla",
  levels: [
    { id: "hamnida", name: "Formal", native: "합니다체", description: "Noticias, presentaciones, anuncios.", examples: [{ text: "감사합니다.", reading: "gamsahamnida", es: "Gracias." }] },
    { id: "haeyo", name: "Cortés", native: "해요체", description: "El estándar cotidiano.", examples: [{ text: "고마워요.", reading: "gomawoyo", es: "Gracias." }] },
    { id: "banmal", name: "Informal", native: "반말", description: "Con amigos íntimos.", examples: [{ text: "고마워.", reading: "gomawo", es: "Gracias." }] },
    { id: "si", name: "Honorífico", native: "-(으)시-", description: "Eleva al sujeto.", examples: [{ text: "선생님이 가세요.", reading: "seonsaengnimi gaseyo", es: "La profesora se va." }] },
  ],
  markdown: "El final del verbo indica la relación con el oyente (해요체, 합니다체, 반말) y el honorífico -(으)시- eleva a la persona de la que se habla.",
};

async function loadVideoIndex(): Promise<CuratedVideoMeta[]> {
  try {
    const res = await fetch(withBase("/videos/ko/index.json"));
    return res.ok ? ((await res.json()) as CuratedVideoMeta[]) : [];
  } catch {
    return [];
  }
}

// el análisis depende del diccionario: al cargarlo, se vacía la caché
koDictionary.subscribe(() => clearKoCache());

const pack: LanguagePack = {
  meta: LANG_META.ko,
  id: "ko",
  bcp47: "ko-KR",
  analyze(text) {
    const showPron = Boolean(useSettings.getState().settings.langs.ko?.readingOptions?.pronunciation);
    const a = analyzeKo(text);
    if (!showPron) return a;
    // opción «pronunciación real»: el ruby muestra [cómo suena] en lugar de la romanización
    return { tokens: a.tokens.map((t) => (t.isWord && t.pronunciation ? { ...t, segments: t.segments.map((s) => ({ ...s, reading: `[${t.pronunciation}]` })) } : t)) };
  },
  segment: segmentKo,
  reading: (text) => romanizeRR(text),
  romanize: (text) => romanizeRR(text),
  normalizeInput: (s) => s,
  altScript(text) {
    // muestra los hanja de las palabras sino-coreanas (escritura alternativa)
    const e = lookupFirstKo(text);
    const h = e?.t;
    return h && Array.from(h).length === Array.from(text).length ? `${text}(${h})` : text;
  },
  isTargetChar: isHangul,
  hasTargetText: (s) => Array.from(s).some(isHangul),
  readingAid: {
    label: "로마자",
    name: "Romanización",
    modes: { show: "Romanización sobre todo", unknown: "Romanización solo en palabras nuevas", hide: "Romanización oculta" },
    options: [{ id: "pronunciation", label: "Pronunciación real", description: "Muestra cómo suena tras las reglas fonológicas: 한국어 → [한구거].", default: false }],
    inputHint: { reading: "Escribe en hangul. Sin teclado coreano: usa el teclado en pantalla (⌨) o marca «mi teclado físico como 두벌식».", text: "Windows → Configuración → Hora e idioma → Idioma → Agregar → Coreano → teclado Microsoft IME (2-beolsik)." },
    altScript: { glyph: "漢", label: "Mostrar hanja", description: "Añade los hanja de las palabras sino-coreanas (학교 → 學校)." },
    weanMessage: "El hangul se aprende en un día o dos: quita la romanización en cuanto puedas.",
  },
  colorizeReading: (r) => [{ text: r }],
  prosody,
  characters: koCharacters,
  strokeData: koStrokes,
  dictionary: koDictionary,
  examples,
  frequency,
  exam: koExam,
  async levelLists() {
    await loadHanja();
    const t = topikData();
    return {
      title: "TOPIK (lista NIKL)",
      words: [
        { level: "TOPIK1", label: "TOPIK I (A)", list: t?.words.TOPIK1 ?? [] },
        { level: "TOPIK3", label: "TOPIK II (B)", list: t?.words.TOPIK3 ?? [] },
        { level: "TOPIK5", label: "TOPIK II (C)", list: t?.words.TOPIK5 ?? [] },
      ],
      chars: [{ level: "jamo", label: "Jamo", list: koCharacters.levelChars?.("jamo") ?? [] }],
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
  counters: koCounters,
  exerciseAdapters: koAdapters,
  tts: { voicePrefs: [/sunhi|injoon|hyunsu|seoyeon/i, /heami/i, /yuna/i], edgeTtsVoices: ["ko-KR-SunHiNeural", "ko-KR-InJoonNeural"], rateDefault: 0.9 },
  asr: { locale: "ko-KR" },
  anki: koAnki,
  theme: koTheme,
  ui: koUI,
  seed: SEED,
  categories: CATEGORY_META,
  data: {},
  credits: [
    { name: "Wiktionary (vía kaikki.org)", use: "Diccionario coreano–inglés, hanja y 훈음 de 2 569 hanja", license: "CC BY-SA 3.0 / GFDL", url: "https://kaikki.org/dictionary/Korean/" },
    { name: "한국어기초사전 · KRDict (NIKL)", use: "Traducciones al español (opcional, con clave gratuita de la API en .env.local) y enlaces a la ficha", license: "CC BY-SA 2.0 KR", url: "https://krdict.korean.go.kr" },
    { name: "한국어 학습용 어휘 목록 (NIKL, 2003)", use: "Niveles A/B/C del vocabulario y base de la semilla TOPIK I", license: "KOGL tipo 1 (atribución)", url: "https://www.korean.go.kr/front_eng/down/down_02V.do?etc_seq=70" },
    { name: "es-hangul (Toss)", use: "Composición y descomposición de jamo, teclado 2-beolsik", license: "MIT", url: "https://github.com/toss/es-hangul" },
    { name: "Tatoeba (pares kor–spa)", use: "Frases de ejemplo coreano–español", license: "CC BY 2.0 FR", url: "https://tatoeba.org" },
    { name: "FrequencyWords (hermitdave, OpenSubtitles)", use: "Frecuencia de palabras", license: "CC BY-SA 4.0", url: "https://github.com/hermitdave/FrequencyWords" },
    { name: "Reglas de pronunciación y romanización (propias)", use: "Pronunciación real (표준 발음법) y romanización revisada, cubiertas por tests", license: "Propio (MIT)", url: "https://www.korean.go.kr" },
    { name: "Trazos de hangul (propios)", use: "Orden de trazos de los jamo y composición de bloques silábicos", license: "Propio (MIT)", url: "" },
    { name: "topik.go.kr", use: "Estructura, tiempos y niveles del simulacro TOPIK I", license: "Documento público (solo estructura)", url: "https://www.topik.go.kr" },
  ],
};

export default pack;
