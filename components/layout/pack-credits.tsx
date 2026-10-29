"use client";
/** Créditos de datos de los paquetes de japonés y coreano (se leen de cada paquete, que los declara). */
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { LANG_META, loadPack } from "@/lib/languages/registry";
import type { Lang, LanguagePack } from "@/lib/languages/types";
import { Mixed } from "@/components/target/mixed";

export function PackCredits({ langs }: { langs: Lang[] }) {
  const [packs, setPacks] = useState<LanguagePack[]>([]);
  useEffect(() => {
    void Promise.all(langs.map((l) => loadPack(l))).then(setPacks);
  }, [langs]);
  if (!packs.length) return <p className="text-sm text-ink-faint">Cargando…</p>;
  return (
    <>
      {packs.map((p) => (
        <section key={p.id} className="card-paper mt-4 px-5 py-4" aria-labelledby={`cr-${p.id}`}>
          <h2 id={`cr-${p.id}`} className="font-serif-es text-xl font-semibold tracking-tight text-ink">
            Datos · {LANG_META[p.id].names.es}{" "}
            <span lang={p.bcp47} className="text-base text-ink-faint">
              <Mixed>{LANG_META[p.id].names.native}</Mixed>
            </span>
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {p.credits.map((d) => (
              <li key={d.name} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                        <Mixed>{d.name}</Mixed> <ExternalLink className="size-3 text-ink-faint" />
                      </a>
                    ) : (
                      d.name
                    )}
                  </p>
                  <p className="text-ink-faint"><Mixed>{d.use}</Mixed></p>
                </div>
                <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft"><Mixed>{d.license}</Mixed></span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
