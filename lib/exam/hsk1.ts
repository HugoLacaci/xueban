/**
 * Simulacro HSK 1 (nuevo HSK 3.0, estructura oficial «新版HSK（1-6级）考试结构与样题示例», publicada 2025-12,
 * vigente desde 2026-07): 听力 20 preguntas (4 partes × 5, ≈12 min) + 阅读 20 preguntas (4 partes × 5, 20 min).
 * Total 40 preguntas, ≈40 min. Sin parte de escritura en el nivel 1.
 * Las partes con imágenes del examen real se adaptan aquí a opciones de texto.
 */
import type { Exercise, MultipleChoiceExercise, FillBlankExercise, PoolWord } from "@/lib/exercises/types";
import { seededRandom, shuffle, pick } from "@/lib/utils";

export const HSK1_STRUCTURE = {
  listening: { questions: 20, minutes: 12, parts: ["Frase corta → imagen (adaptado: significado)", "Pregunta/frase → respuesta", "Diálogo → opción A–F", "Frase + pregunta → A/B/C"] },
  reading: { questions: 20, minutes: 20, parts: ["Frase → imagen (adaptado: significado)", "Frase → respuesta adecuada (A–F)", "Rellenar hueco con banco de palabras (A–F)", "Frase + pregunta → A/B/C"] },
  totalQuestions: 40,
  totalMinutes: 40,
  source: "汉考国际 · 新版HSK（1-6级）考试结构与样题示例（2025-12）",
};

/* ------------------------- Bancos de contenido ------------------------- */

/** Parte 1 escucha / Parte 1 lectura: frases cortas con su significado. */
const SHORT_PHRASES: { zh: string; es: string }[] = [
  { zh: "三个苹果", es: "tres manzanas" },
  { zh: "一杯茶", es: "una taza de té" },
  { zh: "两本书", es: "dos libros" },
  { zh: "我的老师", es: "mi profesor" },
  { zh: "一只猫", es: "un gato" },
  { zh: "很多钱", es: "mucho dinero" },
  { zh: "今天下雨", es: "hoy llueve" },
  { zh: "他在睡觉", es: "él está durmiendo" },
  { zh: "我们去学校", es: "vamos a la escuela" },
  { zh: "她喜欢喝咖啡", es: "a ella le gusta tomar café" },
  { zh: "爸爸在看电视", es: "papá está viendo la tele" },
  { zh: "一个大西瓜", es: "una sandía grande" },
  { zh: "他们是朋友", es: "ellos son amigos" },
  { zh: "现在八点", es: "son las ocho" },
  { zh: "一件衣服", es: "una prenda de ropa" },
  { zh: "我有一个弟弟", es: "tengo un hermano menor" },
  { zh: "这是我的手机", es: "este es mi móvil" },
  { zh: "天气很冷", es: "hace mucho frío" },
  { zh: "她在吃饭", es: "ella está comiendo" },
  { zh: "我们坐出租车", es: "cogemos un taxi" },
  { zh: "一张桌子", es: "una mesa" },
  { zh: "他在写字", es: "él está escribiendo caracteres" },
  { zh: "妈妈在做饭", es: "mamá está cocinando" },
  { zh: "一瓶水", es: "una botella de agua" },
  { zh: "星期天", es: "domingo" },
  { zh: "一个医生", es: "un médico" },
  { zh: "五块钱", es: "cinco yuanes" },
  { zh: "他在打电话", es: "él está llamando por teléfono" },
  { zh: "我的中国朋友", es: "mi amigo chino" },
  { zh: "一辆车", es: "un coche" },
];

