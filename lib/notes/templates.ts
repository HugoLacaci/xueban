/**
 * Plantillas de apunte: campos estructurados por tipo. Lógica pura (sin React): la UI (components/notes/fields.tsx)
 * pinta cada campo según su `kind`, y lib/notes/practice.ts genera tarjetas y ejercicios a partir de ellos.
 */
import type { NoteType } from "@/lib/db/schema";

export type FieldKind =
  | "text" // una línea en español
  | "long" // varias líneas en español (markdown ligero)
  | "zh" // texto en la lengua meta (una línea), con pinyin automático
  | "pinyin" // lectura (calculada, editable)
  | "select"
  | "date"
  | "zhList" // lista de palabras/frases en la lengua meta
  | "list" // lista de textos en español
  | "examples" // [{ zh, py, es }]
  | "qa" // preguntas con respuesta [{ q, qpy, qes, a, apy, aes }]
  | "pairs" // [{ wrong, right, why }]
  | "table" // { columns: string[], rows: string[][] }
  | "formula" // [{ text, role }]
  | "dialogue" // [{ speaker, zh, py, es }]
  | "minitest" // [{ zh (con ＿), answer, options?, es }]
  | "nodes" // mapa mental [{ text, kind, children }]
  | "image"
  | "audio";

export interface FieldDef {
  id: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number; // mínimo de elementos recomendados (examples, zhList…)
  placeholder?: string;
}

export interface NoteTemplate {
  type: NoteType;
  name: string;
  native: string;
  icon: string; // lucide
  description: string;
  defaultTitle: string;
  /** Campo(s) de los que sale el título si el usuario no escribe uno */
  titleFrom: string[];
  fields: FieldDef[];
  /** Sugerencias de preguntas Cornell para este tipo */
  cueHints: string[];
  /** Texto corto de ayuda pedagógica que se muestra al crear */
  coach: string;
}

export interface Example {
  zh: string;
  py?: string;
  es?: string;
}
export interface QA {
  q: string;
  qpy?: string;
  qes?: string;
  a: string;
  apy?: string;
  aes?: string;
}
export interface Pair {
  wrong: string;
  right: string;
  why?: string;
}
export interface FormulaPart {
  text: string;
  role: FormulaRole;
}
export type FormulaRole = "subject" | "time" | "place" | "verb" | "object" | "particle" | "adverb" | "adjective" | "measure" | "number" | "question" | "other";
export const FORMULA_ROLES: Record<FormulaRole, { label: string; cls: string }> = {
  subject: { label: "Sujeto", cls: "role-subject" },
  time: { label: "Tiempo", cls: "role-time" },
  place: { label: "Lugar", cls: "role-place" },
  verb: { label: "Verbo", cls: "role-verb" },
  object: { label: "Objeto", cls: "role-object" },
  particle: { label: "Partícula", cls: "role-particle" },
  adverb: { label: "Adverbio", cls: "role-adverb" },
  adjective: { label: "Adjetivo", cls: "role-adjective" },
  measure: { label: "Clasificador", cls: "role-measure" },
  number: { label: "Número", cls: "role-number" },
  question: { label: "Interrogativo", cls: "role-question" },
  other: { label: "Otro", cls: "role-other" },
};
export interface DialogueLine {
  speaker: string;
  zh: string;
  py?: string;
  es?: string;
}
export interface MiniTestItem {
  zh: string; // con ＿ como hueco
  answer: string;
  options?: string[];
  es?: string;
}
export interface TopicNode {
  text: string;
  kind: "word" | "phrase" | "structure" | "group";
  es?: string;
  children?: TopicNode[];
}

const REGISTERS = [
  { value: "neutral", label: "neutro" },
  { value: "colloquial", label: "coloquial" },
  { value: "formal", label: "más formal" },
];

const POS = ["nombre", "verbo", "adjetivo", "adverbio", "pronombre", "clasificador", "partícula", "número", "preposición", "conjunción", "expresión"].map((p) => ({ value: p, label: p }));

