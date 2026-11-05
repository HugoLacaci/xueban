/**
 * El esqueleto de la frase china: una fila de huecos en el orden canónico.
 *
 *   [Tiempo] [Sujeto] [Tiempo] [Adverbios] [Auxiliar] [跟/和 + persona + 一起] [在 + lugar] [Verbo 1 (+ lugar)]
 *   [Verbo 2] [Objeto] [Complementos / duración] [Partícula final]
 *
 * El esqueleto crece con el temario: cada hueco declara la unidad en la que se estrena (`since`) y no se dibuja
 * antes. Lógica pura (sin React), usada por <SentenceSkeleton>, los apuntes vivos, «Construye la frase» y
 * `npm run content:check`.
 */
export type SlotId =
  | "time0"
  | "subject"
  | "time"
  | "adverb"
  | "aux"
  | "with"
  | "place"
  | "verb1"
  | "verb2"
  | "object"
  | "complement"
  | "particle";

export interface SlotDef {
  id: SlotId;
  /** etiqueta corta en español */
  es: string;
  /** ejemplo de lo que cabe */
  hint: string;
  /** color (token CSS RGB de styles/tokens.css) */
  color: string;
  /** unidad del temario en la que se estrena el hueco (orden de `curriculumRank`) */
  since: string;
}

export const SLOTS: SlotDef[] = [
  { id: "time0", es: "Tiempo", hint: "明天, 今天上午", color: "--indigo", since: "a1-u06" },
  { id: "subject", es: "Sujeto", hint: "我, 我朋友", color: "--ink", since: "e0-01" },
  { id: "time", es: "Tiempo", hint: "明天, 八点", color: "--indigo", since: "a1-u05" },
  {
    id: "adverb",
    es: "Adverbios",
    hint: "也 / 都 / 不 / 没 / 常常",
    color: "--gold",
    since: "a1-u01",
  },
  { id: "aux", es: "Auxiliar", hint: "会 / 能 / 想 / 要", color: "--danger", since: "a1-u09" },
  { id: "with", es: "Con quién", hint: "跟朋友一起", color: "--celadon", since: "a1-u11" },
  { id: "place", es: "Dónde", hint: "在学校", color: "--celadon", since: "a1-u14" },
  {
    id: "verb1",
    es: "Verbo 1 (+ lugar)",
    hint: "去学校, 坐地铁",
    color: "--cinnabar",
    since: "e0-01",
  },
  { id: "verb2", es: "Verbo 2", hint: "上课, 吃饭", color: "--cinnabar", since: "a1-u07" },
  { id: "object", es: "Objeto", hint: "汉语, 一杯茶", color: "--ink-soft", since: "e0-01" },
  {
    id: "complement",
    es: "Complemento / duración",
    hint: "两个小时, 得很好",
    color: "--gold-ink",
    since: "a1-u15",
  },
  {
    id: "particle",
    es: "Partícula final",
    hint: "吗 / 呢 / 吧 / 了",
    color: "--ink-faint",
    since: "a1-u01",
  },
];
export const SLOT_IDS = SLOTS.map((s) => s.id);
export const slotDef = (id: SlotId): SlotDef => SLOTS.find((s) => s.id === id)!;

export interface SlotFill {
  zh: string;
  py?: string;
  /** glosa en español del trozo (opcional) */
  es?: string;
}

/** Frase repartida en huecos. `es` es la traducción natural; `esOrder` reparte la frase española en trozos con su hueco. */
export interface SkeletonSentence {
  slots: Partial<Record<SlotId, SlotFill>>;
  es: string;
  /** puntuación final (。？！) */
  end?: string;
  /** trozos de la frase española en su orden, con el hueco chino al que corresponden (para las flechas) */
  esOrder?: { text: string; slot?: SlotId }[];
}

/* ------------------------------------------------------------------ orden del temario */

const STAGE_RANK: Record<string, number> = { e0: 0, a1: 1, a2: 2, b1: 3 };

/**
 * Rango comparable de una unidad o lección del temario nuevo: «e0-05» → 5, «a1-u07» → 1007, «a1-u07-l3» → 1007,
 * «a2-u02» → 2002. Ids desconocidos → Infinity (no desbloquean nada).
 */
export function curriculumRank(id: string): number {
  const m = id.match(/^(e0|a1|a2|b1)(?:-(?:u)?(\d{1,2}|cp))?(?:-|$)/);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = m[2] === undefined ? 0 : m[2] === "cp" ? 99 : Number(m[2]);
  return STAGE_RANK[m[1]] * 1000 + n;
}

