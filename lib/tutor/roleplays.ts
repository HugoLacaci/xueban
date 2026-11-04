"use client";
/** Role-plays por turnos (content/zh/roleplays/uNN.json): tipos y carga diferida por unidad. */

export interface UserOption {
  zh: string;
  py?: string;
  es?: string;
  keywords?: string[];
  next: string;
  goal?: number;
}
export interface RoleplayNode {
  npc: { zh: string; py?: string; es?: string };
  user?: UserOption[];
  hint?: string;
  end?: boolean;
  feedback?: string;
}
export interface Scenario {
  id: string;
  title: string;
  zh: string;
  level?: 1 | 2;
  setting: string;
  role: string;
  roleZh?: string;
  voice?: "f" | "m";
  goals: string[];
  vocab?: string[];
  start: string;
  nodes: Record<string, RoleplayNode>;
  unitId?: string;
}
export interface RoleplayFile {
  unitId: string;
  scenarios: Scenario[];
}

export const ROLEPLAY_UNITS = ["u01", "u02", "u03", "u04", "u05", "u06", "u07", "u08", "u09", "u10", "u11", "u12", "u13", "u14"];
const cache = new Map<string, Promise<RoleplayFile | null>>();

export function loadRoleplays(unitId: string): Promise<RoleplayFile | null> {
  if (!cache.has(unitId)) {
    cache.set(
      unitId,
      import(`@/content/zh/roleplays/${unitId}.json`)
        .then((m) => {
          const f = (m.default ?? m) as RoleplayFile;
          for (const s of f.scenarios) s.unitId = f.unitId;
          return f;
        })
        .catch(() => null),
    );
  }
  return cache.get(unitId)!;
}

export async function loadAllRoleplays(): Promise<Scenario[]> {
  const files = await Promise.all(ROLEPLAY_UNITS.map(loadRoleplays));
  return files.flatMap((f) => f?.scenarios ?? []);
}

/** Escenario «del día»: rota por fecha entre los disponibles. */
export async function dailyScenario(dayIndex = Math.floor(Date.now() / 86400000)): Promise<Scenario | null> {
  const all = await loadAllRoleplays();
  if (!all.length) return null;
  return all[dayIndex % all.length];
}

const PUNCT = /[\s，。！？、,.!?；;：:「」“”"']/g;

/**
 * Elige la opción del alumno que mejor encaja con lo que dijo (voz o teclado).
 * - Una palabra clave que solo aparece dentro de otra más larga también dicha (七点 ⊂ 七点半) no cuenta.
 * - Las claves largas pesan más (son más específicas).
 * - El parecido de caracteres con la frase modelo desempata (claves compartidas entre opciones).
 */
export function matchOption(said: string, node: RoleplayNode): UserOption | null {
  const s = said.replace(PUNCT, "");
  if (!s) return null;
  const opts = node.user ?? [];
  const hits = opts.map((o) => (o.keywords ?? []).filter((k) => k && s.includes(k)));
  const allHits = hits.flat();
  let best: { opt: UserOption; score: number } | null = null;
  opts.forEach((opt, i) => {
    const model = opt.zh.replace(PUNCT, "");
    let score = 0;
    for (const k of hits[i]) {
      const shadowed = allHits.some((o) => o !== k && o.length > k.length && o.includes(k) && !(hits[i].includes(o)));
      if (!shadowed) score += 1 + k.length;
    }
    if (s === model) score += 20;
    // parecido: proporción de caracteres de la frase modelo presentes en lo dicho
    const chars = Array.from(new Set(Array.from(model)));
    if (chars.length) score += (chars.filter((c) => s.includes(c)).length / chars.length) * 2;
    if (hits[i].length || s === model) {
      if (score > (best?.score ?? 0)) best = { opt, score };
    }
  });
  return (best as { opt: UserOption } | null)?.opt ?? null;
}
