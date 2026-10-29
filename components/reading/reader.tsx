"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "@/lib/languages/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check, Eye, EyeOff, ListChecks, Moon, Plus, Sun, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { readingById } from "@/lib/readings";
import { useKnowledge } from "@/lib/knowledge";
import { useDictionary } from "@/lib/dictionary/service";
import { getActivePack } from "@/lib/languages/registry";
import { comprehensionOfLines } from "@/lib/videos/breakdown";
import { readingQuestionsToExercises } from "@/lib/exercises/build";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { SealTag } from "@/components/ornament/seal";
import { toast } from "@/components/ui/toast";
import { AudioButton } from "@/components/target/audio-button";
import { ChineseText } from "@/components/target/target-text";
import { Pinyin } from "@/components/target/reading";
import { ExerciseRunner, type SessionSummary } from "@/components/exercises/runner";
import { SummaryCard } from "@/components/learn/steps";
import { QuickAddDialog } from "@/components/flashcards/quick-add";
import { cn } from "@/lib/utils";
import { getActiveLang } from "@/lib/languages/registry";
import { targetLang } from "@/lib/languages/registry";
import { Mixed } from "@/components/target/mixed";

/** «Modo noche» local del libro: tokens de noche solo en la página de lectura, sin tocar el tema global. */
const NIGHT_VARS: React.CSSProperties = {
  ["--paper" as string]: "24 23 21",
  ["--paper-raised" as string]: "33 31 28",
  ["--paper-sunk" as string]: "18 17 16",
  ["--ink" as string]: "236 228 214",
  ["--ink-soft" as string]: "190 180 164",
  ["--ink-faint" as string]: "150 140 126",
  ["--line" as string]: "58 54 49",
  ["--shadow-paper" as string]: "0 1px 2px rgb(0 0 0 / 0.3), 0 8px 24px -8px rgb(0 0 0 / 0.5)",
  ["--shadow-sunk" as string]: "inset 0 1px 2px rgb(0 0 0 / 0.4)",
};

