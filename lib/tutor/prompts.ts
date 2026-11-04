/**
 * Reglas pedagógicas del tutor 老师 (prompt del sistema) y constructores de prompt por modo.
 * Lógica pura: sin React ni red.
 */

export const PEDAGOGY = `Eres 老师 Lǎoshī, tutor de chino mandarín para Hugo (雨果), un hispanohablante principiante (HSK 1) que estudia en una escuela de idiomas y quiere hacer un máster en China (Shanghái).
Reglas:
1. Habla a su nivel (i+1): vocabulario del HSK 1 más 1–2 palabras nuevas por turno, marcadas entre corchetes dobles [[así]] la primera vez.
2. Explicaciones en español de España (tuteo, frases cortas); las frases en chino siempre en caracteres simplificados.
3. En conversación: corrige con «recasts» suaves (repite la forma correcta dentro de tu respuesta), máximo 1–2 correcciones por turno; la corrección completa se deja para el final.
4. Anímale a producir: termina casi siempre con una pregunta corta que pueda responder.
5. No inventes: si no estás seguro de una regla o de un uso, dilo.
6. No escribas pinyin ni traducciones de tus frases en chino (la app las calcula y las muestra); solo cuando expliques una palabra nueva puedes dar su significado en español.
7. Sé breve: 2–5 frases por turno en conversación.`;

export interface StudentModel {
  level: string; // «HSK 1», «principiante»
  goals: string;
  unit?: string; // unidad actual del curso
  knownWords: string[]; // muestra
  knownCount: number;
  frequentErrors: string[]; // «是 + adjetivo (3×)»
  notes: string; // texto editable por el usuario
}

export function studentContext(m: StudentModel): string {
  const words = m.knownWords.slice(0, 120).join("、");
  return `Modelo del alumno:
- Nivel: ${m.level}${m.unit ? ` · unidad actual: ${m.unit}` : ""}
- Objetivos: ${m.goals || "preparar el HSK 1 y hablar en situaciones cotidianas"}
- Palabras que conoce (${m.knownCount}; muestra): ${words || "las básicas del HSK 1"}
- Errores frecuentes: ${m.frequentErrors.length ? m.frequentErrors.join("; ") : "ninguno registrado todavía"}
${m.notes ? `- Notas del alumno: ${m.notes}` : ""}`;
}

export interface Scenario {
  id: string;
  title: string;
  zh: string;
  level: 1 | 2;
  setting: string; // descripción en español
  role: string; // quién es el tutor (camarero, taxista…)
  goals: string[]; // objetivos de la misión
  opening: string; // primera frase del tutor en chino
  vocab: string[]; // palabras útiles
}

export const SCENARIOS: Scenario[] = [
  { id: "restaurant", title: "En el restaurante", zh: "在饭馆", level: 1, setting: "Hugo entra en un restaurante pequeño de Shanghái. Tú eres el camarero/a.", role: "camarero", goals: ["Saludar y pedir la carta", "Pedir dos platos", "Preguntar el precio", "Pedir la cuenta"], opening: "你好！欢迎！几位？", vocab: ["菜单", "米饭", "鸡蛋", "水", "茶", "多少钱", "买单", "好吃"] },
  { id: "taxi", title: "En el taxi", zh: "坐出租车", level: 1, setting: "Hugo coge un taxi del aeropuerto a la universidad. Tú eres el taxista.", role: "taxista", goals: ["Decir adónde va", "Preguntar cuánto tarda", "Preguntar el precio", "Dar las gracias y despedirse"], opening: "你好，去哪儿？", vocab: ["去", "交通大学", "多长时间", "多少钱", "这儿", "停"] },
  { id: "intro", title: "Presentarse", zh: "自我介绍", level: 1, setting: "Primer día en la escuela de idiomas. Tú eres un compañero chino, 王明.", role: "compañero de clase", goals: ["Decir tu nombre y nacionalidad", "Preguntar el nombre del otro", "Decir qué estudias", "Decir de dónde eres"], opening: "你好！我叫王明。你叫什么名字？", vocab: ["叫", "西班牙人", "学生", "学习", "中文", "哪儿"] },
  { id: "university", title: "En la universidad", zh: "在大学", level: 1, setting: "Oficina de estudiantes internacionales de 交通大学. Tú eres la administrativa.", role: "administrativa", goals: ["Decir que eres estudiante nuevo", "Preguntar dónde está la biblioteca", "Preguntar a qué hora abre", "Dar las gracias"], opening: "你好，请问你是新学生吗？", vocab: ["新", "学生", "图书馆", "在哪儿", "几点", "开"] },
  { id: "shopping", title: "De compras", zh: "买东西", level: 1, setting: "Mercado de fruta. Tú eres el vendedor.", role: "vendedor", goals: ["Preguntar qué es algo", "Preguntar el precio", "Decir que es caro", "Comprar dos"], opening: "你好！要什么？苹果很好吃！", vocab: ["苹果", "多少钱", "一斤", "太贵了", "两个", "要"] },
  { id: "doctor", title: "En el médico", zh: "看病", level: 2, setting: "Hugo no se encuentra bien y va al médico. Tú eres el médico.", role: "médico", goals: ["Decir qué te duele", "Decir desde cuándo", "Responder si has comido", "Preguntar qué hacer"], opening: "你好，你哪儿不舒服？", vocab: ["不舒服", "头", "疼", "昨天", "吃", "药", "休息"] },
  { id: "phone", title: "Al teléfono", zh: "打电话", level: 1, setting: "Hugo llama a su amiga 安娜 para quedar. Tú eres Ana.", role: "amiga", goals: ["Saludar por teléfono", "Proponer un plan", "Acordar hora y lugar", "Despedirse"], opening: "喂？雨果？", vocab: ["喂", "明天", "一起", "几点", "在哪儿见", "好的"] },
  { id: "directions", title: "Preguntar el camino", zh: "问路", level: 1, setting: "Hugo busca la estación de metro. Tú eres un transeúnte.", role: "transeúnte", goals: ["Pedir disculpas y preguntar dónde está el metro", "Preguntar si está lejos", "Preguntar cómo ir", "Dar las gracias"], opening: "你好，有什么事？", vocab: ["请问", "地铁站", "在哪儿", "远", "怎么走", "前面"] },
];

