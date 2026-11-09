"use client";
/**
 * Apuntes → Clases (solo chino): «Mis clases», línea temporal de las clases importadas (y las escritas a mano) con
 * su progreso, buscador en todas las clases («¿en qué clase explicó 了?») y acceso a Importar.
 * En japonés y coreano (y con ?vista=cuaderno) se muestra el cuaderno de clase manual de siempre.
 */
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Download, NotebookPen, Search } from "lucide-react";
import Link from "@/lib/languages/link";
import { db, type ExerciseItem, type Note } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { searchClasses, clipAssetId, ddmm, type ClassHitKind } from "@/lib/classes/search";
import type { ClassPackage } from "@/lib/classes/package-schema";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Input, PageHeader, Progress } from "@/components/ui/primitives";
import { Mixed } from "@/components/target/mixed";
import { ClassNotebook } from "@/components/study-hall/class-notebook";
import { ClipButton } from "./clip-button";
import { classPackageOf } from "./class-note-view";

const EMPTY_NOTES: Note[] = [];
const EMPTY_ITEMS: ExerciseItem[] = [];

const KIND_LABEL: Record<ClassHitKind, string> = { grammar: "Estructura", tip: "Truco", exercise: "Ejercicio", doubt: "Duda", vocab: "Palabra", phrase: "Frase", topic: "Tema", summary: "Resumen" };

export function ClassesRoute() {
  const pack = usePack();
  const sp = useSearchParams();
  if (pack.id !== "zh" || sp.get("vista") === "cuaderno") return <ClassNotebook />;
  return <ClassesPage />;
}

function dateParts(d: string) {
  const date = new Date(`${d}T12:00:00`);
  return {
    day: date.toLocaleDateString("es-ES", { day: "numeric" }),
    month: date.toLocaleDateString("es-ES", { month: "short" }).replace(".", ""),
    weekday: date.toLocaleDateString("es-ES", { weekday: "long" }),
    year: date.getFullYear(),
  };
}

