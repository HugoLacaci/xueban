/**
 * Detalles culturales de la interfaz por idioma (saludos, fecha nativa, refranes del día, glifos de
 * las cifras y accesos rápidos, títulos de los ornamentos). Cada idioma con lo suyo: sin mezclar culturas.
 */
import type { Lang } from "./types";

export interface Quote {
  text: string;
  reading: string;
  es: string;
}

export interface Culture {
  greetings: { text: string; es: string; from: number }[];
  /** Fecha en la lengua meta */
  date(d: Date): string;
  /** Nombre del usuario en la escritura meta (si se llama Hugo) */
  userName: string;
  quotes: Quote[];
  stats: { week: string; words: string; chars: string; reviews: string };
  quick: { lesson: string; review: string; read: string; video: string; notebook: string; dict: string };
  branch: { native: string; es: string };
  itemOfDay: { native: string; es: string };
  examSeal: string;
  passSeal: string;
  cheer: string;
  notFound: Quote;
  emptyDict: Quote;
  onboarding: { welcome: string; welcomeReading: string; tagline: string; proverbs: string[] };
  streakWord: string;
}

const ZH_NUM = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const zhNumber = (n: number) => (n <= 10 ? ZH_NUM[n] : n < 20 ? `十${ZH_NUM[n - 10]}` : `${ZH_NUM[Math.floor(n / 10)]}十${n % 10 ? ZH_NUM[n % 10] : ""}`);

