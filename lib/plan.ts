import type { Settings } from "@/lib/settings";
import type { TodaySummary } from "@/lib/stats";

export interface PlanStep {
  title: string;
  subtitle: string;
  href: string;
  minutes: number;
  kind: "review" | "lesson" | "practice" | "input";
}

/** Plan del día: repasos → lección nueva → práctica → input, ajustado al objetivo de minutos. */
export function todayPlan(sum: TodaySummary, settings: Settings): PlanStep[] {
  const goal = Math.max(10, settings.dailyGoalMinutes);
  const steps: PlanStep[] = [];
  const reviewMin = Math.min(Math.max(3, Math.ceil(sum.dueCards / 6)), Math.round(goal * 0.4));
  if (sum.dueCards > 0) {
    steps.push({ title: "Repasar flashcards", subtitle: `${sum.dueCards} tarjetas pendientes (FSRS)`, href: "/flashcards/repasar", minutes: reviewMin, kind: "review" });
  }
  const remaining = goal - (sum.dueCards > 0 ? reviewMin : 0);
  const lessonMin = Math.min(12, Math.max(8, Math.round(remaining * 0.4)));
  steps.push({ title: "Lección nueva", subtitle: "Continúa el curso HSK 1 (vocabulario, diálogo y gramática)", href: "/aprender", minutes: lessonMin, kind: "lesson" });
  const practiceMin = Math.max(5, Math.round(remaining * 0.3));
  steps.push({ title: "Práctica intercalada", subtitle: "Ejercicios mezclados: tonos, caracteres, frases y escucha", href: "/practicar", minutes: practiceMin, kind: "practice" });
  const inputMin = Math.max(5, remaining - lessonMin - practiceMin);
  steps.push({ title: "Input comprensible", subtitle: "Una lectura graduada o un vídeo con subtítulos", href: sum.wordsKnown > 40 ? "/videos" : "/lectura", minutes: inputMin, kind: "input" });
  if (sum.dueCards === 0 && sum.newAvailable > 0) {
    steps.unshift({ title: "Aprender palabras nuevas", subtitle: `${Math.min(settings.newWordsPerDay, sum.newAvailable)} palabras nuevas del mazo`, href: "/flashcards/repasar?new=1", minutes: 5, kind: "review" });
  }
  return steps;
}
