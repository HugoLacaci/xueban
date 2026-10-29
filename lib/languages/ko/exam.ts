/**
 * TOPIK I (한국어능력시험). Estructura verificada en topik.go.kr (29-oct-2026): 듣기 30 preguntas (100 puntos)
 * + 읽기 40 preguntas (100 puntos), 100 minutos en papel (una sola sesión; reparto habitual ≈ 40 + 60 min).
 * Nivel 1: 80–139 puntos; nivel 2: 140–200. TOPIK II (3–6) se describe en el registro para el futuro.
 */
import type { ExamDefinition, ExamSectionDef } from "@/lib/languages/types";
import { buildFromBank } from "@/lib/languages/core/exam-bank";
import { EXAM_BANK } from "./content";

const SECTIONS: ExamSectionDef[] = [
  { id: "listening", name: "Comprensión auditiva", native: "듣기", questions: 30, minutes: 40, parts: ["알맞은 대답 (respuesta adecuada)", "이어지는 말", "장소 · 화제 (lugar y tema)", "그림 · 내용 일치", "중심 생각"] },
  { id: "reading", name: "Comprensión lectora", native: "읽기", questions: 40, minutes: 60, parts: ["화제 (tema)", "빈칸 (huecos)", "안내문 (avisos)", "내용 일치", "순서 (ordenar)", "글 읽고 답하기"] },
];

export const koExam: ExamDefinition = {
  id: "TOPIK",
  name: "TOPIK (한국어능력시험)",
  officialUrl: "https://www.topik.go.kr",
  levels: [
    { id: "TOPIK1", label: "TOPIK I · 1급", description: "80–139 puntos de 200: supervivencia básica, presentarse, comprar, pedir comida.", words: 800 },
    { id: "TOPIK2", label: "TOPIK I · 2급", description: "140–200 puntos de 200: vida diaria, teléfono, servicios públicos.", words: 2000 },
    { id: "TOPIK3", label: "TOPIK II · 3급", description: "120–149 de 300 (듣기 + 쓰기 + 읽기).", words: 3000 },
    { id: "TOPIK4", label: "TOPIK II · 4급", description: "150–189 de 300.", words: 4000 },
    { id: "TOPIK5", label: "TOPIK II · 5급", description: "190–229 de 300.", words: 6000 },
    { id: "TOPIK6", label: "TOPIK II · 6급", description: "230–300 de 300.", words: 8000 },
  ],
  firstLevel: "TOPIK1",
  sections: SECTIONS,
  totalQuestions: 70,
  totalMinutes: 100,
  scoring: "Cada sección vale 100 puntos (200 en total). Nivel 1 desde 80 puntos y nivel 2 desde 140. TOPIK II (preparado en la app para más adelante): 듣기 50 + 쓰기 4 (110 min) y 읽기 50 (70 min), 300 puntos.",
  passRule(correct) {
    const [l = 0, r = 0] = correct;
    const pl = Math.round((l / SECTIONS[0].questions) * 100);
    const pr = Math.round((r / SECTIONS[1].questions) * 100);
    const total = pl + pr;
    const level = total >= 140 ? "2급" : total >= 80 ? "1급" : "sin nivel";
    return { passed: total >= 80, score: total, max: 200, detail: `듣기 ${pl}/100 · 읽기 ${pr}/100 → ${level}` };
  },
  source: "topik.go.kr · «시험 수준별 구성» y «시험 시간» (consultado el 29-oct-2026)",
  notes: "El TOPIK por internet (IBT) tiene el mismo valor (TOPIK I: 70 min) y la prueba oral (말하기) se hace solo en Corea en 2026.",
  buildMock: (seed) =>
    buildFromBank(
      EXAM_BANK,
      [
        { def: SECTIONS[0], banks: ["listening"], skill: "listening" },
        { def: SECTIONS[1], banks: ["reading"], skill: "reading" },
      ],
      seed,
    ),
};
