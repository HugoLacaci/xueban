"use client";
/**
 * <Mixed>: texto en español con palabras de la lengua meta incrustadas («El verbo 是 (ser)»).
 * Envuelve cada tramo en chino/japonés/coreano con su atributo lang (por escritura: hangul → ko,
 * kana → ja, solo hanzi/kanji → idioma activo) para la tipografía, el lector de pantalla y la auditoría.
 */
import { Fragment } from "react";
import { getActivePackOrNull } from "@/lib/languages/registry";

const RUN = /[\u3000-\u303f\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff01-\uff60\u1100-\u11ff\u3130-\u318f\uac00-\ud7af][\u3000-\u303f\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff01-\uff60\u1100-\u11ff\u3130-\u318f\uac00-\ud7af\s·…～〜\-/()（）]*/g;
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
const KANA = /[\u3040-\u30ff]/;

export function langOfRun(run: string): string {
  if (HANGUL.test(run)) return "ko-KR";
  if (KANA.test(run)) return "ja-JP";
  const active = getActivePackOrNull()?.bcp47;
  return active === "ja-JP" ? "ja-JP" : active === "ko-KR" ? "ko-KR" : "zh-CN";
}

export function mixedParts(text: string): { text: string; lang?: string }[] {
  const out: { text: string; lang?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(RUN)) {
    const run = m[0].replace(/[\s\-/(（]+$/, "");
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i) });
    out.push({ text: run, lang: langOfRun(run) });
    last = i + run.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

export function Mixed({ children }: { children?: string | null }) {
  if (!children) return null;
  const parts = mixedParts(children);
  if (parts.length === 1 && !parts[0].lang) return <>{children}</>;
  return (
    <>
      {parts.map((p, i) =>
        p.lang ? (
          <span key={i} lang={p.lang}>
            {p.text}
          </span>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}

/** Para atributos que solo admiten texto (option, title…): el idioma dominante del texto meta. */
export const hasTargetScript = (s: string) => new RegExp(RUN.source).test(s);
