"use client";
/**
 * Ejercicio incrustado en un apunte: hueco, ordenar, traducir o elegir. Se practica dentro del propio apunte
 * con el motor de corrección de la app (lib/exercises/check) y, para traducir, con lib/correction.
 */
import { useMemo, useState } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { Dumbbell, RotateCcw } from "lucide-react";
import { usePack } from "@/lib/languages/provider";
import { check } from "@/lib/exercises/check";
import { tilesFromSentence } from "@/lib/exercises/generators";
import type { CheckResult, Exercise, Response } from "@/lib/exercises/types";
import { ExerciseView as CoreExerciseView } from "@/components/exercises/exercise-view";
import { Input, Select, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { TargetText } from "@/components/target/target-text";
import { cn, shuffle } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";
import { BlockFrame, useNoteEditorContext } from "./blocks";

export type EmbeddedKind = "fill" | "order" | "translate" | "choice";
export interface EmbeddedData {
  zh?: string; // frase (fill: con ＿; order/translate: completa)
  answer?: string; // fill: respuesta; choice: índice como texto
  options?: string; // fill/choice: separadas por «·» o «,»
  es?: string;
  py?: string;
  prompt?: string; // choice: pregunta
  explain?: string;
}

const EMPTY_DATA: EmbeddedData = {};
const splitOptions = (s?: string) => (s ?? "").split(/[·,，;；|]/).map((x) => x.trim()).filter(Boolean);

/** Construye el ejercicio del motor a partir de los atributos (null si faltan datos). */
export function buildEmbedded(kind: EmbeddedKind, d: EmbeddedData, tiles: (s: string) => string[], id = "embedded"): Exercise | null {
  switch (kind) {
    case "fill": {
      if (!d.zh || !d.answer || !d.zh.includes("＿")) return null;
      const opts = splitOptions(d.options);
      return { id, type: "fill-blank", skill: "grammar", itemId: d.zh, itemKind: "sentence", prompt: "Completa el hueco", zh: d.zh, answer: d.answer, options: opts.length >= 2 ? (opts.includes(d.answer) ? opts : [d.answer, ...opts]) : undefined, es: d.es ?? "", pinyin: d.py, explain: d.explain };
    }
    case "order": {
      if (!d.zh) return null;
      const answer = tilesFromSentence(d.zh, tiles);
      if (answer.length < 2) return null;
      let t = shuffle(answer);
      if (t.join("") === answer.join("") && t.length > 1) t = [...t.slice(1), t[0]];
      return { id, type: "order-words", skill: "grammar", itemId: d.zh, itemKind: "sentence", prompt: "Ordena las fichas", tiles: t, answer, zh: d.zh, es: d.es ?? "", pinyin: d.py, explain: d.explain };
    }
    case "choice": {
      const opts = splitOptions(d.options);
      const ans = Number(d.answer ?? 0);
      if (!d.prompt || opts.length < 2 || Number.isNaN(ans) || ans >= opts.length) return null;
      return { id, type: "choose-meaning", skill: "grammar", itemId: d.prompt, itemKind: "sentence", prompt: "Elige la opción correcta", display: { es: d.prompt }, options: opts.map((o) => ({ text: o, zh: /[一-鿿]/.test(o) })), answer: ans, explain: d.explain };
    }
    default:
      return null;
  }
}

function EditForm({ kind, data, onKind, onData }: { kind: EmbeddedKind; data: EmbeddedData; onKind: (k: EmbeddedKind) => void; onData: (d: EmbeddedData) => void }) {
  const pack = usePack();
  const set = (patch: EmbeddedData) => onData({ ...data, ...patch });
  const zhField = (label: string, key: keyof EmbeddedData, placeholder: string) => (
    <label className="block text-xs text-ink-faint">
      <span className="mb-0.5 block">{label}</span>
      <Input lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-base")} value={(data[key] as string) ?? ""} onChange={(e) => set({ [key]: e.target.value })} placeholder={placeholder} />
    </label>
  );
  const esField = (label: string, key: keyof EmbeddedData, placeholder = "") => (
    <label className="block text-xs text-ink-faint">
      <span className="mb-0.5 block">{label}</span>
      <Input value={(data[key] as string) ?? ""} onChange={(e) => set({ [key]: e.target.value })} placeholder={placeholder} />
    </label>
  );
  return (
    <div className="grid gap-2 sm:grid-cols-2" contentEditable={false}>
      <label className="block text-xs text-ink-faint sm:col-span-2">
        <span className="mb-0.5 block">Tipo</span>
        <Select value={kind} onChange={(e) => onKind(e.target.value as EmbeddedKind)} className="h-9">
          <option value="fill">Rellenar hueco (＿)</option>
          <option value="order">Ordenar la frase</option>
          <option value="translate">Traducir al chino (con corrección)</option>
          <option value="choice">Elegir opción</option>
        </Select>
      </label>
      {kind === "fill" ? (
        <>
          {zhField("Frase con ＿ en el hueco", "zh", "我＿家吃饭。")}
          {zhField("Respuesta", "answer", "在")}
          {zhField("Opciones (separadas por ·)", "options", "在 · 是 · 有 · 去")}
          {esField("Traducción", "es", "Como en casa.")}
        </>
      ) : null}
      {kind === "order" ? (
        <>
          {zhField("Frase correcta", "zh", "我今天在家吃饭。")}
          {esField("Traducción", "es", "Hoy como en casa.")}
        </>
      ) : null}
      {kind === "translate" ? (
        <>
          {esField("Frase en español", "es", "Hoy como en casa.")}
          {zhField("Respuesta(s) de referencia (separadas por ·)", "zh", "我今天在家吃饭。")}
        </>
      ) : null}
      {kind === "choice" ? (
        <>
          {esField("Pregunta", "prompt", "¿Cuál es correcta?")}
          {zhField("Opciones (separadas por ·)", "options", "我很高兴 · 我是很高兴")}
          {esField("Índice de la correcta (0, 1, 2…)", "answer", "0")}
        </>
      ) : null}
      <label className="block text-xs text-ink-faint sm:col-span-2">
        <span className="mb-0.5 block">Explicación tras responder</span>
        <Textarea value={data.explain ?? ""} onChange={(e) => set({ explain: e.target.value })} className="min-h-12" />
      </label>
    </div>
  );
}

/** Traducción con el motor de corrección por capas (lib/correction). */
function TranslateEmbedded({ data }: { data: EmbeddedData }) {
  const pack = usePack();
  const [answer, setAnswer] = useState("");
  const [report, setReport] = useState<import("@/lib/correction/types").CorrectionReport | null>(null);
  const refs = splitOptions(data.zh);
  const run = async () => {
    const { correct } = await import("@/lib/correction");
    setReport(await correct({ es: data.es ?? "", answer, references: refs, mode: /[一-鿿]/.test(answer) ? "hanzi" : "pinyin" }));
  };
  return (
    <div className="space-y-2" contentEditable={false}>
      <p className="text-sm text-ink"><Mixed>{data.es ?? ""}</Mixed></p>
      <div className="flex gap-2">
        <Input lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-base")} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Escribe en chino o en pinyin (ni3 hao3)" onKeyDown={(e) => e.key === "Enter" && void run()} disabled={!!report} />
        {report ? (
          <Button size="sm" variant="secondary" onClick={() => { setReport(null); setAnswer(""); }}>
            <RotateCcw /> otra vez
          </Button>
        ) : (
          <Button size="sm" variant="ink" onClick={() => void run()} disabled={!answer.trim()}>
            Corregir
          </Button>
        )}
      </div>
      {report ? <CorrectionSummary report={report} /> : null}
    </div>
  );
}

function CorrectionSummary({ report }: { report: import("@/lib/correction/types").CorrectionReport }) {
  const tone = report.verdict === "correct" ? "text-celadon-ink" : report.verdict === "improvable" ? "text-gold-ink" : "text-danger";
  return (
    <div className="rounded-[8px] border border-line bg-paper-sunk/50 p-2 text-sm">
      <p className={cn("font-medium", tone)}>
        {report.verdict === "correct" ? "✅ Correcta" : report.verdict === "improvable" ? "🟡 Correcta pero mejorable" : report.verdict === "partial" ? "Corrección parcial" : "❌ Incorrecta"} · {report.score}/100
      </p>
      {report.corrected ? <TargetText text={report.corrected} size="md" as="div" className="mt-1" /> : null}
      <ul className="mt-1 space-y-0.5 text-xs text-ink-soft">
        {report.errors.slice(0, 4).map((e, i) => (
          <li key={i}>
            <Mixed>{e.explanation}</Mixed>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExerciseView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const pack = usePack();
  const { readOnly } = useNoteEditorContext();
  const kind = (node.attrs.kind as EmbeddedKind) ?? "fill";
  const data = (node.attrs.data as EmbeddedData | undefined) ?? EMPTY_DATA;
  const [editing, setEditing] = useState(!data.zh && !data.es && !data.prompt && !readOnly);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [round, setRound] = useState(0);
  const ex = useMemo(() => buildEmbedded(kind, data, (s) => pack.exerciseAdapters.tiles(s), `emb-${round}`), [kind, data, pack, round]);
  const submit = (r: Response) => {
    if (!ex) return;
    setResult(check(ex, r));
  };
  return (
    <BlockFrame label="Ejercicio" icon={<Dumbbell className="size-3" />} selected={selected} editing={editing && !readOnly} onEdit={() => setEditing((e) => !e)} onDelete={deleteNode} tone="sunk">
      <div className="p-3 pr-16" contentEditable={false}>
        {editing && !readOnly ? (
          <EditForm kind={kind} data={data} onKind={(k) => updateAttributes({ kind: k })} onData={(d) => updateAttributes({ data: d })} />
        ) : kind === "translate" ? (
          <TranslateEmbedded data={data} />
        ) : ex ? (
          <div className="xb-embedded-exercise">
            <CoreExerciseView ex={ex} onSubmit={submit} result={result} />
            {result ? (
              <div className={cn("mt-2 flex items-start justify-between gap-2 rounded-[8px] border px-3 py-2 text-sm", result.correct ? "border-celadon/50 bg-celadon/10 text-celadon-ink" : "border-danger/40 bg-danger/8 text-danger")}>
                <span>
                  {result.correct ? "¡Correcto! " : "Incorrecto. "}
                  <Mixed>{result.explanation}</Mixed>
                </span>
                <Button size="sm" variant="ghost" onClick={() => { setResult(null); setRound((r) => r + 1); }}>
                  <RotateCcw /> otra vez
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-ink-faint">Ejercicio incompleto: pulsa el lápiz para rellenarlo.</p>
        )}
      </div>
    </BlockFrame>
  );
}
