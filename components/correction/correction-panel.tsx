"use client";
/**
 * Panel de corrección (reutilizado por el cuaderno de ejercicios, los ejercicios incrustados y el tutor):
 * veredicto con nota, frase del usuario con errores coloreados por tipo (falta, sobra, orden con flecha, carácter,
 * tono, registro), frase correcta con pinyin y audio a dos velocidades, alternativas por registro, explicación de
 * cada error enlazada al apunte de gramática con truco, y práctica extra inmediata.
 */
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Lightbulb, MoveRight, Sparkles } from "lucide-react";
import Link from "@/lib/languages/link";
import { usePack } from "@/lib/languages/provider";
import type { AlignedToken, CorrectionError, CorrectionReport } from "@/lib/correction/types";
import { TargetText } from "@/components/target/target-text";
import { AudioButton } from "@/components/target/audio-button";
import { Reading } from "@/components/target/reading";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

const TYPE_LABEL: Record<string, string> = { missing: "falta", extra: "sobra", order: "orden", char: "carácter", tone: "tono", pinyin: "sílaba", word: "palabra / registro", grammar: "regla" };
const TYPE_CLS: Record<AlignedToken["status"], string> = { ok: "corr-ok", missing: "corr-missing", extra: "corr-extra", sub: "corr-sub", moved: "corr-moved", tone: "corr-tone" };

function Verdict({ r }: { r: CorrectionReport }) {
  const map = {
    correct: { icon: "✅", label: "Correcta", cls: "border-celadon/50 bg-celadon/10 text-celadon-ink" },
    improvable: { icon: "🟡", label: "Correcta pero mejorable", cls: "border-gold/50 bg-gold/10 text-gold-ink" },
    wrong: { icon: "❌", label: "Incorrecta", cls: "border-danger/40 bg-danger/8 text-danger" },
    partial: { icon: "◐", label: "Corrección parcial", cls: "border-line bg-paper-sunk/60 text-ink-soft" },
  }[r.verdict];
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-[10px] border px-3 py-2", map.cls)} role="status" aria-live="polite">
      <span className="text-lg" aria-hidden="true">
        {map.icon}
      </span>
      <span className="font-semibold">{map.label}</span>
      {r.verdict !== "partial" ? <span className="tabular ml-auto font-serif-es text-2xl">{r.score}<span className="text-sm opacity-70">/100</span></span> : null}
      {r.verdict === "partial" ? <span className="ml-auto text-xs">añade la solución de tu profesor o activa el tutor para una corrección completa</span> : null}
    </div>
  );
}

/** Frase del usuario con cada palabra coloreada según su estado. */
function AlignedSentence({ tokens, errors }: { tokens: AlignedToken[]; errors: CorrectionError[] }) {
  const pack = usePack();
  const moves = new Map<number, number>();
  for (const e of errors) if (e.type === "order" && e.span && e.moveTo !== undefined) moves.set(e.span.from, e.moveTo);
  let ui = 0;
  return (
    <p className="flex flex-wrap items-end gap-x-1 gap-y-1.5 text-xl leading-relaxed" lang={pack.bcp47}>
      {tokens.map((t, i) => {
        const idx = t.user !== undefined ? ui++ : -1;
        const moveTo = idx >= 0 ? moves.get(idx) : undefined;
        if (t.status === "missing")
          return (
            <span key={i} className={cn("corr-tok corr-missing text-base", pack.meta.cssClass)} title={`falta ${t.ref}`}>
              {t.ref}
            </span>
          );
        return (
          <span key={i} className="inline-flex flex-col items-center">
            <span className={cn("corr-tok", TYPE_CLS[t.status], pack.meta.cssClass)} title={t.status === "sub" ? `debería ser ${t.ref}` : t.status === "tone" ? `tono: ${t.refPy}` : t.status === "extra" ? "sobra" : t.status === "moved" ? "va en otro sitio" : undefined}>
              {t.user}
            </span>
            {t.status === "sub" || t.status === "tone" ? <span className="text-[11px] text-ink-faint">→ {t.ref}</span> : null}
            {moveTo !== undefined ? (
              <span className="inline-flex items-center text-[11px] text-gold-ink">
                <MoveRight className="size-3" /> pos. {moveTo + 1}
              </span>
            ) : null}
          </span>
        );
      })}
    </p>
  );
}