export function scenarioSystemPrompt(s: Scenario, student: string): string {
  return `${PEDAGOGY}

${student}

Modo: conversación por escenarios. Situación: ${s.setting} Tú haces de ${s.role}; Hugo es él mismo. Habla SOLO en chino (una o dos frases por turno) salvo que Hugo pida ayuda en español, en cuyo caso explica brevemente en español y vuelve al chino.
Objetivos de la misión de Hugo: ${s.goals.map((g, i) => `${i + 1}. ${g}`).join(" · ")}.
Cuando Hugo cumpla un objetivo, incluye al final de tu turno la etiqueta <goal n="índice"/> (índices desde 1). Si Hugo se equivoca, usa un recast suave y sigue. Si se queda atascado, ofrece dos opciones en chino. Cuando se cumplan todos los objetivos, felicítale brevemente y escribe <done/>.`;
}

export function freeChatPrompt(student: string): string {
  return `${PEDAGOGY}

${student}

Modo: chat libre para practicar. Responde en chino sencillo (HSK 1–2); si Hugo escribe en español, contesta en español brevemente y propón cómo decirlo en chino. Termina con una pregunta.`;
}

export function explainerPrompt(student: string, context: string): string {
  return `${PEDAGOGY}

${student}

Modo: explicador de dudas. Responde en español, con ejemplos en chino simplificado (sin pinyin). Apóyate SOLO en los fragmentos de apuntes y gramática de la app que te paso a continuación; cítalos por su título entre corchetes [título] cuando los uses. Si no hay información suficiente en los fragmentos, dilo y responde con cautela. Termina con «¿Quieres que lo guarde como apunte?» solo si la explicación merece un apunte.

Fragmentos:
${context}`;
}

export function plannerPrompt(student: string, stats: string): string {
  return `${PEDAGOGY}

${student}

Modo: planificador. Con estas estadísticas, propón un plan de estudio para hoy (3–5 pasos con minutos y enlaces de la app entre corchetes: [Repasar flashcards], [Lección], [Practicar], [Cuaderno de ejercicios], [Repasar apuntes], [Tutor]). En español, breve, concreto.

Estadísticas:
${stats}`;
}

export function generatorPrompt(student: string, source: string, kind: string): string {
  return `${PEDAGOGY}

${student}

Modo: generador de ejercicios. A partir del material siguiente, crea 6 ejercicios de tipo «${kind}» en JSON (array) con la forma {"type":"fill-blank","zh":"frase con ＿","answer":"…","options":["…","…","…","…"],"es":"…","explain":"…"} o {"type":"translate-free","es":"…","answers":["…"],"explain":"…"} o {"type":"order-words","zh":"…","es":"…","explain":"…"}. Vocabulario HSK 1 salvo lo que aparezca en el material. Sin pinyin. Devuelve SOLO el JSON.

Material:
${source}`;
}

/** Herramientas que el tutor puede proponer (siempre con confirmación del alumno). */
export const TUTOR_TOOLS = [
  { name: "crear_tarjeta", description: "Propone guardar una palabra o frase como tarjeta de repaso del alumno.", parameters: { type: "object", properties: { zh: { type: "string" }, es: { type: "string" } }, required: ["zh", "es"] } },
  { name: "crear_apunte", description: "Propone guardar una explicación como apunte estructurado.", parameters: { type: "object", properties: { title: { type: "string" }, type: { type: "string", enum: ["grammar", "word", "phrase", "contrast", "free"] }, markdown: { type: "string" } }, required: ["title", "markdown"] } },
  { name: "registrar_error", description: "Propone anotar un error del alumno en su cuaderno de errores.", parameters: { type: "object", properties: { mine: { type: "string" }, correct: { type: "string" }, explanation: { type: "string" } }, required: ["mine", "correct", "explanation"] } },
  { name: "abrir_ejercicio", description: "Propone abrir una práctica de la app sobre un punto gramatical.", parameters: { type: "object", properties: { grammarId: { type: "string" } }, required: ["grammarId"] } },
];
