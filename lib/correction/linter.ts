/**
 * Capa 3: «linter» gramatical por reglas (HSK 1–2). Funciona sin respuesta de referencia. Cada regla tiene id,
 * patrón (sobre la frase segmentada), explicación en español, ejemplos ✅/❌, enlace al apunte de gramática y tests.
 * Lógica pura. Las reglas trabajan sobre la frase en hanzi sin puntuación (y, cuando ayuda, sobre las palabras).
 */
import type { CorrectionError } from "./types";
import type { Lexicon } from "@/lib/segment";
import { words } from "./normalize";

export interface LintRule {
  id: string;
  name: string;
  /** Apunte del profesor y punto de gramática relacionados */
  noteId?: string;
  grammarId?: string;
  explanation: string;
  tip: string;
  ok: string[]; // ejemplos correctos (no deben disparar la regla)
  bad: string[]; // ejemplos incorrectos (deben dispararla)
  /** Devuelve el texto afectado (o true) si hay error; null si no. */
  test(s: string, w: string[]): string | true | null;
  /** Sugerencia de corrección automática (opcional) */
  fix?(s: string): string | null;
  severity?: "error" | "warn";
}

const TIME = "(今天|明天|昨天|现在|早上|上午|中午|下午|晚上|星期[一二三四五六日天]|[一二三四五六七八九十]+点(半)?|[一二三四五六七八九十]+月[一二三四五六七八九十]+[号日]|后天|前天|周末|每天|以前|以后|去年|今年|明年)";
const VERB = "(去|来|吃|喝|看|买|学习|工作|睡觉|住|做|说|听|读|写|打电话|认识|喜欢|想|要|会|能|可以|回|坐|玩|游泳|跑步|唱歌|开|洗|穿|坐|见|找|教|学|上课|下课|起床|休息|等|用|给|问|帮)";
const QWORDS = "(什么|谁|哪儿|哪里|哪|几|多少|怎么|怎么样|为什么|什么时候)";
const ADJ = "(高兴|忙|好|大|小|冷|热|漂亮|贵|便宜|多|少|累|饿|渴|远|近|难|容易|快|慢|新|旧|长|短|胖|瘦|老|年轻|聪明|有意思|好吃|好看|好听|舒服|干净|安静|方便|重要)";
const NOUN_MEASURE = "(个|本|块|件|口|杯|瓶|只|张|条|位|辆|家|次|些|元|把|双|碗|岁|斤|点|分|年|月|天|号)";
const NUM = "([一二两三四五六七八九十百千]+|几)";
const COUNT_MEASURE = "(个|本|块|件|口|杯|瓶|只|张|条|位|辆|家|次|些|元|把|双|碗|斤|点)";

