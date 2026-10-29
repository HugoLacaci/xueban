/**
 * Pequeños glifos decorativos de la interfaz en la escritura de cada idioma (iconos de navegación,
 * cabeceras). Regla cultural: el tema coreano usa hangul (no hanja) y el japonés usa kanji/kana
 * propios del japonés (練, 札, 辞…), nunca los caracteres simplificados chinos.
 */
import type { Lang } from "./types";

export const NAV_GLYPHS: Record<Lang, Record<string, string>> = {
  zh: { "/": "今", "/aprender": "学", "/practicar": "练", "/flashcards": "卡", "/diccionario": "典", "/caracteres": "字", "/lectura": "读", "/videos": "视", "/study-hall": "斋", "/progreso": "进", "/ajustes": "设" },
  ja: { "/": "今", "/aprender": "学", "/practicar": "練", "/flashcards": "札", "/diccionario": "辞", "/caracteres": "字", "/lectura": "読", "/videos": "映", "/study-hall": "斎", "/progreso": "進", "/ajustes": "設" },
  ko: { "/": "오", "/aprender": "배", "/practicar": "연", "/flashcards": "카", "/diccionario": "사", "/caracteres": "글", "/lectura": "읽", "/videos": "영", "/study-hall": "서", "/progreso": "진", "/ajustes": "설" },
};

/** Títulos nativos de las secciones (PageHeader zh=…). */
export const PAGE_NATIVE: Record<Lang, Record<string, string>> = {
  zh: { today: "今天", learn: "学习", practice: "练习", flashcards: "卡片", dictionary: "词典", characters: "汉字", reading: "阅读", videos: "视频", studyHall: "书斋", progress: "进步", settings: "设置", grammar: "语法", notebook: "课堂笔记", notes: "笔记", credits: "致谢", design: "设计", howto: "学习方法", me: "我的语言", exam: "模拟考试", review: "复习" },
  ja: { today: "今日", learn: "学習", practice: "練習", flashcards: "単語カード", dictionary: "辞書", characters: "文字", reading: "読み物", videos: "動画", studyHall: "書斎", progress: "進歩", settings: "設定", grammar: "文法", notebook: "授業ノート", notes: "ノート", credits: "謝辞", design: "デザイン", howto: "学び方", me: "私の言語", exam: "模擬試験", review: "復習" },
  ko: { today: "오늘", learn: "배우기", practice: "연습", flashcards: "단어 카드", dictionary: "사전", characters: "한글", reading: "읽기", videos: "영상", studyHall: "서재", progress: "진도", settings: "설정", grammar: "문법", notebook: "수업 노트", notes: "노트", credits: "감사의 말", design: "디자인", howto: "공부법", me: "나의 언어", exam: "모의고사", review: "복습" },
};

/** Textos y sellos decorativos de la interfaz común (divisores, sellos, ánimos, ejemplos). */
export interface UiGlyphs {
  review: string; vocab: string; grammar: string; score: string;
  doneSeal: string; passSeal: string; retrySeal: string;
  checkpoint: string; gate: string; congrats: string; noWorries: string;
  skills: Record<"listening" | "reading" | "writing" | "speaking" | "tones" | "characters" | "grammar" | "vocab", string>;
  modes: { random: string; mistakes: string; topic: string; grammar: string; skill: string };
  sessionDone: string; sessionIdle: string;
  rate: { again: string; good: string; fresh: string };
  status: { review: string; learning: string; new: string };
  toast: { success: string; error: string; info: string };
  feedback: { ok: string; partial: string; wrong: string };
  report: { level: string; skill: string; weak: string; forecast: string; history: string; badges: string; words: string; chars: string; days: string; time: string };
  badges: { w10: string; w100: string; level: string; d7: string; d30: string; l5: string; l30: string; h10: string; e500: string };
  numerals: string[];
  /** Etiqueta del campo «palabra» en la lengua meta (汉字 / 日本語 / 한국어) */
  wordLabel: string;
  examples: { word: string; word2: string; word3: string; sentence: string; grammar: string; question: string };
  notebook: { vocab: string; grammarHw: string };
  incense: string;
  notesQuote: { text: string; reading: string; es: string };
  notebookQuote: { text: string; reading: string; es: string };
}