export const CULTURE: Record<Lang, Culture> = {
  zh: {
    greetings: [
      { text: "早上好", es: "Buenos días", from: 5 },
      { text: "下午好", es: "Buenas tardes", from: 13 },
      { text: "晚上好", es: "Buenas noches", from: 19 },
    ],
    date: (d) => `${zhNumber(d.getMonth() + 1)}月${zhNumber(d.getDate())}日 · ${["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][d.getDay()]}`,
    userName: "雨果",
    quotes: [
      { text: "学而时习之，不亦说乎？", reading: "Xué ér shí xí zhī, bú yì yuè hū?", es: "Aprender y repasar a su tiempo, ¿no es un placer? (Analectas)" },
      { text: "温故而知新。", reading: "Wēn gù ér zhī xīn.", es: "Repasar lo viejo para conocer lo nuevo." },
      { text: "千里之行，始于足下。", reading: "Qiān lǐ zhī xíng, shǐ yú zú xià.", es: "Un viaje de mil li empieza con un paso." },
      { text: "不积跬步，无以至千里。", reading: "Bù jī kuǐbù, wú yǐ zhì qiānlǐ.", es: "Sin acumular pasos cortos no se llega a mil li." },
      { text: "熟能生巧。", reading: "Shú néng shēng qiǎo.", es: "La práctica hace al maestro." },
    ],
    stats: { week: "周", words: "词", chars: "字", reviews: "卡" },
    quick: { lesson: "学", review: "卡", read: "读", video: "视", notebook: "斋", dict: "典" },
    branch: { native: "梅花", es: "Tu ciruelo" },
    itemOfDay: { native: "每日一字", es: "Carácter del día" },
    examSeal: "考",
    passSeal: "合格",
    cheer: "加油！",
    notFound: { text: "此路不通", reading: "cǐ lù bù tōng", es: "Por aquí no se pasa." },
    emptyDict: { text: "学而时习之", reading: "xué ér shí xí zhī", es: "Aprender y repasar a su tiempo (论语)" },
    onboarding: { welcome: "欢迎来到学伴", welcomeReading: "Huānyíng lái dào Xuébàn · Bienvenido a Xuébàn", tagline: "学伴：你的中文学习伙伴", proverbs: ["千里之行，始于足下。", "不积跬步，无以至千里。", "有志者事竟成。"] },
    streakWord: "灯",
  },
  ja: {
    greetings: [
      { text: "おはようございます", es: "Buenos días", from: 5 },
      { text: "こんにちは", es: "Buenas tardes", from: 11 },
      { text: "こんばんは", es: "Buenas noches", from: 18 },
    ],
    date: (d) => `${d.getMonth() + 1}月${d.getDate()}日（${"日月火水木金土"[d.getDay()]}）`,
    userName: "ウーゴさん",
    quotes: [
      { text: "継続は力なり。", reading: "けいぞく は ちから なり", es: "La constancia es fuerza." },
      { text: "七転び八起き。", reading: "ななころび やおき", es: "Caer siete veces, levantarse ocho." },
      { text: "千里の道も一歩から。", reading: "せんり の みち も いっぽ から", es: "Hasta un camino de mil ri empieza con un paso." },
      { text: "習うより慣れろ。", reading: "ならう より なれろ", es: "Más que estudiarlo, acostúmbrate (la práctica hace al maestro)." },
      { text: "塵も積もれば山となる。", reading: "ちり も つもれば やま と なる", es: "Hasta el polvo, acumulado, se hace montaña." },
      { text: "石の上にも三年。", reading: "いし の うえ に も さんねん", es: "Tres años sobre una piedra (la paciencia da fruto)." },
    ],
    stats: { week: "週", words: "語", chars: "字", reviews: "札" },
    quick: { lesson: "学", review: "札", read: "読", video: "映", notebook: "帳", dict: "辞" },
    branch: { native: "桜", es: "Tu cerezo" },
    itemOfDay: { native: "今日の漢字", es: "Kanji del día" },
    examSeal: "試",
    passSeal: "合格",
    cheer: "頑張って！",
    notFound: { text: "道に迷いました", reading: "みち に まよいました", es: "Me he perdido." },
    emptyDict: { text: "継続は力なり", reading: "けいぞく は ちから なり", es: "La constancia es fuerza." },
    onboarding: { welcome: "ようこそ", welcomeReading: "Yōkoso · Bienvenido", tagline: "日本語の学習パートナー", proverbs: ["千里の道も一歩から。", "継続は力なり。", "七転び八起き。"] },
    streakWord: "灯",
  },
  ko: {
    greetings: [
      { text: "좋은 아침이에요", es: "Buenos días", from: 5 },
      { text: "안녕하세요", es: "Buenas tardes", from: 11 },
      { text: "좋은 저녁이에요", es: "Buenas noches", from: 18 },
    ],
    date: (d) => `${d.getMonth() + 1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}요일`,
    userName: "우고 씨",
    quotes: [
      { text: "시작이 반이다.", reading: "sijagi banida", es: "Empezar es la mitad del camino." },
      { text: "천 리 길도 한 걸음부터.", reading: "cheon ri gildo han georeumbuteo", es: "Un camino de mil ri empieza con un paso." },
      { text: "티끌 모아 태산.", reading: "tikkeul moa taesan", es: "Juntando motas de polvo se hace una gran montaña." },
      { text: "가는 말이 고와야 오는 말이 곱다.", reading: "ganeun mari gowaya oneun mari gopda", es: "Si hablas con amabilidad, te responderán con amabilidad." },
      { text: "낮말은 새가 듣고 밤말은 쥐가 듣는다.", reading: "nanmareun saega deutgo bammareun jwiga deunneunda", es: "De día oyen los pájaros y de noche los ratones (las paredes oyen)." },
      { text: "배워서 남 주나.", reading: "baewoseo nam juna", es: "Lo que aprendes no se lo regalas a otro (aprender siempre te beneficia)." },
    ],
    stats: { week: "주", words: "단어", chars: "글", reviews: "복습" },
    quick: { lesson: "배", review: "복", read: "읽", video: "영", notebook: "노", dict: "사" },
    branch: { native: "무궁화", es: "Tu mugunghwa" },
    itemOfDay: { native: "오늘의 단어", es: "Palabra del día" },
    examSeal: "시",
    passSeal: "합격",
    cheer: "화이팅!",
    notFound: { text: "길을 잃었어요", reading: "gireul ireosseoyo", es: "Me he perdido." },
    emptyDict: { text: "시작이 반이다", reading: "sijagi banida", es: "Empezar es la mitad del camino." },
    onboarding: { welcome: "환영합니다", welcomeReading: "Hwanyeonghamnida · Bienvenido", tagline: "한국어 공부 친구", proverbs: ["천 리 길도 한 걸음부터.", "시작이 반이다.", "티끌 모아 태산."] },
    streakWord: "등",
  },
};

export function greetingFor(lang: Lang, hour: number) {
  const g = CULTURE[lang].greetings;
  return g.filter((x) => hour >= x.from).pop() ?? g[g.length - 1];
}

export function quoteOfDayFor(lang: Lang, d = new Date()): Quote {
  const q = CULTURE[lang].quotes;
  return q[Math.floor(d.getTime() / 86400000) % q.length];
}