export const RULES: LintRule[] = [
  {
    id: "time-before-verb",
    name: "La expresión de tiempo va antes del verbo",
    grammarId: "word-order",
    noteId: "zh-word-order-skeleton",
    explanation: "En chino, cuándo pasa algo se dice antes del verbo (y antes del lugar): 我今天去学校. En español lo ponemos al final.",
    tip: "Esqueleto: Sujeto + Tiempo + Lugar + Verbo + Objeto. El tiempo nunca cierra la frase.",
    ok: ["我今天去学校", "今天我很忙", "我们明天在家吃饭", "我每天六点起床", "我今天去，明天不去"],
    bad: ["我去学校今天", "我吃饭明天", "他在家明天", "我学习中文晚上"],
    test: (s) => {
      const m = s.match(new RegExp(`(${VERB}|在|是)[^，。]*?${TIME}$`));
      if (!m) return null;
      // tiempo al final tras verbo+objeto (no «我今天去，明天不去»)
      if (new RegExp(`^${TIME}`).test(s)) return null;
      return m[0];
    },
    fix: (s) => {
      const m = s.match(new RegExp(`^(.*?)((?:${VERB}|在|是).*?)${TIME}$`));
      return m ? `${m[1]}${m[3]}${m[2]}` : null;
    },
  },
  {
    id: "zai-place-before-verb",
    name: "在 + lugar va antes del verbo",
    grammarId: "zai",
    noteId: "zh-grammar-zai-place",
    explanation: "El lugar donde se hace algo se dice antes del verbo con 在: 我在家吃饭. «Como en casa» se ordena al revés que en español.",
    tip: "Primero dónde, luego qué: 在 + lugar + verbo.",
    ok: ["我在家吃饭", "他在学校学习中文", "我住在北京", "我在北京", "你在哪儿工作", "他坐在这儿"],
    bad: ["我吃饭在家", "他学习中文在学校", "我们看电影在家"],
    test: (s) => {
      const m = s.match(new RegExp(`${VERB}[^在]{1,6}在[^，。]+$`));
      if (!m) return null;
      if (/(住在|坐在|放在|站在|住|在哪儿|在哪里)/.test(s)) return null;
      return m[0];
    },
  },
  {
    id: "shi-adjective",
    name: "No se usa 是 con adjetivos",
    grammarId: "hen-adj",
    noteId: "zh-grammar-hen-adj",
    explanation: "Los adjetivos ya funcionan como verbos: «estoy contento» es 我很高兴, no 我是高兴. 是 solo une nombres (我是学生).",
    tip: "Si en español dirías «ser/estar + adjetivo», en chino pon 很 (o 不) y quita 是.",
    ok: ["我很高兴", "我是学生", "他是我的老师", "今天是星期一", "这是很好的书", "他不是很忙"],
    bad: ["我是很高兴", "他是忙", "我是高兴", "今天是很冷"],
    test: (s) => {
      const m = s.match(new RegExp(`(?<!不)是(很|不|太)?${ADJ}(?!的)`));
      if (!m) return null;
      if (/^.{0,4}是不是/.test(s) && !/是不是.*是/.test(s)) return null;
      if (/是不是/.test(s)) return null;
      return m[0];
    },
    fix: (s) => s.replace(new RegExp(`是(很|不|太)?${ADJ}`), (_, adv: string | undefined, adj: string) => `${adv ?? "很"}${adj}`),
  },
  {
    id: "missing-hen",
    name: "Adjetivo solo: añade 很",
    grammarId: "hen-adj",
    noteId: "zh-grammar-hen-adj",
    explanation: "Sujeto + adjetivo sin nada suena a comparación («yo sí estoy ocupado, tú no»). Para afirmar se usa 很, aunque no signifique «muy».",
    tip: "我很忙, 他很高, 今天很冷: 很 es casi obligatorio en afirmativas sin otro adverbio.",
    ok: ["我很忙", "我不忙", "他太忙了", "你忙吗", "我也很忙", "我很好", "天气真好", "这个很贵"],
    bad: ["我忙", "他高兴", "今天冷", "我累"],
    test: (s, w) => {
      if (/[吗呢吧]$/.test(s) || /(很|不|太|真|非常|也|都|有点儿|有点|比|更|最)/.test(s)) return null;
      const m = s.match(new RegExp(`^(我|你|他|她|我们|你们|他们|她们|今天|明天|天气|这个|那个|这|那)${ADJ}$`));
      if (!m) return null;
      return w.length <= 3 ? m[0] : null;
    },
    fix: (s) => s.replace(new RegExp(`^(我|你|他|她|我们|你们|他们|她们|今天|明天|天气|这个|那个|这|那)(${ADJ})$`), "$1很$2"),
    severity: "warn",
  },
  {
    id: "bu-mei-past",
    name: "Pasado o experiencia: 没, no 不",
    grammarId: "bu-mei",
    noteId: "zh-contrast-bu-mei",
    explanation: "不 niega el presente, el futuro y los hábitos; 没 (没有) niega lo que no ha pasado: con 了, 过 y con 有 siempre 没.",
    tip: "Si hay 了/过/有 → 没. Si es «no quiero / no voy / no me gusta» → 不.",
    ok: ["我没去", "我不去", "我没有钱", "他没来过中国", "我不喜欢", "我不是学生", "我没吃饭", "我昨天不舒服", "他昨天不忙", "我昨天没去", "明天我不去"],
    bad: ["我不有钱", "他不去过中国", "我不吃饭了", "我不看了电影", "我不有时间", "我昨天不去", "他上个星期不来学校"],
    test: (s) => {
      const a = s.match(/不有/);
      if (a) return a[0];
      // momento pasado + 不 + verbo de acción (no estados ni verbos de querer/poder, que sí van con 不)
      const past = s.match(/(昨天|前天|上个?(星期|周|月)|去年|刚才)[^，。]{0,4}不(?!是|喜欢|想|要|会|能|可以|舒服|忙|好|高兴|在|知道|认识|太|错|累|冷|热|大|小|多|少|贵)([一-鿿])/);
      if (past) return `不${past[3]}`;
      const b = s.match(/不[^，。]{1,4}过/);
      if (b) return b[0];
      const c = s.match(/不[^，。]{1,3}了/);
      if (c && !/不要|不用|不能|不会|不想|太.*了|不错/.test(c[0])) return c[0];
      return null;
    },
    fix: (s) => s.replace(/不有/g, "没有").replace(/不([^，。]{1,4})过/g, "没$1过").replace(/(昨天|前天|上个?(?:星期|周|月)|去年|刚才)([^，。]{0,4})不/, "$1$2没"),
  },
  {
    id: "er-liang",
    name: "Dos + clasificador: 两, no 二",
    grammarId: "numbers",
    noteId: "zh-contrast-er-liang",
    explanation: "Al contar cosas (dos personas, dos libros) se dice 两 + clasificador: 两个人, 两本书. 二 se usa en números y fechas (二月, 十二).",
    tip: "Si hay clasificador detrás → 两. 十二, 二十, 二月 → 二.",
    ok: ["两个人", "两本书", "十二个", "二十个", "二月", "两点", "二零二六年"],
    bad: ["二个人", "二本书", "二杯茶", "二点"],
    test: (s) => {
      const m = s.match(new RegExp(`(?<![一二三四五六七八九十])二${COUNT_MEASURE}`));
      return m ? m[0] : null;
    },
    fix: (s) => s.replace(new RegExp(`(?<![一二三四五六七八九十])二(${COUNT_MEASURE})`, "g"), "两$1"),
  },
  {
    id: "missing-measure",
    name: "Falta el clasificador entre número y nombre",
    grammarId: "measure-words",
    noteId: "zh-classifiers-table",
    explanation: "Entre un número (o 这/那/几) y un nombre siempre va un clasificador: 三个学生, 一本书, 这个人.",
    tip: "Si dudas, 个 vale para casi todo (personas, cosas); mejor 个 que nada.",
    ok: ["三个学生", "一本书", "这个人", "两杯茶", "三天", "五岁", "两点", "一月", "我有三个朋友", "十二点"],
    bad: ["三学生", "一书", "这人", "两茶", "我有三朋友", "四苹果"],
    test: (s, w) => {
      const nouns = "(学生|老师|人|朋友|书|苹果|茶|咖啡|水|猫|狗|桌子|椅子|衣服|电脑|手机|车|汉字|电影|菜|米饭|钱|词|字|课|问题|医生|孩子|家|饭馆|商店|学校|房间|杯子)";
      const m = s.match(new RegExp(`(?<![一二三四五六七八九十])${NUM}${nouns}`)) ?? s.match(new RegExp(`(这|那|哪)${nouns}`));
      if (!m) return null;
      if (/(天|年|岁|点|月|号|块|元|分)/.test(m[0])) return null;
      void w;
      return m[0];
    },
    fix: (s) => s.replace(new RegExp(`(${NUM}|这|那|哪)(学生|老师|人|朋友|书|苹果|茶|咖啡|猫|狗|桌子|椅子|电脑|手机|电影|问题|医生|孩子)`), "$1个$3"),
  },
  {
    id: "ma-with-question-word",
    name: "吗 con pronombre interrogativo (doble pregunta)",
    grammarId: "question-words",
    noteId: "zh-question-ma",
    explanation: "Una frase con 什么/谁/哪儿/几… ya es pregunta: no se añade 吗. 你叫什么名字？ (sin 吗).",
    tip: "吗 solo convierte afirmaciones en preguntas de sí/no. Con interrogativo, nunca.",
    ok: ["你叫什么名字", "你去哪儿", "你是学生吗", "你知道他是谁吗", "你知道这是什么吗"],
    bad: ["你叫什么名字吗", "你去哪儿吗", "他是谁吗", "几点吗"],
    test: (s) => {
      if (!/吗$/.test(s)) return null;
      if (/(知道|认识|记得|明白|懂|告诉)/.test(s)) return null;
      const m = s.match(new RegExp(`${QWORDS}[^，。]*吗$`));
      return m ? m[0] : null;
    },
    fix: (s) => s.replace(/吗$/, ""),
  },
  {
    id: "le-with-bu",
    name: "了 con 不",
    grammarId: "le",
    noteId: "zh-grammar-le-completed",
    explanation: "Una acción negada con 不 no se ha completado: no lleva 了. Para «no hice» usa 没 (sin 了): 我没去.",
    tip: "不…了 solo existe como «ya no» (我不去了 = ya no voy). Si quieres decir «no fui», es 我没去.",
    ok: ["我没去", "我不去了", "我不喝了", "我去了", "我不想去"],
    bad: ["我不去了学校", "他不吃了饭", "我不看了电影"],
    test: (s) => {
      const m = s.match(/不[^，。]{1,2}了[^，。]+/);
      return m && !/不要|不用|不能|不会|不想|不是/.test(m[0]) ? m[0] : null;
    },
    fix: (s) => s.replace(/不([^，。]{1,2})了([^，。]+)/, "没$1$2"),
  },
  {
    id: "de-possession",
    name: "的 en posesión y atribución",
    grammarId: "de",
    noteId: "zh-grammar-de",
    explanation: "Entre poseedor y cosa va 的: 我的书, 老师的手机. Se omite solo con familia y lugares cercanos (我妈妈, 我家, 我们学校).",
    tip: "Si en español dirías «mi/tu/su + cosa» → 的 (salvo familia y casa/escuela/empresa).",
    ok: ["我的书", "我妈妈", "我家", "他的手机", "我们学校", "这是我朋友", "老师的书"],
    bad: ["我书", "他手机", "老师书", "你电脑"],
    test: (s) => {
      const things = "(书|手机|电脑|车|衣服|杯子|桌子|椅子|钱|名字|东西|房间|狗|猫|老师|学生|问题|工作)";
      const m = s.match(new RegExp(`(?<![一-鿿])(我|你|他|她|我们|你们|他们|老师|学生|朋友)${things}`));
      if (!m) return null;
      if (/(朋友|家|妈妈|爸爸|哥哥|姐姐|弟弟|妹妹|学校|公司|老师)$/.test(m[1] + m[2]) && /^(我|你|他|她|我们|你们|他们)$/.test(m[1]) && /(朋友|家|妈妈|爸爸|哥哥|姐姐|弟弟|妹妹|学校|公司|老师)$/.test(m[2])) return null;
      return m[0];
    },
    severity: "warn",
  },
  {
    id: "ye-dou-position",
    name: "也 y 都 van entre el sujeto y el verbo",
    grammarId: "ye-dou",
    noteId: "zh-contrast-he-ye-dou",
    explanation: "也 («también») y 都 («todos») son adverbios: van después del sujeto y antes del verbo o 很: 我也是学生, 我们都很忙. Y si van juntos: 也都.",
    tip: "Nunca al principio ni al final: 也我是… ❌, 我是学生也 ❌.",
    ok: ["我也是学生", "我们都很忙", "他们也都是老师", "我也很好", "我们都去"],
    bad: ["也我是学生", "我是学生也", "都我们很忙", "我们很忙都", "他们都也是老师"],
    test: (s) => {
      const a = s.match(/^(也|都)/);
      if (a) return a[0];
      const b = s.match(/(也|都)$/);
      if (b) return b[0];
      const c = s.match(/都也/);
      if (c) return c[0];
      return null;
    },
    fix: (s) => s.replace(/都也/g, "也都"),
  },
  {
    id: "tai-le",
    name: "太 + adjetivo + 了",
    grammarId: "tai-le",
    noteId: "zh-grammar-tai-le",
    explanation: "太 («demasiado / ¡qué…!») casi siempre cierra con 了: 太贵了, 太好了. La negación es 不太 (sin 了): 不太贵.",
    tip: "太…了 van juntos como un sándwich.",
    ok: ["太贵了", "太好了", "不太贵", "他太忙了", "不太好"],
    bad: ["太贵", "太好", "他太忙", "不太贵了"],
    test: (s) => {
      const a = s.match(new RegExp(`(?<!不)太${ADJ}(?!了)`));
      if (a) return a[0];
      const b = s.match(new RegExp(`不太${ADJ}了`));
      return b ? b[0] : null;
    },
    fix: (s) => s.replace(new RegExp(`(?<!不)太(${ADJ})(?!了)`), "太$1了").replace(new RegExp(`不太(${ADJ})了`), "不太$1"),
    severity: "warn",
  },
  {
    id: "he-not-clauses",
    name: "和 une nombres, no frases",
    grammarId: "he",
    noteId: "zh-contrast-he-ye-dou",
    explanation: "和 («y») solo une nombres o pronombres: 我和你, 茶和咖啡. Para unir dos acciones se ponen seguidas o se usa 也: 我吃饭，也喝茶.",
    tip: "Si hay un verbo a cada lado de 和 → quita 和 y usa coma o 也.",
    ok: ["我和你是朋友", "我喜欢茶和咖啡", "他和我都去", "我买书和笔"],
    bad: ["我吃饭和喝茶", "他看书和我看电视", "我学习中文和我工作"],
    test: (s) => {
      const m = s.match(new RegExp(`${VERB}[^和]{0,4}和[^，。]{0,3}${VERB}`));
      return m ? m[0] : null;
    },
  },
  {
    id: "modal-hui-neng",
    name: "会 / 能 / 可以",
    grammarId: "modal-verbs",
    noteId: "zh-contrast-hui-neng-keyi",
    explanation: "会 = saber hacer algo aprendido (idiomas, nadar, conducir); 能 = poder (capacidad o circunstancia); 可以 = tener permiso. «No sé chino» es 我不会说中文, no 我不能说中文.",
    tip: "¿Es una habilidad aprendida? → 会. ¿Permiso? → 可以. ¿Posibilidad/circunstancia? → 能.",
    ok: ["我会说中文", "我会游泳", "我不会开车", "我能来", "这里可以抽烟吗", "我今天不能去"],
    bad: ["我能说中文", "我不能说汉语", "他能游泳", "我能写汉字"],
    test: (s) => {
      const m = s.match(/(不?能|可以)(说|写)(中文|汉语|英语|西班牙语|法语|日语|韩语|德语|汉字)/);
      if (m && !/(吗|能不能|可以不可以)/.test(s)) return m[0];
      const n = s.match(/能游泳(?!吗)/);
      return n ? n[0] : null;
    },
    fix: (s) => s.replace(/不能(说|写)(中文|汉语|英语|西班牙语|法语|日语|韩语|德语|汉字)/, "不会$1$2").replace(/(?<!不)能(说|写)(中文|汉语|英语|西班牙语|法语|日语|韩语|德语|汉字)/, "会$1$2"),
    severity: "warn",
  },
  {
    id: "you-mei-you",
    name: "有 se niega con 没",
    grammarId: "you",
    noteId: "zh-grammar-you",
    explanation: "«No tengo / no hay» es 没有, nunca 不有.",
    tip: "有 ↔ 没有. 不 no toca a 有.",
    ok: ["我没有钱", "我有钱", "没有人"],
    bad: ["我不有钱", "不有人"],
    test: (s) => (s.includes("不有") ? "不有" : null),
    fix: (s) => s.replace(/不有/g, "没有"),
  },
  {
    id: "zai-shi-place",
    name: "Estar en un lugar: 在, no 是",
    grammarId: "zai",
    noteId: "zh-contrast-ser-estar",
    explanation: "«Estoy en Pekín» es 我在北京. 是 no sirve para estar en un sitio.",
    tip: "ser = 是 (identidad); estar en un sitio = 在; estar + adjetivo = 很 + adjetivo.",
    ok: ["我在北京", "他在家", "这是北京", "我是北京人"],
    bad: ["我是在北京", "他是家", "我是北京"],
    test: (s) => {
      const places = "(北京|上海|家|学校|中国|西班牙|马德里|这儿|那儿|这里|那里|医院|饭馆|商店|公司|房间|教室|图书馆)";
      const m = s.match(new RegExp(`是在${places}`)) ?? s.match(new RegExp(`^(我|你|他|她|我们|你们|他们)是${places}$`));
      if (!m) return null;
      if (/人$/.test(s)) return null;
      return m[0];
    },
    fix: (s) => s.replace(/是在/, "在"),
  },
  {
    id: "plural-s",
    name: "El plural no se marca",
    noteId: "zh-errors-hispanohablantes",
    explanation: "Los nombres chinos no cambian en plural: 三个学生 (no 学生们 al contar). 们 solo con pronombres y, a veces, personas sin número: 老师们.",
    tip: "Si hay número + clasificador, nunca 们.",
    ok: ["三个学生", "我们", "老师们好", "同学们"],
    bad: ["三个学生们", "两个朋友们", "很多人们"],
    test: (s) => {
      const m = s.match(new RegExp(`(${NUM}${NOUN_MEASURE}|很多|一些)[^，。]{1,3}们`));
      return m ? m[0] : null;
    },
    fix: (s) => s.replace(new RegExp(`((${NUM}${NOUN_MEASURE}|很多|一些)[^，。]{1,3})们`), "$1"),
  },
  {
    id: "question-word-position",
    name: "El interrogativo ocupa el sitio de la respuesta",
    grammarId: "question-words",
    noteId: "zh-question-shenme",
    explanation: "En chino la pregunta tiene el mismo orden que la respuesta: 你叫什么名字 ↔ 我叫雨果. 什么/谁/哪儿 no van al principio como en español.",
    tip: "Piensa la respuesta y sustituye lo que no sabes por el interrogativo, sin mover nada.",
    ok: ["你叫什么名字", "你去哪儿", "他是谁", "这是什么", "谁是老师", "什么时候去", "为什么不去", "怎么样"],
    bad: ["什么你叫名字", "哪儿你去", "什么这是", "谁他是"],
    test: (s) => {
      const m = s.match(new RegExp(`^(什么|哪儿|哪里|谁)(?=(你|我|他|她|我们|你们|他们|这|那))`));
      if (!m) return null;
      if (/^什么时候|^谁是|^谁(来|去)|^什么是/.test(s)) return null;
      return m[0];
    },
  },
];

export interface LintIssue extends CorrectionError {
  ruleName: string;
  fix?: string;
}

/** Ejecuta todas las reglas sobre una frase en hanzi. */
export function lint(hanzi: string, lexicon?: Lexicon, only?: string[]): LintIssue[] {
  const s = hanzi.replace(/[\s，。！？、：；“”‘’（）《》,.!?;:'"()\-·]/g, "");
  if (!s) return [];
  const w = words(s, lexicon);
  const out: LintIssue[] = [];
  for (const r of RULES) {
    if (only && !only.includes(r.id)) continue;
    const hit = r.test(s, w);
    if (hit === null) continue;
    const text = hit === true ? s : hit;
    const idx = typeof hit === "string" ? s.indexOf(hit) : 0;
    const fix = r.fix?.(s) ?? undefined;
    out.push({ type: "grammar", ruleId: r.id, noteId: r.noteId, span: { from: idx, to: idx + text.length, text }, explanation: r.explanation, tip: r.tip, severity: r.severity ?? "error", source: "linter", ruleName: r.name, fix: fix && fix !== s ? fix : undefined });
  }
  return out;
}

export function ruleById(id: string): LintRule | undefined {
  return RULES.find((r) => r.id === id);
}