export const UI_GLYPHS: Record<Lang, UiGlyphs> = {
  zh: {
    review: "复习", vocab: "词汇", grammar: "语法", score: "成绩",
    doneSeal: "完成", passSeal: "通过", retrySeal: "再试",
    checkpoint: "检查点", gate: "牌坊", congrats: "恭喜！", noWorries: "没关系",
    skills: { listening: "听", reading: "读", writing: "写", speaking: "说", tones: "调", characters: "字", grammar: "法", vocab: "词" },
    modes: { random: "混", mistakes: "错", topic: "题", grammar: "法", skill: "能" },
    sessionDone: "完", sessionIdle: "闲",
    rate: { again: "再", good: "好", fresh: "新" },
    status: { review: "熟", learning: "习", new: "新" },
    toast: { success: "好", error: "误", info: "注" },
    feedback: { ok: "太棒了", partial: "差不多", wrong: "没关系，再试一次" },
    report: { level: "级", skill: "能", weak: "弱", forecast: "预", history: "历", badges: "章", words: "词", chars: "字", days: "日", time: "时" },
    badges: { w10: "十", w100: "百", level: "一级", d7: "七日", d30: "月", l5: "五课", l30: "卅课", h10: "十时", e500: "五百" },
    numerals: ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"],
    wordLabel: "汉字",
    examples: { word: "咖啡", word2: "茶", word3: "啤酒", sentence: "我想喝咖啡。", grammar: "是…的", question: "请问" },
    notebook: { vocab: "生词", grammarHw: "语法 · 作业" },
    incense: "一炷香",
    notesQuote: { text: "好记性不如烂笔头。", reading: "Hǎo jìxing bùrú làn bǐtóu.", es: "Más vale un mal lápiz que una buena memoria." },
    notebookQuote: { text: "温故而知新。", reading: "Wēn gù ér zhī xīn.", es: "Repasar lo viejo para conocer lo nuevo." },
  },
  ja: {
    review: "復習", vocab: "語彙", grammar: "文法", score: "成績",
    doneSeal: "完了", passSeal: "合格", retrySeal: "再挑戦",
    checkpoint: "関所", gate: "鳥居", congrats: "おめでとう！", noWorries: "大丈夫",
    skills: { listening: "聴", reading: "読", writing: "書", speaking: "話", tones: "音", characters: "字", grammar: "法", vocab: "語" },
    modes: { random: "混", mistakes: "誤", topic: "題", grammar: "法", skill: "技" },
    sessionDone: "完", sessionIdle: "休",
    rate: { again: "再", good: "良", fresh: "新" },
    status: { review: "熟", learning: "習", new: "新" },
    toast: { success: "良", error: "誤", info: "注" },
    feedback: { ok: "すごい！", partial: "おしい！", wrong: "大丈夫、もう一度" },
    report: { level: "級", skill: "技", weak: "弱", forecast: "予", history: "歴", badges: "章", words: "語", chars: "字", days: "日", time: "時" },
    badges: { w10: "十", w100: "百", level: "N5", d7: "七日", d30: "一月", l5: "五課", l30: "三十", h10: "十時", e500: "五百" },
    numerals: ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"],
    wordLabel: "日本語",
    examples: { word: "コーヒー", word2: "お茶", word3: "水", sentence: "コーヒーを飲みたいです。", grammar: "〜てもいいです", question: "すみません" },
    notebook: { vocab: "新しい言葉", grammarHw: "文法 · 宿題" },
    incense: "線香",
    notesQuote: { text: "習うより慣れろ。", reading: "ならう より なれろ", es: "Más que estudiarlo, acostúmbrate." },
    notebookQuote: { text: "温故知新。", reading: "おんこちしん", es: "Repasar lo viejo para conocer lo nuevo." },
  },
  ko: {
    review: "복습", vocab: "어휘", grammar: "문법", score: "성적",
    doneSeal: "완료", passSeal: "통과", retrySeal: "다시",
    checkpoint: "관문", gate: "홍살문", congrats: "축하해요!", noWorries: "괜찮아요",
    skills: { listening: "듣", reading: "읽", writing: "쓰", speaking: "말", tones: "발", characters: "글", grammar: "법", vocab: "말" },
    modes: { random: "섞", mistakes: "틀", topic: "주", grammar: "법", skill: "능" },
    sessionDone: "끝", sessionIdle: "쉼",
    rate: { again: "다시", good: "좋음", fresh: "새" },
    status: { review: "앎", learning: "익힘", new: "새" },
    toast: { success: "좋", error: "틀", info: "알" },
    feedback: { ok: "잘했어요!", partial: "아까워요!", wrong: "괜찮아요, 다시 해 봐요" },
    report: { level: "급", skill: "능", weak: "약", forecast: "예", history: "기록", badges: "장", words: "단어", chars: "글", days: "일", time: "시간" },
    badges: { w10: "열", w100: "백", level: "1급", d7: "7일", d30: "한 달", l5: "5과", l30: "30과", h10: "10시간", e500: "500" },
    numerals: ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구", "십", "십일", "십이", "십삼", "십사", "십오", "십육", "십칠", "십팔", "십구", "이십"],
    wordLabel: "한국어",
    examples: { word: "커피", word2: "차", word3: "물", sentence: "커피를 마시고 싶어요.", grammar: "-아/어도 돼요", question: "저기요" },
    notebook: { vocab: "새 단어", grammarHw: "문법 · 숙제" },
    incense: "향",
    notesQuote: { text: "배워서 남 주나.", reading: "baewoseo nam juna", es: "Lo que aprendes no se lo regalas a otro." },
    notebookQuote: { text: "온고지신.", reading: "on-go-ji-sin", es: "Repasar lo viejo para conocer lo nuevo." },
  },
};
