"use client";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { hanziOnly } from "@/lib/pinyin/convert";
import { lookup } from "@/lib/dictionary/service";
import { Button } from "@/components/ui/button";
import { Card, Input, Label, Select } from "@/components/ui/primitives";
import { Pinyin } from "@/components/zh/pinyin";

/** Hoja de caligrafía imprimible (田字格): carácter modelo + copias en gris + casillas vacías. */
export function CalligraphySheet({ chars, setChars, suggestions }: { chars: string[]; setChars: (c: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState("");
  const [cols, setCols] = useState(10);
  const [traced, setTraced] = useState(3);
  const list = useMemo(() => (chars.length ? chars : Array.from(hanziOnly(text))), [chars, text]);

  return (
    <div className="space-y-4">
      <Card className="no-print">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div>
            <Label htmlFor="cs-text">Caracteres (escribe o pega)</Label>
            <Input id="cs-text" lang="zh-CN" className="zh mt-1 text-lg" value={text} onChange={(e) => { setText(e.target.value); setChars([]); }} placeholder="你好我是学生" />
          </div>
          <div>
            <Label htmlFor="cs-cols">Casillas por fila</Label>
            <Select id="cs-cols" className="mt-1 w-full" value={cols} onChange={(e) => setCols(Number(e.target.value))}>
              {[6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="cs-traced">Copias en gris</Label>
            <Select id="cs-traced" className="mt-1 w-full" value={traced} onChange={(e) => setTraced(Number(e.target.value))}>
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => window.print()} disabled={!list.length}>
              <Printer /> Imprimir / PDF
            </Button>
          </div>
        </div>
        {suggestions.length ? (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">Sugerencias (HSK): pulsa para añadir</p>
            <div className="flex flex-wrap gap-1">
              {suggestions.map((c) => (
                <button key={c} onClick={() => { setChars([...list, c]); setText(""); }} lang="zh-CN" className="zh-serif flex size-9 items-center justify-center rounded-[8px] border border-line bg-paper-raised text-lg leading-none text-ink transition-colors hover:border-ink/40 hover:bg-paper-sunk">
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <div className="print-sheet space-y-3 rounded-[12px] border border-line bg-white p-4 text-black shadow-[var(--shadow-paper)] print:border-0 print:p-0 print:shadow-none" style={{ colorScheme: "light" }}>
        {!list.length ? <p className="font-serif-es text-sm italic text-neutral-500">Escribe algunos caracteres arriba para generar la hoja.</p> : null}
        {list.map((c, i) => {
          const e = lookup(c)[0];
          return (
            <div key={i} className="break-inside-avoid">
              <div className="mb-0.5 flex items-baseline gap-2 text-xs text-neutral-600">
                <Pinyin text={e?.p ?? ""} colored={false} className="font-medium" />
                <span>{e?.es ?? e?.en?.[0] ?? ""}</span>
              </div>
              <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {Array.from({ length: cols }).map((_, j) => (
                  <div key={j} className="tianzige-print relative aspect-square" style={{ border: "1px solid #c0392b", backgroundImage: "linear-gradient(to right, #ddd 1px, transparent 1px), linear-gradient(to bottom, #ddd 1px, transparent 1px)", backgroundSize: "50% 50%" }}>
                    {j === 0 ? (
                      <span lang="zh-CN" className="zh-kai absolute inset-0 flex items-center justify-center text-[2.1rem] text-black" style={{ fontSize: "min(2.4rem, 7vw)" }}>
                        {c}
                      </span>
                    ) : j <= traced ? (
                      <span lang="zh-CN" className="zh-kai absolute inset-0 flex items-center justify-center text-neutral-300" style={{ fontSize: "min(2.4rem, 7vw)" }}>
                        {c}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-sheet, .print-sheet * { visibility: visible; }
          .print-sheet { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