/** Huecos que existen en el punto `at` del temario (unidad o lección), en orden canónico. */
export function visibleSlots(at: string): SlotId[] {
  const r = curriculumRank(at);
  return SLOTS.filter((s) => curriculumRank(s.since) <= r).map((s) => s.id);
}

/* ------------------------------------------------------------------ frases */

/** Huecos ocupados de una frase, en orden canónico. */
export function filledSlots(s: SkeletonSentence): SlotId[] {
  return SLOT_IDS.filter((id) => s.slots[id]?.zh);
}

/** Texto chino de la frase (huecos en orden canónico + puntuación). */
export function joinZh(s: SkeletonSentence): string {
  return (
    filledSlots(s)
      .map((id) => s.slots[id]!.zh)
      .join("") + (s.end ?? "")
  );
}

/** Pinyin de la frase (si todos los huecos lo traen). */
export function joinPy(s: SkeletonSentence): string | undefined {
  const parts = filledSlots(s).map((id) => s.slots[id]!.py);
  if (parts.some((p) => !p)) return undefined;
  const txt = parts.join(" ");
  const end = s.end === "？" ? "?" : s.end === "！" ? "!" : s.end ? "." : "";
  return txt.charAt(0).toUpperCase() + txt.slice(1) + end;
}

/** Columnas a dibujar: los huecos visibles en ese punto del temario + cualquier hueco que la frase use. */
export function columnsFor(sentences: SkeletonSentence[], at?: string): SlotId[] {
  const used = new Set(sentences.flatMap(filledSlots));
  const vis = new Set(at ? visibleSlots(at) : SLOT_IDS);
  return SLOT_IDS.filter((id) => used.has(id) || (vis.has(id) && id !== "time0"));
}

/** Problemas de una frase de esqueleto (para content:check): huecos aún no enseñados, texto esperado distinto… */
export function checkSentence(
  s: SkeletonSentence,
  opts: { at?: string; expectZh?: string } = {},
): string[] {
  const out: string[] = [];
  if (!filledSlots(s).length) out.push("frase sin huecos");
  // las frases elípticas (你呢？, 明天呢？) son válidas: basta con que el esqueleto tenga al menos dos huecos
  if (!s.slots.verb1?.zh && !s.slots.object?.zh && !s.slots.verb2?.zh && filledSlots(s).length < 2)
    out.push("frase sin verbo ni objeto");
  if (opts.at) {
    const vis = new Set(visibleSlots(opts.at));
    for (const id of filledSlots(s))
      if (!vis.has(id))
        out.push(`usa el hueco «${slotDef(id).es}» antes de enseñarlo (${slotDef(id).since})`);
  }
  if (
    opts.expectZh &&
    joinZh(s).replace(/[。？！?!.，, ]/g, "") !== opts.expectZh.replace(/[。？！?!.，, ]/g, "")
  )
    out.push(`no coincide con «${opts.expectZh}»`);
  if (s.esOrder)
    for (const t of s.esOrder)
      if (t.slot && !s.slots[t.slot]) out.push(`la flecha de «${t.text}» apunta a un hueco vacío`);
  return out;
}

/**
 * Movimientos para la comparación con el español: para cada trozo español con hueco, su posición en la frase
 * española y en la china. `moved` = cambia de posición relativa.
 */
export function moves(
  s: SkeletonSentence,
): { text: string; slot: SlotId; esIndex: number; zhIndex: number; moved: boolean }[] {
  if (!s.esOrder) return [];
  const zhCols = filledSlots(s);
  const withSlot = s.esOrder
    .map((t, i) => ({ ...t, i }))
    .filter((t): t is { text: string; slot: SlotId; i: number } => Boolean(t.slot));
  const esRank = withSlot.map((t) => t.slot);
  return withSlot.map((t) => {
    const zhIndex = zhCols.indexOf(t.slot);
    const esIndex = t.i;
    const relEs = esRank.indexOf(t.slot);
    const relZh = zhCols.filter((c) => esRank.includes(c)).indexOf(t.slot);
    return { text: t.text, slot: t.slot, esIndex, zhIndex, moved: relEs !== relZh };
  });
}

/**
 * Comprueba una respuesta de «Construye la frase»: devuelve los huecos mal colocados comparando el orden de los
 * trozos elegidos con el canónico.
 */
export function checkBuild(
  s: SkeletonSentence,
  chosen: string[],
): { ok: boolean; misplaced: SlotId[] } {
  const cols = filledSlots(s);
  const expected = cols.map((id) => s.slots[id]!.zh);
  const misplaced: SlotId[] = [];
  cols.forEach((id, i) => {
    if (chosen[i] !== expected[i]) misplaced.push(id);
  });
  return { ok: misplaced.length === 0 && chosen.length === expected.length, misplaced };
}