/** Parte 2 escucha y lectura: frase/pregunta → respuesta adecuada. */
const QA_PAIRS: { q: string; a: string; es: string }[] = [
  { q: "你好吗？", a: "我很好，谢谢。", es: "¿Cómo estás? — Muy bien, gracias." },
  { q: "你喝水吗？", a: "好的，谢谢！", es: "¿Bebes agua? — Vale, ¡gracias!" },
  { q: "今天天气怎么样？", a: "今天很热。", es: "¿Qué tiempo hace hoy? — Hace mucho calor." },
  { q: "你叫什么名字？", a: "我叫王明。", es: "¿Cómo te llamas? — Me llamo Wang Ming." },
  { q: "你是哪国人？", a: "我是西班牙人。", es: "¿De qué país eres? — Soy español." },
  { q: "现在几点？", a: "现在三点。", es: "¿Qué hora es? — Son las tres." },
  { q: "这个多少钱？", a: "十块钱。", es: "¿Cuánto cuesta esto? — Diez yuanes." },
  { q: "你家有几口人？", a: "四口人。", es: "¿Cuántos sois en tu familia? — Cuatro." },
  { q: "你在哪儿？", a: "我在学校。", es: "¿Dónde estás? — En la escuela." },
  { q: "你想吃什么？", a: "我想吃米饭。", es: "¿Qué quieres comer? — Quiero arroz." },
  { q: "明天你去北京吗？", a: "不去，我去上海。", es: "¿Mañana vas a Pekín? — No, voy a Shanghái." },
  { q: "谢谢你！", a: "不客气。", es: "¡Gracias! — De nada." },
  { q: "对不起。", a: "没关系。", es: "Lo siento. — No pasa nada." },
  { q: "你会说汉语吗？", a: "会一点儿。", es: "¿Sabes hablar chino? — Un poco." },
  { q: "他是谁？", a: "他是我的老师。", es: "¿Quién es él? — Es mi profesor." },
  { q: "你今天忙吗？", a: "不太忙。", es: "¿Estás ocupado hoy? — No mucho." },
  { q: "你的生日是几月几号？", a: "五月三号。", es: "¿Cuándo es tu cumpleaños? — El 3 de mayo." },
  { q: "你有狗吗？", a: "没有，我有一只猫。", es: "¿Tienes perro? — No, tengo un gato." },
  { q: "我们去吃饭吧。", a: "好啊，走吧！", es: "Vamos a comer. — ¡Vale, vamos!" },
  { q: "你怎么去学校？", a: "我坐地铁去。", es: "¿Cómo vas a la escuela? — En metro." },
  { q: "你喜欢什么水果？", a: "我喜欢苹果。", es: "¿Qué fruta te gusta? — Las manzanas." },
  { q: "你多大？", a: "我二十三岁。", es: "¿Cuántos años tienes? — Veintitrés." },
  { q: "老师在哪儿？", a: "老师在那儿。", es: "¿Dónde está el profesor? — Allí." },
  { q: "你什么时候来？", a: "我下午来。", es: "¿Cuándo vienes? — Por la tarde." },
];

/** Parte 3 escucha: minidiálogo → qué expresa (opciones A–F). */
const DIALOGUES: { lines: { s: string; zh: string }[]; answer: string; es: string }[] = [
  { lines: [{ s: "女", zh: "你好！" }, { s: "男", zh: "你好，很高兴认识你！" }], answer: "非常高兴", es: "Se conocen y él está muy contento." },
  { lines: [{ s: "女", zh: "你在做什么？" }, { s: "男", zh: "我在学习汉语。" }], answer: "在学习", es: "Él está estudiando." },
  { lines: [{ s: "男", zh: "今天怎么样？" }, { s: "女", zh: "非常热！" }], answer: "非常热", es: "Hace mucho calor." },
  { lines: [{ s: "女", zh: "你喜欢这个歌吗？" }, { s: "男", zh: "喜欢，很好听。" }], answer: "很好听", es: "La canción suena bien." },
  { lines: [{ s: "男", zh: "我们几点吃饭？" }, { s: "女", zh: "十二点吧。" }], answer: "十二点", es: "Comen a las doce." },
  { lines: [{ s: "女", zh: "这件衣服多少钱？" }, { s: "男", zh: "一百块。" }], answer: "一百块", es: "La prenda cuesta cien yuanes." },
  { lines: [{ s: "男", zh: "你去哪儿？" }, { s: "女", zh: "我去医院。" }], answer: "去医院", es: "Ella va al hospital." },
  { lines: [{ s: "女", zh: "你有哥哥吗？" }, { s: "男", zh: "有，我有两个哥哥。" }], answer: "两个哥哥", es: "Él tiene dos hermanos mayores." },
  { lines: [{ s: "男", zh: "你喝茶还是咖啡？" }, { s: "女", zh: "我喝茶。" }], answer: "喝茶", es: "Ella toma té." },
  { lines: [{ s: "女", zh: "明天星期几？" }, { s: "男", zh: "明天星期六。" }], answer: "星期六", es: "Mañana es sábado." },
  { lines: [{ s: "男", zh: "你会开车吗？" }, { s: "女", zh: "不会，我坐公共汽车。" }], answer: "坐公共汽车", es: "Ella va en autobús." },
  { lines: [{ s: "女", zh: "你的家在哪儿？" }, { s: "男", zh: "在上海。" }], answer: "在上海", es: "Su casa está en Shanghái." },
  { lines: [{ s: "男", zh: "你怎么了？" }, { s: "女", zh: "我有点儿累。" }], answer: "有点儿累", es: "Está un poco cansada." },
  { lines: [{ s: "女", zh: "这是谁的书？" }, { s: "男", zh: "是老师的。" }], answer: "老师的书", es: "El libro es del profesor." },
  { lines: [{ s: "男", zh: "你想吃什么？" }, { s: "女", zh: "我想吃面条。" }], answer: "吃面条", es: "Ella quiere comer fideos." },
  { lines: [{ s: "女", zh: "现在下雨吗？" }, { s: "男", zh: "不下了，天气很好。" }], answer: "天气很好", es: "Ya hace buen tiempo." },
];

