/** Datos de pronunciación: tabla de pinyin, tonos, pares de tonos, caracteres parecidos y errores típicos de hispanohablantes. */

export const INITIALS = ["b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s", "y", "w"];

export const FINALS = [
  "a", "o", "e", "i", "u", "ü", "ai", "ei", "ao", "ou", "an", "en", "ang", "eng", "ong", "er",
  "ia", "ie", "iao", "iu", "ian", "in", "iang", "ing", "iong",
  "ua", "uo", "uai", "ui", "uan", "un", "uang", "ueng",
  "üe", "üan", "ün",
];

/** Todas las sílabas válidas del mandarín estándar (sin tono), por inicial. "-" = sin inicial. */
export const SYLLABLES: Record<string, string[]> = {
  "-": ["a", "o", "e", "ai", "ei", "ao", "ou", "an", "en", "ang", "eng", "er", "yi", "ya", "ye", "yao", "you", "yan", "yin", "yang", "ying", "yong", "wu", "wa", "wo", "wai", "wei", "wan", "wen", "wang", "weng", "yu", "yue", "yuan", "yun"],
  b: ["ba", "bo", "bai", "bei", "bao", "ban", "ben", "bang", "beng", "bi", "bie", "biao", "bian", "bin", "bing", "bu"],
  p: ["pa", "po", "pai", "pei", "pao", "pou", "pan", "pen", "pang", "peng", "pi", "pie", "piao", "pian", "pin", "ping", "pu"],
  m: ["ma", "mo", "me", "mai", "mei", "mao", "mou", "man", "men", "mang", "meng", "mi", "mie", "miao", "miu", "mian", "min", "ming", "mu"],
  f: ["fa", "fo", "fei", "fou", "fan", "fen", "fang", "feng", "fu"],
  d: ["da", "de", "dai", "dei", "dao", "dou", "dan", "den", "dang", "deng", "dong", "di", "dia", "die", "diao", "diu", "dian", "ding", "du", "duo", "dui", "duan", "dun"],
  t: ["ta", "te", "tai", "tao", "tou", "tan", "tang", "teng", "tong", "ti", "tie", "tiao", "tian", "ting", "tu", "tuo", "tui", "tuan", "tun"],
  n: ["na", "ne", "nai", "nei", "nao", "nou", "nan", "nen", "nang", "neng", "nong", "ni", "nie", "niao", "niu", "nian", "nin", "niang", "ning", "nu", "nuo", "nuan", "nü", "nüe"],
  l: ["la", "le", "lai", "lei", "lao", "lou", "lan", "lang", "leng", "long", "li", "lia", "lie", "liao", "liu", "lian", "lin", "liang", "ling", "lu", "luo", "luan", "lun", "lü", "lüe"],
  g: ["ga", "ge", "gai", "gei", "gao", "gou", "gan", "gen", "gang", "geng", "gong", "gu", "gua", "guo", "guai", "gui", "guan", "gun", "guang"],
  k: ["ka", "ke", "kai", "kei", "kao", "kou", "kan", "ken", "kang", "keng", "kong", "ku", "kua", "kuo", "kuai", "kui", "kuan", "kun", "kuang"],
  h: ["ha", "he", "hai", "hei", "hao", "hou", "han", "hen", "hang", "heng", "hong", "hu", "hua", "huo", "huai", "hui", "huan", "hun", "huang"],
  j: ["ji", "jia", "jie", "jiao", "jiu", "jian", "jin", "jiang", "jing", "jiong", "ju", "jue", "juan", "jun"],
  q: ["qi", "qia", "qie", "qiao", "qiu", "qian", "qin", "qiang", "qing", "qiong", "qu", "que", "quan", "qun"],
  x: ["xi", "xia", "xie", "xiao", "xiu", "xian", "xin", "xiang", "xing", "xiong", "xu", "xue", "xuan", "xun"],
  zh: ["zha", "zhe", "zhi", "zhai", "zhei", "zhao", "zhou", "zhan", "zhen", "zhang", "zheng", "zhong", "zhu", "zhua", "zhuo", "zhuai", "zhui", "zhuan", "zhun", "zhuang"],
  ch: ["cha", "che", "chi", "chai", "chao", "chou", "chan", "chen", "chang", "cheng", "chong", "chu", "chua", "chuo", "chuai", "chui", "chuan", "chun", "chuang"],
  sh: ["sha", "she", "shi", "shai", "shei", "shao", "shou", "shan", "shen", "shang", "sheng", "shu", "shua", "shuo", "shuai", "shui", "shuan", "shun", "shuang"],
  r: ["re", "ri", "rao", "rou", "ran", "ren", "rang", "reng", "rong", "ru", "rua", "ruo", "rui", "ruan", "run"],
  z: ["za", "ze", "zi", "zai", "zei", "zao", "zou", "zan", "zen", "zang", "zeng", "zong", "zu", "zuo", "zui", "zuan", "zun"],
  c: ["ca", "ce", "ci", "cai", "cao", "cou", "can", "cen", "cang", "ceng", "cong", "cu", "cuo", "cui", "cuan", "cun"],
  s: ["sa", "se", "si", "sai", "sao", "sou", "san", "sen", "sang", "seng", "song", "su", "suo", "sui", "suan", "sun"],
};

