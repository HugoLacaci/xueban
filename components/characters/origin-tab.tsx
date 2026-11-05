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
import {
  loadGlyphIndex,
  loadPictograms,
  STAGE_INFO,
  type GlyphIndex,
  type Pictogram,
  type Stage,
} from "@/lib/hanzi/origin";
import { Badge, Card } from "@/components/ui/primitives";
import { Hanzi } from "@/components/target/target-text";
import { Reading } from "@/components/target/reading";
import { Mixed } from "@/components/target/mixed";
import { cn } from "@/lib/utils";
import { OriginThumb } from "./origin";

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
  const withStages = useMemo(
    () =>
      index
        ? Object.entries(index.chars)
            .filter(([, v]) => v.stages.length)
            .map(([c]) => c)
        : [],
    [index],
  );
  const visible = pics.filter(
    (p) =>
      filter === "todos" ||
      p.type === filter ||
      (filter === "pictograma" && /象形|pictograma/.test(p.type)),
  );
  return (
    <div className="space-y-5">
      <Card>
        <p className="text-ink-faint mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase">
          <BookOpen className="size-3.5" /> Serie «De dónde vienen los caracteres»
        </p>
        <ol className="grid gap-1.5 sm:grid-cols-2">
          {series.map((a, i) => (
            <li key={a.id}>
              <Link
                href={`/study-hall/articulo/${a.id}`}
                className="border-line hover:border-ink/40 flex items-start gap-2 rounded-[8px] border px-3 py-2"
              >
                <span className="tabular text-ink-faint text-sm">{i + 1}</span>
                <span className="min-w-0">
                  <span className="text-ink block text-sm font-medium">
                    <Mixed>{a.title}</Mixed>
                  </span>
                  <span lang="zh-CN" className="zh-kai text-cinnabar block text-xs">
                    {a.zh}
                  </span>
                </span>
                {a.reviewed === false ? (
                  <Badge variant="muted" className="ml-auto shrink-0">
                    por validar
                  </Badge>
                ) : null}
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <p className="text-ink-faint mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
          Línea del tiempo de la escritura
        </p>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          {(Object.keys(STAGE_INFO) as Stage[]).map((s) => (
            <li
              key={s}
              className="border-line bg-paper-raised rounded-[8px] border px-2 py-1.5 text-center"
            >
              <span lang="zh-CN" className="zh-serif text-ink block text-lg">
                {STAGE_INFO[s].zh}
              </span>
              <span className="text-ink-soft block text-xs">{STAGE_INFO[s].es}</span>
              <span className="text-ink-faint block text-[10px]">{STAGE_INFO[s].when}</span>
            </li>
          ))}
        </ol>
        {withStages.length ? (
          <div className="mt-3">
            <p className="text-ink-soft mb-1 text-xs">
              Caracteres con formas antiguas reales (pulsa uno para ver su tira de evolución):
            </p>
            <div className="flex flex-wrap gap-1">
              {withStages.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onOpen(c)}
                  className="border-line bg-paper-raised hover:border-ink/40 rounded-[6px] border px-2 py-0.5"
                >
                  <Hanzi text={c} size="lg" font="serif" />
                </button>
              ))}
            </div>
            <p className="text-ink-faint mt-1 text-[11px]">
              Imágenes de Wikimedia Commons; solo se usan las de licencia libre verificada (los
              créditos aparecen bajo cada tira).
            </p>
          </div>
        ) : null}
      </Card>

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <p className="text-ink-faint mr-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
            Pictogramas ({pics.length})
          </p>
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs",
                filter === t
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink-soft hover:border-ink/40",
              )}
              aria-pressed={filter === t}
            >
              {t}
            </button>
          ))}
        </div>
        {!pics.length ? <p className="text-ink-faint text-sm">Cargando dibujos…</p> : null}
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <PictogramCard key={p.c} p={p} onOpen={onOpen} />
          ))}
        </ul>
        <p className="text-ink-faint mt-2 text-[11px]">
          Dibujos esquemáticos propios de Xuébàn (no son reproducciones de inscripciones); pasa el
          ratón o enfoca una tarjeta para ver su evolución. Contenido pendiente de validar con el
          profesor.
        </p>
      </div>
    </div>
  );
}

/** Tarjeta de la galería: miniatura estática; la evolución solo se reproduce mientras la tarjeta tiene hover o foco. */
function PictogramCard({ p, onOpen }: { p: Pictogram; onOpen: (c: string) => void }) {
  const [active, setActive] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(p.c)}
        onPointerEnter={() => setActive(true)}
        onPointerLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        className="card-paper hover:border-ink/40 flex w-full items-start gap-3 p-3 text-left"
      >
        <OriginThumb ch={p.c} size={96} active={active} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <Hanzi text={p.c} size="xl" font="serif" />
            <Reading text={p.pinyin} />
            <span className="text-ink-soft text-sm">
              <Mixed>{p.es}</Mixed>
            </span>
          </span>
          <span className="text-ink-soft mt-1 line-clamp-3 block text-xs">
            <Mixed>{p.story}</Mixed>
          </span>
        </span>
      </button>
    </li>
  );
}
