"use client";
/**
 * Grafo de conexiones entre apuntes (enlaces [[…]], etiquetas compartidas y palabras en común): SVG con
 * disposición por fuerzas sencilla (sin librerías). Clic en un nodo → abre el apunte.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft } from "lucide-react";
import Link from "@/lib/languages/link";
import { useLangRouter } from "@/lib/languages/link";
import { db, type Note } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { templateFor } from "@/lib/notes/templates";
import { PageHeader, Switch, Label } from "@/components/ui/primitives";
import { seededRandom } from "@/lib/utils";

interface GNode {
  id: string;
  title: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  builtin: boolean;
}
interface GEdge {
  a: string;
  b: string;
  kind: "link" | "tag" | "word";
}

const EMPTY: Note[] = [];

function buildGraph(notes: Note[], opts: { tags: boolean; words: boolean }): { nodes: GNode[]; edges: GEdge[] } {
  const rng = seededRandom(3);
  const byId = new Map(notes.map((n) => [n.id, n]));
  const byTitle = new Map(notes.map((n) => [n.title.toLowerCase(), n]));
  const nodes: GNode[] = notes.map((n) => ({ id: n.id, title: n.title, type: n.type, x: 300 + (rng() - 0.5) * 400, y: 250 + (rng() - 0.5) * 300, vx: 0, vy: 0, builtin: Boolean(n.builtin) }));
  const edges: GEdge[] = [];
  const seen = new Set<string>();
  const add = (a: string, b: string, kind: GEdge["kind"]) => {
    if (a === b) return;
    const k = [a, b].sort().join("|");
    if (seen.has(k)) return;
    seen.add(k);
    edges.push({ a, b, kind });
  };
  for (const n of notes) {
    for (const l of n.links) {
      const t = byId.get(l) ?? byTitle.get(l.toLowerCase());
      if (t) add(n.id, t.id, "link");
    }
  }
  if (opts.tags) {
    const byTag = new Map<string, string[]>();
    for (const n of notes) for (const t of n.tags) byTag.set(t, [...(byTag.get(t) ?? []), n.id]);
    for (const ids of byTag.values()) if (ids.length <= 12) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) add(ids[i], ids[j], "tag");
  }
  if (opts.words) {
    const byWord = new Map<string, string[]>();
    for (const n of notes) for (const w of n.wordIds) byWord.set(w, [...(byWord.get(w) ?? []), n.id]);
    for (const ids of byWord.values()) if (ids.length <= 8) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) add(ids[i], ids[j], "word");
  }
  return { nodes, edges };
}

function layout(nodes: GNode[], edges: GEdge[], w: number, h: number, iterations = 220) {
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  for (let it = 0; it < iterations; it++) {
    const t = 1 - it / iterations;
    // repulsión
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          dx = 1;
          dy = 1;
          d2 = 2;
        }
        const f = 2600 / d2;
        const d = Math.sqrt(d2);
        a.vx += (dx / d) * f;
        a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f;
        b.vy -= (dy / d) * f;
      }
    }
    // atracción por aristas
    for (const e of edges) {
      const a = nodes[idx.get(e.a)!];
      const b = nodes[idx.get(e.b)!];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const k = e.kind === "link" ? 0.03 : 0.012;
      const f = (d - 90) * k;
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    }
    // gravedad al centro + integración
    for (const n of nodes) {
      n.vx += (w / 2 - n.x) * 0.004;
      n.vy += (h / 2 - n.y) * 0.004;
      n.x += n.vx * 0.12 * t + n.vx * 0.02;
      n.y += n.vy * 0.12 * t + n.vy * 0.02;
      n.vx *= 0.6;
      n.vy *= 0.6;
      n.x = Math.max(24, Math.min(w - 24, n.x));
      n.y = Math.max(24, Math.min(h - 24, n.y));
    }
  }
}

const COLORS: Record<string, string> = { grammar: "rgb(var(--cinnabar))", contrast: "rgb(var(--tone-4))", word: "rgb(var(--tone-3))", phrase: "rgb(var(--tone-2))", question: "rgb(var(--gold))", particle: "rgb(var(--indigo))", error: "rgb(var(--danger))", class: "rgb(var(--celadon))" };

export function NotesGraphPage() {
  const pack = usePack();
  const router = useLangRouter();
  const notes = useLiveQuery(() => db.notes.where("lang").equals(pack.id).filter((n) => n.status === "active").toArray(), [pack.id]) ?? EMPTY;
  const [tags, setTags] = useState(true);
  const [words, setWords] = useState(false);
  const [teacher, setTeacher] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 560 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: Math.max(420, Math.min(720, el.clientWidth * 0.62)) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const filtered = useMemo(() => notes.filter((n) => teacher || !n.builtin), [notes, teacher]);
  const graph = useMemo(() => {
    const g = buildGraph(filtered, { tags, words });
    layout(g.nodes, g.edges, size.w, size.h);
    return g;
  }, [filtered, tags, words, size]);
  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of graph.edges) {
      m.set(e.a, (m.get(e.a) ?? new Set()).add(e.b));
      m.set(e.b, (m.get(e.b) ?? new Set()).add(e.a));
    }
    return m;
  }, [graph]);

  return (
    <div className="space-y-4">
      <Link href="/apuntes" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Apuntes
      </Link>
      <PageHeader title="Grafo de apuntes" zh="笔记网" subtitle="Cómo se conectan tus apuntes: enlaces [[…]] (líneas de tinta), etiquetas compartidas (punteadas) y palabras en común. Pulsa un nodo para abrirlo." />
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <Label className="flex items-center gap-2">
          <Switch checked={tags} onCheckedChange={setTags} /> etiquetas
        </Label>
        <Label className="flex items-center gap-2">
          <Switch checked={words} onCheckedChange={setWords} /> palabras en común
        </Label>
        <Label className="flex items-center gap-2">
          <Switch checked={teacher} onCheckedChange={setTeacher} /> apuntes del profesor
        </Label>
        <span className="ml-auto text-ink-faint tabular">
          {graph.nodes.length} apuntes · {graph.edges.length} conexiones
        </span>
      </div>
      <div ref={ref} className="card-paper overflow-hidden p-0">
        {graph.nodes.length ? (
          <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} role="img" aria-label="Grafo de apuntes" className="block">
            {graph.edges.map((e, i) => {
              const a = graph.nodes.find((n) => n.id === e.a)!;
              const b = graph.nodes.find((n) => n.id === e.b)!;
              const hl = hover && (e.a === hover || e.b === hover);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hl ? "rgb(var(--cinnabar))" : "rgb(var(--ink))"} strokeOpacity={hl ? 0.8 : e.kind === "link" ? 0.35 : 0.12} strokeWidth={e.kind === "link" ? 1.5 : 1} strokeDasharray={e.kind === "link" ? undefined : "3 4"} />;
            })}
            {graph.nodes.map((n) => {
              const deg = neighbors.get(n.id)?.size ?? 0;
              const r = 6 + Math.min(10, deg * 1.5);
              const dim = hover && hover !== n.id && !neighbors.get(hover)?.has(n.id);
              return (
                <g key={n.id} className="graph-node" transform={`translate(${n.x},${n.y})`} opacity={dim ? 0.25 : 1} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} onClick={() => router.push(`/apuntes/${encodeURIComponent(n.id)}`)} tabIndex={0} role="link" aria-label={n.title} onKeyDown={(e) => e.key === "Enter" && router.push(`/apuntes/${encodeURIComponent(n.id)}`)}>
                  <circle r={r} fill={COLORS[n.type] ?? "rgb(var(--ink-faint))"} fillOpacity={n.builtin ? 0.45 : 0.9} stroke="rgb(var(--paper-raised))" strokeWidth={2} />
                  <text y={r + 11} textAnchor="middle" fontSize={10} fill="rgb(var(--ink-soft))" className="pointer-events-none select-none" lang={pack.hasTargetText(n.title) ? pack.bcp47 : undefined}>
                    {n.title.length > 22 ? `${n.title.slice(0, 21)}…` : n.title}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="p-8 text-center text-sm text-ink-faint">Aún no hay apuntes que conectar.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-ink-faint">
        {Object.entries(COLORS).map(([t, c]) => (
          <span key={t} className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-full" style={{ background: c }} /> {templateFor(t as Note["type"]).name}
          </span>
        ))}
      </div>
    </div>
  );
}
