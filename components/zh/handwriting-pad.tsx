"use client";
import { useEffect, useRef, useState } from "react";
import { Eraser, Undo2 } from "lucide-react";
import { loadMedians, recognize, type Candidate, type Stroke } from "@/lib/handwriting";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HandwritingPad({
  onCandidates,
  size = 240,
  className,
}: {
  onCandidates: (c: Candidate[]) => void;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const mediansRef = useRef<Record<string, number[][][]> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadMedians()
      .then((m) => {
        mediansRef.current = m;
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const redraw = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(5, size / 36);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#1c1915";
    const all = current.current ? [...strokesRef.current, current.current] : strokesRef.current;
    for (const s of all) {
      if (s.length < 2) {
        if (s.length === 1) {
          ctx.beginPath();
          ctx.arc(s[0][0] * size, s[0][1] * size, ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();
        }
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(s[0][0] * size, s[0][1] * size);
      for (const [x, y] of s.slice(1)) ctx.lineTo(x * size, y * size);
      ctx.stroke();
    }
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr;
    c.height = size * dpr;
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const run = () => {
    if (!mediansRef.current) return;
    onCandidates(recognize(strokesRef.current, mediansRef.current, 10));
  };
  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(run, 250);
  };

  const pos = (e: React.PointerEvent): [number, number] => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <canvas
        ref={canvasRef}
        className="tianzige touch-none rounded-lg"
        style={{ width: size, height: size }}
        aria-label="Zona para dibujar el carácter"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          current.current = [pos(e)];
          redraw();
        }}
        onPointerMove={(e) => {
          if (!current.current) return;
          current.current.push(pos(e));
          redraw();
        }}
        onPointerUp={() => {
          if (current.current) strokesRef.current.push(current.current);
          current.current = null;
          redraw();
          schedule();
        }}
        onPointerCancel={() => {
          current.current = null;
          redraw();
        }}
      />
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            strokesRef.current.pop();
            redraw();
            schedule();
          }}
        >
          <Undo2 /> Deshacer trazo
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            strokesRef.current = [];
            redraw();
            onCandidates([]);
          }}
        >
          <Eraser /> Borrar
        </Button>
      </div>
      <p className="max-w-[260px] text-center text-xs text-muted">
        {status === "loading" ? "Cargando reconocedor…" : status === "error" ? "Sin datos de reconocimiento (ejecuta npm run data:build)." : "Dibuja el carácter trazo a trazo, en orden. Reconoce caracteres HSK 1–4."}
      </p>
    </div>
  );
}