/** Parte 4 escucha / Parte 4 lectura: frase + pregunta → A/B/C. */
const STATEMENTS: { zh: string; q: string; options: string[]; answer: number; es: string }[] = [
  { zh: "下午我去超市，我想买一些水果。", q: "说话人下午去哪里？", options: ["超市", "医院", "学校"], answer: 0, es: "Por la tarde voy al supermercado a comprar fruta." },
  { zh: "请问现在几点了？", q: "说话人想知道什么？", options: ["时间", "名字", "房间号"], answer: 0, es: "¿Qué hora es, por favor?" },
  { zh: "我妈妈是医生，她在医院工作。", q: "说话人的妈妈做什么工作？", options: ["老师", "医生", "学生"], answer: 1, es: "Mi madre es médica y trabaja en el hospital." },
  { zh: "明天是星期天，我不上课，我想在家看电视。", q: "说话人明天做什么？", options: ["上课", "看电视", "去学校"], answer: 1, es: "Mañana es domingo, no tengo clase; quiero ver la tele en casa." },
  { zh: "这杯咖啡二十块钱，有点儿贵。", q: "咖啡多少钱？", options: ["十块", "二十块", "三十块"], answer: 1, es: "Este café cuesta 20 yuanes, es un poco caro." },
  { zh: "我有一个姐姐，没有哥哥。", q: "说话人有什么？", options: ["哥哥", "姐姐", "弟弟"], answer: 1, es: "Tengo una hermana mayor, no tengo hermano mayor." },
  { zh: "今天很冷，你多穿衣服。", q: "今天天气怎么样？", options: ["很热", "很冷", "下雨"], answer: 1, es: "Hoy hace frío, abrígate." },
  { zh: "我每天早上七点起床，八点去学校。", q: "说话人几点去学校？", options: ["七点", "八点", "九点"], answer: 1, es: "Me levanto a las siete y voy a la escuela a las ocho." },
  { zh: "我不喜欢喝茶，我喜欢喝水。", q: "说话人喜欢喝什么？", options: ["茶", "咖啡", "水"], answer: 2, es: "No me gusta el té, me gusta el agua." },
  { zh: "我的朋友是中国人，他叫王明。", q: "王明是哪国人？", options: ["中国人", "西班牙人", "美国人"], answer: 0, es: "Mi amigo es chino, se llama Wang Ming." },
  { zh: "我们坐地铁去火车站，很快。", q: "他们怎么去火车站？", options: ["坐出租车", "坐地铁", "坐飞机"], answer: 1, es: "Vamos a la estación en metro, es rápido." },
  { zh: "这本书是我在北京买的。", q: "说话人在哪儿买的书？", options: ["上海", "北京", "学校"], answer: 1, es: "Este libro lo compré en Pekín." },
  { zh: "我今天有点儿不舒服，不想吃饭。", q: "说话人怎么了？", options: ["很高兴", "不舒服", "很忙"], answer: 1, es: "Hoy no me encuentro bien, no quiero comer." },
  { zh: "你的手机在桌子上，书在椅子上。", q: "手机在哪儿？", options: ["桌子上", "椅子上", "家里"], answer: 0, es: "Tu móvil está en la mesa, el libro en la silla." },
  { zh: "我们学校有很多学生，有三十个老师。", q: "学校有多少老师？", options: ["十三个", "三十个", "三个"], answer: 1, es: "Nuestra escuela tiene muchos estudiantes y treinta profesores." },
  { zh: "我想学做中国菜，很好吃。", q: "说话人想学什么？", options: ["说汉语", "做中国菜", "写汉字"], answer: 1, es: "Quiero aprender a cocinar comida china, está muy buena." },
  { zh: "下个星期我妈妈来上海看我。", q: "谁来上海？", options: ["爸爸", "妈妈", "朋友"], answer: 1, es: "La semana que viene mi madre viene a Shanghái a verme." },
  { zh: "我的生日是十月二十号，我想请朋友吃饭。", q: "说话人生日想做什么？", options: ["请朋友吃饭", "去北京", "买衣服"], answer: 0, es: "Mi cumpleaños es el 20 de octubre, quiero invitar a mis amigos a comer." },
];

