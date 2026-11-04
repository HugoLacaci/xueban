"use client";
/**
 * Mi cuaderno de ejercicios 练习本: conjuntos de frases en español (por clase, fecha o tema) para traducir al chino
 * con corrección detallada por capas. Entrada masiva (texto o foto con OCR), 4 modos de respuesta, SRS por ítem,
 * historial de intentos y errores que entran solos en el 错题本.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ArrowRight, Camera, Check, ClipboardPaste, History, Plus, Play, Trash2, X, Lightbulb, Dumbbell } from "lucide-react";
import Link from "@/lib/languages/link";
import { useLangRouter } from "@/lib/languages/link";
import { db, type AnswerMode, type ExerciseItem, type ExerciseSet, type ItemAttempt } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { useSettings } from "@/lib/settings";
import { addItems, createSet, deleteItem, deleteSet, parseWorkbookText, recordAttempt, updateItem, workbookQueue } from "@/lib/notes/workbook";
import { getLexicon, useDictionary } from "@/lib/dictionary/service";
import { liveTonesText, onChangeWithTones } from "@/lib/correction/live-tones";
import type { CorrectionReport } from "@/lib/correction/types";
import { Button } from "@/components/ui/button";
import { Badge, Card, Dialog, DialogContent, EmptyState, Input, Label, PageHeader, Progress, Select, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { TargetText } from "@/components/target/target-text";
import { CorrectionPanel } from "@/components/correction/correction-panel";
import { AnswerInput, MODES } from "@/components/correction/answer-input";
import { cn, formatDate } from "@/lib/utils";
import { todayKey } from "@/lib/utils-date";
import { pageNative } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

const EMPTY_SETS: ExerciseSet[] = [];
const EMPTY_ITEMS: ExerciseItem[] = [];

export function WorkbookPage() {
  const pack = usePack();
  const sp = useSearchParams();
  const router = useLangRouter();
  const sets = useLiveQuery(() => db.exerciseSets.where("lang").equals(pack.id).reverse().sortBy("updatedAt"), [pack.id]) ?? EMPTY_SETS;
  const counts = useLiveQuery(async () => {
    const items = await db.exerciseItems.where("lang").equals(pack.id).toArray();
    const now = Date.now();
    const m: Record<string, { total: number; due: number; done: number }> = {};
    for (const i of items) {
      const c = (m[i.setId] ??= { total: 0, due: 0, done: 0 });
      c.total++;
      if (i.due <= now || i.state === 0) c.due++;
      if (i.attempts > 0) c.done++;
    }
    return m;
  }, [pack.id]) ?? {};
  const setId = sp.get("set");
  const dueMode = sp.get("due") === "1";
  const [creating, setCreating] = useState(false);
  const [practice, setPractice] = useState<ExerciseItem[] | null>(null);
  const [practiceTitle, setPracticeTitle] = useState("");

  const startPractice = async (id?: string, dueOnly = false) => {
    const q = await workbookQueue({ setId: id, dueOnly });
    if (!q.length) return toast.info("No hay frases que practicar", dueOnly ? "Nada pendiente ahora mismo." : "Añade frases al conjunto.");
    setPracticeTitle(id ? (sets.find((s) => s.id === id)?.title ?? "") : "Todos los conjuntos");
    setPractice(q);
  };
  const autoStarted = useRef(false);
  useEffect(() => {
    if (dueMode && !autoStarted.current) {
      autoStarted.current = true;
      void workbookQueue({ dueOnly: true }).then((q) => {
        if (q.length) {
          setPracticeTitle("Pendientes");
          setPractice(q);
        }
      });
    }
  }, [dueMode]);

  if (practice) return <PracticeSession items={practice} title={practiceTitle} onExit={() => { setPractice(null); if (dueMode) router.replace("/apuntes/cuaderno"); }} />;
  if (setId) return <SetView id={setId} onPractice={(due) => void startPractice(setId, due)} />;

  const totalDue = Object.values(counts).reduce((a, c) => a + c.due, 0);
  return (
    <div className="space-y-4">
      <Link href="/apuntes" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Apuntes
      </Link>
      <PageHeader
        title="Mi cuaderno de ejercicios"
        zh={pageNative("workbook")}
        subtitle="Las frases en español de tu cuaderno de papel, para traducirlas al chino con corrección detallada: veredicto, errores por colores, frase correcta con audio, alternativas, explicación y práctica extra. Cada fallo va al cuaderno de errores."
        action={
          <>
            <Button variant="outline" onClick={() => void startPractice(undefined, true)} disabled={!totalDue}>
              <Play /> Pendientes ({totalDue})
            </Button>
            <Button variant="ink" onClick={() => setCreating(true)}>
              <Plus /> Nuevo conjunto
            </Button>
          </>
        }
      />
      {sets.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {sets.map((s) => {
            const c = counts[s.id] ?? { total: 0, due: 0, done: 0 };
            return (
              <li key={s.id}>
                <Link href={`/apuntes/cuaderno?set=${s.id}`} className="card-paper flex items-start gap-3 p-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
                  <span lang="zh-CN" className="zh-serif mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-paper-sunk text-xl text-cinnabar" aria-hidden="true">
                    练
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink"><Mixed>{s.title}</Mixed></span>
                    <span className="block text-xs text-ink-faint">
                      {s.date ? `${s.date} · ` : ""}
                      {s.topic ? `${s.topic} · ` : ""}
                      {c.total} frases · {c.done} practicadas
                    </span>
                    <Progress value={c.total ? (c.done / c.total) * 100 : 0} className="mt-2 h-1" />
                  </span>
                  {c.due ? <Badge variant="lacquer">{c.due} pend.</Badge> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<Dumbbell />} title="Importa las frases de tu cuaderno" zh={{ zh: "熟能生巧。", py: "Shú néng shēng qiǎo.", es: "La práctica hace al maestro." }} description="Crea un conjunto por clase o tema y pega las frases (una por línea, con la solución del profesor tras | si la tienes) o haz una foto del cuaderno." action={<Button variant="ink" onClick={() => setCreating(true)}><Plus /> Nuevo conjunto</Button>} />
      )}
      <Card className="text-sm text-ink-soft">
        <p className="mb-1 font-medium text-ink">Cómo se corrige</p>
        <ol className="list-decimal space-y-0.5 pl-5 text-xs">
          <li>Se normaliza tu respuesta (puntuación, tradicional → simplificado, pinyin con números o tildes).</li>
          <li>Se compara con las soluciones (alineación palabra a palabra): faltas, sobras, orden, homófonos, tonos.</li>
          <li>Un «linter» de gramática HSK 1–2 revisa reglas aunque no haya solución (tiempo antes del verbo, <span lang="zh-CN">很, 不/没, 二/两</span>, clasificadores…).</li>
          <li>Si activas el tutor IA en Ajustes, añade alternativas y matices; las reglas verificadas siempre prevalecen.</li>
        </ol>
      </Card>
      <NewSetDialog open={creating} onOpenChange={setCreating} onCreated={(id) => router.push(`/apuntes/cuaderno?set=${id}`)} />
    </div>
  );
}

function NewSetDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const pack = usePack();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayKey());
  const [topic, setTopic] = useState("");
  const [unitId, setUnitId] = useState("");
  const [text, setText] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const rows = useMemo(() => parseWorkbookText(text), [text]);
  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    setOcrBusy(true);
    try {
      const { ocrImage } = await import("@/lib/notes/ocr");
      const r = await ocrImage(f, pack.id);
      setText((t) => (t ? `${t}\n${r.text}` : r.text));
      toast.info("Texto reconocido: revísalo antes de guardar");
    } catch (e) {
      toast.error("No se pudo leer la foto", (e as Error).message);
    } finally {
      setOcrBusy(false);
    }
  };
  const create = async () => {
    const s = await createSet({ title: title || (topic ? `Ejercicios: ${topic}` : `Clase ${date}`), date, topic, unitId: unitId || undefined, tags: unitId ? [unitId] : [] });
    const valid = rows.filter((r) => !r.error);
    if (valid.length) await addItems(s.id, valid.map((r) => ({ es: r.es, answers: r.answers, hint: r.hint, unitId: unitId || undefined })));
    onOpenChange(false);
    setText("");
    setTitle("");
    onCreated(s.id);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Nuevo conjunto de ejercicios" description="Por clase, fecha o tema. Pega las frases ahora o añádelas después." side="bottom" className="sm:max-w-2xl">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-ink-soft">Título</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Clase 3 nov · deberes p. 23" />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-ink-soft">Fecha</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="tabular" />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-ink-soft">Tema</span>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="在 + lugar, la familia…" />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-ink-soft">Unidad relacionada</span>
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="w-full">
              <option value="">—</option>
              {pack.curriculum.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="wb-text">Frases (una por línea; opcional: «español | solución · otra solución | pista»)</Label>
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={ocrBusy}>
              <Camera /> {ocrBusy ? "Leyendo…" : "Foto del cuaderno"}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} aria-label="Foto del cuaderno" />
          </div>
          <Textarea id="wb-text" value={text} onChange={(e) => setText(e.target.value)} className="min-h-36 font-mono text-sm" placeholder={"Hoy como en casa. | 我今天在家吃饭。 · 今天我在家吃饭。\nMi hermano tiene dos gatos.\n¿Dónde está el profesor? | 老师在哪儿？ | pista: 在 para «estar en»"} />
          {rows.length ? (
            <p className="mt-1 text-xs text-ink-faint">
              {rows.filter((r) => !r.error).length} frases · {rows.filter((r) => r.answers.length).length} con solución · {rows.filter((r) => r.error).length} con aviso
            </p>
          ) : null}
          {rows.filter((r) => r.error).slice(0, 3).map((r) => (
            <p key={r.line} className="text-xs text-danger">
              Línea {r.line}: {r.error}
            </p>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="ink" onClick={() => void create()}>
            <ClipboardPaste /> Crear{rows.length ? ` con ${rows.filter((r) => !r.error).length} frases` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SetView({ id, onPractice }: { id: string; onPractice: (dueOnly: boolean) => void }) {
  const pack = usePack();
  const router = useLangRouter();
  const set = useLiveQuery(() => db.exerciseSets.get(id), [id]);
  const items = useLiveQuery(() => db.exerciseItems.where("setId").equals(id).sortBy("order"), [id]) ?? EMPTY_ITEMS;
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const rows = useMemo(() => parseWorkbookText(text), [text]);
  const [now] = useState(() => Date.now());
  if (!set) return <Card className="text-sm text-ink-faint">Conjunto no encontrado.</Card>;
  const due = items.filter((i) => i.due <= now || i.state === 0).length;
  return (
    <div className="space-y-4">
      <Link href="/apuntes/cuaderno" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Cuaderno de ejercicios
      </Link>
      <PageHeader
        title={set.title}
        zh="练习本"
        subtitle={`${set.date ?? ""}${set.topic ? ` · ${set.topic}` : ""} · ${items.length} frases${due ? ` · ${due} pendientes` : ""}`}
        action={
          <>
            <Button variant="outline" onClick={() => setAdding(true)}>
              <Plus /> Añadir frases
            </Button>
            <Button variant="ink" onClick={() => onPractice(false)} disabled={!items.length}>
              <Play /> Practicar
            </Button>
          </>
        }
      />
      {adding ? (
        <Card className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-28 font-mono text-sm" placeholder={"Una frase por línea · español | solución · otra | pista"} aria-label="Frases nuevas" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <Button variant="ink" onClick={async () => { await addItems(id, rows.filter((r) => !r.error).map((r) => ({ es: r.es, answers: r.answers, hint: r.hint, unitId: set.unitId }))); setText(""); setAdding(false); }} disabled={!rows.filter((r) => !r.error).length}>
              Añadir {rows.filter((r) => !r.error).length}
            </Button>
          </div>
        </Card>
      ) : null}
      <ol className="space-y-2">
        {items.map((it, i) => (
          <li key={it.id} className="card-paper p-3">
            <div className="flex items-start gap-3">
              <span className="tabular mt-0.5 w-6 shrink-0 text-right text-xs text-ink-faint">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                {editing === it.id ? (
                  <ItemEditor item={it} onDone={() => setEditing(null)} />
                ) : (
                  <>
                    <p className="text-ink"><Mixed>{it.es}</Mixed></p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-faint">
                      {it.answers.length ? (
                        <span className="inline-flex items-center gap-1 text-celadon-ink">
                          <Check className="size-3" /> {it.answers.length} solución{it.answers.length > 1 ? "es" : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gold-ink">
                          <Lightbulb className="size-3" /> sin solución del profesor: corrección por reglas
                        </span>
                      )}
                      {it.attempts ? (
                        <span>
                          {it.attempts} intento{it.attempts > 1 ? "s" : ""} · última nota {it.lastScore ?? "—"}
                        </span>
                      ) : null}
                      {it.hint ? <span>pista: <Mixed>{it.hint}</Mixed></span> : null}
                    </p>
                    <ItemAnswer item={it} setTitle={set.title} />
                  </>
                )}
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button size="icon-sm" variant="ghost" onClick={() => setHistory(history === it.id ? null : it.id)} aria-label="Historial de intentos">
                  <History />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => setEditing(editing === it.id ? null : it.id)} aria-label="Editar">
                  <Plus className="rotate-45" />
                </Button>
                <Button size="icon-sm" variant="ghost" className="text-danger" onClick={() => void deleteItem(it.id)} aria-label="Borrar frase">
                  <Trash2 />
                </Button>
              </div>
            </div>
            {history === it.id ? <AttemptHistory itemId={it.id} /> : null}
          </li>
        ))}
      </ol>
      {!items.length ? <p className="text-sm text-ink-faint">Este conjunto está vacío: añade frases.</p> : null}
      <div className="flex justify-end">
        <Button variant="ghost" className="text-danger hover:text-danger" onClick={async () => { if (window.confirm("¿Borrar este conjunto y sus frases?")) { await deleteSet(id); router.push("/apuntes/cuaderno"); } }}>
          <Trash2 /> Borrar conjunto
        </Button>
      </div>
      <p className="text-xs text-ink-faint">{pack.id === "zh" ? "" : "El motor de corrección por reglas solo existe para el chino."}</p>
    </div>
  );
}

const splitAnswers = (s: string) => s.split(/\s*[·;\n]\s*/).map((a) => a.trim()).filter(Boolean);

