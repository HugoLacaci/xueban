"use client";
import { useState } from "react";
import { getActivePack, getActiveLang } from "@/lib/languages/registry";
import Link from "@/lib/languages/link";
import { AlertTriangle, Dumbbell, ExternalLink } from "lucide-react";
import type { GrammarPoint } from "@/lib/course/types";
import { grammarById } from "@/lib/course";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { AudioButton } from "@/components/target/audio-button";
import { ChineseText } from "@/components/target/target-text";
import { FretBorder } from "@/components/ornament";
import { Markdown } from "./markdown";
import { targetLang } from "@/lib/languages/registry";
import { Mixed } from "@/components/target/mixed";

export function GrammarView({ g, compact, onPractice }: { g: GrammarPoint; compact?: boolean; onPractice?: () => void }) {
  const [showAll, setShowAll] = useState(!compact);
  const examples = showAll ? g.examples : g.examples.slice(0, 3);
  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="font-serif-es text-2xl font-semibold tracking-tight text-ink"><Mixed>{g.title}</Mixed></h2>
          <span lang={targetLang()} className="zh-kai text-lg text-cinnabar">
            {g.zh}
          </span>
          <Badge variant="jade">{getActiveLang() === "zh" ? `HSK ${g.level}` : getActivePack().curriculum.levelTitle}</Badge>
          {!g.reviewed ? <Badge variant="muted">pendiente de revisar con el profesor</Badge> : null}
        </div>
        <p className="mt-1.5 text-ink-soft"><Mixed>{g.summary}</Mixed></p>
      </div>

      {/* fórmula entre dos grecas 回纹 */}
      <div className="card-sunk overflow-hidden rounded-[10px] text-ink">
        <FretBorder height={8} opacity={0.4} />
        <div className="px-4 py-3 text-center">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-ink-faint">Estructura</span>
          <ChineseText text={g.pattern} size="md" ruby={false} markUnknown={false} interactive={false} className="font-mono text-[15px] text-ink" />
        </div>
        <FretBorder height={8} opacity={0.4} />
      </div>

      <Markdown>{g.explanation}</Markdown>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">Ejemplos</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {examples.map((e, i) => (
            <li key={i} className="card-paper flex items-start gap-2 p-3">
              <AudioButton text={e.zh} size="sm" className="mt-1" />
              <ChineseText text={e.zh} size="lg" pinyinLine={e.py} translation={e.es} as="div" className="min-w-0 flex-1" />
            </li>
          ))}
        </ul>
        {compact && g.examples.length > 3 ? (
          <button onClick={() => setShowAll((s) => !s)} className="mt-2 text-sm text-indigo underline-offset-4 hover:underline">
            {showAll ? "ver menos" : `ver los ${g.examples.length} ejemplos`}
          </button>
        ) : null}
      </section>

      {g.mistakes.length ? (
        <section className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/[0.05] p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-danger">
            <AlertTriangle className="size-3.5" /> Errores comunes
          </h3>
          <ul className="space-y-2.5">
            {g.mistakes.map((m, i) => (
              <li key={i} className="text-sm">
                <span lang={targetLang()} className="zh text-danger line-through decoration-danger/60">
                  {m.wrong}
                </span>{" "}
                <span className="text-ink-faint">→</span>{" "}
                <ChineseText text={m.right} size="sm" ruby={false} className="text-ink" />
                <span className="block text-xs text-ink-faint">{m.why}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {onPractice ? (
          <Button onClick={onPractice} variant="jade">
            <Dumbbell /> Practicar este punto
          </Button>
        ) : (
          <Button asChild variant="jade">
            <Link href={`/practicar?grammar=${g.id}`}>
              <Dumbbell /> Practicar este punto
            </Link>
          </Button>
        )}
        {g.related?.length ? (
          <span className="flex flex-wrap items-center gap-1 text-sm text-ink-faint">
            Relacionado:
            {g.related.map((r) => {
              const rg = grammarById(r);
              return rg ? (
                <Link key={r} href={`/aprender/gramatica/${r}`} className="rounded-[6px] border border-line bg-paper-raised px-2 py-0.5 text-xs text-ink-soft transition-colors hover:border-ink/30 hover:text-ink">
                  <Mixed>{rg.title}</Mixed>
                </Link>
              ) : null;
            })}
          </span>
        ) : null}
        {g.source ? (
          <a href={g.source} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink">
            Fuente: Chinese Grammar Wiki <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
