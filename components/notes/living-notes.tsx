"use client";
/**
 * Apuntes vivos (/apuntes/vivos?n=<id>): un apunte por tema que crece con el temario.
 *  - Índice: cada tema con su progreso (secciones desbloqueadas / total) y su línea de evolución.
 *  - Apunte: secciones en orden de temario; las bloqueadas se ven difuminadas como adelanto («se desbloquea en U18»).
 *  - «Mías»: secciones, ejemplos y notas del profesor del usuario, guardadas aparte (nunca se sobrescriben).
 *  - Imprimible (estilo de la app, clases xb-print / xb-no-print).
 */
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useSearchParams } from "next/navigation";
import Link from "@/lib/languages/link";
import { ArrowLeft, Lock, PenLine, Plus, Printer, Sprout, Trash2 } from "lucide-react";
import { db, type LessonProgress } from "@/lib/db";
import { getActiveLang } from "@/lib/languages/registry";
import {
  isUnlocked,
  mergeAdditions,
  noteStatus,
  orderedSections,
  growthTimeline,
  unlockLabel,
  type LivingNote,
  type LivingSection,
  type UserAddition,
} from "@/lib/notes/living-model";
import {
  deleteLivingAdd,
  loadLivingNotes,
  modelSentences,
  saveLivingAdd,
  type ModelSentence,
} from "@/lib/notes/living";
import { lessonById } from "@/lib/course";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, PageHeader, Progress, Textarea } from "@/components/ui/primitives";
import { AudioButton } from "@/components/target/audio-button";
import { Reading } from "@/components/target/reading";
import { Mixed } from "@/components/target/mixed";
import { Markdown } from "@/components/learn/markdown";
import { SentenceSkeleton } from "@/components/learn/sentence-skeleton";
import { cn } from "@/lib/utils";

function useProgress(): Map<string, LessonProgress> {
  const rows = useLiveQuery(
    () => db.lessonProgress.where("lang").equals(getActiveLang()).toArray(),
    [],
  );
  return useMemo(() => new Map((rows ?? []).map((r) => [r.lessonId, r])), [rows]);
}

