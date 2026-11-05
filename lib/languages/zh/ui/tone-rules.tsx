"use client";
/**
 * Módulos de la Etapa 0:
 *  - <ChaoDiagram> (e0-10): esquema de los 5 niveles de Chao con los cuatro tonos (55, 35, 214 → 21, 51) y el neutro,
 *    color por tono, audio de 妈 麻 马 骂 吗 y notación con tildes y con números.
 *  - <PinyinRules> (e0-07): reglas de escritura del pinyin con ejemplos que suenan y el juego «¿dónde va la tilde?».
 */
import { useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { addToneMark, type Tone } from "../pinyin/tones";
import { playText } from "@/components/target/audio-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Chao */

const CHAO: { tone: 1 | 2 | 3 | 4 | 5; name: string; chao: string; pts: [number, number][]; zh: string; py: string; es: string; hand: string }[] = [
  { tone: 1, name: "1.er tono", chao: "55", pts: [[0, 5], [1, 5]], zh: "妈", py: "mā", es: "mamá", hand: "La mano se queda arriba, recta: como cantar una nota larga y aguda." },
  { tone: 2, name: "2.º tono", chao: "35", pts: [[0, 3], [1, 5]], zh: "麻", py: "má", es: "cáñamo; entumecido", hand: "La mano sube en diagonal: como un «¿eh?» de sorpresa." },
  { tone: 3, name: "3.er tono", chao: "214", pts: [[0, 2], [0.45, 1], [1, 4]], zh: "马", py: "mǎ", es: "caballo", hand: "La mano baja hasta el fondo y vuelve a subir: un «vaya…» grave." },
  { tone: 4, name: "4.º tono", chao: "51", pts: [[0, 5], [1, 1]], zh: "骂", py: "mà", es: "regañar", hand: "La mano cae de golpe: como una orden seca, «¡ya!»." },
];
const HALF_THIRD: [number, number][] = [[0, 2], [1, 1]];

export function ChaoDiagram() {
  const [active, setActive] = useState<number | null>(null);
  const [half, setHalf] = useState(false);
  const W = 300;
  const H = 200;
  const x0 = 72;
  const y = (lv: number) => H - 20 - ((lv - 1) / 4) * (H - 40);
  const path = (pts: [number, number][]) => pts.map(([t, lv], i) => `${i ? "L" : "M"}${x0 + 20 + t * (W - x0 - 40)} ${y(lv)}`).join(" ");
  return (
    <div className="space-y-3" data-chao>
      <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <figure className="rounded-[12px] border border-line bg-paper-raised p-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Esquema de los cinco niveles de Chao con los cuatro tonos">
            {[1, 2, 3, 4, 5].map((lv) => (
              <g key={lv}>
                <line x1={x0} x2={W - 10} y1={y(lv)} y2={y(lv)} stroke="rgb(var(--line))" strokeDasharray={lv === 3 ? "0" : "3 4"} />
                <text x={x0 - 10} y={y(lv) + 4} textAnchor="end" fontSize="12" fill="rgb(var(--ink-faint))">{lv}</text>
              </g>
            ))}
            <text x={4} y={y(5) + 4} fontSize="10" fill="rgb(var(--ink-faint))">agudo</text>
            <text x={4} y={y(1) + 4} fontSize="10" fill="rgb(var(--ink-faint))">grave</text>
            {CHAO.map((t, i) => (
              <path key={t.tone} d={path(t.tone === 3 && half ? HALF_THIRD : t.pts)} fill="none" strokeWidth={active === null || active === i ? 4 : 2} strokeLinecap="round" strokeLinejoin="round" className={cn(`tone-${t.tone}`, "transition-opacity")} stroke="currentColor" opacity={active === null || active === i ? 1 : 0.2} strokeDasharray={t.tone === 3 && half ? "6 5" : undefined} />
            ))}
            {/* tono neutro: punto corto, su altura depende del tono anterior */}
            <circle cx={W - 24} cy={y(2.5)} r={5} className="tone-5" fill="currentColor" opacity={active === null || active === 4 ? 1 : 0.2} />
          </svg>
          <figcaption className="px-1 text-[11px] text-ink-faint">
            Niveles de altura del 1 (grave) al 5 (agudo), según Chao Yuen Ren. {half ? "El 3.er tono se muestra como «medio tercer tono» (21): así suena casi siempre delante de otra sílaba." : "El 3.er tono completo (214) solo suena entero aislado o al final de frase."}
          </figcaption>
        </figure>
        <ul className="space-y-1.5">
          {CHAO.map((t, i) => (
            <li key={t.tone}>
              <button type="button" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => void playText(t.zh, 0.8)} className="flex w-full items-start gap-3 rounded-[10px] border border-line bg-paper-raised px-3 py-2 text-left hover:border-ink/40">
                <span lang="zh-CN" className={cn("zh text-2xl leading-none", `tone-${t.tone}`)}>{t.zh}</span>
                <span className="min-w-0">
                  <span className={cn("block text-sm font-semibold", `tone-${t.tone}`)}>
                    {t.name} · {t.py} · {t.tone === 3 && half ? "21" : t.chao} · <span className="font-mono">ma{t.tone}</span>
                  </span>
                  <span className="block text-xs text-ink-soft">{t.es} — {t.hand}</span>
                </span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onMouseEnter={() => setActive(4)} onMouseLeave={() => setActive(null)} onClick={() => void playText("妈妈吗", 0.8)} className="flex w-full items-start gap-3 rounded-[10px] border border-line bg-paper-raised px-3 py-2 text-left hover:border-ink/40">
              <span lang="zh-CN" className="zh tone-5 text-2xl leading-none">吗</span>
              <span className="min-w-0">
                <span className="tone-5 block text-sm font-semibold">tono neutro · ma (sin tilde) · <span className="font-mono">ma5 / ma0</span></span>
                <span className="block text-xs text-ink-soft">Corto y suave; su altura depende de la sílaba anterior (más alto tras el 3.er tono). Aparece en partículas (吗, 呢) y en la segunda sílaba de muchas palabras (妈妈, 谢谢).</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={half ? "default" : "outline"} onClick={() => setHalf((h) => !h)} aria-pressed={half}>
          Medio tercer tono (21)
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void playText("妈麻马骂", 0.7)}>Oír los cuatro seguidos</Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ reglas del pinyin */

const RULES: { title: string; rule: string; ex: { from: string; to: string; zh: string }[] }[] = [
  { title: "y y w al principio", rule: "Si la sílaba no tiene inicial y empieza por i, u o ü, se escribe con y o w: i → yi, ia → ya; u → wu, ua → wa; ü → yu.", ex: [{ from: "i", to: "yī", zh: "一" }, { from: "uo", to: "wǒ", zh: "我" }, { from: "ü", to: "yú", zh: "鱼" }] },
  { title: "La ü pierde los puntos", rule: "Tras j, q, x e y, la ü se escribe u (no hay confusión posible: j q x nunca van con u). Tras n y l se mantienen los puntos: nǚ, lǜ.", ex: [{ from: "qü", to: "qù", zh: "去" }, { from: "xüe", to: "xué", zh: "学" }, { from: "nü", to: "nǚ", zh: "女" }] },
  { title: "Finales abreviadas", rule: "Tras una inicial, iou → iu, uei → ui, uen → un. La vocal del medio se sigue oyendo un poco.", ex: [{ from: "liou", to: "liù", zh: "六" }, { from: "duei", to: "duì", zh: "对" }, { from: "shuei", to: "shuǐ", zh: "水" }] },
  { title: "Dónde va la tilde", rule: "Sobre la a si la hay; si no, sobre la o o la e; en iu y ui, sobre la segunda vocal; si solo hay una vocal, sobre ella.", ex: [{ from: "hao3", to: "hǎo", zh: "好" }, { from: "dui4", to: "duì", zh: "对" }, { from: "liu4", to: "liù", zh: "六" }] },
  { title: "Apóstrofo", rule: "Cuando una sílaba que empieza por a, o, e va detrás de otra dentro de la misma palabra, se separa con ’ para no confundir: Xī’ān (西安, dos sílabas) no es xiān (先).", ex: [{ from: "Xi + an", to: "Xī'ān", zh: "西安" }, { from: "nü + er", to: "nǚ'ér", zh: "女儿" }] },
  { title: "Mayúsculas y palabras juntas", rule: "Las sílabas de una palabra se escriben juntas (xuésheng, Zhōngguó); los nombres propios y el principio de frase, con mayúscula.", ex: [{ from: "zhong guo", to: "Zhōngguó", zh: "中国" }, { from: "bei jing", to: "Běijīng", zh: "北京" }] },
];

/** Vocal que lleva la tilde según la regla (índice en la sílaba). */
export function toneVowelIndex(syl: string): number {
  const s = syl.toLowerCase();
  for (const v of ["a", "o", "e"]) if (s.includes(v)) return s.indexOf(v);
  if (s.includes("iu")) return s.indexOf("iu") + 1;
  if (s.includes("ui")) return s.indexOf("ui") + 1;
  const m = s.search(/[iuü]/);
  return m;
}

const QUIZ: { syl: string; tone: Tone; zh: string }[] = [
  { syl: "hao", tone: 3, zh: "好" },
  { syl: "dui", tone: 4, zh: "对" },
  { syl: "liu", tone: 4, zh: "六" },
  { syl: "xie", tone: 4, zh: "谢" },
  { syl: "guo", tone: 2, zh: "国" },
  { syl: "shui", tone: 3, zh: "水" },
  { syl: "jiu", tone: 3, zh: "九" },
  { syl: "lou", tone: 2, zh: "楼" },
  { syl: "xue", tone: 2, zh: "学" },
  { syl: "kuai", tone: 4, zh: "快" },
];

export function PinyinRules() {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const q = QUIZ[i % QUIZ.length];
  const right = useMemo(() => toneVowelIndex(q.syl), [q]);
  const pick = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (k === right) setScore((s) => s + 1);
    void playText(q.zh, 0.8);
  };
  return (
    <div className="space-y-4" data-pinyin-rules>
      <ol className="space-y-2">
        {RULES.map((r, n) => (
          <li key={n} className="rounded-[10px] border border-line bg-paper-raised p-3">
            <p className="text-sm font-semibold text-ink">{n + 1}. {r.title}</p>
            <p className="text-sm text-ink-soft">{r.rule}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.ex.map((e) => (
                <button key={e.to} type="button" onClick={() => void playText(e.zh, 0.8)} className="flex items-center gap-1.5 rounded-[8px] border border-line px-2 py-1 text-sm hover:bg-paper-sunk">
                  <span className="font-mono text-ink-faint line-through decoration-ink-faint/40">{e.from}</span>
                  <span className="text-ink-faint">→</span>
                  <span className="pinyin">{e.to}</span>
                  <span lang="zh-CN" className="zh text-ink">{e.zh}</span>
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <div className="rounded-[12px] border border-cinnabar/40 bg-cinnabar/5 p-3">
        <p className="mb-2 text-sm font-semibold text-ink">¿Dónde va la tilde? <span className="font-normal text-ink-faint">({score} aciertos)</span></p>
        <p className="mb-2 text-xs text-ink-soft">Pulsa la vocal que lleva la marca del {q.tone}.º tono:</p>
        <div className="flex items-center gap-1">
          {Array.from(q.syl).map((c, k) => (
            <button key={k} type="button" onClick={() => pick(k)} disabled={picked !== null || !/[aeiouü]/.test(c)} className={cn("min-h-11 min-w-10 rounded-[8px] border font-mono text-xl", picked === null ? "border-line bg-paper-raised hover:border-ink/40 disabled:opacity-50" : k === right ? "border-celadon bg-celadon/15 text-celadon-ink" : k === picked ? "border-cinnabar bg-cinnabar/10 text-cinnabar" : "border-line opacity-60")}>
              {c}
            </button>
          ))}
          {picked !== null ? (
            <span className="ml-3 flex items-center gap-1 text-sm">
              {picked === right ? <Check className="size-4 text-celadon-ink" /> : <X className="size-4 text-cinnabar" />}
              <span className="pinyin text-base">{addToneMark(q.syl, q.tone)}</span>
              <span lang="zh-CN" className="zh">{q.zh}</span>
            </span>
          ) : null}
        </div>
        {picked !== null ? (
          <Button size="sm" className="mt-2" onClick={() => {
            setI((x) => x + 1);
            setPicked(null);
          }}>
            <RotateCcw /> Otra
          </Button>
        ) : null}
      </div>
    </div>
  );
}
