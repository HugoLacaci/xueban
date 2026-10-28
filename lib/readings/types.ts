export type ReadingKind = "dialogue" | "message" | "menu" | "sign" | "schedule" | "story" | "wechat" | "email" | "list";

export interface ReadingQuestion {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
}

export interface GradedReading {
  id: string;
  title: string; // español
  zh: string; // título en chino
  kind: ReadingKind;
  level: 1 | 2 | 3; // 1 = HSK 1 puro; 2 = HSK 1 + algo de HSK 2
  minutes: number;
  text: string; // chino; saltos de línea \n para diálogos (A：… / B：…) o listas
  es: string; // traducción completa
  gloss?: { hanzi: string; pinyin: string; es: string }[]; // palabras fuera del HSK 1 usadas en el texto
  questions: ReadingQuestion[];
  tags: string[]; // temas: comida, metro, universidad…
  reviewed: boolean;
}