export function LivingNotesPage() {
  const params = useSearchParams();
  const selected = params.get("n");
  const [notes, setNotes] = useState<LivingNote[] | null>(null);
  const progress = useProgress();
  useEffect(() => {
    void loadLivingNotes(getActiveLang()).then((n) =>
      setNotes([...n].sort((a, b) => a.order - b.order)),
    );
  }, []);
  const note = notes?.find((n) => n.id === selected);
  if (selected === "frases-modelo") return <ModelSentencesView />;
  if (note) return <LivingNoteView note={note} progress={progress} />;
  return (
    <div className="xb-print">
      <PageHeader
        title="Apuntes vivos"
        zh="活笔记"
        subtitle="Un apunte por tema que crece a medida que avanzas en el temario. Lo que añadas tú se guarda aparte y nunca se pierde."
      />
      {!notes ? <p className="text-ink-faint text-sm">Cargando…</p> : null}
      {notes && !notes.length ? (
        <Card className="text-ink-soft text-sm">
          Todavía no hay apuntes vivos para este idioma.
        </Card>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notes?.map((n) => {
          const st = noteStatus(n, progress);
          return (
            <li key={n.id}>
              <Link
                href={`/apuntes/vivos?n=${n.id}`}
                className="card-paper hover:border-ink/40 flex h-full flex-col gap-2 p-4"
              >
                <span className="flex items-baseline gap-2">
                  <span className="font-serif-es text-ink text-lg font-semibold">
                    <Mixed>{n.title}</Mixed>
                  </span>
                  {n.zh ? (
                    <span lang="zh-CN" className="zh-kai text-cinnabar">
                      {n.zh}
                    </span>
                  ) : null}
                </span>
                <span className="text-ink-soft line-clamp-2 text-xs">
                  <Mixed>{n.summary}</Mixed>
                </span>
                <span className="mt-auto">
                  <Progress
                    value={st.total ? (st.unlocked / st.total) * 100 : 0}
                    className="h-1.5"
                  />
                  <span className="text-ink-faint mt-1 block text-[11px]">
                    {st.unlocked} / {st.total} secciones
                    {st.next ? ` · siguiente en ${unlockLabel(st.next.unlockedBy)}` : " · completo"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/apuntes/vivos?n=frases-modelo"
            className="card-paper border-gold/50 hover:border-ink/40 flex h-full flex-col gap-2 p-4"
          >
            <span className="font-serif-es text-ink text-lg font-semibold">Mis frases modelo</span>
            <span className="text-ink-soft text-xs">
              Las frases completas que has construido en «Construye la frase», de la más sencilla a
              la más larga.
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

function ModelSentencesView() {
  const [list, setList] = useState<ModelSentence[] | null>(null);
  useEffect(() => {
    void modelSentences(getActiveLang()).then(setList);
  }, []);
  return (
    <div className="xb-print mx-auto max-w-3xl">
      <div className="xb-no-print mb-3 flex gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/apuntes/vivos">
            <ArrowLeft /> Apuntes vivos
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer /> Imprimir / PDF
        </Button>
      </div>
      <PageHeader
        title="Mis frases modelo"
        zh="我的例句"
        subtitle="Cada frase que construyes bien se guarda aquí, ordenada por complejidad (número de huecos del esqueleto)."
      />
      {!list ? <p className="text-ink-faint text-sm">Cargando…</p> : null}
      {list && !list.length ? (
        <Card className="text-ink-soft text-sm">
          Aún no hay frases: aparecerán al completar «Construye la frase» en las lecciones.
        </Card>
      ) : null}
      <ol className="space-y-2">
        {list?.map((s) => (
          <li key={s.zh} className="card-paper flex items-start gap-2 p-3">
            <AudioButton text={s.zh} size="sm" />
            <span className="min-w-0">
              <span lang="zh-CN" className="zh text-ink block text-lg">
                {s.zh}
              </span>
              <span className="text-ink-soft block text-xs">{s.es}</span>
            </span>
            <Badge variant="muted" className="ml-auto shrink-0">
              {s.slots} huecos · {unlockLabel(s.lessonId)}
            </Badge>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LivingNoteView({
  note,
  progress,
}: {
  note: LivingNote;
  progress: Map<string, LessonProgress>;
}) {
  const lang = getActiveLang();
  const adds =
    useLiveQuery(
      () => db.livingNoteAdds.where("[lang+noteId]").equals([lang, note.id]).toArray(),
      [note.id],
    ) ?? [];
  const [preview, setPreview] = useState(true);
  const [adding, setAdding] = useState<{ after?: string } | null>(null);
  const ordered = useMemo(() => orderedSections(note), [note]);
  const visible = preview ? ordered : ordered.filter((s) => isUnlocked(s, progress));
  const merged = mergeAdditions(visible, adds);
  const timeline = growthTimeline(note);
  const st = noteStatus(note, progress);
  return (
    <div className="xb-print mx-auto max-w-3xl">
      <div className="xb-no-print mb-3 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/apuntes/vivos">
            <ArrowLeft /> Apuntes vivos
          </Link>
        </Button>
        <span className="ml-auto flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreview((v) => !v)}
            aria-pressed={preview}
          >
            <Lock /> {preview ? "Ocultar bloqueadas" : "Ver bloqueadas"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer /> Imprimir / PDF
          </Button>
        </span>
      </div>
      <PageHeader
        title={<Mixed>{note.title}</Mixed>}
        zh={note.zh}
        subtitle={<Mixed>{note.summary}</Mixed>}
      />
      <div className="border-line bg-paper-raised text-ink-soft mb-5 rounded-[10px] border px-3 py-2 text-xs">
        <Sprout className="text-celadon-ink mr-1 inline size-3.5" />
        Este apunte creció en {timeline.join(", ")}. Tienes {st.unlocked} de {st.total} secciones.
        {!note.reviewed ? (
          <Badge variant="muted" className="ml-2">
            pendiente de revisar con tu profesor
          </Badge>
        ) : null}
      </div>
      <div className="space-y-4">
        {merged.map((m) =>
          m.type === "base" ? (
            <SectionCard
              key={m.section.id}
              section={m.section}
              unlocked={isUnlocked(m.section, progress)}
              onAdd={() => setAdding({ after: m.section.id })}
            />
          ) : (
            <MineCard key={m.add.id} add={m.add} />
          ),
        )}
      </div>
      <div className="xb-no-print mt-6">
        {adding ? (
          <AddForm noteId={note.id} after={adding.after} onDone={() => setAdding(null)} />
        ) : (
          <Button variant="outline" onClick={() => setAdding({})}>
            <Plus /> Añadir una sección mía
          </Button>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  section,
  unlocked,
  onAdd,
}: {
  section: LivingSection;
  unlocked: boolean;
  onAdd: () => void;
}) {
  const lesson = lessonById(section.unlockedBy);
  const label = unlockLabel(section.unlockedBy);
  return (
    <section
      id={section.id}
      className={cn("card-paper relative scroll-mt-20 p-4", !unlocked && "xb-no-print")}
    >
      <header className="mb-2 flex flex-wrap items-baseline gap-2">
        <Badge variant={unlocked ? "jade" : "muted"}>{label}</Badge>
        <h2 className="font-serif-es text-ink text-lg font-semibold">
          <Mixed>{section.title}</Mixed>
        </h2>
        {unlocked ? (
          <Button
            variant="ghost"
            size="sm"
            className="xb-no-print ml-auto"
            onClick={onAdd}
            aria-label="Añadir algo mío después de esta sección"
          >
            <PenLine /> Añadir
          </Button>
        ) : null}
      </header>
      <div
        className={cn(!unlocked && "pointer-events-none blur-[3px] saturate-50 select-none")}
        aria-hidden={!unlocked}
      >
        <Markdown>{section.markdown}</Markdown>
        {section.skeleton ? (
          <SentenceSkeleton
            sentences={section.skeleton.sentences}
            focus={section.skeleton.focus}
            at={section.unlockedBy}
            className="mt-3"
          />
        ) : null}
        {section.examples?.length ? (
          <ul className="mt-3 space-y-1.5">
            {section.examples.map((e, i) => (
              <li key={i} className="flex items-start gap-2">
                <AudioButton text={e.zh} size="sm" />
                <span>
                  <span lang="zh-CN" className="zh text-ink text-base">
                    {e.zh}
                  </span>
                  {e.py ? <Reading text={e.py} className="ml-2 text-xs" /> : null}
                  <span className="text-ink-soft block text-xs">{e.es}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {!unlocked ? (
        <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-center">
          <span className="border-line bg-paper-raised text-ink-soft flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm shadow-[var(--shadow-paper)]">
            <Lock className="size-3.5" /> se desbloquea en {label}
            {lesson ? <span className="text-ink-faint">· «{lesson.lesson.title}»</span> : null}
          </span>
        </div>
      ) : null}
    </section>
  );
}

const KIND_LABEL: Record<UserAddition["kind"], string> = {
  section: "sección mía",
  example: "ejemplo mío",
  teacher: "nota del profesor",
};

function MineCard({ add }: { add: UserAddition }) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return <AddForm noteId={add.noteId} existing={add} onDone={() => setEditing(false)} />;
  return (
    <section className="border-gold/60 bg-gold/5 relative rounded-[12px] border p-4">
      <header className="mb-1 flex flex-wrap items-baseline gap-2">
        <Badge variant="gold">{KIND_LABEL[add.kind]}</Badge>
        {add.title ? (
          <h3 className="font-serif-es text-ink text-base font-semibold">
            <Mixed>{add.title}</Mixed>
          </h3>
        ) : null}
        <span className="xb-no-print ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
            aria-label="Editar"
          >
            <PenLine />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void deleteLivingAdd(add.id)}
            aria-label="Borrar"
          >
            <Trash2 />
          </Button>
        </span>
      </header>
      <Markdown>{add.markdown}</Markdown>
    </section>
  );
}

function AddForm({
  noteId,
  after,
  existing,
  onDone,
}: {
  noteId: string;
  after?: string;
  existing?: UserAddition;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<UserAddition["kind"]>(existing?.kind ?? "section");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [md, setMd] = useState(existing?.markdown ?? "");
  const save = async () => {
    if (!md.trim()) return;
    await saveLivingAdd(getActiveLang(), {
      id: existing?.id,
      noteId,
      afterSectionId: existing?.afterSectionId ?? after,
      kind,
      title: title.trim() || undefined,
      markdown: md,
    });
    onDone();
  };
  return (
    <Card className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo">
        {(Object.keys(KIND_LABEL) as UserAddition["kind"][]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs",
              kind === k ? "border-ink bg-ink text-paper" : "border-line text-ink-soft",
            )}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (opcional)"
        aria-label="Título"
      />
      <Textarea
        value={md}
        onChange={(e) => setMd(e.target.value)}
        placeholder="Escribe en Markdown: 我很忙 → «estoy muy ocupado»…"
        aria-label="Contenido"
        rows={5}
      />
      <div className="flex gap-2">
        <Button onClick={() => void save()} disabled={!md.trim()}>
          Guardar
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