/**
 * Responder una frase desde la lista, sin abrir una sesión: escribe tu respuesta (se guarda sola), añade si quieres
 * la corrección del profesor y pulsa «Corregir» cuando quieras. Muestra el panel por capas y si coincide con el profesor.
 */
function ItemAnswer({ item, setTitle }: { item: ExerciseItem; setTitle?: string }) {
  const pack = usePack();
  const tutorOn = useSettings((s) => Boolean(s.settings.tutor?.provider && s.settings.tutor.provider !== "none" && s.settings.tutor.correct));
  const joined = item.answers.join(" · ");
  const [answer, setAnswer] = useState(liveTonesText(item.myAnswer ?? ""));
  const [teacher, setTeacher] = useState(liveTonesText(joined));
  const [seenJoined, setSeenJoined] = useState(joined);
  if (seenJoined !== joined) {
    // la solución se editó desde el editor de la frase
    setSeenJoined(joined);
    setTeacher(liveTonesText(joined));
  }
  const [report, setReport] = useState<CorrectionReport | null>(null);
  const [match, setMatch] = useState<{ kind: "same" | "equivalent" | "different"; teacher: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const saveDraft = () => {
    if ((item.myAnswer ?? "") !== answer) void updateItem(item.id, { myAnswer: answer });
  };
  const saveTeacher = () => {
    const refs = splitAnswers(teacher);
    if (refs.join(" · ") !== joined) void updateItem(item.id, { answers: refs });
    return refs;
  };
  const run = async () => {
    if (!answer.trim()) return;
    setBusy(true);
    try {
      saveDraft();
      const refs = saveTeacher();
      // el diccionario hace falta para pasar a hanzi una solución en pinyin (audio) y para segmentar
      if (useDictionary.getState().status !== "ready") await useDictionary.getState().load().catch(() => undefined);
      const { correct, normalizeAnswer } = await import("@/lib/correction");
      const tutor = tutorOn ? (await import("@/lib/tutor/corrector")).tutorCorrector : undefined;
      const mode: AnswerMode = normalizeAnswer(answer).kind === "pinyin" ? "pinyin" : "hanzi";
      const r = await correct({ es: item.es, answer, references: refs, mode, hint: item.hint, grammarIds: item.grammarIds, useTutor: tutorOn }, { lexicon: getLexicon(), tutor });
      setReport(r);
      if (refs.length) {
        const mine = normalizeAnswer(answer).text;
        const same = refs.find((x) => normalizeAnswer(x).text === mine);
        setMatch(same ? { kind: "same", teacher: same } : { kind: r.verdict === "correct" ? "equivalent" : "different", teacher: refs[0] });
      } else setMatch(null);
      await recordAttempt({ ...item, answers: refs }, mode, answer, r, { setTitle });
    } catch (e) {
      toast.error("No se pudo corregir", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 space-y-2 border-t border-line/70 pt-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-ink-soft">Mi respuesta</span>
          <Input
            value={answer}
            onChange={(e) => onChangeWithTones(e, setAnswer)}
            onBlur={saveDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") void run();
            }}
            lang={pack.bcp47}
            className={cn("text-lg", pack.meta.cssClass)}
            placeholder="hanzi o pinyin (wo3 zai4 jia1…)"
            aria-label={`Mi respuesta: ${item.es}`}
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-ink-soft">Corrección del profesor (opcional)</span>
          <Input value={teacher} onChange={(e) => onChangeWithTones(e, setTeacher)} onBlur={() => void saveTeacher()} lang={pack.bcp47} className={cn("text-lg", pack.meta.cssClass)} placeholder="la frase que te dio el profesor · otra válida" aria-label={`Corrección del profesor: ${item.es}`} />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!teacher.trim() ? <span className="mr-auto text-[11px] text-ink-faint">Sin corrección del profesor se corrige con las reglas de gramática{tutorOn ? " y el tutor" : ""}.</span> : null}
        <Button size="sm" variant="ink" onClick={() => void run()} disabled={busy || !answer.trim()}>
          <Check /> {busy ? "Corrigiendo…" : "Corregir"}
        </Button>
      </div>
      {match ? (
        <p
          role="status"
          className={cn(
            "rounded-[8px] border px-3 py-2 text-sm",
            match.kind === "same" && "border-celadon/50 bg-celadon/10 text-celadon-ink",
            match.kind === "equivalent" && "border-gold/50 bg-gold/10 text-gold-ink",
            match.kind === "different" && "border-danger/40 bg-danger/8 text-danger",
          )}
        >
          {match.kind === "same" ? "✓ Coincide con la corrección del profesor." : match.kind === "equivalent" ? "Es correcta, pero no es la frase exacta del profesor:" : "No coincide con la corrección del profesor:"}
          {match.kind !== "same" ? (
            <span lang={pack.bcp47} className={cn("ml-2 text-base text-ink", pack.meta.cssClass)}>
              {liveTonesText(match.teacher)}
            </span>
          ) : null}
        </p>
      ) : null}
      {report ? <CorrectionPanel report={report} es={item.es} /> : null}
    </div>
  );
}

function ItemEditor({ item, onDone }: { item: ExerciseItem; onDone: () => void }) {
  const [es, setEs] = useState(item.es);
  const [answers, setAnswers] = useState(item.answers.join(" · "));
  const [hint, setHint] = useState(item.hint ?? "");
  return (
    <div className="space-y-1.5">
      <Input value={es} onChange={(e) => setEs(e.target.value)} aria-label="Frase en español" />
      <Input value={answers} onChange={(e) => onChangeWithTones(e, setAnswers)} lang="zh-CN" className="zh" placeholder="soluciones separadas por ·" aria-label="Soluciones" />
      <Input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="pista" aria-label="Pista" />
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button size="sm" variant="ink" onClick={async () => { await updateItem(item.id, { es, answers: answers.split(/\s*[·;]\s*/).map((a) => a.trim()).filter(Boolean), hint: hint || undefined }); onDone(); }}>
          Guardar
        </Button>
      </div>
    </div>
  );
}

function AttemptHistory({ itemId }: { itemId: string }) {
  const attempts = useLiveQuery(() => db.itemAttempts.where("itemId").equals(itemId).reverse().sortBy("at"), [itemId]) ?? ([] as ItemAttempt[]);
  const pack = usePack();
  if (!attempts.length) return <p className="mt-2 border-t border-line/70 pt-2 text-xs text-ink-faint">Sin intentos todavía.</p>;
  return (
    <ul className="mt-2 space-y-1 border-t border-line/70 pt-2 text-xs">
      {attempts.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center gap-2">
          <span className="tabular text-ink-faint">{formatDate(a.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          <Badge variant={a.verdict === "correct" ? "jade" : a.verdict === "improvable" ? "gold" : a.verdict === "partial" ? "muted" : "lacquer"}>{a.score}</Badge>
          <span lang={pack.bcp47} className={pack.meta.cssClass}>
            {a.answer}
          </span>
          <span className="text-ink-faint">({MODES.find((m) => m.id === a.mode)?.label})</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ sesión de práctica */

function PracticeSession({ items, title, onExit }: { items: ExerciseItem[]; title: string; onExit: () => void }) {
  const pack = usePack();
  const tutorOn = useSettings((s) => s.settings.tutor?.provider && s.settings.tutor.provider !== "none");
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<AnswerMode>("hanzi");
  const [answer, setAnswer] = useState("");
  const [report, setReport] = useState<CorrectionReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [extra, setExtra] = useState<{ es: string; zh: string } | null>(null);
  const [results, setResults] = useState<CorrectionReport["verdict"][]>([]);
  const item = items[idx];
  const sets = useLiveQuery(() => db.exerciseSets.where("lang").equals(pack.id).toArray(), [pack.id]) ?? EMPTY_SETS;

  const submit = async () => {
    if (!item || !answer.trim()) return;
    setBusy(true);
    try {
      // el diccionario hace falta para pasar a hanzi una solución en pinyin (audio) y para segmentar
      if (useDictionary.getState().status !== "ready") await useDictionary.getState().load().catch(() => undefined);
      const { correct } = await import("@/lib/correction");
      const tutor = tutorOn ? (await import("@/lib/tutor/corrector")).tutorCorrector : undefined;
      const target = extra ?? { es: item.es, zh: "" };
      const r = await correct({ es: target.es, answer, references: extra ? [extra.zh] : item.answers, mode, hint: item.hint, grammarIds: item.grammarIds, useTutor: Boolean(tutorOn) }, { lexicon: getLexicon(), tutor });
      setReport(r);
      if (!extra) {
        await recordAttempt(item, mode, answer, r, { setTitle: sets.find((s) => s.id === item.setId)?.title });
        setResults((x) => [...x, r.verdict]);
      }
    } finally {
      setBusy(false);
    }
  };
  const next = () => {
    setReport(null);
    setAnswer("");
    setExtra(null);
    setIdx((i) => i + 1);
  };
  const practiceExtra = (x: { es: string; zh: string }) => {
    setExtra(x);
    setReport(null);
    setAnswer("");
  };

  if (!item) {
    const ok = results.filter((r) => r === "correct").length;
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState title="Sesión terminada" zh={{ zh: "熟能生巧。", py: "Shú néng shēng qiǎo.", es: "La práctica hace al maestro." }} description={`${ok} de ${results.length} correctas. Los errores están en tu cuaderno de errores y las frases volverán cuando toque.`} action={<div className="flex gap-2"><Button variant="ink" onClick={onExit}>Volver</Button><Button variant="outline" asChild><Link href="/apuntes/errores">Ver errores</Link></Button></div>} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-xs text-ink-faint">
        <button type="button" onClick={onExit} className="inline-flex items-center gap-1 hover:text-ink">
          <X className="size-4" /> Salir
        </button>
        <span className="truncate"><Mixed>{title}</Mixed></span>
        <span className="tabular">
          {idx + 1} / {items.length}
        </span>
      </div>
      <Progress value={(idx / items.length) * 100} className="h-1.5" />
      <Card className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{extra ? "Práctica extra · misma estructura" : "Traduce al chino"}</p>
        <p className="font-serif-es text-2xl leading-snug text-ink"><Mixed>{extra ? extra.es : item.es}</Mixed></p>
        {item.hint && !extra ? (
          <details className="text-xs text-ink-faint">
            <summary className="cursor-pointer">pista</summary>
            <Mixed>{item.hint}</Mixed>
          </details>
        ) : null}
        {!report ? (
          <>
            <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Cómo responder">
              {MODES.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => { setMode(m.id); setAnswer(""); }} title={m.hint} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", mode === m.id ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink/40")}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
            <AnswerInput mode={mode} value={answer} onChange={setAnswer} onSubmit={() => void submit()} disabled={busy} autoFocus />
            {!item.answers.length && !extra ? <p className="text-[11px] text-ink-faint">Esta frase no tiene solución del profesor: se corregirá solo con las reglas de gramática{tutorOn ? " y el tutor" : ""}.</p> : null}
          </>
        ) : null}
      </Card>
      {report ? (
        <>
          <CorrectionPanel report={report} es={extra ? extra.es : item.es} onPractice={practiceExtra} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => { setReport(null); setAnswer(""); }}>
              Otra vez
            </Button>
            {extra ? (
              <Button variant="ink" onClick={() => { setExtra(null); setReport(null); setAnswer(""); }}>
                Volver a la frase
              </Button>
            ) : (
              <Button variant="ink" size="lg" onClick={next}>
                {idx + 1 >= items.length ? "Terminar" : "Siguiente"} <ArrowRight />
              </Button>
            )}
            <TargetText text="" size="sm" className="hidden" />
          </div>
        </>
      ) : null}
    </div>
  );
}
