"use client";
/**
 * Pestaña «Origen y evolución» de Caracteres: la serie de artículos, la línea del tiempo de la escritura,
 * la galería de pictogramas animados (dibujos propios) y los caracteres con formas antiguas reales
 * (SVG de Wikimedia Commons con licencia verificada; créditos en cada tira).
 */
import { useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import Link from "@/lib/languages/link";
import { getArticles } from "@/lib/study-hall";
import { loadGlyphIndex, loadPictograms, STAGE_INFO, type GlyphIndex, type Pictogram, type Stage } from "@/lib/hanzi/origin";
import { Badge, Card } from "@/components/ui/primitives";
import { Hanzi } from "@/components/target/target-text";
import { Reading } from "@/components/target/reading";
import { Mixed } from "@/components/target/mixed";
import { cn } from "@/lib/utils";
import { PictogramMorph } from "./origin";

const TYPE_FILTERS = ["todos", "pictograma", "指事", "会意", "形声"] as const;

export function OriginTab({ onOpen }: { onOpen: (c: string) => void }) {
  const [pics, setPics] = useState<Pictogram[]>([]);
  const [index, setIndex] = useState<GlyphIndex | null>(null);
  const [filter, setFilter] = useState<(typeof TYPE_FILTERS)[number]>("todos");
  useEffect(() => {
    void loadPictograms().then(setPics);
    void loadGlyphIndex().then(setIndex);
  }, []);
  const series = getArticles().filter((a) => a.category === "origen de los caracteres");
  const withStages = useMemo(() => (index ? Object.entries(index.chars).filter(([, v]) => v.stages.length).map(([c]) => c) : []), [index]);
  const visible = pics.filter((p) => filter === "todos" || p.type === filter || (filter === "pictograma" && /象形|pictograma/.test(p.type)));
  return (
    <div className="space-y-5">
      <Card>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          <BookOpen className="size-3.5" /> Serie «De dónde vienen los caracteres»
        </p>
        <ol className="grid gap-1.5 sm:grid-cols-2">
          {series.map((a, i) => (
            <li key={a.id}>
              <Link href={`/study-hall/articulo/${a.id}`} className="flex items-start gap-2 rounded-[8px] border border-line px-3 py-2 hover:border-ink/40">
                <span className="tabular text-sm text-ink-faint">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink"><Mixed>{a.title}</Mixed></span>
                  <span lang="zh-CN" className="zh-kai block text-xs text-cinnabar">{a.zh}</span>
                </span>
                {a.reviewed === false ? <Badge variant="muted" className="ml-auto shrink-0">por validar</Badge> : null}
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Línea del tiempo de la escritura</p>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          {(Object.keys(STAGE_INFO) as Stage[]).map((s) => (
            <li key={s} className="rounded-[8px] border border-line bg-paper-raised px-2 py-1.5 text-center">
              <span lang="zh-CN" className="zh-serif block text-lg text-ink">{STAGE_INFO[s].zh}</span>
              <span className="block text-xs text-ink-soft">{STAGE_INFO[s].es}</span>
              <span className="block text-[10px] text-ink-faint">{STAGE_INFO[s].when}</span>
            </li>
          ))}
        </ol>
        {withStages.length ? (
          <div className="mt-3">
            <p className="mb-1 text-xs text-ink-soft">Caracteres con formas antiguas reales (pulsa uno para ver su tira de evolución):</p>
            <div className="flex flex-wrap gap-1">
              {withStages.map((c) => (
                <button key={c} type="button" onClick={() => onOpen(c)} className="rounded-[6px] border border-line bg-paper-raised px-2 py-0.5 hover:border-ink/40">
                  <Hanzi text={c} size="lg" font="serif" />
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-faint">Imágenes de Wikimedia Commons; solo se usan las de licencia libre verificada (los créditos aparecen bajo cada tira).</p>
          </div>
        ) : null}
      </Card>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <p className="mr-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Pictogramas animados ({pics.length})</p>
          {TYPE_FILTERS.map((t) => (
            <button key={t} type="button" onClick={() => setFilter(t)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", filter === t ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink/40")} aria-pressed={filter === t}>
              {t}
            </button>
          ))}
        </div>
        {!pics.length ? <p className="text-sm text-ink-faint">Cargando dibujos…</p> : null}
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <li key={p.c}>
              <button type="button" onClick={() => onOpen(p.c)} className="card-paper flex w-full items-start gap-3 p-3 text-left hover:border-ink/40">
                <PictogramMorph ch={p.c} size={96} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <Hanzi text={p.c} size="xl" font="serif" />
                    <Reading text={p.pinyin} />
                    <span className="text-sm text-ink-soft"><Mixed>{p.es}</Mixed></span>
                  </span>
                  <span className="mt-1 line-clamp-3 block text-xs text-ink-soft"><Mixed>{p.story}</Mixed></span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-ink-faint">Dibujos esquemáticos propios de Xuébàn (no son reproducciones de inscripciones). Contenido pendiente de validar con el profesor.</p>
      </div>
    </div>
  );
}
