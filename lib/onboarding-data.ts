/** Datos del onboarding por idioma (niveles, examen, ejemplos de objetivo): compartidos por el onboarding y la portada. */
import type { Lang } from "@/lib/languages/types";

/** Niveles por idioma: [valor, título, descripción]. El valor se guarda en langs[lang].level. */
export const LEVELS: Record<Lang, [string, string, string][]> = {
  zh: [
    ["zero", "Empiezo de cero", "Todavía no sé pinyin ni tonos."],
    ["beginner", "Principiante", "Sé saludar y algunas palabras; preparo el HSK 1."],
    ["hsk1", "Ya tengo HSK 1", "Quiero ir a por el HSK 2."],
    ["hsk2", "HSK 2 o más", "Quiero consolidar y llegar al HSK 3."],
  ],
  ja: [
    ["zero", "Empiezo de cero", "Todavía no leo hiragana ni katakana."],
    ["beginner", "Leo kana", "Leo hiragana y katakana; preparo el JLPT N5."],
    ["n5", "Ya tengo el N5", "Quiero ir a por el N4."],
    ["n4", "N4 o más", "Quiero consolidar y llegar al N3."],
  ],
  ko: [
    ["zero", "Empiezo de cero", "Todavía no leo hangul."],
    ["beginner", "Leo hangul", "Leo hangul y sé algunas frases; preparo el TOPIK I (nivel 1)."],
    ["topik1", "Ya tengo TOPIK 1", "Quiero llegar al nivel 2."],
    ["topik2", "TOPIK 2 o más", "Quiero consolidar y pasar al TOPIK II."],
  ],
};

export const EXAM_INFO: Record<Lang, { label: string; note: string }> = {
  zh: {
    label: "Fecha del examen HSK (opcional)",
    note: "En 2026 la última convocatoria del HSK 2.0 es el 7 de noviembre y la primera oficial del HSK 3.0 está anunciada para el 13 de diciembre. Comprueba las fechas de tu centro en chinesetest.cn.",
  },
  ja: {
    label: "Fecha del JLPT (opcional)",
    note: "El JLPT se celebra dos veces al año; en 2026, el 5 de julio y el 6 de diciembre (fuera de Japón no todas las sedes ofrecen las dos). Comprueba tu sede en jlpt.jp.",
  },
  ko: {
    label: "Fecha del TOPIK (opcional)",
    note: "El TOPIK tiene varias convocatorias al año en papel y también en formato IBT (por ordenador). Consulta el calendario y las sedes en topik.go.kr.",
  },
};

export const GOAL_HINT: Record<Lang, string> = {
  zh: "HSK 1 antes de junio",
  ja: "leer kana en dos semanas, N5 en diciembre",
  ko: "leer hangul esta semana, TOPIK 1 en primavera",
};
