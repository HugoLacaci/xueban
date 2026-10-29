/** Entrada de diccionario unificada (CC-CEDICT + HSK + semilla + palabras del usuario). */
export interface DictEntry {
  s: string; // simplificado
  t?: string; // tradicional (si difiere)
  p: string; // pinyin con diacríticos, sílabas separadas por espacio
  en: string[]; // definiciones en inglés (CC-CEDICT)
  es?: string; // español (semilla / usuario / Tatoeba)
  hsk?: number; // nivel HSK 3.0 (1–9), 7 = 7–9
  hsk2?: number; // nivel HSK 2.0 (1–6)
  freq?: number; // rango de frecuencia (menor = más frecuente)
  pos?: string[]; // categorías gramaticales
  cl?: string[]; // clasificadores (p. ej. ["个","本"])
  src?: "cedict" | "hsk" | "seed" | "user" | "jmdict" | "krdict" | "wiktionary";
  lv?: string; // etiqueta de nivel genérica (ja: N5…N1; ko: TOPIK1…; zh usa hsk/hsk2)
  extra?: Record<string, unknown>; // ja: pitch, pos detallado; ko: hanja, pronunciación
}

export interface SearchResult extends DictEntry {
  score: number;
}

export interface CharInfo {
  character: string;
  definition?: string;
  pinyin: string[];
  decomposition: string; // notación IDS de Make Me a Hanzi
  radical: string;
  etymology?: { type: string; hint?: string; phonetic?: string; semantic?: string };
  strokes: number;
  matches?: (number[] | null)[];
}

export interface RadicalInfo {
  number: number;
  radical: string;
  variants: string[];
  strokes: number;
  pinyin: string;
  meaning: string; // español
  meaningEn: string;
  frequency?: number; // rango aproximado
}
