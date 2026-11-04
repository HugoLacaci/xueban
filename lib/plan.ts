import { getActiveLang } from "@/lib/languages/registry";
import type { Settings } from "@/lib/settings";
import type { TodaySummary } from "@/lib/stats";

export interface PlanStep {
  title: string;
  subtitle: string;
  href: string;
  minutes: number;
  kind: "review" | "lesson" | "practice" | "input" | "notes" | "workbook" | "talk";
}

/** Plan del día: repasos → lección nueva → práctica → input, ajustado al objetivo de minutos. */
export function todayPlan(sum: TodaySummary, settings: Settings, ctx: { levelTitle: string; practiceTopics: string; goalMinutes?: number } = { levelTitle: "HSK 1", practiceTopics: "tonos, caracteres, frases y escucha" }): PlanStep[] {
  const goal = Math.max(10, ctx.goalMinutes ?? settings.dailyGoalMinutes);
  const steps: PlanStep[] = [];
  const reviewMin = Math.min(Math.max(3, Math.ceil(sum.dueCards / 6)), Math.round(goal * 0.4));
  if (sum.dueCards > 0) {
    steps.push({ title: "Repasar flashcards", subtitle: `${sum.dueCards} tarjetas pendientes (FSRS)`, href: "/flashcards/repasar", minutes: reviewMin, kind: "review" });
  }
  const remaining = goal - (sum.dueCards > 0 ? reviewMin : 0);
  const lessonMin = Math.min(12, Math.max(8, Math.round(remaining * 0.4)));
  steps.push({ title: "Lección nueva", subtitle: `Continúa el curso ${ctx.levelTitle} (vocabulario, diálogo y gramática)`, href: "/aprender", minutes: lessonMin, kind: "lesson" });
  const practiceMin = Math.max(5, Math.round(remaining * 0.3));
  steps.push({ title: "Práctica intercalada", subtitle: `Ejercicios mezclados: ${ctx.practiceTopics}`, href: "/practicar", minutes: practiceMin, kind: "practice" });
  const inputMin = Math.max(5, remaining - lessonMin - practiceMin);
  steps.push({ title: "Input comprensible", subtitle: "Una lectura graduada o un vídeo con subtítulos", href: sum.wordsKnown > 40 ? "/escuchar-leer?tab=videos" : "/escuchar-leer?tab=lectura", minutes: inputMin, kind: "input" });
  // apuntes: bandeja sin procesar, preguntas Cornell/errores pendientes o apuntes sin repasar hace una semana
  if (sum.inbox > 0) steps.push({ title: "Procesar la bandeja de apuntes", subtitle: `${sum.inbox} captura${sum.inbox === 1 ? "" : "s"} de clase por convertir en apuntes (10 min)`, href: "/apuntes/bandeja", minutes: Math.min(10, 3 + sum.inbox * 2), kind: "notes" });
  else if (sum.noteCardsDue > 0 || sum.notesToReview > 0) steps.push({ title: "Repasar apuntes", subtitle: sum.noteCardsDue ? `${sum.noteCardsDue} preguntas Cornell y errores pendientes` : `${sum.notesToReview} apuntes sin repasar desde hace una semana`, href: "/apuntes/repasar", minutes: Math.min(10, 3 + Math.ceil((sum.noteCardsDue || sum.notesToReview) / 4)), kind: "notes" });
  // cuaderno de ejercicios (frases del cuaderno de papel)
  if (sum.workbookDue > 0) steps.push({ title: "Ejercicios del cuaderno", subtitle: `${sum.workbookDue} frases del cuaderno para traducir con corrección`, href: "/apuntes/cuaderno?due=1", minutes: Math.min(10, 2 + sum.workbookDue), kind: "workbook" });
  else if (sum.workbookTotal === 0 && getActiveLang() === "zh") steps.push({ title: "Ejercicios del cuaderno", subtitle: "Pega las frases de tu cuaderno de papel y practícalas con corrección detallada", href: "/apuntes/cuaderno", minutes: 5, kind: "workbook" });
  // conversación del día (role-play escrito a mano o tutor IA)
  if (getActiveLang() === "zh") steps.push({ title: "Conversación del día", subtitle: "Un role-play por turnos (sin IA) o una charla con el tutor", href: "/tutor?daily=1", minutes: 5, kind: "talk" });
  if (sum.dueCards === 0 && sum.newAvailable > 0) {
    steps.unshift({ title: "Aprender palabras nuevas", subtitle: `${Math.min((settings.langs[getActiveLang()]?.newWordsPerDay ?? settings.newWordsPerDay), sum.newAvailable)} palabras nuevas del mazo`, href: "/flashcards/repasar?new=1", minutes: 5, kind: "review" });
  }
  return steps;
}