/** Ejemplo de carácter para cada sílaba+tono frecuente (para la tabla interactiva). Vacío = usar TTS de la sílaba en pinyin. */
export const SYLLABLE_EXAMPLES: Record<string, string> = {
  ma1: "妈", ma2: "麻", ma3: "马", ma4: "骂", ba1: "八", ba4: "爸", bu4: "不", wo3: "我", ni3: "你", ta1: "他", hao3: "好",
  shi4: "是", de5: "的", le5: "了", zai4: "在", you3: "有", bu2: "不", yi1: "一", er4: "二", san1: "三", si4: "四", wu3: "五",
  liu4: "六", qi1: "七", jiu3: "九", shi2: "十", ren2: "人", da4: "大", xiao3: "小", zhong1: "中", guo2: "国", xue2: "学",
  sheng1: "生", lao3: "老", shi1: "师", peng2: "朋", you2: "友", jia1: "家", shu1: "书", che1: "车", qian2: "钱", shui3: "水",
  cha2: "茶", fan4: "饭", cai4: "菜", xie4: "谢", qing3: "请", zuo4: "坐", kan4: "看", ting1: "听", shuo1: "说", du2: "读",
  xie3: "写", qu4: "去", lai2: "来", hui4: "会", neng2: "能", xiang3: "想", yao4: "要", ai4: "爱", xi3: "喜", huan1: "欢",
  ri4: "日", yue4: "月", nian2: "年", tian1: "天", dian3: "点", fen1: "分", xing1: "星", qi2: "期", jin1: "今", ming2: "明",
  zuo2: "昨", nü3: "女", nan2: "男", lü4: "绿", ju4: "句", xu1: "需", qu1: "区", yu3: "语", yun4: "运", yuan2: "元", jue2: "觉",
  zhi1: "只", chi1: "吃", zi4: "字", ci4: "次", si1: "思", re4: "热", rou4: "肉", zhe4: "这", na4: "那", ge4: "个", hen3: "很",
  tai4: "太", ye3: "也", dou1: "都", he2: "和", ma5: "吗", ne5: "呢", ba5: "吧", men5: "们", zi5: "子", hou4: "后",
};

export interface ToneInfo {
  tone: 1 | 2 | 3 | 4 | 5;
  name: string;
  contour: string; // 55, 35, 214, 51
  description: string;
  tip: string; // comparación con el español
  example: { zh: string; py: string; es: string };
}