/** Parte 3 lectura: frase con hueco + banco de palabras. */
const FILL: { zh: string; answer: string; es: string }[] = [
  { zh: "你（　）什么名字？", answer: "叫", es: "¿Cómo te llamas?" },
  { zh: "我（　）西班牙人。", answer: "是", es: "Soy español." },
  { zh: "你（　）哪儿？", answer: "在", es: "¿Dónde estás?" },
  { zh: "我（　）一个妹妹。", answer: "有", es: "Tengo una hermana menor." },
  { zh: "这（　）书是我的。", answer: "本", es: "Este libro es mío." },
  { zh: "他（　）是学生。", answer: "也", es: "Él también es estudiante." },
  { zh: "我们（　）是中国人。", answer: "都", es: "Todos somos chinos." },
  { zh: "今天（　）热。", answer: "很", es: "Hoy hace mucho calor." },
  { zh: "我（　）喝咖啡。", answer: "不", es: "No bebo café." },
  { zh: "我（　）去学校。", answer: "没", es: "No fui a la escuela." },
  { zh: "现在（　）点？", answer: "几", es: "¿Qué hora es?" },
  { zh: "这个（　）钱？", answer: "多少", es: "¿Cuánto cuesta esto?" },
  { zh: "我（　）说汉语。", answer: "会", es: "Sé hablar chino." },
  { zh: "我（　）喝水。", answer: "想", es: "Quiero beber agua." },
  { zh: "请（　）我一杯茶。", answer: "给", es: "Dame un té, por favor." },
  { zh: "我买（　）一本书。", answer: "了", es: "Compré un libro." },
  { zh: "你是老师（　）？", answer: "吗", es: "¿Eres profesor?" },
  { zh: "我很好，你（　）？", answer: "呢", es: "Estoy bien, ¿y tú?" },
  { zh: "我们走（　）！", answer: "吧", es: "¡Vámonos!" },
  { zh: "我（　）两个哥哥。", answer: "有", es: "Tengo dos hermanos mayores." },
  { zh: "他（　）北京工作。", answer: "在", es: "Él trabaja en Pekín." },
  { zh: "一（　）咖啡多少钱？", answer: "杯", es: "¿Cuánto cuesta un café?" },
  { zh: "太（　）了！", answer: "好", es: "¡Genial!" },
  { zh: "我（　）天都学习汉语。", answer: "每", es: "Estudio chino todos los días." },
];

/* ------------------------- Generación ------------------------- */

let n = 0;
const id = (p: string) => `exam-${p}-${n++}`;

function mc(part: string, prompt: string, display: MultipleChoiceExercise["display"], options: { text: string; sub?: string; zh?: boolean }[], answer: number, skill: "listening" | "reading", explain?: string): MultipleChoiceExercise {
  return { id: id(part), type: skill === "listening" ? "listen-choose" : "comprehension", skill, itemId: `hsk1-${part}`, itemKind: "sentence", prompt, display, options, answer, explain };
}

export interface ExamSection {
  id: "listening" | "reading";
  title: string;
  minutes: number;
  parts: { title: string; exercises: Exercise[] }[];
}