export function CorrectionPanel({ report, es, onPractice, className }: { report: CorrectionReport; es?: string; onPractice?: (x: { es: string; zh: string }) => void; className?: string }) {
  const pack = usePack();
  const [showAlt, setShowAlt] = useState(true);
  const errors = report.errors.filter((e) => !(e.type === "tone" && e.severity === "warn" && report.mode !== "pinyin"));
  return (
    <section className={cn("space-y-4", className)} aria-label="Corrección">
      <Verdict r={report} />
      {report.alignment.length ? (
        <div className="card-paper p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Tu frase</p>
          <AlignedSentence tokens={report.alignment} errors={report.errors} />
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-faint">
            <span><span className="corr-tok corr-missing">falta</span></span>
            <span><span className="corr-tok corr-extra">sobra</span></span>
            <span><span className="corr-tok corr-moved">orden</span></span>
            <span><span className="corr-tok corr-sub">carácter / palabra</span></span>
            <span><span className="corr-tok corr-tone">tono</span></span>
          </p>
        </div>
      ) : report.answer ? (
        <div className="card-paper p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Tu frase</p>
          <p className="text-xl" lang={pack.bcp47}>
            {errors.map((e) => e.span?.text).filter(Boolean).length ? (
              <HighlightSpans text={report.answer} errors={errors} />
            ) : (
              <span className={pack.meta.cssClass}>{report.answer}</span>
            )}
          </p>
        </div>
      ) : null}

      {report.corrected ? (
        <div className="card-paper p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{report.verdict === "correct" ? "Frase" : "Frase correcta"}</p>
          <div className="flex items-start gap-2">
            <div className="flex shrink-0 flex-col gap-1">
              <AudioButton text={report.corrected} size="sm" label="Escuchar" />
              <AudioButton text={report.corrected} size="sm" rate={0.65} label="Escuchar despacio" className="text-ink-faint" />
            </div>
            <TargetText text={report.corrected} size="lg" pinyinLine={report.correctedPy} translation={es} as="div" className="min-w-0 flex-1" />
          </div>
        </div>
      ) : null}

      {report.alternatives.length ? (
        <div className="card-paper p-3">
          <button type="button" onClick={() => setShowAlt((s) => !s)} className="flex w-full items-center justify-between text-left" aria-expanded={showAlt}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Otras formas de decirlo</span>
            <ChevronDown className={cn("size-4 text-ink-faint transition-transform", showAlt && "rotate-180")} />
          </button>
          {showAlt ? (
            <ul className="mt-2 space-y-2">
              {report.alternatives.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AudioButton text={a.zh} size="sm" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <TargetText text={a.zh} size="md" pinyinLine={a.py} as="div" />
                    <p className="text-xs text-ink-faint">
                      <Badge variant="outline" className="mr-1">{a.register === "formal" ? "más formal" : a.register === "colloquial" ? "coloquial" : "neutro"}</Badge>
                      {a.es_literal ? <span>lit. «{a.es_literal}» · </span> : null}
                      {a.es ? <Mixed>{a.es}</Mixed> : null}
                      {a.note ? <span> · {a.note}</span> : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {errors.length ? (
        <div className="card-paper p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Qué ha pasado</p>
          <ol className="space-y-2">
            {errors.map((e, i) => {
              const g = e.ruleId ? pack.grammar.byId(e.ruleId) : undefined;
              return (
                <li key={i} className="flex gap-2 text-sm">
                  <Badge variant={e.severity === "warn" ? "muted" : "lacquer"} className="mt-0.5 shrink-0">
                    {TYPE_LABEL[e.type] ?? e.type}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-ink"><Mixed>{e.explanation}</Mixed></p>
                    {e.tip ? (
                      <p className="mt-0.5 text-xs text-gold-ink">
                        <Lightbulb className="mr-1 inline size-3" />
                        <Mixed>{e.tip}</Mixed>
                      </p>
                    ) : null}
                    <p className="mt-0.5 flex flex-wrap gap-2 text-xs">
                      {e.noteId ? (
                        <Link href={`/apuntes/${encodeURIComponent(e.noteId)}`} className="text-indigo underline-offset-2 hover:underline">
                          apunte relacionado
                        </Link>
                      ) : null}
                      {g ? (
                        <Link href={`/aprender/gramatica/${g.id}`} className="text-indigo underline-offset-2 hover:underline">
                          gramática: <Mixed>{g.title}</Mixed>
                        </Link>
                      ) : null}
                      {e.source === "tutor" ? <span className="text-ink-faint">(tutor)</span> : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          {report.disagreements?.length ? (
            <p className="mt-2 rounded-[6px] bg-paper-sunk px-2 py-1 text-xs text-ink-faint">
              {report.disagreements.join(" ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {report.tip && !errors.some((e) => e.tip === report.tip) ? (
        <p className="rounded-[8px] bg-gold/10 px-3 py-2 text-sm text-gold-ink">
          <Lightbulb className="mr-1 inline size-4" />
          <Mixed>{report.tip}</Mixed>
        </p>
      ) : null}

      {report.extraPractice.length ? (
        <div className="card-paper p-3">
          <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            <Sparkles className="size-3" /> Práctica extra: misma estructura
          </p>
          <ul className="space-y-1.5">
            {report.extraPractice.map((x, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-ink"><Mixed>{x.es}</Mixed></span>
                {onPractice ? (
                  <Button size="sm" variant="secondary" onClick={() => onPractice({ es: x.es, zh: x.zh })}>
                    practicar <ArrowRight />
                  </Button>
                ) : (
                  <details className="text-xs text-ink-faint">
                    <summary className="cursor-pointer">solución</summary>
                    <TargetText text={x.zh} size="sm" pinyinLine={x.py} as="div" />
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.layers.linter && !report.layers.align ? (
        <p className="text-[11px] text-ink-faint">
          <Check className="mr-1 inline size-3" />
          Comprobado con las reglas de gramática HSK 1–2 de la app. {report.verdict === "partial" ? "No se ha inventado una respuesta: añade la solución de tu profesor o activa el tutor para una corrección completa." : ""}
        </p>
      ) : null}
    </section>
  );
}

function HighlightSpans({ text, errors }: { text: string; errors: CorrectionError[] }) {
  const pack = usePack();
  const spans = errors.filter((e) => e.span?.text).map((e) => ({ t: e.span!.text, type: e.type }));
  let rest = text;
  const parts: { t: string; type?: string }[] = [];
  for (const s of spans) {
    const i = rest.indexOf(s.t);
    if (i < 0) continue;
    if (i > 0) parts.push({ t: rest.slice(0, i) });
    parts.push({ t: s.t, type: s.type });
    rest = rest.slice(i + s.t.length);
  }
  if (rest) parts.push({ t: rest });
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} className={cn(pack.meta.cssClass, p.type && "corr-tok corr-grammar")}>
          {p.t}
        </span>
      ))}
    </>
  );
}

export { Reading };