export const TONES: ToneInfo[] = [
  { tone: 1, name: "Primer tono", contour: "55", description: "Alto y plano, como una nota sostenida.", tip: "Como cuando el médico te dice «di aaah» o cuando cantas una nota larga.", example: { zh: "妈", py: "mā", es: "madre" } },
  { tone: 2, name: "Segundo tono", contour: "35", description: "Sube de medio a alto, como una pregunta corta.", tip: "Como el «¿qué?» sorprendido en español: ¿qué↗?", example: { zh: "麻", py: "má", es: "cáñamo; entumecido" } },
  { tone: 3, name: "Tercer tono", contour: "214", description: "Bajo; baja un poco y sube al final (aislado). Entre palabras suele quedarse bajo.", tip: "Como un «mmm…» dubitativo con la voz muy grave. Dos terceros seguidos: el primero se convierte en segundo (nǐ hǎo → ní hǎo).", example: { zh: "马", py: "mǎ", es: "caballo" } },
  { tone: 4, name: "Cuarto tono", contour: "51", description: "Cae de alto a bajo, corto y firme.", tip: "Como un «¡no!» tajante o una orden: ¡ya↘!", example: { zh: "骂", py: "mà", es: "regañar" } },
  { tone: 5, name: "Tono neutro", contour: "—", description: "Breve, ligero, sin tono propio; toma la altura de la sílaba anterior.", tip: "Como la segunda sílaba de «casa» cuando hablas rápido. Se escribe sin marca: ma.", example: { zh: "吗", py: "ma", es: "partícula interrogativa" } },
];

export interface TonePair {
  pattern: string; // "11", "12", … "10" (0 = neutro)
  word: string;
  pinyin: string;
  label: string; // significado
}

/** Los 20 pares bisilábicos (16 combinaciones + 4 con tono neutro) con palabras del HSK 1. */
export const TONE_PAIRS: TonePair[] = [
  { pattern: "11", word: "今天", pinyin: "jīntiān", label: "hoy" },
  { pattern: "12", word: "中国", pinyin: "Zhōngguó", label: "China" },
  { pattern: "13", word: "多少", pinyin: "duōshǎo", label: "cuánto" },
  { pattern: "14", word: "工作", pinyin: "gōngzuò", label: "trabajo" },
  { pattern: "21", word: "明天", pinyin: "míngtiān", label: "mañana" },
  { pattern: "22", word: "学习", pinyin: "xuéxí", label: "estudiar" },
  { pattern: "23", word: "没有", pinyin: "méiyǒu", label: "no tener" },
  { pattern: "24", word: "学校", pinyin: "xuéxiào", label: "escuela" },
  { pattern: "31", word: "老师", pinyin: "lǎoshī", label: "profesor" },
  { pattern: "32", word: "小时", pinyin: "xiǎoshí", label: "hora" },
  { pattern: "33", word: "你好", pinyin: "nǐ hǎo", label: "hola" },
  { pattern: "34", word: "可以", pinyin: "kěyǐ", label: "poder" },
  { pattern: "41", word: "大家", pinyin: "dàjiā", label: "todos" },
  { pattern: "42", word: "问题", pinyin: "wèntí", label: "pregunta" },
  { pattern: "43", word: "汉语", pinyin: "Hànyǔ", label: "chino (idioma)" },
  { pattern: "44", word: "再见", pinyin: "zàijiàn", label: "adiós" },
  { pattern: "10", word: "妈妈", pinyin: "māma", label: "mamá" },
  { pattern: "20", word: "什么", pinyin: "shénme", label: "qué" },
  { pattern: "30", word: "我们", pinyin: "wǒmen", label: "nosotros" },
  { pattern: "40", word: "谢谢", pinyin: "xièxie", label: "gracias" },
];

/** Grupos de caracteres que se confunden fácilmente. */
export const SIMILAR_CHARS: string[][] = [
  ["人", "入", "八"],
  ["大", "太", "天", "夫"],
  ["日", "目", "白", "百"],
  ["买", "卖"],
  ["己", "已"],
  ["土", "士"],
  ["千", "干", "于"],
  ["王", "玉", "主"],
  ["木", "本", "末", "未"],
  ["田", "由", "甲"],
  ["牛", "午", "年"],
  ["口", "中", "日"],
  ["几", "九"],
  ["儿", "几"],
  ["住", "往"],
  ["他", "她", "它"],
  ["们", "门"],
  ["清", "请", "情", "晴"],
  ["很", "跟"],
  ["哪", "那"],
  ["在", "再"],
  ["的", "得", "地"],
  ["做", "作", "坐", "座"],
  ["问", "间", "闻"],
  ["没", "设"],
  ["这", "送"],
  ["东", "车"],
  ["见", "贝"],
  ["水", "永"],
  ["末", "未"],
  ["左", "右"],
  ["上", "下"],
  ["小", "少"],
  ["木", "林", "森"],
  ["女", "好"],
  ["子", "孙"],
  ["字", "宇"],
  ["像", "象"],
  ["候", "侯"],
  ["块", "快"],
  ["低", "底"],
  ["高", "商"],
  ["学", "觉"],
  ["吃", "吗"],
  ["想", "相"],
  ["睡", "谁"],
  ["姓", "性"],
  ["名", "各"],
  ["家", "象"],
];

