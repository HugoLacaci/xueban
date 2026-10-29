"use client";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Lightbulb, PenLine, Play, Save } from "lucide-react";
import { db } from "@/lib/db";
import { charsWithComponent, componentsOf, getCharInfo, loadCharInfo, lookup, radicalInfo, useDictionary, wordsContaining, getHsk, loadHsk } from "../dictionary";
import type { CharInfo } from "@/lib/dictionary/types";
import { wordPinyin } from "../pinyin/convert";
import { Button } from "@/components/ui/button";
import { Badge, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Pinyin } from "@/components/target/reading";
import { StrokeOrder } from "@/components/target/stroke-order";
import { Hanzi } from "@/components/target/target-text";
import { WritingGrid } from "@/components/ornament/writing-grid";
import { SealTag } from "@/components/ornament/seal";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

const ETYM_ES: Record<string, string> = {
  pictographic: "pictograma (dibuja el objeto)",
  ideographic: "ideograma (combina ideas)",
  pictophonetic: "pictofonético (semántico + fonético)",
};

/** Lámina de enciclopedia de un carácter: 米字格 con trazos, radical en bermellón, árbol de componentes y nota de etimología. */
export function CharDetail({ ch, onNavigate, compact }: { ch: string; onNavigate?: (w: string) => void; compact?: boolean }) {
  const [tick, setTick] = useState(0);
  const dictStatus = useDictionary((s) => s.status);
  useEffect(() => {
    void loadCharInfo().then(() => setTick((t) => t + 1));
    void loadHsk().then(() => setTick((t) => t + 1));
  }, []);
  const info = useMemo(() => getCharInfo(ch), [ch, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const entry = useMemo(() => lookup(ch)[0], [ch, dictStatus]); // eslint-disable-line react-hooks/exhaustive-deps
  const state = useLiveQuery(() => db.charStates.get(`zh:${ch}`), [ch]);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const rad = info ? radicalInfo(info.radical) : undefined;
  const components = useMemo(() => (info ? componentsOf(ch) : []), [ch, info]);
  const hskPool = useMemo(() => {
    const h = getHsk();
    if (!h) return undefined;
    const set = new Set<string>();
    for (const lv of Object.values(h.chars["3.0"])) for (const c of lv) set.add(c);
    return set;
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const sharing = useMemo(() => {
    if (!info) return [];
    const comps = components.filter((c) => c !== info.radical);
    const target = comps[0] ?? info.radical;
    return target ? charsWithComponent(target, hskPool, 24) : [];
  }, [info, components, hskPool]);
  const words = useMemo(() => wordsContaining(ch, compact ? 8 : 24), [ch, dictStatus, compact]); // eslint-disable-line react-hooks/exhaustive-deps
  const hskLevel = useMemo(() => {
    const h = getHsk();
    if (!h) return undefined;
    for (const [lv, chars] of Object.entries(h.chars["3.0"])) if (chars.includes(ch)) return Number(lv);
    return undefined;
  }, [ch, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMnemonic = async () => {
    const now = Date.now();
    const cur = await db.charStates.get(`zh:${ch}`);
    await db.charStates.put({ id: `zh:${ch}`, lang: "zh", hanzi: ch, known: cur?.known ?? false, canWrite: cur?.canWrite ?? false, writingAttempts: cur?.writingAttempts ?? 0, writingMistakes: cur?.writingMistakes ?? 0, mnemonic: (mnemonic ?? "").trim() || undefined, updatedAt: now });
    setMnemonic(null);
    toast.success("Mnemotecnia guardada");
  };

  const toggleKnown = async (field: "known" | "canWrite") => {
    const now = Date.now();
    const cur = await db.charStates.get(`zh:${ch}`);
    await db.charStates.put({ id: `zh:${ch}`, lang: "zh", hanzi: ch, known: cur?.known ?? false, canWrite: cur?.canWrite ?? false, writingAttempts: cur?.writingAttempts ?? 0, writingMistakes: cur?.writingMistakes ?? 0, mnemonic: cur?.mnemonic, ...{ [field]: !(cur?.[field] ?? false) }, updatedAt: now });
  };

  const grid = compact ? 136 : 184;
  const [writer, setWriter] = useState<{ mode: "animate" | "quiz"; key: number }>({ mode: "animate", key: 0 });

  return (
    <article className="card-paper relative overflow-hidden p-4 sm:p-5" aria-label={`Ficha del carácter ${ch}`}>
      <span className="absolute inset-x-6 top-0 h-[2px] rounded-b bg-cinnabar/85" aria-hidden="true" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* 米字格 con orden de trazos */}
        <div className="flex shrink-0 flex-col items-center gap-2 self-center sm:self-start">
          <WritingGrid variant="mi" size={grid} className="shadow-[var(--shadow-sunk)]">
            <StrokeOrder key={writer.key} char={ch} size={grid} grid={false} mode={writer.mode} controls={false} />
          </WritingGrid>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setWriter((w) => ({ mode: "animate", key: w.key + 1 }))} aria-label="Animar trazos">
              <Play /> Animar
            </Button>
            <Button size="sm" variant={writer.mode === "quiz" ? "soft" : "ghost"} onClick={() => setWriter((w) => ({ mode: "quiz", key: w.key + 1 }))} aria-label="Practicar escritura">
              <PenLine /> Escribir
            </Button>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <Hanzi text={ch} size="2xl" font="serif" className="leading-none" />
            <Pinyin text={entry?.p ?? info?.pinyin?.join(" / ") ?? wordPinyin(ch)} className="pb-1 text-2xl" />
            {hskLevel ? <SealTag className="mb-2">HSK {hskLevel}</SealTag> : null}
          </div>
          {info?.pinyin && info.pinyin.length > 1 ? <p className="mt-0.5 text-xs text-ink-faint">lecturas: {info.pinyin.join(", ")}</p> : null}
          <p className="font-serif-es mt-2 text-xl leading-snug text-ink">{entry?.es ?? info?.definition ?? entry?.en?.slice(0, 2).join("; ") ?? "—"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {info ? <Badge variant="outline">{info.strokes} trazos</Badge> : null}
            {info?.etymology?.type ? <Badge variant="muted">{ETYM_ES[info.etymology.type] ?? info.etymology.type}</Badge> : null}
          </div>

          {info ? (
            <div className="mt-4 space-y-4">
              {/* Radical en bermellón */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate?.(info.radical)}
                  lang="zh-CN"
                  className="zh-serif flex size-12 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] border-cinnabar bg-cinnabar/8 text-2xl leading-none text-cinnabar transition-colors hover:bg-cinnabar/16"
                  title="Ver la ficha del radical"
                >
                  {info.radical}
                </button>
                <div className="min-w-0 text-sm">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">Radical{rad ? ` n.º ${rad.number}` : ""}</p>
                  {rad ? (
                    <p className="text-ink-soft">
                      {rad.radical !== info.radical ? `forma de ${rad.radical} · ` : ""}
                      <Pinyin text={rad.pinyin} className="text-sm" /> · «{rad.meaning}»
                    </p>
                  ) : (
                    <p className="text-ink-soft">componente principal</p>
                  )}
                </div>
              </div>

              {components.length ? <ComponentTree root={ch} info={info} onNavigate={onNavigate} /> : null}

              {info.etymology?.hint ? (
                <aside className="relative rounded-[10px] border border-line bg-paper-sunk/50 px-3 py-2.5 pl-4 text-sm">
                  <span className="absolute inset-y-2 left-0 w-[2px] rounded-r bg-ink/40" aria-hidden="true" />
                  <p className="font-serif-es text-xs italic text-ink-faint">Etimología (en inglés, Make Me a Hanzi)</p>
                  <p className="mt-0.5 text-ink-soft"><Mixed>{info.etymology.hint}</Mixed></p>
                  {info.etymology.semantic || info.etymology.phonetic ? (
                    <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-faint">
                      {info.etymology.semantic ? (
                        <span>
                          semántico <span lang="zh-CN" className="zh text-sm text-celadon-ink">{info.etymology.semantic}</span>
                        </span>
                      ) : null}
                      {info.etymology.phonetic ? (
                        <span>
                          fonético <span lang="zh-CN" className="zh text-sm text-indigo">{info.etymology.phonetic}</span>
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </aside>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-faint">Sin datos de descomposición para este carácter.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant={state?.known ? "jade" : "outline"} onClick={() => void toggleKnown("known")}>
              {state?.known ? "Lo reconozco ✓" : "Marcar como reconocido"}
            </Button>
            <Button size="sm" variant={state?.canWrite ? "jade" : "outline"} onClick={() => void toggleKnown("canWrite")}>
              {state?.canWrite ? "Sé escribirlo ✓" : "Marcar: sé escribirlo"}
            </Button>
          </div>
        </div>
      </div>

      {!compact ? (
        <div className="mt-5 space-y-5 border-t border-line/80 pt-4">
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
              <Lightbulb className="size-3.5" /> Mnemotecnia
            </h4>
            {mnemonic === null ? (
              <div className="flex items-start gap-2">
                <p className={cn("flex-1 text-sm", state?.mnemonic ? "font-serif-es text-base text-ink" : "text-ink-faint")}>{state?.mnemonic ?? "Inventa una historia que una los componentes con el significado y el sonido. Cuanto más absurda, mejor se recuerda."}</p>
                <Button size="sm" variant="ghost" onClick={() => setMnemonic(state?.mnemonic ?? "")}>
                  Editar
                </Button>
              </div>
            ) : (
              <div>
                <Textarea value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} autoFocus />
                <div className="mt-1 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setMnemonic(null)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={() => void saveMnemonic()}>
                    <Save /> Guardar
                  </Button>
                </div>
              </div>
            )}
          </div>
          {words.length ? (
            <div>
              <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                Palabras frecuentes con <span lang="zh-CN" className="zh text-sm normal-case tracking-normal text-ink">{ch}</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {words.map((e) => (
                  <WordSlip key={e.s + e.p} s={e.s} p={e.p} es={e.es ?? e.en[0]} hsk={e.hsk} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          ) : null}
          {sharing.length ? (
            <div>
              <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">Caracteres HSK que comparten componente</h4>
              <div className="flex flex-wrap gap-1">
                {sharing.map((c) => (
                  <button key={c} onClick={() => onNavigate?.(c)} lang="zh-CN" className="zh-serif flex size-10 items-center justify-center rounded-[8px] border border-line bg-paper-raised text-xl leading-none text-ink transition-colors hover:border-ink/40 hover:bg-paper-sunk">
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/** Tira de papel con una palabra (hanzi, pinyin, español) para listas de «palabras con». */
export function WordSlip({ s, p, es, hsk, onNavigate, highlight }: { s: string; p: string; es?: string; hsk?: number; onNavigate?: (w: string) => void; highlight?: string }) {
  return (
    <button onClick={() => onNavigate?.(s)} className="group relative flex min-h-12 items-center gap-2.5 rounded-[8px] border border-line bg-paper-raised px-2.5 py-1.5 text-left shadow-[var(--shadow-paper)] transition-colors hover:border-ink/35 hover:bg-paper-sunk">
      <span lang="zh-CN" className="zh-serif text-xl leading-none text-ink">
        {highlight
          ? Array.from(s).map((c, i) => (
              <span key={i} className={c === highlight ? "text-cinnabar" : undefined}>
                {c}
              </span>
            ))
          : s}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <Pinyin text={p} className="text-xs" />
          {hsk ? <span className="text-[10px] text-ink-faint">HSK {hsk}</span> : null}
        </span>
        <span className="block max-w-40 truncate text-xs text-ink-soft"><Mixed>{es}</Mixed></span>
      </span>
    </button>
  );
}

/* ---------------- Árbol de componentes ---------------- */
interface TreeNode {
  ch: string;
  children: TreeNode[];
  leaves: number;
}

function buildTree(root: string, depth: number): TreeNode {
  const comps = depth > 0 ? componentsOf(root).filter((c) => c !== root && c.length === 1) : [];
  const children = comps.map((c) => buildTree(c, depth - 1));
  return { ch: root, children, leaves: children.length ? children.reduce((a, c) => a + c.leaves, 0) : 1 };
}

const NODE = 56;
const GAP_X = 14;
const GAP_Y = 44;

/** Árbol de descomposición dibujado con líneas de tinta finas (SVG) y nodos pulsables. */
function ComponentTree({ root, info, onNavigate }: { root: string; info: CharInfo; onNavigate?: (w: string) => void }) {
  const tree = useMemo(() => buildTree(root, 2), [root]);
  const depth = tree.children.some((c) => c.children.length) ? 3 : 2;
  const width = tree.leaves * (NODE + GAP_X) - GAP_X;
  const height = depth * NODE + (depth - 1) * GAP_Y;

  // posiciones: cada nodo centrado sobre el espacio de sus hojas
  const nodes: { ch: string; x: number; y: number; level: number; parent?: { x: number; y: number } }[] = [];
  const place = (n: TreeNode, level: number, leafStart: number, parent?: { x: number; y: number }) => {
    const span = n.leaves * (NODE + GAP_X) - GAP_X;
    const x = leafStart * (NODE + GAP_X) + span / 2;
    const y = level * (NODE + GAP_Y) + NODE / 2;
    nodes.push({ ch: n.ch, x, y, level, parent });
    let offset = leafStart;
    for (const c of n.children) {
      place(c, level + 1, offset, { x, y });
      offset += c.leaves;
    }
  };
  place(tree, 0, 0);

  return (
    <div>
      <p className="mb-1.5 flex items-baseline gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
        Componentes
        <span lang="zh-CN" className="font-normal normal-case tracking-normal" title="Descomposición (IDS)">
          {info.decomposition}
        </span>
      </p>
      <div className="max-w-full overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin">
        <div className="relative mx-auto" style={{ width, height }}>
          <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden="true">
            {nodes
              .filter((n) => n.parent)
              .map((n, i) => {
                const p = n.parent!;
                const y0 = p.y + NODE / 2;
                const y1 = n.y - NODE / 2;
                const my = (y0 + y1) / 2;
                return <path key={i} d={`M${p.x} ${y0} C${p.x} ${my}, ${n.x} ${my}, ${n.x} ${y1}`} fill="none" stroke="rgb(var(--ink))" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round" />;
              })}
          </svg>
          {nodes.map((n, i) => {
            const isRoot = n.level === 0;
            const isRadical = !isRoot && n.ch === info.radical;
            const semantic = info.etymology?.semantic === n.ch;
            const phonetic = info.etymology?.phonetic === n.ch;
            const e = isRoot ? undefined : lookup(n.ch)[0];
            const ci = isRoot ? undefined : getCharInfo(n.ch);
            const label = e?.es ?? ci?.definition?.split(";")[0] ?? e?.en?.[0] ?? "";
            const inner = (
              <>
                <span lang="zh-CN" className={cn("zh-serif leading-none", isRoot ? "text-3xl" : "text-2xl")}>
                  {n.ch}
                </span>
                {semantic || phonetic ? <span className={cn("absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full border bg-paper-raised px-1 text-[9px] leading-3", semantic ? "border-celadon/60 text-celadon-ink" : "border-indigo/50 text-indigo")}>{semantic ? "sig." : "son."}</span> : null}
              </>
            );
            const cls = cn(
              "absolute flex items-center justify-center rounded-[8px] border transition-colors",
              isRoot ? "border-ink/60 bg-paper-raised text-ink" : isRadical ? "border-cinnabar bg-cinnabar/8 text-cinnabar hover:bg-cinnabar/16" : "border-line bg-paper-raised text-ink hover:border-ink/40 hover:bg-paper-sunk",
            );
            const style = { left: n.x - NODE / 2, top: n.y - NODE / 2, width: NODE, height: NODE };
            return isRoot ? (
              <div key={i} className={cls} style={style} aria-hidden="true">
                {inner}
              </div>
            ) : (
              <button key={i} onClick={() => onNavigate?.(n.ch)} className={cls} style={style} title={[label, isRadical ? "radical" : semantic ? "componente semántico (significado)" : phonetic ? "componente fonético (sonido)" : ""].filter(Boolean).join(" · ")} aria-label={`Componente ${n.ch}${label ? `: ${label}` : ""}`}>
                {inner}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export type { CharInfo };
