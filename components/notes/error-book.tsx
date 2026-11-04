"use client";
/**
 * 错题本 · cuaderno de errores: lista filtrable (tipo, regla, origen), reflexión editable, estadísticas de los
 * errores más repetidos y acceso al repaso SRS de los errores.
 */
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, ArrowLeft, Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "@/lib/languages/link";
import { db, type Note } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { deleteNote, saveNote } from "@/lib/notes/repo";
import { ERROR_TYPES } from "@/lib/notes/templates";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader, Textarea } from "@/components/ui/primitives";
import { FilterChip } from "@/components/study-hall/filter-chip";
import { TargetText } from "@/components/target/target-text";
import { AudioButton } from "@/components/target/audio-button";
import { openNewNote } from "./new-note-dialog";
import { formatDate } from "@/lib/utils";
import { pageNative } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

const EMPTY: Note[] = [];
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function ErrorBookPage() {
  const pack = usePack();
  const errors = useLiveQuery(() => db.notes.where("[lang+type]").equals([pack.id, "error"]).reverse().sortBy("updatedAt"), [pack.id]) ?? EMPTY;
  const due = useLiveQuery(() => db.noteCards.where("[lang+kind]").equals([pack.id, "error"]).filter((c) => !c.suspended && c.due <= Date.now()).count(), [pack.id]) ?? 0;
  const [type, setType] = useState("");
  const [rule, setRule] = useState("");
  const grammar = pack.grammar;

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of errors) m.set(str(e.fields.errorType) || "other", (m.get(str(e.fields.errorType) || "other") ?? 0) + Number(e.fields.times ?? 1));
    return m;
  }, [errors]);
  const byRule = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of errors) {
      const r = str(e.fields.ruleId);
      if (r) m.set(r, (m.get(r) ?? 0) + Number(e.fields.times ?? 1));
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [errors]);
  const visible = errors.filter((e) => (!type || str(e.fields.errorType) === type) && (!rule || str(e.fields.ruleId) === rule));
  const label = (t: string) => ERROR_TYPES.find((x) => x.value === t)?.label ?? t;

  return (
    <div className="space-y-4">
      <Link href="/apuntes" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Apuntes
      </Link>
      <PageHeader
        title="Cuaderno de errores"
        zh={pageNative("errors")}
        subtitle="El método de los estudiantes chinos: cada error con lo que escribí, lo correcto, el porqué, la regla y mi reflexión. Entran solos desde los ejercicios y el cuaderno, y se repasan con espaciado."
        action={
          <>
            <Button variant="outline" onClick={() => openNewNote({ type: "error" })}>
              <Plus /> Anotar un error
            </Button>
            <Button variant="ink" asChild>
              <Link href="/apuntes/repasar?kind=error">
                <RefreshCw /> Repasar errores{due ? ` (${due})` : ""}
              </Link>
            </Button>
          </>
        }
      />

      {errors.length ? (
        <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={!type} onClick={() => setType("")}>
                todos ({errors.length})
              </FilterChip>
              {Array.from(byType.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([t, c]) => (
                  <FilterChip key={t} active={type === t} onClick={() => setType(type === t ? "" : t)}>
                    {label(t)} <span className="ml-1 text-ink-faint">{c}</span>
                  </FilterChip>
                ))}
            </div>
            <ul className="space-y-2">
              {visible.map((e) => (
                <ErrorRow key={e.id} e={e} />
              ))}
            </ul>
          </div>
          <aside className="space-y-3">
            <Card>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Lo que más repites</p>
              {byRule.length ? (
                <ul className="space-y-1 text-sm">
                  {byRule.slice(0, 8).map(([r, c]) => {
                    const g = grammar.byId(r);
                    return (
                      <li key={r} className="flex items-center justify-between gap-2">
                        <button type="button" onClick={() => setRule(rule === r ? "" : r)} className={rule === r ? "font-medium text-cinnabar" : "text-ink hover:underline"}>
                          <Mixed>{g ? g.title : r}</Mixed>
                        </button>
                        <Badge variant="muted">{c}×</Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-ink-faint">Cuando los errores lleven una regla asociada, aquí verás cuáles repites.</p>
              )}
            </Card>
            <Card>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Cómo usarlo</p>
              <ol className="list-decimal space-y-1 pl-4 text-xs text-ink-soft">
                <li>Lee el porqué hasta entenderlo de verdad.</li>
                <li>Escribe tu reflexión: ¿por qué me confundí?</li>
                <li>Repásalo cuando la app lo pida (SRS).</li>
                <li>Si se repite, abre la regla y haz 3 frases nuevas.</li>
              </ol>
            </Card>
          </aside>
        </div>
      ) : (
        <EmptyState icon={<AlertTriangle />} title="Aún no hay errores anotados" zh={{ zh: "吃一堑，长一智。", py: "Chī yí qiàn, zhǎng yí zhì.", es: "Cada tropiezo te hace más sabio." }} description="Los fallos del cuaderno de ejercicios y de la práctica entran aquí automáticamente. También puedes anotar a mano una corrección de tu profesor." action={<Button onClick={() => openNewNote({ type: "error" })}><Plus /> Anotar un error</Button>} />
      )}
    </div>
  );
}

function ErrorRow({ e }: { e: Note }) {
  const pack = usePack();
  const [reflect, setReflect] = useState(false);
  const g = pack.grammar.byId(str(e.fields.ruleId));
  const times = Number(e.fields.times ?? 1);
  return (
    <li className="card-paper p-3">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="mr-1 text-danger">❌</span>
            <span lang={pack.bcp47} className={`${pack.meta.cssClass} text-danger line-through decoration-danger/60`}>
              {str(e.fields.mine)}
            </span>
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-celadon-ink">✅</span>
            <AudioButton text={str(e.fields.correct)} size="sm" />
            <TargetText text={str(e.fields.correct)} size="md" translation={str(e.fields.es) || undefined} as="div" />
          </div>
          <p className="mt-1 text-sm text-ink-soft"><Mixed>{str(e.fields.explanation)}</Mixed></p>
          {str(e.fields.tip) ? <p className="mt-0.5 text-xs text-gold-ink">💡 <Mixed>{str(e.fields.tip)}</Mixed></p> : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-faint">
            <Badge variant="outline">{ERROR_TYPES.find((x) => x.value === e.fields.errorType)?.label ?? "error"}</Badge>
            {g ? (
              <Link href={`/aprender/gramatica/${g.id}`} className="text-indigo underline-offset-2 hover:underline">
                regla: <Mixed>{g.title}</Mixed>
              </Link>
            ) : null}
            {times > 1 ? <Badge variant="lacquer">{times}× repetido</Badge> : null}
            <span>· {str(e.fields.origin)}</span>
            <span className="tabular">· {formatDate(e.updatedAt)}</span>
            <Link href={`/apuntes/${encodeURIComponent(e.id)}`} className="ml-auto text-indigo underline-offset-2 hover:underline">
              abrir
            </Link>
          </div>
        </div>
        <button type="button" onClick={() => void deleteNote(e.id)} className="rounded p-1 text-ink-faint hover:text-danger" aria-label="Borrar error">
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="mt-2 border-t border-line/70 pt-2">
        {reflect || str(e.fields.reflection) ? (
          <Textarea defaultValue={str(e.fields.reflection)} placeholder="Mi reflexión: ¿por qué me confundí? ¿cómo lo evito la próxima vez?" className="min-h-12 text-sm" onBlur={(ev) => void saveNote(e.id, { fields: { ...e.fields, reflection: ev.target.value } })} aria-label="Mi reflexión" />
        ) : (
          <button type="button" onClick={() => setReflect(true)} className="text-xs text-ink-faint hover:text-ink">
            + añadir mi reflexión
          </button>
        )}
      </div>
    </li>
  );
}
