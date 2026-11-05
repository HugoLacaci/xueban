"use client";
/** Paso «Carácter del día» (temario v2): visor de evolución, cómo se formó, mnemotecnia y orden de trazos. */
import { useEffect, useState } from "react";
import { loadCharInfo, lookupFirst } from "../dictionary";
import { wordPinyin } from "../pinyin/convert";
import { FormationDiagram, OriginViewer } from "@/components/characters/origin";
import { StrokeOrder } from "@/components/target/stroke-order";
import { Reading } from "@/components/target/reading";
import { Mixed } from "@/components/target/mixed";

export function CharOfDayStep({ params }: { params?: Record<string, unknown> }) {
  const chars = (params?.chars as string[] | undefined) ?? [];
  const mnemonics = (params?.mnemonics as Record<string, string> | undefined) ?? {};
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void loadCharInfo().then(() => setReady(true));
  }, []);
  return (
    <div className="space-y-6">
      <h2 className="font-serif-es text-ink text-xl font-semibold">Carácter del día</h2>
      {chars.map((ch) => (
        <section
          key={ch}
          className="border-line bg-paper-raised space-y-4 rounded-[12px] border p-4"
        >
          <header className="flex flex-wrap items-baseline gap-3">
            <span lang="zh-CN" className="zh-serif text-ink text-5xl">
              {ch}
            </span>
            <Reading text={wordPinyin(ch)} className="text-lg" />
            <span className="text-ink-soft text-sm">
              <Mixed>{lookupFirst(ch)?.es?.split(/[;,(]/)[0].trim() ?? ""}</Mixed>
            </span>
          </header>
          <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)]">
            <OriginViewer ch={ch} variant="card" />
            <div className="min-w-0 space-y-4">
              <div>
                <p className="text-ink-faint mb-1 text-[11px] font-semibold tracking-[0.12em] uppercase">
                  Cómo se formó
                </p>
                {ready ? <FormationDiagram ch={ch} /> : null}
              </div>
              {mnemonics[ch] ? (
                <div>
                  <p className="text-ink-faint mb-1 text-[11px] font-semibold tracking-[0.12em] uppercase">
                    Para recordarlo
                  </p>
                  <p className="font-serif-es text-ink text-base">
                    <Mixed>{mnemonics[ch]}</Mixed>
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-ink-faint mb-1 text-[11px] font-semibold tracking-[0.12em] uppercase">
                  Orden de trazos
                </p>
                <StrokeOrder char={ch} size={140} grid controls />
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
