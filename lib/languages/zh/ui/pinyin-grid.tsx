"use client";
/**
 * Tabla completa del pinyin (Etapa 0 · e0-09 y apunte vivo «Tabla de pinyin»): cuadrícula iniciales × finales.
 *  - celdas posibles con su grafía real (yi, wu, ju, zhi…); imposibles atenuadas;
 *  - al pulsar una celda: audio en los 4 tonos;
 *  - filtros por grupo de iniciales (labiales, alveolares, velares, palatales, retroflejas, dentales) y de finales.
 * En móvil la tabla se desplaza en horizontal con cabeceras fijas.
 */
import { useMemo, useState } from "react";
import { FINALS, SYLLABLES, SYLLABLE_EXAMPLES } from "../data/pronunciation";
import { addToneMark, type Tone } from "../pinyin/tones";
import { playText } from "@/components/target/audio-button";
import { cn } from "@/lib/utils";

const INITIAL_ROWS = ["∅", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s"];
const COLS = ["-i", ...FINALS];

const INITIAL_GROUPS: { id: string; es: string; rows: string[] }[] = [
  { id: "all", es: "Todas", rows: INITIAL_ROWS },
  { id: "lab", es: "Labiales b p m f", rows: ["b", "p", "m", "f"] },
  { id: "alv", es: "Alveolares d t n l", rows: ["d", "t", "n", "l"] },
  { id: "vel", es: "Velares g k h", rows: ["g", "k", "h"] },
  { id: "pal", es: "Palatales j q x", rows: ["j", "q", "x"] },
  { id: "ret", es: "Retroflejas zh ch sh r", rows: ["zh", "ch", "sh", "r"] },
  { id: "den", es: "Dentales z c s", rows: ["z", "c", "s"] },
  { id: "none", es: "Sin inicial (y/w)", rows: ["∅"] },
];
const FINAL_GROUPS: { id: string; es: string; test: (f: string) => boolean }[] = [
  { id: "all", es: "Todas", test: () => true },
  { id: "a", es: "Simples", test: (f) => ["a", "o", "e", "i", "u", "ü", "-i", "er"].includes(f) },
  { id: "d", es: "Diptongos", test: (f) => ["ai", "ei", "ao", "ou"].includes(f) },
  { id: "n", es: "Nasales -n / -ng", test: (f) => /n$|ng$/.test(f) && !/^[iuü]/.test(f) },
  { id: "i", es: "Con i-", test: (f) => /^i./.test(f) },
  { id: "u", es: "Con u-", test: (f) => /^u./.test(f) },
  { id: "ü", es: "Con ü-", test: (f) => /^ü./.test(f) },
];

/** Final canónica de una sílaba escrita (yi → i, wen → un, ju → ü, zhi → -i…). */
export function finalOf(initial: string, syl: string): string {
  if (initial === "∅") {
    const map: Record<string, string> = { yi: "i", ya: "ia", ye: "ie", yao: "iao", you: "iu", yan: "ian", yin: "in", yang: "iang", ying: "ing", yong: "iong", wu: "u", wa: "ua", wo: "uo", wai: "uai", wei: "ui", wan: "uan", wen: "un", wang: "uang", weng: "ueng", yu: "ü", yue: "üe", yuan: "üan", yun: "ün" };
    return map[syl] ?? syl;
  }
  const rest = syl.slice(initial.length);
  if (["zh", "ch", "sh", "r", "z", "c", "s"].includes(initial) && rest === "i") return "-i";
  if (["j", "q", "x"].includes(initial) && rest.startsWith("u")) return "ü" + rest.slice(1);
  if (rest === "v") return "ü";
  if (rest === "ve") return "üe";
  return rest;
}

/** Celda de la tabla → grafía real, o null si la combinación no existe. */
export function useGrid(): Map<string, string> {
  return useMemo(() => {
    const m = new Map<string, string>();
    for (const ini of INITIAL_ROWS) for (const s of SYLLABLES[ini === "∅" ? "-" : ini] ?? []) m.set(`${ini}|${finalOf(ini, s)}`, s);
    return m;
  }, []);
}

function speak(syl: string, tone: Tone) {
  const ex = SYLLABLE_EXAMPLES[`${syl}${tone}`];
  void playText(ex ?? addToneMark(syl, tone), 0.8);
}

export function PinyinGrid() {
  const grid = useGrid();
  const [ig, setIg] = useState("all");
  const [fg, setFg] = useState("all");
  const [sel, setSel] = useState<string | null>(null);
  const rows = INITIAL_GROUPS.find((g) => g.id === ig)!.rows;
  const cols = COLS.filter(FINAL_GROUPS.find((g) => g.id === fg)!.test).filter((f) => rows.some((r) => grid.has(`${r}|${f}`)));
  const total = grid.size;
  return (
    <div className="space-y-3" data-pinyin-grid>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar iniciales">
        {INITIAL_GROUPS.map((g) => (
          <button key={g.id} type="button" aria-pressed={ig === g.id} onClick={() => setIg(g.id)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", ig === g.id ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink/40")}>
            {g.es}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar finales">
        {FINAL_GROUPS.map((g) => (
          <button key={g.id} type="button" aria-pressed={fg === g.id} onClick={() => setFg(g.id)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", fg === g.id ? "border-cinnabar bg-cinnabar text-paper-raised" : "border-line text-ink-soft hover:border-ink/40")}>
            {g.es}
          </button>
        ))}
      </div>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[10px] border border-line bg-paper-raised px-3 py-1.5" aria-live="polite">
        {sel ? (
          <>
            <span className="mr-1 font-mono text-sm text-ink">{sel}</span>
            {([1, 2, 3, 4] as Tone[]).map((t) => (
              <button key={t} type="button" onClick={() => speak(sel, t)} className={cn("min-h-8 rounded-[6px] border border-line px-2.5 text-sm hover:bg-paper-sunk", `tone-${t}`)}>
                {addToneMark(sel, t)}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-ink-faint">pulsa cada tono para oírlo</span>
          </>
        ) : (
          <span className="text-xs text-ink-faint">Pulsa una sílaba de la tabla para oírla en los cuatro tonos. {total} sílabas posibles.</span>
        )}
      </div>
      <div className="max-h-[65vh] overflow-auto rounded-[10px] border border-line bg-paper-raised [scrollbar-width:thin]" role="region" aria-label="Tabla de pinyin (desliza)" tabIndex={0}>
        <table className="border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 border-b border-r border-line bg-paper-sunk px-2 py-1" />
              {cols.map((f) => (
                <th key={f} scope="col" className="sticky top-0 z-10 border-b border-line bg-paper-sunk px-1.5 py-1 font-mono font-semibold text-cinnabar">
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((ini) => (
              <tr key={ini}>
                <th scope="row" className="sticky left-0 z-10 border-r border-line bg-paper-sunk px-2 py-1 text-left font-mono text-sm font-semibold text-ink">
                  {ini}
                </th>
                {cols.map((f) => {
                  const s = grid.get(`${ini}|${f}`);
                  return (
                    <td key={f} className="border-b border-line/50 p-0.5 text-center">
                      {s ? (
                        <button type="button" onClick={() => {
                            setSel(s);
                            speak(s, 1);
                          }} className={cn("min-h-7 w-full rounded-[4px] px-1 font-mono text-[12px] text-ink hover:bg-cinnabar/10", sel === s && "bg-cinnabar/15 ring-1 ring-cinnabar")}>
                          {s}
                        </button>
                      ) : (
                        <span className="block min-h-7 rounded-[4px] bg-paper-sunk/60" aria-hidden="true" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-faint">
        Las casillas grises son combinaciones que no existen en chino estándar. Fíjate en las filas j q x: solo se combinan con i y ü (la ü se escribe u: ju, qu, xu). La columna «-i» es la i «vacía» de zhi, chi, shi, ri, zi, ci, si.
      </p>
    </div>
  );
}