export function ClassesPage() {
  const notes = useLiveQuery(() => db.notes.where("[lang+kind]").equals(["zh", "class"]).toArray(), []) ?? EMPTY_NOTES;
  const items = useLiveQuery(() => db.exerciseItems.where("origin").equals("class").toArray(), []) ?? EMPTY_ITEMS;
  const [q, setQ] = useState("");

  // orden del temario (syllabusOrder) si lo tienen las dos; si no, por fecha. La más reciente arriba.
  const classes = useMemo(
    () =>
      [...notes].sort((a, b) => {
        const oa = classPackageOf(a)?.syllabusOrder;
        const ob = classPackageOf(b)?.syllabusOrder;
        if (oa !== undefined && ob !== undefined && oa !== ob) return ob - oa;
        return (b.classDate ?? "").localeCompare(a.classDate ?? "") || b.createdAt - a.createdAt;
      }),
    [notes],
  );
  const byNote = useMemo(() => {
    const m = new Map<string, { total: number; done: number; low: number }>();
    for (const it of items) {
      const c = m.get(it.classNoteId ?? "") ?? { total: 0, done: 0, low: 0 };
      c.total++;
      if (it.attempts > 0) c.done++;
      if (it.confidence === "baja" && !it.confirmed) c.low++;
      m.set(it.classNoteId ?? "", c);
    }
    return m;
  }, [items]);
  const imported = useMemo(() => classes.flatMap((n) => (classPackageOf(n) ? [{ noteId: n.id, pkg: classPackageOf(n) as ClassPackage }] : [])), [classes]);
  const hits = useMemo(() => (q.trim() ? searchClasses(imported, q) : []), [imported, q]);

  return (
    <div className="space-y-4">
      <Link href="/apuntes" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Apuntes
      </Link>
      <PageHeader
        title="Mis clases"
        zh="课堂"
        subtitle="Cada clase grabada se convierte en un apunte con su vocabulario, sus estructuras, los ejercicios que corrigió el profesor y su voz en recortes cortos."
        action={
          <>
            <Button variant="ghost" asChild>
              <Link href="/apuntes/clases?vista=cuaderno">
                <NotebookPen /> Cuaderno a mano
              </Link>
            </Button>
            <Button variant="ink" asChild>
              <Link href="/apuntes/clases/importar">
                <Download /> Importar
              </Link>
            </Button>
          </>
        }
      />

      {imported.length ? (
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca en todas las clases: ¿en qué clase explicó 了?" className="pl-9" aria-label="Buscar en todas las clases" />
        </label>
      ) : null}

      {q.trim() ? (
        <section aria-label="Resultados" className="space-y-2">
          <p className="text-xs text-ink-faint">{hits.length ? `${hits.length} resultado${hits.length > 1 ? "s" : ""}` : "Nada en tus clases con esas palabras."}</p>
          <ul className="space-y-2">
            {hits.map((h, i) => {
              const d = dateParts(h.classDate);
              return (
                <li key={i} className="card-paper flex items-start gap-3 p-3">
                  <Link href={`/apuntes/${encodeURIComponent(h.noteId)}`} className="tabular w-12 shrink-0 text-center leading-tight text-ink hover:text-cinnabar-ink">
                    <span className="block font-serif-es text-xl">{d.day}</span>
                    <span className="block text-[11px] uppercase text-ink-faint">{d.month}</span>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-faint">
                      <Badge variant="outline">{KIND_LABEL[h.kind]}</Badge>
                      <Link href={`/apuntes/${encodeURIComponent(h.noteId)}`} className="truncate hover:underline"><Mixed>{h.title}</Mixed></Link>
                    </p>
                    <p className="line-clamp-3 text-sm text-ink"><Mixed>{h.text}</Mixed></p>
                  </div>
                  <ClipButton assetId={h.clip ? clipAssetId(h.noteId, h.clip) : undefined} t={h.t} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : classes.length ? (
        <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[1.45rem] before:top-2 before:w-px before:bg-line sm:before:left-[1.95rem]" aria-label="Línea temporal de clases">
          {classes.map((n) => {
            const pkg = classPackageOf(n);
            const d = dateParts(n.classDate ?? new Date(n.createdAt).toISOString().slice(0, 10));
            const c = byNote.get(n.id) ?? { total: 0, done: 0, low: 0 };
            return (
              <li key={n.id} className="relative flex gap-3 sm:gap-4">
                <div className="tabular relative z-[1] flex w-12 shrink-0 self-start flex-col items-center rounded-[10px] border border-line bg-paper-raised py-1.5 leading-tight sm:w-16">
                  <span className="font-serif-es text-xl text-ink sm:text-2xl">{d.day}</span>
                  <span className="text-[11px] uppercase tracking-wide text-cinnabar-ink">{d.month}</span>
                </div>
                <Link href={`/apuntes/${encodeURIComponent(n.id)}`} className="card-paper block min-w-0 flex-1 p-3 transition-[transform,box-shadow] duration-[var(--dur-ui)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] sm:p-4">
                  <span className="mb-0.5 block text-[11px] capitalize text-ink-faint">
                    {d.weekday} · {d.year}
                    {pkg?.teacher ? ` · ${pkg.teacher}` : ""}
                  </span>
                  <span className="block font-serif-es text-lg font-semibold leading-snug text-ink"><Mixed>{n.title}</Mixed></span>
                  {pkg ? <span className="mt-1 line-clamp-2 text-sm text-ink-soft"><Mixed>{pkg.summary}</Mixed></span> : <span className="mt-1 block text-xs text-ink-faint">Escrita a mano en el cuaderno de clase.</span>}
                  <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {pkg?.group === "otro" ? <Badge variant="gold">de otro grupo{pkg.coversDate ? ` · cubre tu clase del ${ddmm(pkg.coversDate)}` : ""}</Badge> : null}
                    {pkg?.syllabusOrder ? <Badge variant="outline">tema {pkg.syllabusOrder}</Badge> : null}
                    <Badge variant="default">{n.wordIds.length} palabras</Badge>
                    {c.total ? <Badge variant="default">{c.total} ejercicios</Badge> : null}
                    {pkg?.grammar.length ? <Badge variant="default">{pkg.grammar.length} estructuras</Badge> : null}
                    {c.low ? <Badge variant="gold">{c.low} por revisar</Badge> : null}
                  </span>
                  {c.total ? (
                    <span className="mt-2 flex items-center gap-2 text-[11px] text-ink-faint">
                      <Progress value={(c.done / c.total) * 100} className="h-1 flex-1" label="Ejercicios practicados" />
                      <span className="tabular">{c.done}/{c.total} practicados</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState
          icon={<NotebookPen />}
          title="Aún no hay clases"
          zh={{ zh: "学而时习之。", py: "Xué ér shí xí zhī.", es: "Aprender y repasarlo a su tiempo." }}
          description="Importa el paquete de una clase grabada (el .json y sus recortes .opus) o escribe tus apuntes a mano en el cuaderno de clase."
          action={
            <Button variant="ink" asChild>
              <Link href="/apuntes/clases/importar">
                <Download /> Importar una clase
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