export interface SpanishError {
  title: string;
  sounds: string[]; // pinyin
  problem: string;
  tip: string;
  minimalPairs: { a: { zh: string; py: string; es: string }; b: { zh: string; py: string; es: string } }[];
}

/** Errores típicos de hispanohablantes con el pinyin. */
export const SPANISH_ERRORS: SpanishError[] = [
  {
    title: "zh / z / j",
    sounds: ["zh", "z", "j"],
    problem: "Ninguno existe en español. zh es como «ch» pero con la punta de la lengua curvada hacia atrás; z suena «ds» (como en «adsorber»); j es como «ch» suave con la lengua plana tras los dientes de abajo.",
    tip: "zh = retrofleja (lengua atrás), z = dental («ds»), j = palatal (sonrisa, lengua abajo). Siempre sin vibrar las cuerdas vocales.",
    minimalPairs: [
      { a: { zh: "中", py: "zhōng", es: "centro" }, b: { zh: "宗", py: "zōng", es: "clan" } },
      { a: { zh: "鸡", py: "jī", es: "pollo" }, b: { zh: "知", py: "zhī", es: "saber" } },
    ],
  },
  {
    title: "q / ch / c",
    sounds: ["q", "ch", "c"],
    problem: "Las tres son «ch» aspiradas (con un golpe de aire). q es palatal (como en «chico» pero con sonrisa), ch retrofleja (lengua curvada), c dental («ts» con aire, como en «tsé-tsé»).",
    tip: "Pon la mano delante de la boca: debes notar el aire en q, ch, c (aspiradas) y no en j, zh, z.",
    minimalPairs: [
      { a: { zh: "七", py: "qī", es: "siete" }, b: { zh: "吃", py: "chī", es: "comer" } },
      { a: { zh: "次", py: "cì", es: "vez" }, b: { zh: "气", py: "qì", es: "aire" } },
    ],
  },
  {
    title: "x / sh / s",
    sounds: ["x", "sh", "s"],
    problem: "x no es la «x» española: es un sonido entre «s» y «sh» hecho con la lengua plana (como «sh» sonriendo). sh es la «sh» inglesa con la lengua curvada atrás. s es como la «s» española.",
    tip: "x: sonríe y di «s» con la lengua tocando los dientes de abajo. sh: lengua hacia atrás, labios ligeramente adelantados.",
    minimalPairs: [
      { a: { zh: "西", py: "xī", es: "oeste" }, b: { zh: "师", py: "shī", es: "maestro" } },
      { a: { zh: "四", py: "sì", es: "cuatro" }, b: { zh: "是", py: "shì", es: "ser" } },
    ],
  },
  {
    title: "ü (yu, ju, qu, xu, nü, lü)",
    sounds: ["ü"],
    problem: "No existe en español: es una «i» pronunciada con los labios redondeados como para una «u». Tras j, q, x, y se escribe «u» pero siempre suena ü.",
    tip: "Di «iii» y, sin mover la lengua, redondea los labios. 女 nǚ ≠ 努 nǔ.",
    minimalPairs: [
      { a: { zh: "女", py: "nǚ", es: "mujer" }, b: { zh: "努", py: "nǔ", es: "esforzarse" } },
      { a: { zh: "绿", py: "lǜ", es: "verde" }, b: { zh: "路", py: "lù", es: "camino" } },
    ],
  },
  {
    title: "-n / -ng",
    sounds: ["an", "ang", "en", "eng", "in", "ing"],
    problem: "En español la «n» final suele sonar igual que «ng» (como en «tango»), pero en chino distinguen palabras: 人 rén ≠ 仍 réng.",
    tip: "-n: la punta de la lengua toca detrás de los dientes (como «pan»). -ng: la lengua queda atrás y la boca abierta, sin tocar (como «tango» sin la «g»).",
    minimalPairs: [
      { a: { zh: "三", py: "sān", es: "tres" }, b: { zh: "桑", py: "sāng", es: "morera" } },
      { a: { zh: "信", py: "xìn", es: "carta" }, b: { zh: "姓", py: "xìng", es: "apellido" } },
    ],
  },
  {
    title: "r",
    sounds: ["r"],
    problem: "Ni la «r» ni la «rr» españolas: es un sonido entre la «r» inglesa y la «j» francesa, con la lengua curvada atrás y sin vibrar.",
    tip: "Pon la lengua como para «sh» y haz vibrar las cuerdas vocales: 日 rì, 人 rén, 热 rè.",
    minimalPairs: [
      { a: { zh: "热", py: "rè", es: "calor" }, b: { zh: "乐", py: "lè", es: "alegre" } },
      { a: { zh: "肉", py: "ròu", es: "carne" }, b: { zh: "漏", py: "lòu", es: "gotear" } },
    ],
  },
  {
    title: "b/p, d/t, g/k: no es sonoro/sordo, es aspirado/no aspirado",
    sounds: ["b", "p", "d", "t", "g", "k"],
    problem: "b, d, g chinas son sordas (como p, t, k españolas) y p, t, k llevan un golpe de aire fuerte que el español no tiene.",
    tip: "Para p, t, k: aspira con fuerza (una hoja de papel delante de la boca debe moverse). Para b, d, g: como p, t, k españolas, sin aire.",
    minimalPairs: [
      { a: { zh: "爸", py: "bà", es: "papá" }, b: { zh: "怕", py: "pà", es: "temer" } },
      { a: { zh: "肚", py: "dù", es: "barriga" }, b: { zh: "兔", py: "tù", es: "conejo" } },
    ],
  },
  {
    title: "e, -i tras z/c/s/zh/ch/sh/r, -ian, -iu, -ui, -un",
    sounds: ["e", "zi", "ci", "si", "zhi", "ian", "iu", "ui", "un"],
    problem: "e aislada suena como una «ö» relajada (喝 hē), no como «e» española. zi/ci/si/zhi/chi/shi/ri no llevan «i»: es un zumbido. -ian suena «ien», -iu es «iou», -ui es «uei», -un es «uen».",
    tip: "Lee así: 天 tiān «tien», 六 liù «liou», 对 duì «duei», 春 chūn «chuen», 四 sì «sz».",
    minimalPairs: [
      { a: { zh: "喝", py: "hē", es: "beber" }, b: { zh: "河", py: "hé", es: "río" } },
      { a: { zh: "四", py: "sì", es: "cuatro" }, b: { zh: "十", py: "shí", es: "diez" } },
    ],
  },
];

