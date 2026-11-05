/**
 * Modelo puro del visor «Origen y evolución»: siempre 6 etapas en el mismo orden (la tira nunca cambia de longitud).
 * Cada etapa dice qué es: forma histórica real (con su fuente), dibujo/aproximación ilustrativa, tipografía actual o
 * «sin forma conservada». Sin dependencias de navegador: se prueba con Vitest.
 */
export type ViewStage = "drawing" | "oracle" | "bronze" | "seal" | "clerical" | "regular";
export const VIEW_STAGES: ViewStage[] = [
  "drawing",
  "oracle",
  "bronze",
  "seal",
  "clerical",
  "regular",
];

export type StageKind = "real" | "illustrative" | "font" | "missing";

export interface StageMeta {
  zh: string;
  es: string;
  short: string;
  when: string;
  /** qué cambió en esta etapa (contenido propio, reviewed: false) */
  change: string;
}

export const VIEW_STAGE_INFO: Record<ViewStage, StageMeta> = {
  drawing: {
    zh: "图",
    es: "Dibujo",
    short: "Dibujo",
    when: "ilustración",
    change: "Dibujo esquemático propio para recordar la idea; no reproduce ninguna inscripción.",
  },
  oracle: {
    zh: "甲骨文",
    es: "Oráculo",
    short: "Oráculo",
    when: "c. 1250–1050 a. C.",
    change:
      "Grabado con punzón en caparazones y huesos: trazos finos y angulosos, y la orientación todavía varía.",
  },
  bronze: {
    zh: "金文",
    es: "Bronce",
    short: "Bronce",
    when: "c. 1050–250 a. C.",
    change: "Fundido en vasijas rituales: trazos más gruesos y redondeados, con partes rellenas.",
  },
  seal: {
    zh: "篆书",
    es: "Sello",
    short: "Sello",
    when: "c. 800–200 a. C.",
    change: "Los Qin unifican la escritura: trazos de grosor uniforme, curvos y simétricos.",
  },
  clerical: {
    zh: "隶书",
    es: "Clerical",
    short: "Clerical",
    when: "Han, c. 200 a. C.–200 d. C.",
    change:
      "Escrito a pincel por los escribas: las curvas se vuelven rectas y aparece el trazo ondulado (蚕头燕尾).",
  },
  regular: {
    zh: "楷书",
    es: "Regular",
    short: "Regular",
    when: "desde c. 200 d. C.",
    change: "Trazos separados y precisos (punto, gancho, barrido): es la forma que se escribe hoy.",
  },
};

export interface GlyphCreditLite {
  file: string;
  url: string;
  license: string;
  author?: string;
  stage: string;
}
export interface GlyphEntryLite {
  stages: string[];
  normalized?: string[];
  credits: GlyphCreditLite[];
}
export interface PictogramLite {
  c: string;
  drawing: string;
  oracle?: string;
  type?: string;
}

export interface StageView {
  key: ViewStage;
  meta: StageMeta;
  kind: StageKind;
  /** etiqueta corta de procedencia: «forma real · Commons (Public domain)», «dibujo ilustrativo»… */
  source: string;
  /** archivo de Commons (para forma real) */
  file?: { stage: string; normalized: boolean };
  credit?: GlyphCreditLite;
  /** trazado propio (0 0 100 100) para lo ilustrativo */
  path?: string;
  /** nota cuando la etapa usa una variante (sello grande en lugar de sello pequeño) */
  variant?: string;
}

const MISSING = "sin forma conservada";

/** Construye las 6 etapas de un carácter. `entry` = índice de glifos de Commons; `pict` = pictograma propio. */
export function buildStages(
  entry: GlyphEntryLite | undefined | null,
  pict: PictogramLite | undefined | null,
): StageView[] {
  const has = (s: string) => Boolean(entry?.stages.includes(s));
  const credit = (s: string) => entry?.credits.find((c) => c.stage === s);
  const real = (key: ViewStage, s: string, variant?: string): StageView => {
    const cr = credit(s);
    return {
      key,
      meta: VIEW_STAGE_INFO[key],
      kind: "real",
      source: `forma real · Wikimedia Commons${cr?.license ? ` (${cr.license})` : ""}`,
      file: { stage: s, normalized: Boolean(entry?.normalized?.includes(s)) },
      credit: cr,
      variant,
    };
  };
  const missing = (key: ViewStage): StageView => ({
    key,
    meta: VIEW_STAGE_INFO[key],
    kind: "missing",
    source: MISSING,
  });
  return VIEW_STAGES.map((key): StageView => {
    switch (key) {
      case "drawing":
        return pict?.drawing
          ? {
              key,
              meta: VIEW_STAGE_INFO.drawing,
              kind: "illustrative",
              source: "dibujo ilustrativo (Xuébàn)",
              path: pict.drawing,
            }
          : missing(key);
      case "oracle":
        if (has("oracle")) return real(key, "oracle");
        return pict?.oracle
          ? {
              key,
              meta: VIEW_STAGE_INFO.oracle,
              kind: "illustrative",
              source: "aproximación ilustrativa (no es una inscripción)",
              path: pict.oracle,
            }
          : missing(key);
      case "bronze":
        return has("bronze") ? real(key, "bronze") : missing(key);
      case "seal":
        if (has("seal")) return real(key, "seal", "小篆 sello pequeño");
        if (has("bigseal")) return real(key, "bigseal", "大篆 sello grande");
        return missing(key);
      case "clerical":
        return has("clerical") ? real(key, "clerical") : missing(key);
      case "regular":
        return {
          key,
          meta: VIEW_STAGE_INFO.regular,
          kind: "font",
          source: "tipografía actual (simplificado)",
        };
    }
  });
}

/** Índices de las etapas con contenido, en orden (la reproducción las recorre y termina en «regular»). */
export function playableIndices(stages: StageView[]): number[] {
  return stages.map((s, i) => (s.kind === "missing" ? -1 : i)).filter((i) => i >= 0);
}

/** Tipo de formación (六书) a partir del pictograma propio o de la etimología de Make Me a Hanzi. */
export function formationType(
  pictType?: string,
  etymType?: string,
): { zh: string; es: string } | null {
  const t = (pictType ?? "").toLowerCase();
  if (/象形|pictograma/.test(t) || etymType === "pictographic")
    return { zh: "象形", es: "pictograma: dibuja el objeto" };
  if (/指事/.test(t)) return { zh: "指事", es: "indicativo: señala una idea con un signo" };
  if (/会意/.test(t) || etymType === "ideographic")
    return { zh: "会意", es: "compuesto de significado: la suma de las partes sugiere la idea" };
  if (/形声/.test(t) || etymType === "pictophonetic")
    return { zh: "形声", es: "fono-semántico: una parte da el significado y otra el sonido" };
  return null;
}
