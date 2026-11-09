/**
 * Paquete de clase: lo genera Claude Code a partir de la transcripción de una clase grabada
 * (scripts/clases) y lo importa la app (Apuntes → Clases → Importar).
 * El mismo esquema valida en los scripts (antes de borrar nada) y en la app (antes de importar).
 */
import { z } from "zod";

const t = z.number().nonnegative().optional(); // segundo de la grabación
const clip = z.string().regex(/^[\w.-]+\.(opus|ogg|m4a|mp3)$/).optional(); // nombre del recorte en recortes\AAAA-MM-DD\

export const zhEs = z.object({ zh: z.string().min(1), es: z.string().min(1) });

export const classVocab = z.object({
  hanzi: z.string().min(1),
  pinyin: z.string().optional(),
  es: z.string().min(1),
  category: z.string().min(1),
  example: zhEs.optional(),
  t,
  clip,
});

export const classGrammar = z.object({
  grammarId: z.string().optional(),
  title: z.string().min(1),
  pattern: z.string().min(1),
  explanationEs: z.string().min(1),
  examples: z.array(zhEs),
  teacherSaid: z.string().optional(),
  t,
  clip,
});

export const confidence = z.enum(["alta", "media", "baja"]);

export const classExercise = z.object({
  es: z.string().min(1),
  myAnswer: z.string().optional(),
  /** Solo lo que dijo el profesor. Nunca una propuesta de Claude. */
  teacherAnswer: z.array(z.string().min(1)).min(1),
  /** Propuesta de Claude, no del profesor (si la corrección no se oye bien). */
  claudeProposal: z.string().optional(),
  explanationEs: z.string().optional(),
  errorTypes: z.array(z.string()).optional(),
  grammarIds: z.array(z.string()).optional(),
  t,
  clip,
  confidence,
});

export const classPackageSchema = z
  .object({
    version: z.literal(1),
    classDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    title: z.string().min(1),
    teacher: z.string().optional(),
    source: z.object({
      file: z.string(),
      transcript: z.string(),
      durationSec: z.number().nonnegative(),
      /** Enlace a la grabación en Stream (solo funciona mientras no caduque). */
      streamUrl: z.string().url().optional(),
      /** Método con el que se obtuvo la clase. */
      method: z.enum(["graph", "navegador", "onedrive", "manual"]).optional(),
      /** "solo transcripción de Teams (calidad del chino limitada)" cuando no hubo audio. */
      onlyTeamsTranscript: z.boolean().optional(),
    }),
    /** "mio" = mi grupo; "otro" = otro grupo del mismo profesor (sirve de repaso o para cubrir una clase que falta). */
    group: z.enum(["mio", "otro"]).optional(),
    /** Páginas del libro que se trabajan (para alinear grupos con el temario). */
    bookPages: z.array(z.number().int().positive()).optional(),
    /** Si es de otro grupo y cubre una clase de Hugo que no se grabó: fecha de esa clase (AAAA-MM-DD). */
    coversDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    /** Si repite el temario de otra clase ya incluida: id de esa clase. La app no la importa como clase aparte; solo añade sus ejercicios/trucos nuevos a esa. */
    duplicateOf: z.string().optional(),
    /** Orden en el temario (1, 2, 3…) tras alinear todas las clases. */
    syllabusOrder: z.number().int().positive().optional(),
    summary: z.string().min(1),
    topics: z.array(z.string()),
    vocab: z.array(classVocab),
    grammar: z.array(classGrammar),
    phrases: z.array(z.object({ zh: z.string().min(1), es: z.string().min(1), situation: z.string().optional(), t, clip })),
    teacherTips: z.array(z.object({ text: z.string().min(1), t, clip })),
    myDoubts: z.array(z.object({ q: z.string().min(1), a: z.string().optional(), t })),
    homework: z.string().optional(),
    cues: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })),
    exercises: z.array(classExercise),
    livingNoteAdds: z.array(
      z.object({
        noteId: z.string().min(1),
        /** Sección del apunte vivo tras la que se coloca (id real de content/zh/living). */
        sectionId: z.string().optional(),
        title: z.string().optional(),
        markdown: z.string().min(1),
        t,
      }),
    ),
    uncertain: z.array(z.object({ what: z.string().min(1), t: z.number().nonnegative() })),
    /** Correcciones de reconocimiento hechas por Claude (homófonos, etc.). */
    asrFixes: z.array(z.object({ from: z.string(), to: z.string(), t, why: z.string().optional() })).optional(),
    /** Recortes de audio del profesor que acompañan al paquete. */
    clips: z
      .array(
        z.object({
          file: z.string().regex(/^[\w.-]+\.(opus|ogg|m4a|mp3)$/),
          start: z.number().nonnegative(),
          end: z.number().positive(),
          kind: z.enum(["exercise", "vocab", "phrase", "grammar", "tip"]),
          ref: z.number().int().nonnegative().optional(),
        }),
      )
      .optional(),
  })
  .superRefine((p, ctx) => {
    // Un ejercicio de confianza baja tiene que aparecer en "uncertain".
    p.exercises.forEach((e, i) => {
      if (e.confidence === "baja" && e.t !== undefined && !p.uncertain.some((u) => Math.abs(u.t - e.t!) < 30))
        ctx.addIssue({ code: "custom", path: ["exercises", i, "confidence"], message: "confianza baja sin entrada en uncertain" });
    });
    for (const c of p.clips ?? []) {
      if (c.end <= c.start) ctx.addIssue({ code: "custom", path: ["clips"], message: `recorte ${c.file} con fin ≤ inicio` });
      if (c.end - c.start > 15.5) ctx.addIssue({ code: "custom", path: ["clips"], message: `recorte ${c.file} de más de 15 s` });
    }
  });

export type ClassPackage = z.infer<typeof classPackageSchema>;
export type ClassExercise = z.infer<typeof classExercise>;

export function parseClassPackage(json: unknown): { ok: true; data: ClassPackage } | { ok: false; errors: string[] } {
  const r = classPackageSchema.safeParse(json);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`) };
}

/** Id estable del paquete/apunte de clase. */
export function classPackageId(p: Pick<ClassPackage, "classDate">): string {
  return `class-${p.classDate}`;
}