export const ERROR_TYPES = [
  { value: "order", label: "orden de la frase" },
  { value: "missing", label: "falta una palabra" },
  { value: "extra", label: "sobra una palabra" },
  { value: "char", label: "carácter equivocado" },
  { value: "tone", label: "tono" },
  { value: "word", label: "palabra inadecuada" },
  { value: "grammar", label: "regla gramatical" },
  { value: "register", label: "registro / naturalidad" },
  { value: "other", label: "otro" },
];

export const TEMPLATES: Record<NoteType, NoteTemplate> = {
  free: {
    type: "free",
    name: "Texto libre",
    native: "随笔",
    icon: "PenLine",
    description: "Página en blanco con bloques: texto, chino con pinyin, ejemplos, fórmulas, tablas, avisos, ejercicios…",
    defaultTitle: "Sin título",
    titleFrom: [],
    fields: [],
    cueHints: ["¿Cuál es la idea principal?", "¿Qué ejemplo lo resume mejor?"],
    coach: "Una idea por apunte. Si cabe en una plantilla (palabra, estructura, contraste…), úsala: te obliga a poner ejemplos y preguntas.",
  },
  word: {
    type: "word",
    name: "Palabra",
    native: "词",
    icon: "Type",
    description: "Hanzi, pinyin, significado, categoría, clasificador, ejemplos, colocaciones y contraste.",
    defaultTitle: "Palabra",
    titleFrom: ["hanzi"],
    fields: [
      { id: "hanzi", label: "Palabra (hanzi)", kind: "zh", required: true },
      { id: "pinyin", label: "Pinyin", kind: "pinyin", hint: "se calcula solo; corrígelo si tu profesor lo dice distinto" },
      { id: "meaning", label: "Significado(s)", kind: "text", required: true, hint: "varias acepciones separadas por ; (la más frecuente primero)" },
      { id: "pos", label: "Categoría gramatical", kind: "select", options: POS },
      { id: "classifier", label: "Clasificador", kind: "zh", placeholder: "个 · 本 · 杯…" },
      { id: "examples", label: "Ejemplos (mínimo 3)", kind: "examples", min: 3, hint: "frases completas, nunca la palabra sola" },
      { id: "collocations", label: "Colocaciones", kind: "zhList", hint: "con qué palabras suele ir: 喝茶, 一杯茶" },
      { id: "related", label: "Palabras relacionadas", kind: "zhList" },
      { id: "contrast", label: "Contraste con…", kind: "text", placeholder: "二 vs 两: …" },
      { id: "trick", label: "Truco para recordarla", kind: "text" },
      { id: "teacher", label: "Nota del profe", kind: "long" },
    ],
    cueHints: ["¿Qué significa {hanzi}?", "¿Cómo se dice «{meaning}»?", "¿Qué clasificador lleva {hanzi}?", "Una frase con {hanzi}"],
    coach: "Nunca una palabra suelta: escribe al menos tres frases donde la usarías tú. Añade con qué otras palabras suele ir.",
  },
  character: {
    type: "character",
    name: "Carácter",
    native: "字",
    icon: "Brush",
    description: "Componentes, radical, origen, mnemotecnia, palabras y caracteres parecidos.",
    defaultTitle: "Carácter",
    titleFrom: ["char"],
    fields: [
      { id: "char", label: "Carácter", kind: "zh", required: true },
      { id: "pinyin", label: "Pinyin", kind: "pinyin" },
      { id: "meaning", label: "Significado", kind: "text" },
      { id: "radical", label: "Radical", kind: "zh" },
      { id: "components", label: "Componentes", kind: "zhList", hint: "女 + 子 = 好" },
      { id: "origin", label: "Origen", kind: "long", hint: "pictograma, ideograma o fono-semántico; qué dibujaba" },
      { id: "mnemonic", label: "Mnemotecnia (mi historia)", kind: "long" },
      { id: "words", label: "Palabras con este carácter", kind: "zhList" },
      { id: "similar", label: "Caracteres parecidos", kind: "zhList" },
    ],
    cueHints: ["¿De qué componentes se forma {char}?", "¿Qué dibujaba originalmente {char}?", "¿Cómo distingues {char} de sus parecidos?"],
    coach: "Descompón el carácter y cuenta una historia con sus partes. Lo que inventas tú se recuerda mejor que lo que lees.",
  },
  grammar: {
    type: "grammar",
    name: "Estructura gramatical",
    native: "语法",
    icon: "Puzzle",
    description: "Fórmula visual con huecos de colores, función, ejemplos, negativa, pregunta, errores y contrastes.",
    defaultTitle: "Estructura",
    titleFrom: ["name"],
    fields: [
      { id: "name", label: "Nombre", kind: "text", required: true, placeholder: "在 + lugar + verbo" },
      { id: "formula", label: "Fórmula", kind: "formula", required: true, hint: "fichas de colores: S + 在 + lugar + V + O" },
      { id: "function", label: "Para qué sirve", kind: "text", required: true },
      { id: "level", label: "Nivel HSK", kind: "select", options: [{ value: "1", label: "HSK 1" }, { value: "2", label: "HSK 2" }, { value: "3", label: "HSK 3" }] },
      { id: "examples", label: "Ejemplos (mínimo 5)", kind: "examples", min: 5 },
      { id: "negative", label: "Forma negativa", kind: "examples", min: 1 },
      { id: "question", label: "Forma de pregunta", kind: "examples", min: 1 },
      { id: "mistakes", label: "Errores típicos", kind: "pairs" },
      { id: "contrasts", label: "Contrastes (A vs B)", kind: "list", hint: "enlaza con [[…]] si tienes el apunte" },
      { id: "teacher", label: "Nota del profe", kind: "long" },
    ],
    cueHints: ["¿Cuál es la fórmula de «{name}»?", "¿Cómo se niega?", "¿Cómo se pregunta?", "¿Qué error típico hay que evitar?"],
    coach: "Escribe la estructura como una fórmula con huecos y rellénala con tus propias frases. Anota siempre cómo se niega y cómo se pregunta.",
  },
  particle: {
    type: "particle",
    name: "Partícula",
    native: "助词",
    icon: "Sparkles",
    description: "Funciones, posición, matiz y tono emocional, ejemplos, qué pasa si la quitas y contrastes.",
    defaultTitle: "Partícula",
    titleFrom: ["particle"],
    fields: [
      { id: "particle", label: "Partícula", kind: "zh", required: true },
      { id: "pinyin", label: "Pinyin", kind: "pinyin" },
      { id: "functions", label: "Función o funciones", kind: "list", min: 1 },
      { id: "position", label: "Posición en la frase", kind: "text", placeholder: "al final · tras el verbo · tras el nombre" },
      { id: "nuance", label: "Matiz y tono emocional", kind: "text" },
      { id: "examples", label: "Ejemplos", kind: "examples", min: 3 },
      { id: "without", label: "¿Qué pasa si la quitas?", kind: "text" },
      { id: "contrasts", label: "Contrastes", kind: "list", placeholder: "吗 vs 呢 vs 吧" },
    ],
    cueHints: ["¿Para qué sirve {particle}?", "¿Dónde va {particle} en la frase?", "¿Qué cambia si quito {particle}?"],
    coach: "Las partículas se entienden por contraste: escribe la misma frase con y sin ella, y con otra partícula.",
  },
  question: {
    type: "question",
    name: "Forma de preguntar",
    native: "问句",
    icon: "CircleHelp",
    description: "Estructura, cuándo se usa, cómo se responde (¡clave!) y ejemplos con su respuesta.",
    defaultTitle: "Pregunta",
    titleFrom: ["structure"],
    fields: [
      { id: "structure", label: "Estructura", kind: "text", required: true, placeholder: "…吗？ · A不A · 还是" },
      { id: "when", label: "Cuándo se usa", kind: "text" },
      { id: "answer", label: "Cómo se responde", kind: "text", required: true, hint: "en chino no se responde «sí/no»: se repite el verbo" },
      { id: "qa", label: "Ejemplos con respuesta", kind: "qa", min: 3 },
      { id: "contrasts", label: "Contrastes", kind: "list" },
    ],
    cueHints: ["¿Cómo se responde a «{structure}»?", "¿Cuándo uso «{structure}» y no 吗?"],
    coach: "Una pregunta sin su respuesta es media lección: escribe siempre el par pregunta → respuesta.",
  },
  contrast: {
    type: "contrast",
    name: "Contraste A vs B",
    native: "对比",
    icon: "Columns2",
    description: "Tabla comparativa, regla corta, ejemplos ✅/❌ y minitest.",
    defaultTitle: "Contraste",
    titleFrom: ["a", "b"],
    fields: [
      { id: "a", label: "A", kind: "zh", required: true },
      { id: "b", label: "B", kind: "zh", required: true },
      { id: "rule", label: "Regla corta", kind: "text", required: true, hint: "una frase que te permita decidir en un segundo" },
      { id: "table", label: "Tabla comparativa", kind: "table" },
      { id: "ok", label: "Ejemplos ✅", kind: "examples", min: 2 },
      { id: "bad", label: "Ejemplos ❌ (con corrección)", kind: "pairs" },
      { id: "minitest", label: "Minitest", kind: "minitest", min: 3, hint: "frases con ＿ donde hay que elegir A o B" },
    ],
    cueHints: ["¿Cuándo uso {a} y cuándo {b}?", "Regla en una frase: {a} vs {b}"],
    coach: "Reduce la diferencia a una regla de una línea y ponla a prueba con un minitest de tres frases.",
  },
  phrase: {
    type: "phrase",
    name: "Frase / expresión",
    native: "句子",
    icon: "Quote",
    description: "Frase completa reutilizable: pinyin, traducción literal y natural, situación, registro y variantes.",
    defaultTitle: "Frase",
    titleFrom: ["zh"],
    fields: [
      { id: "zh", label: "Frase", kind: "zh", required: true },
      { id: "pinyin", label: "Pinyin", kind: "pinyin" },
      { id: "literal", label: "Traducción literal", kind: "text", hint: "palabra por palabra: ayuda a ver la estructura" },
      { id: "natural", label: "Traducción natural", kind: "text", required: true },
      { id: "situation", label: "Situación", kind: "text", placeholder: "al pedir en un restaurante" },
      { id: "register", label: "Registro", kind: "select", options: REGISTERS },
      { id: "variants", label: "Variantes", kind: "examples" },
    ],
    cueHints: ["¿Cómo se dice «{natural}»?", "¿En qué situación uso «{zh}»?"],
    coach: "Mina frases enteras (chunks), no palabras: se recuperan de golpe cuando hablas.",
  },
  dialogue: {
    type: "dialogue",
    name: "Diálogo",
    native: "对话",
    icon: "MessagesSquare",
    description: "Líneas por hablante con audio de voces distintas, vocabulario y gramática destacados.",
    defaultTitle: "Diálogo",
    titleFrom: ["topic"],
    fields: [
      { id: "topic", label: "Tema / situación", kind: "text", required: true },
      { id: "lines", label: "Líneas", kind: "dialogue", min: 2 },
      { id: "vocab", label: "Vocabulario destacado", kind: "zhList" },
      { id: "grammar", label: "Estructuras que aparecen", kind: "list" },
    ],
    cueHints: ["¿Qué dirías tú en «{topic}»?", "¿Cómo empieza el diálogo?"],
    coach: "Escribe el diálogo tal como lo dirías tú (con tu nombre, tu ciudad). Luego practícalo en el Tutor.",
  },
  error: {
    type: "error",
    name: "Error",
    native: "错题",
    icon: "AlertTriangle",
    description: "Lo que escribí, lo correcto, el porqué, la regla y mi reflexión. Va al 错题本 y se repasa con SRS.",
    defaultTitle: "Error",
    titleFrom: ["correct"],
    fields: [
      { id: "origin", label: "De dónde viene", kind: "text", placeholder: "ejercicio del cuaderno, clase del martes…" },
      { id: "mine", label: "Lo que escribí", kind: "zh", required: true },
      { id: "correct", label: "Lo correcto", kind: "zh", required: true },
      { id: "errorType", label: "Tipo de error", kind: "select", options: ERROR_TYPES },
      { id: "explanation", label: "Por qué", kind: "long", required: true },
      { id: "ruleId", label: "Regla (id del apunte de gramática)", kind: "text" },
      { id: "reflection", label: "Mi reflexión", kind: "long", hint: "¿por qué me confundí? ¿cómo lo evito?" },
    ],
    cueHints: ["¿Por qué «{mine}» está mal?", "¿Cómo se dice bien?"],
    coach: "El cuaderno de errores es el método de los estudiantes chinos: cada error que entiendes de verdad no vuelve.",
  },
  class: {
    type: "class",
    name: "Clase",
    native: "课堂",
    icon: "NotebookPen",
    description: "Fecha, profesor, tema, vocabulario, gramática, frases, deberes y fotos del cuaderno.",
    defaultTitle: "Clase",
    titleFrom: ["topic"],
    fields: [
      { id: "date", label: "Fecha", kind: "date", required: true },
      { id: "teacher", label: "Profesor/a", kind: "text" },
      { id: "topic", label: "Tema", kind: "text" },
      { id: "vocabText", label: "Vocabulario (una palabra por línea)", kind: "long", hint: "咖啡 · 咖啡,kāfēi,café · 我想喝咖啡。| wǒ xiǎng hē kāfēi | Quiero un café" },
      { id: "grammar", label: "Gramática vista", kind: "long" },
      { id: "phrases", label: "Frases de la clase", kind: "examples" },
      { id: "homework", label: "Deberes", kind: "long" },
      { id: "photos", label: "Fotos del cuaderno / pizarra", kind: "image" },
    ],
    cueHints: ["¿Qué tres cosas nuevas vimos el {date}?", "¿Qué deberes hay?"],
    coach: "Durante la clase, captura rápido en la bandeja; después de clase, dedica 10 minutos a procesarla en apuntes estructurados.",
  },
  topic: {
    type: "topic",
    name: "Tema / mapa mental",
    native: "主题",
    icon: "Network",
    description: "Palabras, frases y estructuras de un tema organizadas en un mapa.",
    defaultTitle: "Tema",
    titleFrom: ["topic"],
    fields: [
      { id: "topic", label: "Tema", kind: "text", required: true, placeholder: "En el restaurante" },
      { id: "nodes", label: "Mapa", kind: "nodes" },
    ],
    cueHints: ["¿Qué 5 palabras clave tiene «{topic}»?", "¿Qué estructura usaría para «{topic}»?"],
    coach: "Agrupa por situaciones, no por listas alfabéticas: así es como lo vas a necesitar al hablar.",
  },
  culture: {
    type: "culture",
    name: "Cultura",
    native: "文化",
    icon: "Landmark",
    description: "Una curiosidad cultural con su vocabulario.",
    defaultTitle: "Cultura",
    titleFrom: ["topic"],
    fields: [
      { id: "topic", label: "Tema", kind: "text", required: true },
      { id: "text", label: "Texto", kind: "long" },
      { id: "image", label: "Imagen propia", kind: "image" },
      { id: "vocab", label: "Vocabulario relacionado", kind: "zhList" },
    ],
    cueHints: ["¿Qué hay que saber sobre «{topic}»?"],
    coach: "Apunta lo que te sorprendió: las sorpresas son las que se recuerdan.",
  },
  pronunciation: {
    type: "pronunciation",
    name: "Pronunciación",
    native: "发音",
    icon: "Mic",
    description: "Un sonido o tono: cómo se articula, pares mínimos con audio y mi grabación.",
    defaultTitle: "Pronunciación",
    titleFrom: ["sound"],
    fields: [
      { id: "sound", label: "Sonido o tono", kind: "text", required: true, placeholder: "zh / ch / sh · tercer tono" },
      { id: "howTo", label: "Cómo se articula", kind: "long", hint: "compara con el español" },
      { id: "pairs", label: "Pares mínimos", kind: "examples", hint: "zhī / chī / shī" },
      { id: "recording", label: "Mi grabación", kind: "audio" },
    ],
    cueHints: ["¿Cómo se pronuncia «{sound}»?", "¿Con qué se confunde «{sound}»?"],
    coach: "Graba tu voz y compárala con el modelo: el oído se entrena escuchándose.",
  },
  lesson: {
    type: "lesson",
    name: "Ficha de la lección",
    native: "课",
    icon: "BookOpen",
    description: "Resumen automático de una lección del curso (vocabulario, estructuras y frases) que puedes ampliar.",
    defaultTitle: "Lección",
    titleFrom: ["lessonTitle"],
    fields: [
      { id: "lessonId", label: "Lección", kind: "text" },
      { id: "lessonTitle", label: "Título", kind: "text" },
      { id: "vocab", label: "Vocabulario", kind: "examples" },
      { id: "structures", label: "Estructuras", kind: "list" },
      { id: "phrases", label: "Frases", kind: "examples" },
    ],
    cueHints: ["¿Qué estructuras enseña la lección?", "¿Qué palabras nuevas hay?"],
    coach: "Esta ficha la genera la app; añade lo que dijo tu profesor y tus propios ejemplos.",
  },
};

