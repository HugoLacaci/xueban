"use client";
/** Gráfica de curva de tono/altura en tinta: modelo (trazo discontinuo de tinta tenue) vs tú (trazo bermellón). */
export function PitchGraph({ model, user, height = 110, label = "╌╌ modelo · ── tú" }: { model: number[]; user: number[]; height?: number; label?: string }) {
  const w = 320;
  const all = [...model, ...user];
  const min = Math.min(-6, ...all);
  const max = Math.max(6, ...all);
  const path = (c: number[]) => c.map((v, i) => `${i === 0 ? "M" : "L"} ${(i / Math.max(1, c.length - 1)) * w} ${height - ((v - min) / (max - min)) * height}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-28 w-full rounded-[var(--radius-card)] border border-line bg-paper-raised shadow-[var(--shadow-paper)]" role="img" aria-label="Curva de tono: modelo frente a tu voz">
      <line x1="0" x2={w} y1={height / 2} y2={height / 2} stroke="rgb(var(--line))" strokeDasharray="3 3" />
      {model.length ? <path d={path(model)} fill="none" stroke="rgb(var(--ink-faint))" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {user.length ? <path d={path(user)} fill="none" stroke="rgb(var(--cinnabar))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
      <text x="8" y="15" fontSize="10" fill="rgb(var(--ink-faint))" fontFamily="var(--font-sans)">
        {label}
      </text>
    </svg>
  );
}
