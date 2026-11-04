"use client";
/**
 * Origen y evolución de un carácter: tira de evolución (oráculo → bronce → sello → clerical → regular, SVG de
 * Wikimedia Commons con créditos), diagrama animado «cómo se formó» (女 + 子 = 好; 氵 + 每 = 海), pictograma animado
 * (dibujo propio que se transforma en el carácter) y familias (red de caracteres por radical y componente fonético).
 */
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { getCharInfo, lookupFirst, radicalInfo } from "@/lib/languages/zh/dictionary";
import { wordPinyin } from "@/lib/languages/zh/pinyin/convert";
import { familyOf, glyphUrl, loadGlyphIndex, loadPictograms, STAGE_INFO, type GlyphIndex, type Pictogram, type Stage } from "@/lib/hanzi/origin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Hanzi } from "@/components/target/target-text";
import { Reading } from "@/components/target/reading";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

/* ------------------------------------------------------------------ tira de evolución */

export function EvolutionStrip({ ch, compact, onNavigate }: { ch: string; compact?: boolean; onNavigate?: (c: string) => void }) {
  const [index, setIndex] = useState<GlyphIndex | null | undefined>(undefined);
  useEffect(() => {
    void loadGlyphIndex().then(setIndex);
  }, []);
  const entry = index?.chars[ch];
  if (index === undefined) return null;
  if (!entry || !entry.stages.length) {
    return <p className="text-xs text-ink-faint">Sin formas antiguas descargadas para <span lang="zh-CN">{ch}</span> (ejecuta <code className="rounded bg-paper-sunk px-1">npm run glyphs:fetch -- --chars=<span lang="zh-CN">{ch}</span></code>; solo se guardan archivos con licencia libre de Wikimedia Commons).</p>;
  }
  const order: Stage[] = ["oracle", "bronze", "bigseal", "seal", "clerical", "kaishu"];
  const stages = order.filter((s) => entry.stages.includes(s));
  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        {stages.map((s, i) => (
          <div key={s} className="flex items-end gap-2">
            <figure className="flex flex-col items-center">
              <span className={cn("flex items-center justify-center rounded-[8px] border border-line bg-paper-raised", compact ? "size-14" : "size-20")}>
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG local de Wikimedia Commons */}
                <img src={glyphUrl(ch, s)} alt={`${ch} en ${STAGE_INFO[s].es}`} className={cn("object-contain p-1.5 dark:invert", compact ? "size-14" : "size-20")} loading="lazy" />
              </span>
              <figcaption className="mt-1 text-center text-[10px] leading-tight text-ink-faint">
                <span lang="zh-CN" className="zh-kai block text-xs text-ink-soft">{STAGE_INFO[s].zh}</span>
                {STAGE_INFO[s].es}
                {!compact ? <span className="block">{STAGE_INFO[s].when}</span> : null}
              </figcaption>
            </figure>
            {i < stages.length - 1 ? <span className="mb-8 text-ink-faint">→</span> : null}
          </div>
        ))}
        <div className="flex items-end gap-2">
          <span className="mb-8 text-ink-faint">→</span>
          <figure className="flex flex-col items-center">
            <button type="button" onClick={() => onNavigate?.(ch)} className={cn("flex items-center justify-center rounded-[8px] border border-cinnabar/50 bg-paper-raised", compact ? "size-14" : "size-20")}>
              <Hanzi text={ch} size={compact ? "lg" : "xl"} font="serif" />
            </button>
            <figcaption className="mt-1 text-center text-[10px] text-ink-faint">
              <span lang="zh-CN" className="zh-kai block text-xs text-ink-soft">简体</span>hoy
            </figcaption>
          </figure>
        </div>
      </div>
      {!compact ? (
        <p className="mt-2 text-[10px] leading-snug text-ink-faint">
          Imágenes: Wikimedia Commons ·{" "}
          {entry.credits.map((c, i) => (
            <span key={c.file}>
              <a href={c.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                {STAGE_INFO[c.stage as Stage]?.es ?? c.stage}
              </a>{" "}
              ({c.license}
              {c.author ? `, ${c.author.slice(0, 40)}` : ""}){i < entry.credits.length - 1 ? " · " : ""}
            </span>
          ))}
          <ExternalLink className="ml-1 inline size-2.5" />
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ cómo se formó */

export function FormationDiagram({ ch, onNavigate }: { ch: string; onNavigate?: (c: string) => void }) {
  const info = getCharInfo(ch);
  const [play, setPlay] = useState(0);
  if (!info) return null;
  const ety = info.etymology;
  const comps = info.decomposition ? Array.from(info.decomposition).filter((c) => /[㐀-鿿]/.test(c) && c !== ch).slice(0, 3) : [];
  if (!comps.length) return <p className="text-sm text-ink-soft">{ch} no se descompone: es un {ety?.type === "pictographic" ? "pictograma (dibuja el objeto)" : ety?.type === "ideographic" ? "indicativo (señala una idea)" : "carácter de una pieza"}.</p>;
  const role = (c: string) => (ety?.type === "pictophonetic" ? (c === ety.semantic ? "significado" : c === ety.phonetic ? "sonido" : "") : "");
  return (
    <div>
      <div key={play} className="flex flex-wrap items-center justify-center gap-2 py-2">
        {comps.map((c, i) => {
          const r = role(c);
          const meaning = radicalInfo(c)?.meaning ?? lookupFirst(c)?.es?.split(/[;,(]/)[0].trim();
          return (
            <span key={c} className="flex items-center gap-2">
              <button type="button" onClick={() => onNavigate?.(c)} className={cn("flex flex-col items-center rounded-[10px] border px-3 py-2 motion-safe:animate-[pop_.5s_var(--ease-ink)_both]", r === "sonido" ? "border-gold bg-gold/10" : r === "significado" ? "border-celadon bg-celadon/10" : "border-line bg-paper-raised")} style={{ animationDelay: `${i * 250}ms` }}>
                <Hanzi text={c} size="xl" font="serif" />
                <span className="text-[11px] text-ink-faint">
                  {r === "sonido" ? <Reading text={wordPinyin(c)} className="text-xs" /> : meaning ? <Mixed>{meaning}</Mixed> : ""}
                </span>
                {r ? <Badge variant={r === "sonido" ? "gold" : "jade"}>{r}</Badge> : null}
              </button>
              <span className="text-xl text-ink-faint">{i < comps.length - 1 ? "+" : "="}</span>
            </span>
          );
        })}
        <span className="flex flex-col items-center rounded-[10px] border border-cinnabar/50 bg-paper-raised px-3 py-2 motion-safe:animate-[pop_.5s_var(--ease-ink)_both]" style={{ animationDelay: `${comps.length * 250}ms` }}>
          <Hanzi text={ch} size="2xl" font="serif" />
          <Reading text={wordPinyin(ch)} className="text-sm" />
          <span className="text-[11px] text-ink-faint"><Mixed>{lookupFirst(ch)?.es?.split(/[;,(]/)[0].trim() ?? ""}</Mixed></span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-soft">
          <Mixed>{ety?.type === "pictophonetic" ? `Compuesto fono-semántico: ${ety.semantic ?? "?"} aporta el campo de significado y ${ety.phonetic ?? "?"} la pronunciación.` : ety?.type === "ideographic" ? "Compuesto de significado (会意): la suma de las partes sugiere la idea." : "Descomposición según Make Me a Hanzi."}</Mixed>
          {ety?.hint ? <span className="block text-ink-faint">Pista (en inglés, Make Me a Hanzi): <Mixed>{ety.hint}</Mixed></span> : null}
        </p>
        <Button size="sm" variant="ghost" onClick={() => setPlay((p) => p + 1)} aria-label="Repetir animación">
          <Play />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pictograma animado */

export function PictogramMorph({ ch, size = 160, auto = true }: { ch: string; size?: number; auto?: boolean }) {
  const [p, setP] = useState<Pictogram | null | undefined>(undefined);
  const [phase, setPhase] = useState<0 | 1 | 2>(0); // 0 dibujo, 1 oráculo, 2 carácter
  useEffect(() => {
    void loadPictograms().then((all) => setP(all.find((x) => x.c === ch) ?? null));
  }, [ch]);
  useEffect(() => {
    if (!auto || !p) return;
    const t = setInterval(() => setPhase((x) => ((x + 1) % 3) as 0 | 1 | 2), 1800);
    return () => clearInterval(t);
  }, [auto, p]);
  if (!p) return null;
  const label = phase === 0 ? "dibujo" : phase === 1 ? "hueso oracular (aprox.)" : "carácter moderno";
  return (
    <figure className="inline-flex flex-col items-center">
      <button type="button" onClick={() => setPhase((x) => ((x + 1) % 3) as 0 | 1 | 2)} className="relative rounded-[12px] border border-line bg-paper-raised" style={{ width: size, height: size }} aria-label={`Pictograma de ${p.c}: ${label}`}>
        <svg viewBox="0 0 100 100" className={cn("absolute inset-0 size-full p-2 text-ink transition-opacity duration-500", phase === 0 ? "opacity-100" : "opacity-0")} aria-hidden="true">
          <path d={p.drawing} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {p.oracle ? (
          <svg viewBox="0 0 100 100" className={cn("absolute inset-0 size-full p-2 text-ink-soft transition-opacity duration-500", phase === 1 ? "opacity-100" : "opacity-0")} aria-hidden="true">
            <path d={p.oracle} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
        <span className={cn("absolute inset-0 flex items-center justify-center transition-opacity duration-500", phase === 2 || (phase === 1 && !p.oracle) ? "opacity-100" : "opacity-0")}>
          <Hanzi text={p.c} size="3xl" font="serif" />
        </span>
      </button>
      <figcaption className="mt-1 text-center text-[11px] text-ink-faint">
        {label} · <Reading text={p.pinyin} className="text-xs" /> · <Mixed>{p.es}</Mixed>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ familias */

export function CharacterFamilies({ ch, pool, onNavigate }: { ch: string; pool?: Set<string>; onNavigate?: (c: string) => void }) {
  const fam = useMemo(() => familyOf(ch, pool), [ch, pool]);
  if (!fam.byRadical.chars.length && !fam.byPhonetic?.chars.length && !fam.components.length) return null;
  return (
    <div className="space-y-3">
      <FamilyGroup title="Mismo radical" label={fam.byRadical.key} chars={fam.byRadical.chars} tone="jade" onNavigate={onNavigate} />
      {fam.byPhonetic ? <FamilyGroup title="Mismo componente fonético" label={fam.byPhonetic.key} chars={fam.byPhonetic.chars} tone="gold" onNavigate={onNavigate} /> : null}
      {fam.components.slice(0, 2).map((c) => (
        <FamilyGroup key={c.c} title="Comparten" label={c.c} chars={c.chars} tone="outline" onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function FamilyGroup({ title, label, chars, tone, onNavigate }: { title: string; label: string; chars: string[]; tone: "jade" | "gold" | "outline"; onNavigate?: (c: string) => void }) {
  if (!chars.length) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {title} <Badge variant={tone}><span lang="zh-CN">{label}</span></Badge>
      </p>
      <div className="flex flex-wrap gap-1">
        {chars.slice(0, 24).map((c) => (
          <button key={c} type="button" onClick={() => onNavigate?.(c)} className="flex flex-col items-center rounded-[6px] border border-line bg-paper-raised px-1.5 py-0.5 hover:border-ink/40" title={lookupFirst(c)?.es ?? ""}>
            <Hanzi text={c} size="md" font="serif" />
            <Reading text={wordPinyin(c)} className="text-[10px]" />
          </button>
        ))}
      </div>
    </div>
  );
}
