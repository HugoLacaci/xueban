/** Corrección de ejercicios con explicación. Lógica pura (sin React, sin BD) → testeable. */
import { levenshtein, normalizeEs, normalizeZh } from "@/lib/utils";
import type { ExerciseAdapters } from "@/lib/languages/types";
import { getActivePackOrNull } from "@/lib/languages/registry";
import type { CheckResult, Exercise, Response } from "./types";

const TONE_NAMES = ["", "1.º (alto)", "2.º (ascendente)", "3.º (bajo)", "4.º (descendente)", "neutro"];

/** Comparadores por defecto (chino) cuando no se pasa el paquete; los paquetes aportan los suyos. */
const DEFAULT_ADAPTERS: Pick<ExerciseAdapters, "readingEquals" | "readingDiff" | "normalizeText" | "normalizeInput" | "explainPartial"> = {
  readingEquals: (u, e) => u.trim().toLowerCase() === e.trim().toLowerCase(),
  readingDiff: (u, e) => [{ unit: e, got: u, ok: u.trim().toLowerCase() === e.trim().toLowerCase(), partial: false }],
  normalizeText: normalizeZh,
  normalizeInput: (s) => s,
};

export function check(ex: Exercise, r: Response, ad: Pick<ExerciseAdapters, "readingEquals" | "readingDiff" | "normalizeText" | "normalizeInput" | "explainPartial"> = getActivePackOrNull()?.exerciseAdapters ?? DEFAULT_ADAPTERS): CheckResult {
  const norm = ad.normalizeText;
  switch (ex.type) {
    case "choose-meaning":
    case "choose-character":
    case "similar-characters":
    case "listen-choose":
    case "component":
    case "classifier":
    case "tone-pair":
    case "comprehension": {
      if (r.kind !== "choice") return bad(ex, "Elige una opción.");
      const ok = r.index === ex.answer;
      const chosen = ex.options[r.index];
      const right = ex.options[ex.answer];
      return {
        correct: ok,
        expected: right.text + (right.sub ? ` — ${right.sub}` : ""),
        explanation: ok ? (ex.explain ?? "¡Correcto!") : `${ex.explain ?? ""} Has elegido «${chosen?.text ?? "—"}»${chosen?.sub ? ` (${chosen.sub})` : ""}; la respuesta es «${right.text}»${right.sub ? ` (${right.sub})` : ""}.`.trim(),
      };
    }
    case "pinyin-input": {
      if (r.kind !== "text") return bad(ex, "Escribe la lectura.");
      const user = ad.normalizeInput(r.text.trim());
      const ok = ad.readingEquals(user, ex.answer);
      const diff = ad.readingDiff(user, ex.answer);
      const partialOnly = !ok && diff.length > 0 && diff.every((d) => d.ok || d.partial) && ad.readingEquals(user, ex.answer, { lenient: true });
      const wrong = diff.filter((d) => !d.ok);
      const explanation = ok
        ? "¡Correcto!"
        : partialOnly
          ? ("explainPartial" in ad && ad.explainPartial ? ad.explainPartial(wrong) : `Casi: ${wrong.map((d) => `${d.got || "—"} → ${d.unit}`).join(", ")}.`)
          : `La lectura correcta es «${ex.answer}». ${wrong.map((d) => `${d.got || "—"} → ${d.unit}`).join(", ")}.`;
      return { correct: ok, partial: Boolean(partialOnly), expected: ex.answer, explanation, detail: diff };
    }
    case "tone-choice": {
      if (r.kind !== "tones") return bad(ex, "Elige el tono de cada sílaba.");
      const name = (t: number) => ex.choices?.find((c) => c.value === t)?.label ?? TONE_NAMES[t];
      const ok = r.tones.length === ex.answer.length && r.tones.every((t, i) => t === ex.answer[i]);
      const wrong = ex.answer.map((t, i) => ({ i, want: t, got: r.tones[i] })).filter((x) => x.got !== x.want);
      return {
        correct: ok,
        expected: ex.answer.map((t, i) => `${ex.syllables[i]}: ${name(t)}`).join(" · "),
        explanation: ok ? "¡Buen oído!" : `Fallo en ${wrong.map((w) => `«${ex.syllables[w.i]}» (es ${name(w.want)}, elegiste ${w.got ? name(w.got) : "—"})`).join(" y ")}. ${ex.explain ?? ""}`.trim(),
      };
    }
    case "order-words":
    case "build-sentence": {
      if (r.kind !== "tiles") return bad(ex, "Ordena las fichas.");
      const got = r.tiles.join("");
      const valid = [ex.answer, ...(ex.alternatives ?? [])].map((a) => a.join(""));
      const ok = valid.some((v) => norm(v) === norm(got));
      if (ok) return { correct: true, expected: ex.zh, explanation: ex.explain ?? "¡Correcto!" };
      let firstDiff = -1;
      for (let i = 0; i < Math.max(r.tiles.length, ex.answer.length); i++) {
        if (r.tiles[i] !== ex.answer[i]) {
          firstDiff = i;
          break;
        }
      }
      const extra = r.tiles.filter((t) => !ex.answer.includes(t));
      const missing = ex.answer.filter((t) => !r.tiles.includes(t));
      let why = "";
      if (extra.length) why += `Sobra: ${extra.map((t) => `«${t}»`).join(", ")}. `;
      if (missing.length) why += `Falta: ${missing.map((t) => `«${t}»`).join(", ")}. `;
      if (!extra.length && !missing.length && firstDiff >= 0) why += `El orden falla a partir de la ficha ${firstDiff + 1}: debería ir «${ex.answer[firstDiff]}». `;
      return { correct: false, expected: ex.zh, explanation: `${why}${ex.explain ?? ""}`.trim(), detail: { firstDiff, extra, missing } };
    }
    case "fill-blank":
    case "particle": {
      if (r.kind !== "text" && r.kind !== "choice") return bad(ex, "Completa el hueco.");
      const text = r.kind === "text" ? r.text : (ex.options?.[r.index] ?? "");
      const ok = norm(text) === norm(ex.answer);
      return { correct: ok, expected: ex.answer, explanation: ok ? (ex.explain ?? "¡Correcto!") : `La respuesta correcta es «${ex.answer}». ${ex.explain ?? ""}`.trim() };
    }
    case "conjugation": {
      if (r.kind !== "text") return bad(ex, "Escribe la forma conjugada.");
      const user = norm(ad.normalizeInput(r.text));
      const valid = [ex.answer, ...(ex.alternatives ?? [])];
      const ok = valid.some((v) => norm(v) === user);
      const d = levenshtein(user, norm(ex.answer));
      return {
        correct: ok,
        partial: !ok && d <= 1,
        expected: ex.answer,
        explanation: ok ? (ex.explain ?? "¡Correcto!") : `${ex.zh} en ${ex.form} (${ex.formNative}) es «${ex.answer}». ${ex.explain ?? ""}`.trim(),
      };
    }
    case "translate-to-es": {
      if (r.kind === "self") return { correct: r.correct, expected: ex.answers[0], explanation: r.correct ? "Marcado como correcto." : `Una traducción válida: «${ex.answers[0]}».` };
      if (r.kind !== "text") return bad(ex, "Escribe la traducción.");
      const user = normalizeEs(r.text);
      const best = ex.answers.map((a) => ({ a, d: levenshtein(user, normalizeEs(a)) / Math.max(1, normalizeEs(a).length) })).sort((x, y) => x.d - y.d)[0];
      const ok = best.d <= 0.2;
      const partial = !ok && best.d <= 0.45;
      return {
        correct: ok,
        partial,
        expected: ex.answers[0],
        explanation: ok ? "¡Bien! (se aceptan pequeñas variaciones)" : partial ? `Casi. Una traducción natural: «${best.a}». Si crees que la tuya también vale, márcala como correcta.` : `Una traducción válida: «${ex.answers[0]}».`,
      };
    }
    case "dictation": {
      if (r.kind !== "text") return bad(ex, "Escribe lo que oyes.");
      const user = norm(ad.normalizeInput(r.text));
      const want = norm(ex.zh);
      const ok = user === want;
      const d = levenshtein(user, want);
      const partial = !ok && d <= Math.max(1, Math.floor(want.length / 4));
      const wrongChars = Array.from(want).filter((c) => !user.includes(c));
      return {
        correct: ok,
        partial,
        expected: ex.zh,
        explanation: ok ? "¡Perfecto!" : `${partial ? "Casi: " : ""}la frase es «${ex.zh}».${wrongChars.length ? ` Te faltan o cambiaste: ${wrongChars.join(" ")}.` : ""}`,
        detail: { wrongChars },
      };
    }
    case "reading-tf": {
      if (r.kind !== "tf") return bad(ex, "Marca verdadero o falso.");
      const results = ex.statements.map((s, i) => ({ s: s.s, ok: r.values[i] === s.truth, truth: s.truth, why: s.why }));
      const correct = results.every((x) => x.ok);
      const wrong = results.filter((x) => !x.ok);
      return {
        correct,
        partial: !correct && wrong.length < results.length,
        expected: ex.statements.map((s) => (s.truth ? "V" : "F")).join(" "),
        explanation: correct ? "¡Todo correcto!" : wrong.map((w) => `«${w.s}» es ${w.truth ? "verdadero" : "falso"}${w.why ? `: ${w.why}` : ""}`).join(" · "),
      };
    }
    case "matching": {
      if (r.kind !== "matching") return bad(ex, "Empareja todas las fichas.");
      const ok = r.completed && r.mistakes === 0;
      return { correct: ok, partial: r.completed && r.mistakes <= 2, expected: ex.pairs.map((p) => `${p.left.text} = ${p.right.text}`).join(" · "), explanation: ok ? "¡Sin fallos!" : `${r.mistakes} emparejamientos fallidos.` };
    }
    case "writing": {
      if (r.kind !== "writing") return bad(ex, "Traza el carácter.");
      const ok = r.mistakes <= 2;
      return { correct: ok, partial: !ok && r.mistakes <= 5, expected: ex.hanzi, explanation: r.mistakes === 0 ? "¡Trazos perfectos!" : ok ? `Bien, con ${r.mistakes} trazo(s) corregido(s).` : `Repásalo: ${r.mistakes} fallos de trazo. Fíjate en el orden (de arriba abajo, de izquierda a derecha).` };
    }
    case "speaking": {
      if (r.kind === "self") return { correct: r.correct, expected: ex.zh, explanation: r.correct ? "Autoevaluado como correcto." : "Autoevaluado: a repetir." };
      if (r.kind !== "speaking") return bad(ex, "Graba tu voz.");
      if (!r.transcript) return { correct: false, expected: ex.zh, explanation: "No se reconoció nada. Prueba de nuevo o autoevalúate.", skip: true };
      const want = norm(ex.zh);
      const got = norm(r.transcript);
      const wantChars = Array.from(want);
      const missed = wantChars.filter((c) => !got.includes(c));
      const ratio = 1 - missed.length / Math.max(1, wantChars.length);
      const ok = ratio >= 0.85;
      return {
        correct: ok,
        partial: !ok && ratio >= 0.6,
        expected: ex.zh,
        explanation: ok ? `Se ha reconocido «${r.transcript}». ¡Bien!` : `Se ha reconocido «${r.transcript}». ${missed.length ? `No se entendió: ${missed.join(" ")}.` : ""}`,
        detail: { missed, ratio },
      };
    }
    case "build-character": {
      if (r.kind !== "tiles") return bad(ex, "Selecciona los componentes.");
      const ok = r.tiles.length === ex.components.length && r.tiles.every((t) => ex.components.includes(t));
      return { correct: ok, expected: ex.components.join(" + "), explanation: ok ? `${ex.hanzi} = ${ex.components.join(" + ")}` : `${ex.hanzi} se compone de ${ex.components.join(" + ")}. ${ex.explain ?? ""}`.trim() };
    }
  }
}

function bad(ex: Exercise, msg: string): CheckResult {
  return { correct: false, expected: "", explanation: msg, skip: true, detail: ex.type };
}