export function Reader({ id }: { id: string }) {
  const builtin = readingById(id);
  const user = useLiveQuery(() => (builtin ? undefined : db.readings.get(id)), [id, builtin]);
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const known = useKnowledge((s) => s.known);
  const knownChars = useKnowledge((s) => s.knownChars);
  const deck = useKnowledge((s) => s.deck);
  const showTranslation = useSettings((s) => s.settings.showTranslation);
  const [showEs, setShowEs] = useState(false);
  const [night, setNight] = useState(false);
  const [phase, setPhase] = useState<"read" | "questions">("read");
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  useEffect(() => {
    if (dictStatus === "idle") void load();
    void getActivePack().levelLists();
  }, [dictStatus, load]);

  const text = builtin?.text ?? user?.text ?? "";
  const es = builtin?.es ?? user?.translation ?? "";
  const title = builtin?.title ?? user?.title ?? "";
  const lines = useMemo(() => text.split("\n").filter((l) => l.trim()), [text]);
  const esLines = useMemo(() => es.split("\n"), [es]);
  const comp = useMemo(() => (dictStatus === "ready" ? comprehensionOfLines(lines.map((zh) => ({ zh })), known, knownChars) : null), [lines, known, knownChars, dictStatus]);
  const unknownWords = useMemo(() => (comp ? Array.from(comp.unknown.entries()).sort((a, b) => b[1] - a[1]).map(([w]) => w).filter((w) => !deck.has(w)).slice(0, 20) : []), [comp, deck]);
  const exercises = useMemo(() => (builtin ? readingQuestionsToExercises(builtin.text, builtin.es, builtin.questions, builtin.id) : []), [builtin]);

  useEffect(() => {
    if (builtin) void db.readings.put({ id: builtin.id, lang: getActiveLang(), title: builtin.title, text: builtin.text, translation: builtin.es, source: "builtin", level: builtin.level, addedAt: Date.now(), lastRead: Date.now(), completed: false }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!builtin && user === undefined) return null;
  if (!builtin && !user) {
    return (
      <div>
        <PageHeader title="Texto no encontrado" />
        <Button asChild variant="secondary">
          <Link href="/lectura">
            <ArrowLeft /> Volver
          </Link>
        </Button>
      </div>
    );
  }

  if (summary) {
    return (
      <div className="mx-auto max-w-2xl">
        <SummaryCard
          summary={summary}
          title={title}
          onContinue={async () => {
            if (builtin) await db.readings.update(builtin.id, { completed: true, score: summary.total ? summary.correct / summary.total : 1 });
            setSummary(null);
            setPhase("read");
          }}
        />
      </div>
    );
  }
  if (phase === "questions") return <ExerciseRunner exercises={exercises} context={`reading:${id}`} onFinish={setSummary} allowSkip={false} title={title} />;

  const translated = showEs || showTranslation;
  const wechat = builtin?.kind === "wechat";

  return (
    <div className="mx-auto max-w-[42rem] space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/lectura" className="inline-flex min-h-9 items-center gap-1 rounded-md text-sm text-ink-faint hover:text-ink">
          <ArrowLeft className="size-4" /> Lecturas
        </Link>
        {user ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-danger hover:text-danger"
            onClick={async () => {
              if (!window.confirm("¿Eliminar este texto?")) return;
              await db.readings.delete(user.id);
              window.location.href = "/lectura";
            }}
          >
            <Trash2 /> Eliminar
          </Button>
        ) : null}
      </div>
      <header>
        <h1 className="font-serif-es text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">
          {title}
          {builtin ? (
            <span lang={targetLang()} className="zh-kai ml-3 text-xl font-normal text-cinnabar">
              {builtin.zh}
            </span>
          ) : null}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {builtin ? <SealTag>nivel {builtin.level}</SealTag> : <Badge variant="outline">mi texto</Badge>}
          {comp ? <Badge variant={comp.ratio >= 0.95 ? "jade" : comp.ratio >= 0.85 ? "gold" : "default"}>Conoces el {Math.round(comp.ratio * 100)} % de las palabras</Badge> : null}
          {builtin?.tags.map((t) => (
            <Badge key={t} variant="muted">
              #{t}
            </Badge>
          ))}
          {builtin && !builtin.reviewed ? <Badge variant="muted">pendiente de revisar con el profesor</Badge> : null}
        </div>
      </header>

      {/* el libro */}
      <article className={cn("card-paper relative overflow-hidden px-5 py-6 transition-colors duration-300 sm:px-10 sm:py-9", night && "border-ink/20")} style={night ? NIGHT_VARS : undefined} aria-label="Texto">
        <span className="absolute inset-x-8 top-0 h-[2px] rounded-b bg-cinnabar/80" aria-hidden="true" />
        <div className="mb-5 flex flex-wrap items-center justify-end gap-1.5 border-b border-line/70 pb-3">
          <AudioButton text={text.replace(/\n/g, "。")} label="Escuchar todo" />
          <Button size="sm" variant="ghost" onClick={() => setShowEs((s) => !s)} aria-pressed={translated}>
            {translated ? <EyeOff /> : <Eye />} traducción
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNight((n) => !n)} aria-pressed={night} title="Oscurece solo el libro">
            {night ? <Sun /> : <Moon />} {night ? "modo papel" : "modo noche"}
          </Button>
        </div>
        <div className={cn("space-y-5", wechat && "space-y-3")}>
          {lines.map((l, i) => (
            <div key={i} className={cn("flex items-start gap-3", wechat && i % 2 === 1 && "flex-row-reverse text-right")}>
              {/* numeral de párrafo como sello diminuto + audio */}
              <div className={cn("flex shrink-0 flex-col items-center gap-1 pt-1.5", wechat && i % 2 === 1 && "items-end")}>
                <SealTag tone="ink" className="min-w-6 justify-center opacity-55">
                  {i + 1}
                </SealTag>
                <AudioButton text={l} size="sm" />
              </div>
              <div className={cn("min-w-0 flex-1", wechat && "max-w-[85%] flex-none rounded-[16px] bg-paper-sunk px-3.5 py-2", wechat && i % 2 === 1 ? "rounded-tr-[4px]" : wechat && "rounded-tl-[4px]")}>
                <ChineseText text={l} size="xl" as="div" className="leading-loose" sourceRef={`reading:${id}`} />
                <p className={cn("font-serif-es mt-1 text-[15px] leading-relaxed text-ink-soft transition-opacity", translated && esLines[i] ? "opacity-100" : "hidden")} aria-hidden={!translated}>
                  {esLines[i]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </article>

      {builtin?.gloss?.length ? (
        <Card>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">Palabras fuera del nivel {getActivePack().curriculum.levelTitle} en este texto</h3>
          <ul className="flex flex-wrap gap-2">
            {builtin.gloss.map((g) => (
              <li key={g.hanzi} className="flex min-h-10 items-center gap-2 rounded-[8px] border border-line bg-paper-raised px-2.5 py-1 text-sm shadow-[var(--shadow-paper)]">
                <ChineseText text={g.hanzi} size="md" ruby={false} markUnknown={false} />
                <Pinyin text={g.pinyin} className="text-xs" />
                <span className="text-ink-faint"><Mixed>{g.es}</Mixed></span>
                {!deck.has(g.hanzi) ? (
                  <button onClick={() => setAdding(g.hanzi)} className="rounded p-1 text-celadon-ink hover:bg-celadon/14" aria-label={`Añadir ${g.hanzi}`}>
                    <Plus className="size-4" />
                  </button>
                ) : (
                  <Check className="size-4 text-celadon-ink" aria-label="En tu mazo" />
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {unknownWords.length ? (
        <Card>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">Palabras que no conoces todavía (pulsa para añadir)</h3>
          <div className="flex flex-wrap gap-1.5">
            {unknownWords.map((w) => (
              <button key={w} onClick={() => setAdding(w)} lang={targetLang()} className="zh-serif min-h-10 rounded-[8px] border border-line bg-paper-raised px-2.5 text-lg leading-none text-ink shadow-[var(--shadow-paper)] transition-colors hover:border-ink/40 hover:bg-paper-sunk">
                {w}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {builtin ? (
        <div className="flex justify-end">
          <Button size="lg" onClick={() => setPhase("questions")}>
            <ListChecks /> Preguntas de comprensión ({builtin.questions.length})
          </Button>
        </div>
      ) : (
        <p className="text-sm text-ink-faint">Consejo: lee primero sin pinyin (tecla P), luego comprueba con la traducción y añade al mazo las palabras subrayadas.</p>
      )}
      {adding ? (
        <QuickAddDialog
          open
          onOpenChange={(o) => {
            if (!o) setAdding(null);
          }}
          initialHanzi={adding}
          initialExample={lines.find((l) => l.includes(adding))}
          source="reading"
          sourceRef={`reading:${id}`}
          onSaved={() => toast.success("Añadida al mazo")}
        />
      ) : null}
    </div>
  );
}
