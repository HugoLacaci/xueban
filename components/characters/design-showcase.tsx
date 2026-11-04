"use client";
/** /design · componentes de las funciones nuevas (solo chino): panel de corrección, tira de evolución, pictograma, formación. */
import { useEffect, useState } from "react";
import { correct, type CorrectionReport } from "@/lib/correction";
import { loadCharInfo } from "@/lib/languages/zh/dictionary";
import { CorrectionPanel } from "@/components/correction/correction-panel";
import { EvolutionStrip, FormationDiagram, PictogramMorph } from "@/components/characters/origin";
import { SectionTitle } from "@/components/ui/primitives";

export function ZhFeaturesSection() {
  const [report, setReport] = useState<CorrectionReport | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void correct({ es: "Yo como en casa.", answer: "我吃饭在家", references: ["我在家吃饭。"] }).then(setReport);
    void loadCharInfo().then(() => setReady(true));
  }, []);
  return (
    <section id="zh-features" className="space-y-4">
      <SectionTitle>10 · Apuntes, corrección y origen de los caracteres</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs text-ink-faint">Panel de corrección por capas (normalización → alineación → reglas → tutor opcional). Rojo = error, oro = mejorable, celadón = correcto.</p>
          {report ? <CorrectionPanel report={report} es="Yo como en casa." /> : null}
        </div>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs text-ink-faint">Tira de evolución (SVG de Wikimedia Commons con licencia verificada).</p>
            <EvolutionStrip ch="马" />
          </div>
          <div className="flex flex-wrap items-start gap-4">
            <div>
              <p className="mb-2 text-xs text-ink-faint">Pictograma animado (dibujo propio).</p>
              <PictogramMorph ch="日" size={120} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs text-ink-faint">Cómo se formó.</p>
              {ready ? <FormationDiagram ch="好" /> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
