"use client";
import { Mixed } from "@/components/target/mixed";
/**
 * Convierte un marcador «[animación: …]» de los artículos en el diagrama adecuado:
 *  - «女 + 子 → 好» → formación (componentes que se juntan)
 *  - «马 甲骨文 → 金文 → … → 马» → tira de evolución
 *  - «言 → 讠 / 金 → 钅» → pares tradicional/comprimido
 *  - «日» (un solo carácter) → visor de evolución (mismo visor que la ficha, en tamaño de artículo)
 */
import { useEffect, useState } from "react";
import { useLangRouter } from "@/lib/languages/link";
import { loadCharInfo } from "@/lib/languages/zh/dictionary";
import { Hanzi } from "@/components/target/target-text";
import { FormationDiagram, OriginViewer } from "./origin";

const HAN = /[㐀-鿿]/;

export function OriginAnimation({ spec }: { spec: string }) {
  const router = useLangRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void loadCharInfo().then(() => setReady(true));
  }, []);
  const go = (c: string) => router.push(`/caracteres?q=${encodeURIComponent(c)}`);
  const chars = Array.from(spec).filter((c) => HAN.test(c));
  if (!chars.length) return null;
  const frame = (title: string, body: React.ReactNode) => (
    <figure className="border-line bg-paper-sunk/40 my-4 rounded-[12px] border p-3">
      <figcaption className="text-ink-faint mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
        <Mixed>{title}</Mixed>
      </figcaption>
      {body}
    </figure>
  );
  // evolución: contiene nombres de etapas
  if (/甲骨文|金文|篆|隶书|楷书/.test(spec)) {
    const ch = chars[0];
    return frame(`Evolución de ${ch}`, <OriginViewer ch={ch} variant="article" />);
  }
  // pares tradicional / comprimido: «言 → 讠 / 金 → 钅»
  if (spec.includes("/") && spec.includes("→")) {
    const pairs = spec
      .split("/")
      .map((p) => p.split("→").map((x) => Array.from(x).find((c) => HAN.test(c)) ?? ""));
    return frame(
      "Forma completa → forma comprimida",
      <div className="flex flex-wrap gap-4">
        {pairs.map(([a, b], i) => (
          <span
            key={i}
            className="border-line bg-paper-raised flex items-center gap-2 rounded-[8px] border px-3 py-2"
          >
            <Hanzi text={a} size="xl" font="serif" />
            <span className="text-ink-faint">→</span>
            <Hanzi text={b} size="xl" font="serif" className="text-cinnabar" />
          </span>
        ))}
      </div>,
    );
  }
  // formación: «女 + 子 → 好»
  if (spec.includes("+") && spec.includes("→")) {
    const result = Array.from(spec.split("→").pop() ?? "").find((c) => HAN.test(c));
    if (result && ready)
      return frame(`Cómo se formó ${result}`, <FormationDiagram ch={result} onNavigate={go} />);
    return null;
  }
  // un carácter: pictograma animado (si existe dibujo) o evolución
  const ch = chars[0];
  return frame(`${ch}: del dibujo al carácter`, <OriginViewer ch={ch} variant="article" />);
}
