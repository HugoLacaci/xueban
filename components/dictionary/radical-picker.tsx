"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { charsByRadical, getHsk, loadCharInfo, loadHsk, RADICALS, getCharInfo } from "@/lib/dictionary/service";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/primitives";
import { Pinyin } from "@/components/zh/pinyin";
import { cn } from "@/lib/utils";

const tile = "zh-serif flex size-11 items-center justify-center rounded-[8px] border border-line bg-paper-raised text-xl leading-none text-ink transition-colors hover:border-ink/40 hover:bg-paper-sunk";
const chip = (on: boolean) => cn("min-h-8 rounded-[6px] border px-2.5 text-xs transition-colors", on ? "border-ink/60 bg-ink text-paper" : "border-line bg-paper-raised text-ink-soft hover:border-ink/30 hover:text-ink");

/** Selector por radical: 214 radicales Kangxi en losetas, luego caracteres agrupados por trazos. */
export function RadicalPicker({ onPick }: { onPick: (ch: string) => void }) {
  const [ready, setReady] = useState(false);
  const [radical, setRadical] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<number | null>(null);
  const [onlyHsk, setOnlyHsk] = useState(true);
  useEffect(() => {
    void Promise.all([loadCharInfo(), loadHsk()]).then(() => setReady(true));
  }, []);
  const pool = useMemo(() => {
    const h = ready ? getHsk() : undefined;
    if (!h || !onlyHsk) return undefined;
    const set = new Set<string>();
    for (const key of ["3.0", "2.0"] as const) for (const lv of Object.values(h.chars[key])) for (const c of lv) set.add(c);
    return set;
  }, [onlyHsk, ready]);
  const chars = useMemo(() => (ready && radical ? charsByRadical(radical, pool) : []), [ready, radical, pool]);
  const byStrokes = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const c of chars) {
      const s = getCharInfo(c)?.strokes ?? 0;
      m.set(s, [...(m.get(s) ?? []), c]);
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [chars]);
  const groups = useMemo(() => {
    const m = new Map<number, typeof RADICALS>();
    for (const r of RADICALS) m.set(r.strokes, [...(m.get(r.strokes) ?? [])!, r]);
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, []);
  const current = radical ? RADICALS.find((r) => r.radical === radical) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-faint">
        <span>1) Elige el radical · 2) filtra por trazos totales</span>
        <label className="flex items-center gap-2 text-ink-soft">
          <Switch checked={onlyHsk} onCheckedChange={setOnlyHsk} aria-label="Solo caracteres HSK" /> solo HSK
        </label>
      </div>
      {!radical ? (
        <div className="card-sunk max-h-[55vh] space-y-2.5 overflow-y-auto p-2.5 scrollbar-thin">
          {groups.map(([s, rs]) => (
            <div key={s} className="flex items-start gap-2">
              <span className="mt-3 w-5 shrink-0 text-center text-[10px] tabular-nums text-ink-faint" aria-label={`${s} trazos`}>
                {s}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {rs.map((r) => (
                  <button key={r.number} onClick={() => setRadical(r.radical)} lang="zh-CN" className={tile} title={`${r.pinyin} · ${r.meaning}`} aria-label={`Radical ${r.radical}, ${r.meaning}`}>
                    {r.radical}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRadical(null);
                setStrokes(null);
              }}
            >
              <ArrowLeft /> radicales
            </Button>
            <span lang="zh-CN" className="zh-serif flex size-11 items-center justify-center rounded-[6px] border-[1.5px] border-cinnabar bg-cinnabar/8 text-2xl leading-none text-cinnabar">
              {radical}
            </span>
            <span className="text-sm text-ink-soft">
              {current ? <Pinyin text={current.pinyin} className="text-sm" /> : null} {current ? `· «${current.meaning}»` : null}
            </span>
            <Button size="sm" variant="link" onClick={() => onPick(radical)}>
              ficha del radical
            </Button>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por trazos">
            <button onClick={() => setStrokes(null)} className={chip(strokes === null)}>
              todos
            </button>
            {byStrokes.map(([s]) => (
              <button key={s} onClick={() => setStrokes(s)} className={chip(strokes === s)}>
                {s}
              </button>
            ))}
          </div>
          <div className="card-sunk max-h-[45vh] space-y-2 overflow-y-auto p-2.5 scrollbar-thin">
            {byStrokes
              .filter(([s]) => strokes === null || s === strokes)
              .map(([s, cs]) => (
                <div key={s} className="flex items-start gap-2">
                  <span className="mt-3 w-5 shrink-0 text-center text-[10px] tabular-nums text-ink-faint">{s}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {cs.map((c) => (
                      <button key={c} onClick={() => onPick(c)} lang="zh-CN" className={tile}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            {!chars.length ? <p className="p-2 text-sm text-ink-faint">{ready ? "Ningún carácter con ese radical en el conjunto elegido." : "Cargando…"}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