export const NOTE_TYPES: NoteType[] = ["word", "grammar", "question", "contrast", "phrase", "error", "class", "particle", "character", "dialogue", "topic", "pronunciation", "culture", "lesson", "free"];

export function templateFor(type: NoteType): NoteTemplate {
  return TEMPLATES[type] ?? TEMPLATES.free;
}

function defaultFor(kind: FieldKind): unknown {
  switch (kind) {
    case "text":
    case "long":
    case "zh":
    case "pinyin":
    case "select":
    case "date":
    case "image":
    case "audio":
      return "";
    case "table":
      return { columns: ["", "A", "B"], rows: [["", "", ""]] };
    default:
      return [];
  }
}

export function defaultsFor(type: NoteType): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of templateFor(type).fields) out[f.id] = defaultFor(f.kind);
  return out;
}

/** Título derivado de los campos («二 vs 两», «在 + lugar + verbo», «咖啡»). */
export function titleFromFields(type: NoteType, fields: Record<string, unknown>): string {
  const tpl = templateFor(type);
  const parts = tpl.titleFrom.map((id) => String(fields[id] ?? "").trim()).filter(Boolean);
  if (!parts.length) return "";
  if (type === "contrast") return parts.join(" vs ");
  if (type === "class") return `Clase ${String(fields.date ?? "").trim()}${parts[0] ? ` · ${parts[0]}` : ""}`.trim();
  return parts[0];
}

/** Rellena las sugerencias de preguntas Cornell con los campos («¿Qué significa {hanzi}?»). */
export function cueSuggestions(type: NoteType, fields: Record<string, unknown>): string[] {
  return templateFor(type)
    .cueHints.map((h) => h.replace(/\{(\w+)\}/g, (_, k: string) => String(fields[k] ?? "").trim()))
    .filter((s) => !/\{|\?\s*$/.test(s) || !/\{/.test(s))
    .filter((s) => !/«»|\(\)/.test(s) && !/\s{2,}/.test(s));
}
