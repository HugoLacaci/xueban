"use client";
/**
 * Repasar mis apuntes: modo Cornell (pregunta visible, respuesta tapada, FSRS con 4 botones) sobre las tarjetas
 * de los apuntes (preguntas, frases, huecos, errores) y repaso semanal guiado (lo nuevo, lo más fallado, lo que
 * más olvido). También exporta las tarjetas a Anki (CSV).
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check, Download, Eye, RefreshCw, Sparkles, X } from "lucide-react";
import Link from "@/lib/languages/link";
import { db, type Note, type NoteCard } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { noteCardsToCsv, noteReviewQueue, rateNoteCard, Rating } from "@/lib/notes/practice";
import { needsReview, markReviewed } from "@/lib/notes/repo";
import { errorStats } from "@/lib/notes/error-book";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Kbd, PageHeader, Progress } from "@/components/ui/primitives";
import { TargetText } from "@/components/target/target-text";
import { AudioButton } from "@/components/target/audio-button";
import { NoteRow } from "./hub";
import { cn } from "@/lib/utils";
import { pageNative } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

const EMPTY: Note[] = [];

function download(name: string, content: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ReviewNotesPage() {
  const pack = usePack();
  const sp = useSearchParams();
  const kind = sp.get("kind") as NoteCard["kind"] | null;
  const weekly = sp.get("weekly") === "1";
  const notes = useLiveQuery(() => db.notes.where("lang").equals(pack.id).filter((n) => n.status === "active").toArray(), [pack.id]) ?? EMPTY;
  const dueCount = useLiveQuery(() => db.noteCards.where("[lang+due]").below([pack.id, Date.now()]).filter((c) => !c.suspended && (!kind || c.kind === kind)).count(), [pack.id, kind]) ?? 0;
  const totalCards = useLiveQuery(() => db.noteCards.where("lang").equals(pack.id).count(), [pack.id]) ?? 0;
  const [session, setSession] = useState<NoteCard[] | null>(null);
  const [mode, setMode] = useState<"home" | "weekly">(weekly ? "weekly" : "home");

  const start = async () => {
    const q = await noteReviewQueue({ newLimit: 10, kinds: kind ? [kind] : undefined });
    setSession(q);
  };
  const stale = notes.filter((n) => !n.builtin && needsReview(n));

  if (session) return <CornellSession cards={session} onExit={() => setSession(null)} />;

  return (
    <div className="space-y-5">
      <Link href="/apuntes" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Apuntes
      </Link>
      <PageHeader
        title="Repasar mis apuntes"
        zh={pageNative("review")}
        subtitle="Modo Cornell: ves la pregunta y tapas la respuesta; FSRS decide cuándo volver a preguntártela. Y un repaso semanal guiado."
        action={
          <>
            <Button variant={mode === "weekly" ? "ink" : "outline"} onClick={() => setMode(mode === "weekly" ? "home" : "weekly")}>
              <Sparkles /> Repaso semanal
            </Button>
            <Button variant="ink" onClick={() => void start()} disabled={!totalCards}>
              <RefreshCw /> Modo Cornell{dueCount ? ` (${dueCount})` : ""}
            </Button>
          </>
        }
      />
      {mode === "weekly" ? (
        <WeeklyReview notes={notes} onStart={start} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Tarjetas de mis apuntes</p>
            <p className="font-serif-es text-3xl text-ink tabular">
              {dueCount} <span className="text-base text-ink-faint">pendientes de {totalCards}</span>
            </p>
            <p className="mt-1 text-xs text-ink-faint">Preguntas Cornell, frases minadas, huecos en los ejemplos y errores del 错题本. Crea más desde cualquier apunte con «Crear tarjetas y ejercicios».</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["cue", "phrase", "cloze", "error", "word"] as NoteCard["kind"][]).map((k) => (
                <Button key={k} size="sm" variant="secondary" asChild>
                  <Link href={`/apuntes/repasar?kind=${k}`}>{k === "cue" ? "preguntas" : k === "phrase" ? "frases" : k === "cloze" ? "huecos" : k === "error" ? "errores" : "palabras"}</Link>
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const cards = await db.noteCards.where("lang").equals(pack.id).toArray();
                  download("xueban-apuntes-anki.csv", noteCardsToCsv(cards, new Map(notes.map((n) => [n.id, n.title]))));
                }}
                disabled={!totalCards}
              >
                <Download /> Enviar a Anki (CSV)
              </Button>
            </div>
          </Card>
          <Card>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Apuntes sin repasar (más de 7 días)</p>
            {stale.length ? (
              <ul className="space-y-2">
                {stale.slice(0, 6).map((n) => (
                  <NoteRow key={n.id} n={n} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-faint">Todo al día. Abre un apunte y léelo en modo «Leer» para marcarlo como repasado.</p>
            )}
          </Card>
        </div>
      )}
      {!totalCards && !stale.length ? <EmptyState title="Nada que repasar todavía" description="Crea apuntes con preguntas clave o pulsa «Crear tarjetas y ejercicios» en un apunte." /> : null}
    </div>
  );
}

function WeeklyReview({ notes, onStart }: { notes: Note[]; onStart: () => void }) {
  const pack = usePack();
  const [week] = useState(() => Date.now() - 7 * 86400000);
  const added = notes.filter((n) => !n.builtin && n.createdAt > week);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof errorStats>> | null>(null);
  const forgotten = useLiveQuery(() => db.noteCards.where("lang").equals(pack.id).filter((c) => c.lapses >= 2).toArray(), [pack.id]) ?? [];
  useEffect(() => {
    void errorStats(pack.id).then(setStats);
  }, [pack.id, notes.length]);
  const [done, setDone] = useState<string[]>([]);
  const steps = [
    { id: "new", title: `Lo que añadí esta semana (${added.length})`, body: added.length ? <ul className="space-y-2">{added.slice(0, 8).map((n) => <NoteRow key={n.id} n={n} />)}</ul> : <p className="text-sm text-ink-faint">Nada nuevo esta semana.</p> },
    { id: "errors", title: `Mis errores más repetidos`, body: stats?.byRule.length || stats?.recent.length ? <ul className="space-y-1 text-sm">{(stats?.recent ?? []).slice(0, 6).map((e) => <li key={e.id} className="flex items-center gap-2"><span className="text-danger">❌</span><span lang={pack.bcp47} className={cn(pack.meta.cssClass, "line-through decoration-danger/60")}>{String(e.fields.mine)}</span><span>→</span><TargetText text={String(e.fields.correct)} size="sm" ruby={false} /></li>)}</ul> : <p className="text-sm text-ink-faint">Sin errores anotados. Haz ejercicios del cuaderno.</p> },
    { id: "forgot", title: `Lo que más olvido (${forgotten.length})`, body: forgotten.length ? <ul className="space-y-1 text-sm">{forgotten.slice(0, 8).map((c) => <li key={c.id} className="flex items-center gap-2"><Badge variant="muted">{c.lapses}× olvidada</Badge><span className="truncate"><Mixed>{c.front.split("\n")[0]}</Mixed></span></li>)}</ul> : <p className="text-sm text-ink-faint">Todavía no hay tarjetas olvidadas varias veces.</p> },
  ];
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <Card key={s.id} className={cn(done.includes(s.id) && "opacity-60")}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-serif-es text-lg text-ink">
              <span className="tabular mr-2 text-ink-faint">{i + 1}.</span>
              {s.title}
            </h3>
            <Button size="sm" variant={done.includes(s.id) ? "jade" : "ghost"} onClick={() => setDone((d) => (d.includes(s.id) ? d.filter((x) => x !== s.id) : [...d, s.id]))}>
              <Check /> {done.includes(s.id) ? "revisado" : "marcar"}
            </Button>
          </div>
          {s.body}
        </Card>
      ))}
      <Card className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-ink">Para terminar: una ronda del modo Cornell con lo pendiente.</p>
        <Button variant="ink" onClick={onStart}>
          <RefreshCw /> Empezar la ronda
        </Button>
      </Card>
    </div>
  );
}

function CornellSession({ cards, onExit }: { cards: NoteCard[]; onExit: () => void }) {
  const pack = usePack();
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const card = cards[idx];
  const note = useLiveQuery(() => (card ? db.notes.get(card.noteId) : undefined), [card?.noteId]);
  const kinds: Record<NoteCard["kind"], string> = { cue: "pregunta clave", phrase: "frase", cloze: "hueco", error: "error", word: "palabra" };

  const rate = async (g: 1 | 2 | 3 | 4) => {
    if (!card) return;
    await rateNoteCard(card, g);
    setResults((r) => [...r, g]);
    setShown(false);
    setIdx((i) => i + 1);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!shown) setShown(true);
        else void rate(3);
      }
      if (shown && ["1", "2", "3", "4"].includes(e.key)) void rate(Number(e.key) as 1 | 2 | 3 | 4);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, card?.id]);

  const isTarget = (s: string) => pack.hasTargetText(s);

  if (!card) {
    const good = results.filter((r) => r >= 3).length;
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState title={results.length ? "Ronda terminada" : "No hay tarjetas pendientes"} zh={{ zh: "温故而知新。", py: "Wēn gù ér zhī xīn.", es: "Repasar lo viejo para conocer lo nuevo." }} description={results.length ? `${good} de ${results.length} recordadas. Las difíciles volverán pronto.` : "Vuelve mañana o crea tarjetas desde tus apuntes."} action={<Button variant="ink" onClick={onExit}>Volver</Button>} />
      </div>
    );
  }
  const back = card.back;
  const notePath = `/apuntes/${encodeURIComponent(card.noteId)}`;
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-2xl flex-col">
      <div className="mb-2 flex items-center justify-between text-xs text-ink-faint">
        <button type="button" onClick={onExit} className="inline-flex items-center gap-1 hover:text-ink">
          <X className="size-4" /> Salir
        </button>
        <span className="tabular">
          {idx + 1} / {cards.length}
        </span>
      </div>
      <Progress value={(idx / cards.length) * 100} className="mb-5 h-1.5" />
      <div className="grid flex-1 gap-3 md:grid-cols-[1fr_1.2fr]">
        <section className="cornell-cue card-paper p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {kinds[card.kind]} {note ? <>· <Link href={notePath} className="normal-case tracking-normal text-indigo underline-offset-2 hover:underline"><Mixed>{note.title}</Mixed></Link></> : null}
          </p>
          <div className="font-serif-es text-xl leading-snug text-ink">
            {card.front.split("\n").map((l, i) => (
              <p key={i} className={cn(i > 0 && "mt-1 text-base text-ink-soft")}>{isTarget(l) ? <TargetText text={l} size="lg" interactive={false} /> : <Mixed>{l}</Mixed>}</p>
            ))}
          </div>
        </section>
        <section className="card-paper relative p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Respuesta</p>
          <div className={cn("text-lg text-ink", !shown && "cornell-hidden")} aria-hidden={!shown}>
            {isTarget(back) ? (
              <div className="flex items-start gap-2">
                <AudioButton text={back} size="sm" className="mt-1" />
                <TargetText text={back} size="lg" pinyinLine={card.hint && !isTarget(card.hint) && /[āáǎàēéěèīíǐìōóǒòūúǔùü]/.test(card.hint) ? card.hint : undefined} as="div" />
              </div>
            ) : (
              <Mixed>{back}</Mixed>
            )}
            {card.hint && !/[āáǎàēéěèīíǐìōóǒòūúǔùü]/.test(card.hint) ? <p className="mt-2 text-sm text-ink-soft"><Mixed>{card.hint}</Mixed></p> : null}
          </div>
          {!shown ? (
            <button type="button" onClick={() => setShown(true)} className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-card)] text-sm text-ink-soft" aria-label="Mostrar respuesta">
              <span className="inline-flex items-center gap-1 rounded-full bg-paper-raised/90 px-3 py-1 shadow-[var(--shadow-paper)]">
                <Eye className="size-4" /> Intenta recordarla y pulsa <Kbd>Espacio</Kbd>
              </span>
            </button>
          ) : null}
        </section>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {(
          [
            [Rating.Again, "Otra vez", "text-danger"],
            [Rating.Hard, "Difícil", "text-gold-ink"],
            [Rating.Good, "Bien", "text-celadon-ink"],
            [Rating.Easy, "Fácil", "text-indigo"],
          ] as [1 | 2 | 3 | 4, string, string][]
        ).map(([g, label, cls], i) => (
          <Button key={g} variant="secondary" size="lg" disabled={!shown} onClick={() => void rate(g)} className={cn("flex-col gap-0 py-6", cls)}>
            <span>{label}</span>
            <Kbd className="mt-1">{i + 1}</Kbd>
          </Button>
        ))}
      </div>
      {note && shown ? (
        <button type="button" onClick={() => void markReviewed(note.id)} className="mt-3 self-center text-xs text-ink-faint hover:text-ink">
          marcar el apunte «{note.title}» como repasado
        </button>
      ) : null}
    </div>
  );
}
