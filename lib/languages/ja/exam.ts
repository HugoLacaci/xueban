/**
 * JLPT (日本語能力試験). Estructura de N5 verificada en jlpt.jp (29-oct-2026):
 * 言語知識（文字・語彙） 20 min · 言語知識（文法）・読解 40 min · 聴解 30 min. Puntuación 0–180;
 * aprobado con 80 en total y mínimos por sección (言語知識・読解 38/120, 聴解 19/60).
 * Número de preguntas del simulacro: el JLPT no publica un número fijo; se usa una distribución
 * habitual de los exámenes de muestra (≈ 25 + 21 + 22), indicada como orientativa en la app.
 */
import type { ExamDefinition, ExamSectionDef } from "@/lib/languages/types";
import { buildFromBank } from "@/lib/languages/core/exam-bank";
import { EXAM_BANK } from "./content";

const SECTIONS: ExamSectionDef[] = [
  { id: "vocab", name: "Conocimiento de la lengua (escritura y vocabulario)", native: "言語知識（文字・語彙）", questions: 25, minutes: 20, parts: ["問題1 漢字読み (lectura de kanji)", "問題2 表記 (escritura)", "問題3 文脈規定 (palabra en contexto)", "問題4 言い換え類義 (frase equivalente)"] },
  { id: "grammar-reading", name: "Conocimiento de la lengua (gramática) · comprensión lectora", native: "言語知識（文法）・読解", questions: 22, minutes: 40, parts: ["文法 問題1 (gramática)", "文法 問題2 並べ替え (ordenar)", "読解 (textos breves y medios, búsqueda de información)"] },
  { id: "listening", name: "Comprensión auditiva", native: "聴解", questions: 20, minutes: 30, parts: ["課題理解", "ポイント理解", "発話表現", "即時応答"] },
];

export const jaExam: ExamDefinition = {
  id: "JLPT",
  name: "JLPT (日本語能力試験)",
  officialUrl: "https://www.jlpt.jp",
  levels: [
    { id: "N5", label: "JLPT N5", description: "Comprende japonés básico: frases y textos sencillos en hiragana, katakana y kanji básicos.", words: 700 },
    { id: "N4", label: "JLPT N4", description: "Japonés básico de la vida diaria.", words: 1500 },
    { id: "N3", label: "JLPT N3", description: "Japonés de situaciones cotidianas hasta cierto punto.", words: 3700 },
    { id: "N2", label: "JLPT N2", description: "Japonés cotidiano y en situaciones más variadas.", words: 6000 },
    { id: "N1", label: "JLPT N1", description: "Japonés en una gran variedad de situaciones.", words: 10000 },
  ],
  firstLevel: "N5",
  sections: SECTIONS,
  totalQuestions: SECTIONS.reduce((a, s) => a + s.questions, 0),
  totalMinutes: 90,
  scoring:
    "Puntuación oficial: 0–180 (言語知識・読解 0–120 + 聴解 0–60). Para aprobar hacen falta 80 en total y al menos 38 en 言語知識・読解 y 19 en 聴解. El simulacro escala tus aciertos a esa puntuación (orientativo).",
  passRule(correct) {
    const [v = 0, gr = 0, l = 0] = correct;
    const lkMax = SECTIONS[0].questions + SECTIONS[1].questions;
    const lk = Math.round(((v + gr) / lkMax) * 120);
    const li = Math.round((l / SECTIONS[2].questions) * 60);
    const total = lk + li;
    return { passed: total >= 80 && lk >= 38 && li >= 19, score: total, max: 180, detail: `言語知識・読解 ${lk}/120 (mín. 38) · 聴解 ${li}/60 (mín. 19)` };
  },
  source: "jlpt.jp · «Test Sections and Test Times» y «Scoring Section and Pass Marks» (consultado el 29-oct-2026)",
  notes: "El JLPT no publica listas oficiales de vocabulario desde 2010: el vocabulario N5 de la app procede de listas comunitarias. El número de preguntas por sección no es fijo; el simulacro usa una distribución orientativa.",
  buildMock: (seed) =>
    buildFromBank(
      EXAM_BANK,
      [
        { def: SECTIONS[0], banks: ["vocab"], skill: "reading" },
        { def: SECTIONS[1], banks: ["grammar", "reading"], skill: "reading", take: { grammar: 16, reading: 6 } },
        { def: SECTIONS[2], banks: ["listening"], skill: "listening" },
      ],
      seed,
    ),
};