/** Construye el simulacro completo (40 preguntas). `extraWords` enriquece las opciones (p. ej. el mazo del usuario). */
export function buildHsk1Exam(seed: number, extraWords: PoolWord[] = []): ExamSection[] {
  const rng = seededRandom(seed);
  n = 0;
  const words = extraWords.filter((w) => w.hanzi.length <= 3);

  // 听力 1: oye una frase corta → elige significado (3 opciones)
  const l1 = pick(SHORT_PHRASES, 5, rng).map((p) => {
    const wrong = pick(
      SHORT_PHRASES.filter((x) => x !== p),
      2,
      rng,
    );
    const opts = shuffle([p, ...wrong], rng);
    return mc("l1", "Escucha y elige lo que se dice", { audio: p.zh }, opts.map((o) => ({ text: o.es })), opts.indexOf(p), "listening", `${p.zh} = ${p.es}`);
  });
  // 听力 2: oye pregunta → elige respuesta (3 opciones, en chino)
  const l2 = pick(QA_PAIRS, 5, rng).map((p) => {
    const wrong = pick(
      QA_PAIRS.filter((x) => x !== p),
      2,
      rng,
    );
    const opts = shuffle([p, ...wrong], rng);
    return mc("l2", "Escucha la pregunta y elige la respuesta adecuada", { audio: p.q }, opts.map((o) => ({ text: o.a, zh: true })), opts.indexOf(p), "listening", p.es);
  });
  // 听力 3: diálogo → opción A–F
  const d3 = pick(DIALOGUES, 5, rng);
  const bank3 = shuffle([...d3.map((d) => d.answer), ...pick(DIALOGUES.filter((d) => !d3.includes(d)).map((d) => d.answer), 1, rng)], rng);
  const l3 = d3.map((d) => mc("l3", "Escucha el diálogo y elige la opción que corresponde (A–F)", { audio: d.lines.map((l) => l.zh).join("　") }, bank3.map((b) => ({ text: b, zh: true })), bank3.indexOf(d.answer), "listening", d.es));
  // 听力 4: frase + pregunta → A/B/C
  const s4 = pick(STATEMENTS, 5, rng);
  const l4 = s4.map((s) => mc("l4", `Escucha y responde: ${s.q}`, { audio: `${s.zh}　问：${s.q}` }, s.options.map((o) => ({ text: o, zh: true })), s.answer, "listening", s.es));

  // 阅读 1: frase → significado (6 opciones, A–F)
  const r1set = pick(
    SHORT_PHRASES.filter((p) => !l1.some((e) => e.display.audio === p.zh)),
    5,
    rng,
  );
  const bank1 = shuffle([...r1set, ...pick(SHORT_PHRASES.filter((p) => !r1set.includes(p)), 1, rng)], rng);
  const r1 = r1set.map((p) => mc("r1", "Lee la frase y elige su significado (A–F)", { zh: p.zh }, bank1.map((b) => ({ text: b.es })), bank1.indexOf(p), "reading"));
  // 阅读 2: frase → respuesta (A–F)
  const r2set = pick(
    QA_PAIRS.filter((p) => !l2.some((e) => e.display.audio === p.q)),
    5,
    rng,
  );
  const bank2 = shuffle([...r2set, ...pick(QA_PAIRS.filter((p) => !r2set.includes(p)), 1, rng)], rng);
  const r2 = r2set.map((p) => mc("r2", "Elige la respuesta adecuada (A–F)", { zh: p.q }, bank2.map((b) => ({ text: b.a, zh: true })), bank2.indexOf(p), "reading", p.es));
  // 阅读 3: hueco con banco A–F
  const f3 = pick(FILL, 5, rng);
  const bank3r = shuffle([...f3.map((f) => f.answer), ...pick(FILL.filter((f) => !f3.includes(f)).map((f) => f.answer).filter((a) => !f3.some((f) => f.answer === a)), 1, rng)], rng);
  const r3: FillBlankExercise[] = f3.map((f) => ({ id: id("r3"), type: "fill-blank", skill: "reading", itemId: "hsk1-r3", itemKind: "grammar", prompt: "Elige la palabra que completa la frase (A–F)", zh: f.zh.replace("（　）", "＿＿"), answer: f.answer, options: bank3r, es: "" }));
  // 阅读 4: frase + pregunta → A/B/C
  const s4r = pick(
    STATEMENTS.filter((s) => !s4.includes(s)),
    5,
    rng,
  );
  const r4 = s4r.map((s) => mc("r4", s.q, { zh: s.zh }, s.options.map((o) => ({ text: o, zh: true })), s.answer, "reading", s.es));

  void words;
  return [
    { id: "listening", title: "听力 · Comprensión auditiva", minutes: HSK1_STRUCTURE.listening.minutes, parts: [{ title: "Primera parte (1–5)", exercises: l1 }, { title: "Segunda parte (6–10)", exercises: l2 }, { title: "Tercera parte (11–15)", exercises: l3 }, { title: "Cuarta parte (16–20)", exercises: l4 }] },
    { id: "reading", title: "阅读 · Comprensión lectora", minutes: HSK1_STRUCTURE.reading.minutes, parts: [{ title: "Primera parte (21–25)", exercises: r1 }, { title: "Segunda parte (26–30)", exercises: r2 }, { title: "Tercera parte (31–35)", exercises: r3 }, { title: "Cuarta parte (36–40)", exercises: r4 }] },
  ];
}
