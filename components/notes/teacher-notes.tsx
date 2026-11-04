"use client";
import { Mixed } from "@/components/target/mixed";
/**
 * Apuntes del profesor: compendios de referencia incluidos en la app (gramática HSK 1, preguntas, partículas,
 * clasificadores, contrastes, números, orden de la frase, errores, frases de clase y de supervivencia).
 * Agrupados por colección; marcados «pendiente de validar con tu profesor» hasta que Hugo los revise.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, GraduationCap, Search } from "lucide-react";
import Link from "@/lib/languages/link";
import { db, type Note } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { ensureZhBuiltinNotes } from "@/lib/notes/builtin";
import { buildIndex, searchNotes } from "@/lib/notes/search";
import { Badge, Card, EmptyState, Input, PageHeader } from "@/components/ui/primitives";
import { FilterChip } from "@/components/study-hall/filter-chip";
import { NoteRow } from "./hub";
import { pageNative } from "@/lib/languages/ui-text";

const EMPTY: Note[] = [];

const COLLECTIONS: { id: string; title: string; zh: string; match: (n: Note) => boolean; description: string }[] = [
  { id: "grammar", title: "Estructuras del HSK 1 (y adelanto del HSK 2)", zh: "语法", match: (n) => n.id.startsWith("zh-grammar-"), description: "Una estructura por apunte: fórmula, función, ejemplos, negativa, pregunta, errores y contrastes." },
  { id: "questions", title: "Todas las formas de hacer preguntas", zh: "问句", match: (n) => n.id.startsWith("zh-question-"), description: "Cada forma con su estructura, cuándo se usa, cómo se responde y ejemplos con respuesta." },
  { id: "particles", title: "Partículas", zh: "助词", match: (n) => n.id.startsWith("zh-particle-"), description: "吗 呢 吧 了 的 啊 过 着, y un adelanto de 地 y 得." },
  { id: "classifiers", title: "Clasificadores", zh: "量词", match: (n) => n.id.startsWith("zh-classifiers-"), description: "Tabla con sustantivos típicos y errores comunes, y mapa por familias." },
  { id: "contrasts", title: "Contrastes", zh: "对比", match: (n) => n.id.startsWith("zh-contrast-"), description: "不/没 · 二/两 · 会/能/可以 · 想/要 · 在 · 有/在/是 · 几/多少 · 这/那/哪 · 和/也/都 · 的/地/得…" },
  { id: "numbers", title: "Números, fechas, horas, dinero y teléfono", zh: "数字", match: (n) => n.id.startsWith("zh-numbers-"), description: "Cómo se dicen y cómo se preguntan." },
  { id: "errors", title: "Orden de la frase y errores de hispanohablantes", zh: "错误", match: (n) => n.id.startsWith("zh-word-order") || n.id.startsWith("zh-errors-") || n.id.startsWith("zh-pron-"), description: "El esqueleto S + T + L + V + O, ser/estar, plural, 很, pronunciación, falsos amigos." },
  { id: "phrases", title: "Frases útiles en clase y de supervivencia", zh: "句子", match: (n) => n.id.startsWith("zh-phrase-") || n.id.startsWith("zh-dialogue-") || n.id.startsWith("zh-topic-"), description: "Lo que necesitas decirle al profesor y lo que necesitarás al llegar a China. Mi guion personal." },
];

export function TeacherNotesPage() {
  const pack = usePack();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [col, setCol] = useState(sp.get("col") ?? "");
  const loaded = useLiveQuery(() => db.syncState.get("notes:builtin:zh").then((row) => Boolean(row) || pack.id !== "zh"), [pack.id]) ?? false;
  const notes = useLiveQuery(() => db.notes.where("lang").equals(pack.id).filter((n) => Boolean(n.builtin)).toArray(), [pack.id]) ?? EMPTY;
  useEffect(() => {
    if (pack.id === "zh") void ensureZhBuiltinNotes();
  }, [pack.id]);
  const index = useMemo(() => buildIndex(notes), [notes]);
  const visible = useMemo(() => {
    if (q.trim()) {
      const ids = searchNotes(index, q);
      const order = new Map(ids.map((id, i) => [id, i]));
      return notes.filter((n) => order.has(n.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    }
    const c = COLLECTIONS.find((x) => x.id === col);
    return (c ? notes.filter(c.match) : notes).sort((a, b) => a.title.localeCompare(b.title, "es"));
  }, [notes, q, col, index]);
  const pending = notes.filter((n) => n.reviewed === false).length;

  return (
    <div className="space-y-5">
      <Link href="/apuntes" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Apuntes
      </Link>
      <PageHeader title="Apuntes del profesor" zh={pageNative("tutor")} subtitle="Compendios de referencia escritos con las mismas plantillas que usas tú: sirven de modelo. Duplícalos y anótalos con lo que diga tu profesor." />
      {pack.id !== "zh" ? <EmptyState icon={<GraduationCap />} title="Solo en chino por ahora" description="Los compendios de referencia existen para el chino; japonés y coreano quedan pendientes." /> : null}
      {pending ? (
        <Card className="border-gold/40 bg-gold/8 text-sm text-ink">
          <Badge variant="gold" className="mr-2">pendiente de validar</Badge>
          {pending} apuntes están marcados para revisarlos con tu profesor: compruébalos en clase y, si algo no cuadra, duplícalo y corrígelo en tu copia.
        </Card>
      ) : null}
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: 吗, zai, dos, clasificador, ¿cómo se responde…?" className="pl-9" aria-label="Buscar en los apuntes del profesor" />
      </label>
      {!q.trim() ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {COLLECTIONS.map((c) => {
            const n = notes.filter(c.match).length;
            return (
              <button key={c.id} type="button" onClick={() => setCol(col === c.id ? "" : c.id)} aria-pressed={col === c.id} className={`card-paper p-3 text-left transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] ${col === c.id ? "border-ink" : ""}`}>
                <span className="flex items-center gap-2">
                  <span lang="zh-CN" className="zh-kai text-lg leading-none text-cinnabar" aria-hidden="true">
                    {c.zh}
                  </span>
                  <span className="text-sm font-medium text-ink"><Mixed>{c.title}</Mixed></span>
                </span>
                <span className="mt-1 block text-[11px] text-ink-faint"><Mixed>{c.description}</Mixed></span>
                <span className="mt-1 block text-[11px] text-ink-faint tabular">{n} apuntes</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={!col} onClick={() => setCol("")}>
          todos ({notes.length})
        </FilterChip>
        {COLLECTIONS.map((c) => (
          <FilterChip key={c.id} active={col === c.id} onClick={() => setCol(col === c.id ? "" : c.id)}>
            <span lang="zh-CN">{c.zh}</span> <Mixed>{c.title.split(" ")[0]}</Mixed>
          </FilterChip>
        ))}
      </div>
      {visible.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visible.map((n) => (
            <NoteRow key={n.id} n={n} />
          ))}
        </ul>
      ) : (
        <EmptyState title={loaded ? (q ? "Sin resultados" : "Todavía no hay apuntes del profesor") : "Cargando…"} description={loaded && !q ? "Los compendios se incluyen con la app (content/zh/notes)." : undefined} />
      )}
    </div>
  );
}
