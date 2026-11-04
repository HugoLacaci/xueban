"use client";
/**
 * Lienzo de dibujo a mano (copiar caracteres, esquemas, mnemotecnias). Guarda un PNG pequeño en los atributos.
 */
import { useEffect, useRef, useState } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { Eraser, PenLine, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BlockFrame, useNoteEditorContext } from "./blocks";

type Pt = [number, number];

export function DrawingView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { readOnly } = useNoteEditorContext();
  const { data, width, height } = node.attrs as { data: string; width: number; height: number };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);
  const drawing = useRef(false);
  const [pen, setPen] = useState<"ink" | "cinnabar" | "erase">("ink");
  const [tick, setTick] = useState(0);

  // pinta el PNG guardado al montar
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !data) return;
    const ctx = c.getContext("2d");
    const img = new Image();
    img.onload = () => ctx?.drawImage(img, 0, 0, c.width, c.height);
    img.src = data;
  }, [data]);

  const color = () => (pen === "cinnabar" ? "#B83A2B" : pen === "erase" ? "#FBF7EF" : "#1C1A17");

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * width, ((e.clientY - r.top) / r.height) * height];
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    strokes.current.push([pos(e)]);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const s = strokes.current[strokes.current.length - 1];
    const p = pos(e);
    const prev = s[s.length - 1];
    s.push(p);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = color();
    ctx.lineWidth = pen === "erase" ? 18 : e.pressure > 0 && e.pointerType === "pen" ? 2 + e.pressure * 5 : 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(prev[0], prev[1]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    save();
  };
  const save = () => {
    const c = canvasRef.current;
    if (!c) return;
    updateAttributes({ data: c.toDataURL("image/png") });
    setTick((t) => t + 1);
  };
  const redraw = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#FBF7EF";
    ctx.fillRect(0, 0, c.width, c.height);
    for (const s of strokes.current) {
      ctx.strokeStyle = "#1C1A17";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      s.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    }
  };
  const undo = () => {
    strokes.current.pop();
    redraw();
    save();
  };
  const clear = () => {
    strokes.current = [];
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#FBF7EF";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    save();
  };

  return (
    <BlockFrame label="Dibujo" icon={<PenLine className="size-3" />} selected={selected} onDelete={deleteNode}>
      <div className="p-2" contentEditable={false}>
        {!readOnly ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-1">
            {(["ink", "cinnabar", "erase"] as const).map((p) => (
              <button key={p} type="button" onClick={() => setPen(p)} aria-pressed={pen === p} className={cn("flex h-7 items-center gap-1 rounded-full border px-2 text-xs", pen === p ? "border-ink bg-ink text-paper" : "border-line text-ink-soft")}>
                {p === "erase" ? <Eraser className="size-3" /> : <span className={cn("size-3 rounded-full", p === "ink" ? "bg-ink" : "bg-cinnabar")} />}
                {p === "ink" ? "tinta" : p === "cinnabar" ? "bermellón" : "goma"}
              </button>
            ))}
            <Button size="sm" variant="ghost" onClick={undo} aria-label="Deshacer trazo">
              <Undo2 /> deshacer
            </Button>
            <Button size="sm" variant="ghost" onClick={clear}>
              borrar todo
            </Button>
            <span className="ml-auto text-[10px] text-ink-faint" aria-hidden="true">
              {tick ? "guardado" : ""}
            </span>
          </div>
        ) : null}
        <canvas ref={canvasRef} width={width} height={height} className={cn("tianzige-faint w-full touch-none rounded-[8px] border border-line bg-[#FBF7EF]", !readOnly && "cursor-crosshair")} style={{ aspectRatio: `${width} / ${height}` }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} aria-label="Lienzo de dibujo" role="img" />
      </div>
    </BlockFrame>
  );
}
