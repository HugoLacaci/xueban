"use client";
/**
 * Sección Apuntes 笔记: cabecera con accesos (bandeja, cuaderno de ejercicios, errores, repasar, clases, guía),
 * búsqueda total, vistas (recientes, fijados, por tipo, por unidad, por etiqueta, por nivel, necesitan repaso,
 * apuntes del profesor) y lista de apuntes.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  BookOpenCheck,
  Inbox,
  Lightbulb,
  NotebookPen,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Sprout,
  Waypoints,
  GraduationCap,
  Dumbbell,
} from "lucide-react";
import Link from "@/lib/languages/link";
import { useLangRouter } from "@/lib/languages/link";
import { db, type Note, type NoteType } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { useSettings } from "@/lib/settings";
import { needsReview } from "@/lib/notes/repo";
import { NOTE_TYPES, templateFor } from "@/lib/notes/templates";
import { buildIndex, searchNotes } from "@/lib/notes/search";
import { ensureZhBuiltinNotes } from "@/lib/notes/builtin";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Input, PageHeader } from "@/components/ui/primitives";
import { FilterChip } from "@/components/study-hall/filter-chip";
import { TargetText } from "@/components/target/target-text";
import { NoteTypeBadge } from "./type-badge";
import { openNewNote } from "./new-note-dialog";
import { openQuickCapture } from "./quick-capture";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { pageNative } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

const EMPTY: Note[] = [];
type View =
  "recent" | "pinned" | "review" | "teacher" | "type" | "unit" | "tag" | "level" | "archived";

function Snippet({ n }: { n: Note }) {
  const pack = usePack();
  const text = (n.summary || n.markdown || "")
    .replace(/[#*>`\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
  if (!text) return null;
  return (
    <p className="text-ink-faint line-clamp-2 text-xs">
      {pack.hasTargetText(text) ? (
        <TargetText text={text} size="sm" ruby={false} interactive={false} markUnknown={false} />
      ) : (
        <Mixed>{text}</Mixed>
      )}
    </p>
  );
}

export function NoteRow({ n }: { n: Note }) {
  const pack = usePack();
  const stale = needsReview(n) && !n.builtin;
  return (
    <li>
      <Link
        href={`/apuntes/${encodeURIComponent(n.id)}`}
        className="group border-line bg-paper-raised/70 flex gap-3 rounded-[10px] border p-3 transition-[transform,box-shadow] duration-[var(--dur-ui)] hover:-translate-y-px hover:shadow-[var(--shadow-float)]"
      >
        <span
          lang="zh-CN"
          className="zh-serif bg-paper-sunk text-cinnabar mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[8px] text-lg leading-none"
          aria-hidden="true"
        >
          {templateFor(n.type).native}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-ink group-hover:decoration-ink/30 font-medium group-hover:underline group-hover:underline-offset-4">
              {pack.hasTargetText(n.title) ? (
                <TargetText
                  text={n.title}
                  size="sm"
                  ruby={false}
                  interactive={false}
                  markUnknown={false}
                />
              ) : (
                <Mixed>{n.title}</Mixed>
              )}
            </span>
            {n.pinned ? <Pin className="text-gold-ink size-3" aria-label="fijado" /> : null}
            {n.builtin ? <Badge variant="gold">profesor</Badge> : null}
            {n.status === "inbox" ? <Badge variant="lacquer">bandeja</Badge> : null}
            {stale ? <Badge variant="muted">sin repasar</Badge> : null}
          </span>
          <Snippet n={n} />
          <span className="text-ink-faint mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span>{templateFor(n.type).name}</span>
            {n.level ? <span>· HSK {n.level}</span> : null}
            {n.tags.slice(0, 4).map((t) => (
              <span key={t} className="bg-paper-sunk rounded-full px-1.5">
                #<Mixed>{t}</Mixed>
              </span>
            ))}
            <span className="tabular ml-auto">{formatDate(n.updatedAt)}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

export function NotesHub() {
  const pack = usePack();
  const sp = useSearchParams();
  const router = useLangRouter();
  const notes =
    useLiveQuery(() => db.notes.where("lang").equals(pack.id).toArray(), [pack.id]) ?? EMPTY;
  const inbox = notes.filter((n) => n.status === "inbox").length;
  const dueCards =
    useLiveQuery(
      () =>
        db.noteCards
          .where("[lang+due]")
          .below([pack.id, Date.now()])
          .filter((c) => !c.suspended)
          .count(),
      [pack.id],
    ) ?? 0;
  const errors =
    useLiveQuery(
      () => db.notes.where("[lang+type]").equals([pack.id, "error"]).count(),
      [pack.id],
    ) ?? 0;
  const workbook =
    useLiveQuery(() => db.exerciseItems.where("lang").equals(pack.id).count(), [pack.id]) ?? 0;
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [view, setView] = useState<View>(
    (sp.get("tag") ? "tag" : sp.get("type") ? "type" : "recent") as View,
  );
  const [type, setType] = useState<NoteType | "">((sp.get("type") as NoteType) ?? "");
  const [tag, setTag] = useState(sp.get("tag") ?? "");
  const [unit, setUnit] = useState("");
  const [level, setLevel] = useState("");
  const tourDone = useSettings((s) => s.settings.notesTourDone);

  // compendios del profesor (idempotente; solo chino)
  useEffect(() => {
    if (pack.id === "zh") void ensureZhBuiltinNotes();
  }, [pack.id]);

  // ?nuevo=título (desde un [[enlace]] a un apunte que no existe)
  useEffect(() => {
    const nuevo = sp.get("nuevo");
    if (nuevo) {
      openNewNote({ title: nuevo });
      router.replace("/apuntes");
    }
  }, [sp, router]);

  const index = useMemo(() => buildIndex(notes), [notes]);
  const tags = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) for (const t of n.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);
  const units = pack.curriculum.units;

  const visible = useMemo(() => {
    let list = notes.filter((n) => n.status !== "archived" || view === "archived");
    if (q.trim()) {
      const ids = searchNotes(index, q);
      const order = new Map(ids.map((id, i) => [id, i]));
      list = list
        .filter((n) => order.has(n.id))
        .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
      return list;
    }
    switch (view) {
      case "pinned":
        list = list.filter((n) => n.pinned);
        break;
      case "review":
        list = list.filter((n) => needsReview(n) && !n.builtin);
        break;
      case "teacher":
        list = list.filter((n) => n.builtin);
        break;
      case "type":
        list = type ? list.filter((n) => n.type === type) : list;
        break;
      case "unit":
        list = unit ? list.filter((n) => n.unitId === unit) : list.filter((n) => n.unitId);
        break;
      case "tag":
        list = tag ? list.filter((n) => n.tags.includes(tag)) : list;
        break;
      case "level":
        list = level
          ? list.filter((n) => String(n.level ?? "") === level)
          : list.filter((n) => n.level);
        break;
      case "archived":
        list = list.filter((n) => n.status === "archived");
        break;
      default:
        list = list.filter((n) => !n.builtin || n.pinned);
    }
    return list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  }, [notes, q, index, view, type, unit, tag, level]);

  const own = notes.filter((n) => !n.builtin).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Apuntes"
        zh={pageNative("notes")}
        subtitle="Una idea por apunte, siempre con ejemplos, convertida en preguntas para recordar. Captura en clase, procesa después y repasa con espaciado."
        action={
          <>
            <Button variant="outline" onClick={() => openQuickCapture()}>
              <Inbox /> Captura rápida{" "}
              <kbd className="border-line ml-1 rounded border px-1 text-[10px]">N</kbd>
            </Button>
            <Button variant="ink" onClick={() => openNewNote()}>
              <Plus /> Nuevo apunte
            </Button>
          </>
        }
      />

      {!tourDone ? (
        <Card className="border-gold/40 bg-gold/8 flex flex-wrap items-center gap-3">
          <Lightbulb className="text-gold-ink size-5 shrink-0" />
          <p className="text-ink min-w-0 flex-1 text-sm">
            <strong>¿Primera vez?</strong> La app te enseña a tomar apuntes de chino en 2 minutos:
            el flujo en 3 tiempos, el método Cornell y el cuaderno de errores.
          </p>
          <Button asChild variant="default" size="sm">
            <Link href="/apuntes/guia">Ver la guía y el tour</Link>
          </Button>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Shortcut
          href="/apuntes/vivos"
          icon={<Sprout />}
          zh="活笔记"
          title="Apuntes vivos"
          sub="crecen con el temario"
        />
        <Shortcut
          href="/apuntes/bandeja"
          icon={<Inbox />}
          zh="收集箱"
          title="Bandeja"
          sub={inbox ? `${inbox} por procesar` : "vacía"}
          hot={inbox > 0}
        />
        <Shortcut
          href="/apuntes/cuaderno"
          icon={<Dumbbell />}
          zh="练习本"
          title="Ejercicios del cuaderno"
          sub={workbook ? `${workbook} frases` : "importa tus frases"}
        />
        <Shortcut
          href="/apuntes/errores"
          icon={<AlertTriangle />}
          zh="错题本"
          title="Cuaderno de errores"
          sub={errors ? `${errors} errores` : "sin errores aún"}
        />
        <Shortcut
          href="/apuntes/repasar"
          icon={<RefreshCw />}
          zh="复习"
          title="Repasar"
          sub={dueCards ? `${dueCards} preguntas pendientes` : "modo Cornell y semanal"}
          hot={dueCards > 0}
        />
        <Shortcut
          href="/apuntes/clases"
          icon={<NotebookPen />}
          zh="课堂"
          title="Cuaderno de clase"
          sub="una página por clase"
        />
        <Shortcut
          href="/apuntes/profesor"
          icon={<GraduationCap />}
          zh="老师"
          title="Apuntes del profesor"
          sub="gramática, preguntas, partículas…"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="text-ink-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por hanzi, pinyin (con o sin tonos), español, etiqueta…"
            className="pl-9"
            aria-label="Buscar apuntes"
          />
        </label>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/apuntes/grafo">
            <Waypoints /> Grafo
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/apuntes/guia">
            <BookOpenCheck /> Cómo tomar apuntes
          </Link>
        </Button>
      </div>

      {!q.trim() ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Vista">
            {(
              [
                ["recent", "Recientes"],
                ["pinned", "Fijados"],
                ["review", "Necesitan repaso"],
                ["type", "Por tipo"],
                ["unit", "Por unidad"],
                ["tag", "Por etiqueta"],
                ["level", "Por nivel"],
                ["teacher", "Del profesor"],
                ["archived", "Archivados"],
              ] as [View, string][]
            ).map(([v, label]) => (
              <FilterChip key={v} active={view === v} onClick={() => setView(v)}>
                {label}
              </FilterChip>
            ))}
          </div>
          {view === "type" ? (
            <div className="flex flex-wrap gap-1.5">
              {NOTE_TYPES.map((t) => (
                <FilterChip
                  key={t}
                  active={type === t}
                  onClick={() => setType(type === t ? "" : t)}
                >
                  <span lang="zh-CN" className="zh-serif text-cinnabar mr-1">
                    {templateFor(t).native}
                  </span>
                  {templateFor(t).name}
                </FilterChip>
              ))}
            </div>
          ) : null}
          {view === "unit" ? (
            <div className="flex flex-wrap gap-1.5">
              {units.map((u) => (
                <FilterChip
                  key={u.id}
                  active={unit === u.id}
                  onClick={() => setUnit(unit === u.id ? "" : u.id)}
                >
                  {u.title}
                </FilterChip>
              ))}
            </div>
          ) : null}
          {view === "tag" ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 40).map(([t, c]) => (
                <FilterChip key={t} active={tag === t} onClick={() => setTag(tag === t ? "" : t)}>
                  #{t} <span className="text-ink-faint ml-1">{c}</span>
                </FilterChip>
              ))}
              {!tags.length ? (
                <p className="text-ink-faint text-xs">
                  Aún no hay etiquetas: escribe #tema en un apunte.
                </p>
              ) : null}
            </div>
          ) : null}
          {view === "level" ? (
            <div className="flex flex-wrap gap-1.5">
              {["1", "2", "3"].map((l) => (
                <FilterChip
                  key={l}
                  active={level === l}
                  onClick={() => setLevel(level === l ? "" : l)}
                >
                  HSK {l}
                </FilterChip>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {visible.length ? (
        <ul className={cn("grid gap-2", visible.length > 6 && "sm:grid-cols-2")}>
          {visible.map((n) => (
            <NoteRow key={n.id} n={n} />
          ))}
        </ul>
      ) : (
        <EmptyState
          title={
            q ? "Sin resultados" : own === 0 ? "Todavía no tienes apuntes" : "Nada en esta vista"
          }
          zh={{
            zh: "好记性不如烂笔头。",
            py: "Hǎo jìxing bùrú làn bǐtóu.",
            es: "Más vale un mal lápiz que una buena memoria.",
          }}
          description={
            q
              ? "Prueba con hanzi, pinyin sin tonos o español."
              : "Empieza con una captura rápida en clase (N) o crea un apunte con plantilla. Los apuntes del profesor te sirven de modelo."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="ink" onClick={() => openNewNote()}>
                <Plus /> Nuevo apunte
              </Button>
              <Button variant="outline" asChild>
                <Link href="/apuntes/profesor">Ver apuntes del profesor</Link>
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}

function Shortcut({
  href,
  icon,
  zh,
  title,
  sub,
  hot,
}: {
  href: string;
  icon: React.ReactNode;
  zh: string;
  title: string;
  sub: string;
  hot?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "card-paper flex items-start gap-2 p-3 transition-[transform,box-shadow] duration-[var(--dur-ui)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]",
        hot && "border-cinnabar/40",
      )}
    >
      <span
        lang="zh-CN"
        className="zh-serif text-cinnabar mt-0.5 shrink-0 text-base leading-none"
        aria-hidden="true"
      >
        {zh}
      </span>
      <span className="min-w-0">
        <span className="text-ink [&_svg]:text-ink-faint flex items-center gap-1 text-sm font-medium [&_svg]:size-3.5">
          {icon} {title}
        </span>
        <span
          className={cn(
            "block truncate text-[11px]",
            hot ? "text-cinnabar-ink font-medium" : "text-ink-faint",
          )}
        >
          {sub}
        </span>
      </span>
    </Link>
  );
}

export { NoteTypeBadge };
