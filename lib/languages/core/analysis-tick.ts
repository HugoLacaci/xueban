/**
 * Contador global que se incrementa cuando un analizador asíncrono (kuromoji en un worker, el
 * analizador coreano…) termina de cargar o de analizar textos pendientes: los componentes que
 * pintan texto meta se suscriben y recalculan.
 */
import { create } from "zustand";

export const useAnalysisTick = create<{ tick: number }>(() => ({ tick: 0 }));

let scheduled = false;
export function bumpAnalysis() {
  if (scheduled) return;
  scheduled = true;
  const run = () => {
    scheduled = false;
    useAnalysisTick.setState((s) => ({ tick: s.tick + 1 }));
  };
  if (typeof requestAnimationFrame !== "undefined") requestAnimationFrame(run);
  else setTimeout(run, 0);
}