export const STROKE_RULES: { rule: string; example: string; zh: string }[] = [
  { rule: "De arriba abajo", example: "三: primero el trazo de arriba", zh: "三" },
  { rule: "De izquierda a derecha", example: "川: de izquierda a derecha", zh: "川" },
  { rule: "Horizontal antes que vertical", example: "十: primero 一, luego 丨", zh: "十" },
  { rule: "Trazo descendente a la izquierda (丿) antes que a la derecha (㇏)", example: "人: primero 丿", zh: "人" },
  { rule: "Fuera antes que dentro", example: "月: el marco antes que los trazos interiores", zh: "月" },
  { rule: "Dentro antes de cerrar", example: "国: se cierra el cuadro al final", zh: "国" },
  { rule: "El trazo central antes que los laterales", example: "小: primero el gancho central", zh: "小" },
  { rule: "El punto final al final", example: "我: el último punto arriba a la derecha", zh: "我" },
];

export const BASIC_STROKES: { name: string; py: string; shape: string; example: string }[] = [
  { name: "横", py: "héng", shape: "一", example: "一, 二, 三" },
  { name: "竖", py: "shù", shape: "丨", example: "十, 中" },
  { name: "撇", py: "piě", shape: "丿", example: "人, 八" },
  { name: "捺", py: "nà", shape: "㇏", example: "人, 大" },
  { name: "点", py: "diǎn", shape: "丶", example: "六, 小" },
  { name: "提", py: "tí", shape: "㇀", example: "我, 习" },
  { name: "钩", py: "gōu", shape: "亅", example: "小, 你" },
  { name: "折", py: "zhé", shape: "𠃍", example: "口, 日" },
];
