/**
 * Índice de currículo genérico: a partir de las unidades y la gramática de un idioma construye las
 * funciones que usa el núcleo (lección por id, siguiente lección, vocabulario controlado, pools).
 */
import type { CurriculumIndex, GrammarIndex } from "@/lib/languages/types";
import type { GrammarPoint, Lesson, Unit } from "@/lib/course/types";
import type { Pool, PoolSentence, PoolWord } from "@/lib/exercises/types";

export interface CurriculumOptions {
  units: Unit[];
  grammar: GrammarPoint[];
  levelTitle: string;
  /** Prefijo de los ids de palabras del curso («course-», «ja-course-») */
  idPrefix?: string;
  /** Separador de frases (por defecto 。！？ y sus equivalentes) */
  sentenceEnd?: RegExp;
  /** Detección de gramática por reglas (breakdown) */
  detect?: (text: string) => string[];
}

export function buildCurriculum(opts: CurriculumOptions): { curriculum: CurriculumIndex; grammar: GrammarIndex } {
  const units = opts.units.slice().sort((a, b) => a.order - b.order);
  const grammarMap = new Map(opts.grammar.map((g) => [g.id, g]));
  const prefix = opts.idPrefix ?? "course-";
  const end = opts.sentenceEnd ?? /(?<=[。！？!?])/;

  const grammarById = (id: string) => grammarMap.get(id);

  const toPoolWord = (v: Lesson["vocab"][number]): PoolWord => ({ id: `${prefix}${v.hanzi}`, hanzi: v.hanzi, pinyin: v.pinyin, meaning: v.es });

  function vocabUpTo(lessonId: string): Map<string, PoolWord> {
    const out = new Map<string, PoolWord>();
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        for (const v of lesson.vocab) if (!out.has(v.hanzi)) out.set(v.hanzi, toPoolWord(v));
        if (lesson.id === lessonId) return out;
      }
    }
    return out;
  }

  function splitSentences(text: string): string[] {
    return text
      .split(end)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);
  }

  function sentencesOf(lesson: Lesson): PoolSentence[] {
    const out: PoolSentence[] = [];
    for (const step of lesson.steps) {
      if (step.type === "dialogue") for (const l of step.lines) out.push({ zh: l.zh, py: l.py, es: l.es });
      if (step.type === "grammar") {
        const g = grammarById(step.id);
        if (g) {
          for (const e of g.examples) out.push({ zh: e.zh, py: e.py, es: e.es, grammarId: g.id });
          for (const o of g.practice.order ?? []) out.push({ zh: o.zh, py: o.py, es: o.es, grammarId: g.id });
        }
      }
      if (step.type === "reading") for (const s of splitSentences(step.text)) out.push({ zh: s, es: "" });
    }
    return out.filter((s) => s.es);
  }

  function lessonById(lessonId: string) {
    for (const unit of units) {
      const index = unit.lessons.findIndex((l) => l.id === lessonId);
      if (index >= 0) return { unit, lesson: unit.lessons[index], index };
    }
    return undefined;
  }

  const curriculum: CurriculumIndex = {
    units,
    levelTitle: opts.levelTitle,
    unitById: (id) => units.find((u) => u.id === id),
    lessonById,
    nextLesson(lessonId) {
      const cur = lessonById(lessonId);
      if (!cur) return undefined;
      if (cur.index + 1 < cur.unit.lessons.length) return { unit: cur.unit, lesson: cur.unit.lessons[cur.index + 1] };
      const nu = units[units.indexOf(cur.unit) + 1];
      return nu?.lessons[0] ? { unit: nu, lesson: nu.lessons[0] } : undefined;
    },
    vocabUpTo,
    sentencesOf,
    splitSentences,
    lessonPool(lesson, extraWords = []) {
      const words = lesson.vocab.map(toPoolWord);
      const seen = vocabUpTo(lesson.id);
      const allWords = Array.from(new Map([...Array.from(seen.values()), ...extraWords].map((w) => [w.hanzi, w])).values());
      return { words: words.length ? words : allWords.slice(-10), allWords, sentences: sentencesOf(lesson) };
    },
  };

  const grammar: GrammarIndex = {
    points: opts.grammar,
    byId: grammarById,
    pool(g, allWords) {
      const sentences: PoolSentence[] = [...g.examples, ...(g.practice.order ?? []), ...(g.practice.translate ?? [])].map((s) => ({ zh: s.zh, py: s.py, es: s.es, grammarId: g.id }));
      return { words: [], allWords, sentences } as Pool;
    },
    detect: opts.detect ?? (() => []),
  };

  return { curriculum, grammar };
}
