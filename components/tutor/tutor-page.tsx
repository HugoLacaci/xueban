"use client";
/**
 * Tutor 老师: conversación por escenarios con misión, chat libre, corrector (capas 1–4), explicador con búsqueda
 * local y citas, generador de ejercicios, planificador y modo voz. Sin IA configurada: guía de activación en 3 pasos,
 * role-plays escritos a mano y corrector por reglas. Nada queda vacío.
 */
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Check, Dumbbell, ExternalLink, Flag, Loader2, MessageCircle, Mic, NotebookPen, Save, Send, Settings, Sparkles, Square, Target, Volume2, Wand2, X, CalendarCheck, Users } from "lucide-react";
import Link from "@/lib/languages/link";
import { useLangRouter } from "@/lib/languages/link";
import { db, type Chat, type ChatMessage } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { useSettings } from "@/lib/settings";
import { tutorConfigured, providerInfo } from "@/lib/tutor/providers";
import { SCENARIOS, type Scenario as AiScenario } from "@/lib/tutor/prompts";
import { appendMessage, markActionDone, newChat, runAction, saveChatAsNote, sendTurn, type TutorMode } from "@/lib/tutor/chat";
import { dailyScenario, loadAllRoleplays, type Scenario } from "@/lib/tutor/roleplays";
import { recognizeOnce, speak, speechRecognitionAvailable, stopSpeaking } from "@/lib/tts";
import { getLexicon } from "@/lib/dictionary/service";
import type { CorrectionReport } from "@/lib/correction/types";
import type { Exercise } from "@/lib/exercises/types";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Input, PageHeader, Textarea, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { TargetText } from "@/components/target/target-text";
import { AudioButton } from "@/components/target/audio-button";
import { AnswerInput } from "@/components/correction/answer-input";
import { CorrectionPanel } from "@/components/correction/correction-panel";
import { ExerciseRunner, type SessionSummary } from "@/components/exercises/runner";
import { SummaryCard } from "@/components/learn/steps";
import { RoleplayPlayer } from "./roleplay";
import { cn, formatDate } from "@/lib/utils";
import { pageNative } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

const EMPTY_CHATS: Chat[] = [];

export function TutorPage() {
  const pack = usePack();
  const sp = useSearchParams();
  const settings = useSettings((s) => s.settings);
  const configured = tutorConfigured(settings.tutor);
  const [tab, setTab] = useState<string>(sp.get("mode") === "explainer" || sp.get("mode") === "corrector" ? sp.get("mode")! : sp.get("daily") ? "roleplay" : configured ? "scenario" : "roleplay");
  const noteId = sp.get("note");
  // si hay un Ollama en este PC y no se ha elegido proveedor, el tutor se activa solo
  useEffect(() => {
    if (pack.id !== "zh" || configured) return;
    let alive = true;
    void import("@/lib/tutor/autodetect").then(async (m) => {
      const r = await m.autoConfigureTutor();
      if (alive && r) {
        toast.success("Tutor activado con Ollama", `Modelo ${r.model}, en tu PC y gratis. Puedes cambiarlo en Ajustes.`);
        setTab("scenario");
      }
    });
    return () => {
      alive = false;
    };
  }, [pack.id, configured]);

  if (pack.id !== "zh") {
    return (
      <div>
        <PageHeader title="Tutor" zh={pageNative("tutor")} subtitle="El tutor y los role-plays existen por ahora solo para el chino." />
        <EmptyState icon={<MessageCircle />} title="Pendiente para este idioma" description="Cambia al chino en el selector de la cabecera para usar el tutor." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tutor 老师"
        zh={pageNative("tutor")}
        subtitle={configured ? `Habla a tu nivel, corrige con suavidad y te hace preguntas. Proveedor: ${providerInfo(settings.tutor.provider)?.name ?? settings.tutor.provider}.` : "Sin IA configurada: practica con los role-plays por turnos y el corrector por reglas. Activa el tutor gratis en 3 pasos cuando quieras."}
        action={
          <Button variant="outline" asChild>
            <Link href="/ajustes#tutor">
              <Settings /> {configured ? "Ajustes del tutor" : "Activar el tutor"}
            </Link>
          </Button>
        }
      />
      {!configured ? <ActivationGuide /> : null}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="roleplay">
            <Users className="mr-1 size-4" /> Role-plays
          </TabsTrigger>
          <TabsTrigger value="corrector">
            <Check className="mr-1 size-4" /> Corrector
          </TabsTrigger>
          <TabsTrigger value="scenario" disabled={!configured}>
            <Target className="mr-1 size-4" /> Escenarios IA
          </TabsTrigger>
          <TabsTrigger value="free" disabled={!configured}>
            <MessageCircle className="mr-1 size-4" /> Chat libre
          </TabsTrigger>
          <TabsTrigger value="explainer" disabled={!configured}>
            <BookOpen className="mr-1 size-4" /> Explicador
          </TabsTrigger>
          <TabsTrigger value="generator" disabled={!configured}>
            <Wand2 className="mr-1 size-4" /> Generador
          </TabsTrigger>
          <TabsTrigger value="planner" disabled={!configured}>
            <CalendarCheck className="mr-1 size-4" /> Planificador
          </TabsTrigger>
          <TabsTrigger value="voice" disabled={!configured}>
            <Mic className="mr-1 size-4" /> Voz
          </TabsTrigger>
        </TabsList>
        <TabsContent value="roleplay">
          <RoleplayHub daily={sp.get("daily") === "1"} />
        </TabsContent>
        <TabsContent value="corrector">
          <CorrectorBox />
        </TabsContent>
        <TabsContent value="scenario">{configured ? <ScenarioChat /> : null}</TabsContent>
        <TabsContent value="free">{configured ? <ChatView mode="free" title="Chat libre" intro="Escribe en chino (o en español si te atascas). El tutor responde a tu nivel y te hace preguntas." /> : null}</TabsContent>
        <TabsContent value="explainer">{configured ? <ChatView mode="explainer" title="Explicador" intro="Pregunta una duda («¿por qué aquí va 了?», «¿diferencia entre 会 y 能?»). Responde apoyándose en tus apuntes y la gramática de la app, y cita lo que usa." noteId={noteId ?? undefined} /> : null}</TabsContent>
        <TabsContent value="generator">{configured ? <GeneratorView /> : null}</TabsContent>
        <TabsContent value="planner">{configured ? <ChatView mode="planner" title="¿Qué estudio hoy?" intro="Basado en tus estadísticas, repasos y errores." autoFirst="¿Qué estudio hoy?" /> : null}</TabsContent>
        <TabsContent value="voice">{configured ? <ChatView mode="voice" title="Modo voz (manos libres)" intro="Pulsa el micrófono, habla en chino; el tutor responde y lo lee en voz alta. Turnos claros." voice /> : null}</TabsContent>
      </Tabs>
    </div>
  );
}

function ActivationGuide() {
  return (
    <Card className="border-gold/40 bg-gold/8">
      <p className="mb-2 font-medium text-ink">Activar el tutor (gratis) en 3 pasos</p>
      <ol className="grid gap-2 text-sm text-ink-soft sm:grid-cols-3">
        <li className="rounded-[8px] bg-paper-raised/70 p-3">
          <span className="font-serif-es text-xl text-cinnabar">1</span> Elige: <strong>Ollama</strong> en tu PC (privado, sin límites; recomendado qwen3.5:9b, va bien con 8 GB de gráfica) o una clave gratuita de <strong>Gemini</strong>, <strong>Groq</strong> u <strong>OpenRouter</strong>.
        </li>
        <li className="rounded-[8px] bg-paper-raised/70 p-3">
          <span className="font-serif-es text-xl text-cinnabar">2</span> Con Ollama: instala desde{" "}
          <a href="https://ollama.com/download" target="_blank" rel="noreferrer" className="text-indigo underline-offset-2 hover:underline">
            ollama.com <ExternalLink className="inline size-3" />
          </a>{" "}
          y ejecuta <code className="rounded bg-paper-sunk px-1">ollama pull qwen3.5:9b</code>. Con nube: crea la clave en la web del proveedor.
        </li>
        <li className="rounded-[8px] bg-paper-raised/70 p-3">
          <span className="font-serif-es text-xl text-cinnabar">3</span> En{" "}
          <Link href="/ajustes#tutor" className="text-indigo underline-offset-2 hover:underline">
            Ajustes → Tutor IA
          </Link>{" "}
          elige el proveedor, pega la clave (se queda en tu navegador) y pulsa «Probar conexión».
        </li>
      </ol>
      <p className="mt-3 text-xs text-ink-soft">
        <strong>¿Ya tienes Ollama abierto?</strong> El tutor se activa solo al entrar aquí. En la web publicada, Chrome pregunta si la página puede acceder a tu red local o a este dispositivo: pulsa <strong>Permitir</strong>. Si lo bloqueaste, pulsa el icono a la izquierda de la dirección → Configuración del sitio → «Acceso a la red local» → Permitir, y recarga.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ role-plays sin IA */

function RoleplayHub({ daily }: { daily: boolean }) {
  const pack = usePack();
  const [all, setAll] = useState<Scenario[] | null>(null);
  const [current, setCurrent] = useState<Scenario | null>(null);
  const [unit, setUnit] = useState("");
  useEffect(() => {
    void loadAllRoleplays().then(setAll);
    if (daily) void dailyScenario().then((s) => s && setCurrent(s));
  }, [daily]);
  if (current) return <RoleplayPlayer scenario={current} onExit={() => setCurrent(null)} />;
  const units = pack.curriculum.units.filter((u) => u.level !== 0);
  const list = (all ?? []).filter((s) => !unit || s.unitId === unit);
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">Diálogos por turnos escritos a mano: la app hace de camarero, taxista, profesor… Habla (o escribe) en tu turno y la conversación avanza según lo que digas. Funciona sin IA.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ink" onClick={() => void dailyScenario().then((s) => s && setCurrent(s))} disabled={!all?.length}>
          <Sparkles /> Conversación del día
        </Button>
        <select value={unit} onChange={(e) => setUnit(e.target.value)} className="h-9 rounded-[8px] border border-line bg-paper-sunk/70 px-2 text-sm" aria-label="Unidad">
          <option value="">todas las unidades</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.title}
            </option>
          ))}
        </select>
      </div>
      {all === null ? (
        <p className="text-sm text-ink-faint">Cargando escenarios…</p>
      ) : list.length ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setCurrent(s)} className="card-paper flex h-full w-full flex-col items-start gap-1 p-3 text-left transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
                <span lang="zh-CN" className="zh-kai text-base text-cinnabar">
                  {s.zh}
                </span>
                <span className="font-medium text-ink"><Mixed>{s.title}</Mixed></span>
                <span className="line-clamp-2 text-xs text-ink-faint"><Mixed>{s.setting}</Mixed></span>
                <span className="mt-auto flex flex-wrap gap-1 pt-1">
                  <Badge variant="outline">{s.goals.length} objetivos</Badge>
                  {s.level ? <Badge variant="jade">HSK {s.level}</Badge> : null}
                  <Badge variant="muted">{units.find((u) => u.id === s.unitId)?.title ?? s.unitId}</Badge>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Users />} title="Aún no hay role-plays" description="Los escenarios escritos a mano se incluyen en content/zh/roleplays." />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ corrector de frases sueltas */

function CorrectorBox() {
  const settings = useSettings((s) => s.settings);
  const [es, setEs] = useState("");
  const [answer, setAnswer] = useState("");
  const [refs, setRefs] = useState("");
  const [report, setReport] = useState<CorrectionReport | null>(null);
  const [busy, setBusy] = useState(false);
  const tutorOn = tutorConfigured(settings.tutor) && settings.tutor.correct;
  const run = async () => {
    setBusy(true);
    try {
      const { correct } = await import("@/lib/correction");
      const tutor = tutorOn ? (await import("@/lib/tutor/corrector")).tutorCorrector : undefined;
      const r = await correct({ es, answer, references: refs.split(/\s*[·;]\s*/).map((x) => x.trim()).filter(Boolean), useTutor: tutorOn }, { lexicon: getLexicon(), tutor });
      setReport(r);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Card className="space-y-3">
        <p className="text-sm text-ink-soft">Corrige una frase suelta: lo que querías decir, lo que escribiste y, si la tienes, la solución del profesor. {tutorOn ? "El tutor añade alternativas y matices; las reglas verificadas prevalecen." : "Sin tutor se aplican las reglas de gramática HSK 1–2."}</p>
        <Input value={es} onChange={(e) => setEs(e.target.value)} placeholder="Lo que quiero decir (español): Hoy como en casa." aria-label="Frase en español" />
        <AnswerInput mode="hanzi" value={answer} onChange={setAnswer} onSubmit={() => void run()} disabled={busy} />
        <Input value={refs} onChange={(e) => setRefs(e.target.value)} lang="zh-CN" className="zh" placeholder="Solución del profesor (opcional, varias con ·)" aria-label="Solución de referencia" />
      </Card>
      {report ? <CorrectionPanel report={report} es={es} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ chat genérico */

function ChatView({ mode, title, intro, voice, autoFirst, noteId, scenario, onDone }: { mode: TutorMode; title: string; intro: string; voice?: boolean; autoFirst?: string; noteId?: string; scenario?: AiScenario; onDone?: () => void }) {
  const pack = usePack();
  const router = useLangRouter();
  const settings = useSettings((s) => s.settings);
  const chats = useLiveQuery(() => db.chats.where("[lang+mode]").equals([pack.id, mode]).reverse().sortBy("updatedAt"), [pack.id, mode]) ?? EMPTY_CHATS;
  const [chatId, setChatId] = useState<string | null>(null);
  const chat = useLiveQuery(() => (chatId ? db.chats.get(chatId) : undefined), [chatId]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const ensure = async (): Promise<Chat> => {
    if (chat) return chat;
    const c = await newChat(mode, scenario ? scenario.title : title, scenario ? { scenarioId: scenario.id, goals: scenario.goals.map((text) => ({ text, done: false })) } : {});
    setChatId(c.id);
    return c;
  };
  const send = async (msg: string) => {
    const m = msg.trim();
    if (!m || busy) return;
    setText("");
    setBusy(true);
    try {
      const c = await ensure();
      const { turn } = await sendTurn(c, m, { scenario });
      if ((voice || settings.tutor.speak) && pack.hasTargetText(turn.text)) await speak(turn.text.replace(/[^㐀-鿿，。！？、\s]/g, " ").trim() || turn.text, { rate: 0.9 });
      if (turn.done) toast.success("¡Misión cumplida!", "Puedes guardar la conversación como apunte.");
    } catch (e) {
      toast.error("El tutor no ha respondido", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!started.current && !chat && !chats.length) {
      started.current = true;
      if (autoFirst) void Promise.resolve().then(() => send(autoFirst));
      else if (scenario) void (async () => {
        const c = await ensure();
        await appendMessage(c.id, { role: "assistant", content: scenario.opening, at: Date.now() });
        if (settings.tutor.speak) void speak(scenario.opening, { rate: 0.9 });
      })();
      else if (noteId) void db.notes.get(noteId).then((n) => n && setText(`Explícame «${n.title}» con ejemplos nuevos.`));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats.length]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat?.messages.length]);
  useEffect(() => () => stopSpeaking(), []);

  const listen = async () => {
    setListening(true);
    try {
      const r = await recognizeOnce({ timeoutMs: 8000 });
      if (r.text) await send(r.text);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setListening(false);
    }
  };
  const doAction = async (a: NonNullable<ChatMessage["actions"]>[number]) => {
    if (!chat) return;
    const r = await runAction(a, chat.id);
    await markActionDone(chat.id, a.id);
    if (r.startsWith("/")) router.push(r);
    else toast.success(r);
  };
  const saveNote = async () => {
    if (!chat) return;
    const id = await saveChatAsNote(chat);
    toast.success("Guardado como apunte de tipo Diálogo", "Frases minadas y errores resumidos");
    router.push(`/apuntes/${encodeURIComponent(id)}`);
  };
  const messages = chat?.messages ?? [];
  const goals = chat?.goals ?? [];

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_15rem]">
      <div className="space-y-3">
        <p className="text-sm text-ink-soft">{intro}</p>
        <div className="card-paper max-h-[52vh] min-h-[16rem] space-y-2 overflow-y-auto p-3 scrollbar-thin" aria-live="polite">
          {messages.map((m, i) => (
            <Bubble key={i} m={m} onAction={doAction} />
          ))}
          {busy ? (
            <p className="flex items-center gap-2 text-xs text-ink-faint">
              <Loader2 className="size-3 animate-spin" /> el tutor escribe…
            </p>
          ) : null}
          {!messages.length && !busy ? <p className="text-sm text-ink-faint">{voice ? "Pulsa el micrófono y habla." : "Escribe tu primer mensaje."}</p> : null}
          <div ref={endRef} />
        </div>
        <div className="flex items-end gap-2">
          {voice || speechRecognitionAvailable() ? (
            <button type="button" onClick={() => void listen()} disabled={listening || busy} className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-paper shadow-[var(--shadow-float)]", listening ? "bg-cinnabar motion-safe:animate-pulse" : "bg-ink")} aria-label="Hablar">
              {listening ? <Square className="size-4" /> : <Mic className="size-5" />}
            </button>
          ) : null}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            placeholder={voice ? "…o escribe aquí" : "Escribe en chino o en español (Enter para enviar)"}
            className="min-h-11 flex-1"
            lang={pack.hasTargetText(text) ? pack.bcp47 : undefined}
            aria-label="Mensaje"
          />
          <Button variant="ink" onClick={() => void send(text)} disabled={busy || !text.trim()} aria-label="Enviar">
            <Send />
          </Button>
        </div>
      </div>
      <aside className="space-y-3">
        {goals.length ? (
          <Card>
            <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              <Flag className="size-3" /> Misión
            </p>
            <ul className="space-y-1 text-sm">
              {goals.map((g, i) => (
                <li key={i} className={cn("flex items-start gap-2", g.done && "text-ink-faint line-through")}>
                  <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", g.done ? "border-celadon bg-celadon text-paper" : "border-line")}>{g.done ? <Check className="size-3" /> : null}</span>
                  <Mixed>{g.text}</Mixed>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {chat?.newWords?.length ? (
          <Card>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Palabras nuevas</p>
            <div className="flex flex-wrap gap-1">
              {chat.newWords.map((w) => (
                <Badge key={w} variant="gold">
                  <TargetText text={w} size="sm" ruby={false} />
                </Badge>
              ))}
            </div>
          </Card>
        ) : null}
        <Card className="space-y-1.5">
          {chat && messages.length > 1 ? (
            <Button size="sm" variant="jade" className="w-full justify-start" onClick={() => void saveNote()} disabled={Boolean(chat.savedNoteId)}>
              <Save /> {chat.savedNoteId ? "Guardado como apunte" : "Terminar y guardar como apunte"}
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" className="w-full justify-start" onClick={() => { setChatId(null); started.current = false; onDone?.(); }}>
            <NotebookPen /> Nueva conversación
          </Button>
          {chats.length ? (
            <details className="text-xs text-ink-faint">
              <summary className="cursor-pointer">Anteriores ({chats.length})</summary>
              <ul className="mt-1 space-y-0.5">
                {chats.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setChatId(c.id)} className={cn("w-full truncate text-left hover:text-ink", c.id === chatId && "text-ink")}>
                      {formatDate(c.updatedAt)} · <Mixed>{c.title}</Mixed>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </Card>
        <p className="text-[11px] text-ink-faint">El tutor nunca guarda nada sin tu clic: cada tarjeta, apunte o error propuesto pide confirmación.</p>
      </aside>
    </div>
  );
}

function Bubble({ m, onAction }: { m: ChatMessage; onAction: (a: NonNullable<ChatMessage["actions"]>[number]) => void }) {
  const pack = usePack();
  const router = useLangRouter();
  const me = m.role === "user";
  const citations = (m.meta?.citations as { id: string; title: string }[] | undefined) ?? [];
  const go = (id: string) => {
    const [kind, ref] = id.split(":");
    if (kind === "note") router.push(`/apuntes/${encodeURIComponent(ref)}`);
    else if (kind === "grammar") router.push(`/aprender/gramatica/${ref}`);
    else if (kind === "article") router.push(`/study-hall/articulo/${ref}`);
  };
  return (
    <div className={cn("flex", me ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[88%] rounded-[12px] px-3 py-2", me ? "bg-ink text-paper" : "bg-paper-sunk")}>
        {me ? (
          <span lang={pack.hasTargetText(m.content) ? pack.bcp47 : undefined} className={cn(pack.hasTargetText(m.content) && pack.meta.cssClass, "text-base")}>
            {m.content}
          </span>
        ) : (
          <div className="space-y-1">
            {m.content.split(/\n+/).map((line, i) => (
              <p key={i} className="text-sm leading-relaxed">
                {pack.hasTargetText(line) ? <TargetText text={line} size="md" interactive /> : <Mixed>{line}</Mixed>}
              </p>
            ))}
            {pack.hasTargetText(m.content) ? <AudioButton text={m.content.replace(/[^㐀-鿿，。！？、]/g, "").slice(0, 200)} size="sm" /> : null}
            {citations.length ? (
              <p className="flex flex-wrap gap-1 text-[11px]">
                {citations.map((c) => (
                  <button key={c.id} type="button" onClick={() => go(c.id)} className="rounded-full border border-line px-2 py-0.5 text-indigo hover:border-ink/40">
                    📎 <Mixed>{c.title}</Mixed>
                  </button>
                ))}
              </p>
            ) : null}
            {m.actions?.length ? (
              <div className="mt-1 space-y-1">
                {m.actions.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-[8px] border border-gold/40 bg-gold/8 px-2 py-1 text-xs">
                    <span className="text-ink">
                      {a.tool === "crear_tarjeta" ? `Guardar tarjeta: ${a.args.zh} — ${a.args.es}` : a.tool === "crear_apunte" ? `Guardar apunte «${a.args.title}»` : a.tool === "registrar_error" ? `Anotar error: ${a.args.mine} → ${a.args.correct}` : `Abrir práctica de ${a.args.grammarId}`}
                    </span>
                    {a.done ? (
                      <Badge variant="jade">hecho</Badge>
                    ) : (
                      <Button size="sm" variant="jade" className="h-7" onClick={() => onAction(a)}>
                        <Check /> Sí
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ escenarios con IA */

function ScenarioChat() {
  const [scenario, setScenario] = useState<AiScenario | null>(null);
  const [level, setLevel] = useState<1 | 2>(1);
  if (scenario) return <ChatView key={scenario.id} mode="scenario" title={scenario.title} intro={`${scenario.setting} Objetivos de la misión a la derecha. Habla en chino; si te atascas, pide ayuda en español.`} scenario={scenario} onDone={() => setScenario(null)} />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">Elige situación y nivel. El tutor hablará solo con vocabulario que conoces más 1–2 palabras nuevas (marcadas), y la misión se va tachando.</p>
      <div className="flex gap-1">
        {([1, 2] as const).map((l) => (
          <Button key={l} size="sm" variant={level === l ? "ink" : "secondary"} onClick={() => setLevel(l)}>
            HSK {l}
          </Button>
        ))}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SCENARIOS.filter((s) => s.level <= level).map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => setScenario(s)} className="card-paper flex h-full w-full flex-col items-start gap-1 p-3 text-left transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
              <span lang="zh-CN" className="zh-kai text-base text-cinnabar">
                {s.zh}
              </span>
              <span className="font-medium text-ink">{s.title}</span>
              <span className="line-clamp-2 text-xs text-ink-faint">{s.setting}</span>
              <span className="mt-auto pt-1">
                <Badge variant="outline">{s.goals.length} objetivos</Badge>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ generador de ejercicios */

function GeneratorView() {
  const pack = usePack();
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [rejected, setRejected] = useState<string[]>([]);
  const notes = useLiveQuery(() => db.notes.where("lang").equals(pack.id).filter((n) => n.status === "active" && !n.builtin).reverse().sortBy("updatedAt"), [pack.id]) ?? [];
  const generate = async () => {
    setBusy(true);
    setRejected([]);
    try {
      const { generateExercises } = await import("@/lib/tutor/generator");
      const r = await generateExercises(source);
      setExercises(r.exercises);
      setRejected(r.rejected);
      if (!r.exercises.length) toast.error("No se generó ningún ejercicio válido", r.rejected[0]);
    } catch (e) {
      toast.error("Error del generador", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (summary) return <SummaryCard summary={summary} title="Ejercicios del tutor terminados" onContinue={() => { setSummary(null); setExercises(null); }} />;
  if (exercises?.length) return <ExerciseRunner exercises={exercises} context="tutor" onFinish={setSummary} title="Ejercicios generados" />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">Crea ejercicios nuevos a partir de un apunte, de tus errores o de una estructura. Antes de usarlos pasan por el validador (pinyin y nivel); los que no cumplen se descartan.</p>
      <div className="flex flex-wrap gap-2">
        <select onChange={(e) => { const n = notes.find((x) => x.id === e.target.value); if (n) setSource(`Apunte «${n.title}»:\n${JSON.stringify(n.fields).slice(0, 1500)}\n${n.markdown.slice(0, 1500)}`); }} className="h-9 rounded-[8px] border border-line bg-paper-sunk/70 px-2 text-sm" aria-label="Desde un apunte">
          <option value="">desde un apunte…</option>
          {notes.slice(0, 40).map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
        </select>
        <Button size="sm" variant="secondary" onClick={async () => { const errs = await db.notes.where("[lang+type]").equals([pack.id, "error"]).limit(10).toArray(); setSource(`Mis errores recientes:\n${errs.map((e) => `❌ ${e.fields.mine} → ✅ ${e.fields.correct} (${e.fields.explanation})`).join("\n")}`); }}>
          desde mis errores
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setSource("Estructura: 在 + lugar + verbo (dónde pasa algo). Ejemplos: 我在家吃饭。他在学校学习。")}>
          desde una estructura
        </Button>
      </div>
      <Textarea value={source} onChange={(e) => setSource(e.target.value)} className="min-h-32" placeholder="Material de partida (texto, apunte, estructura, errores)…" aria-label="Material" />
      <div className="flex items-center gap-2">
        <Button variant="ink" onClick={() => void generate()} disabled={busy || !source.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Wand2 />} Generar 6 ejercicios
        </Button>
        {rejected.length ? <span className="text-xs text-ink-faint">{rejected.length} descartados por el validador</span> : null}
      </div>
      {rejected.length ? (
        <ul className="text-xs text-ink-faint">
          {rejected.slice(0, 4).map((r, i) => (
            <li key={i}>· {r}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-ink-faint">
        <Dumbbell className="mr-1 inline size-3" /> Los ejercicios se practican aquí mismo; los fallos van al cuaderno de errores. <Volume2 className="ml-2 mr-1 inline size-3" /> El audio usa la voz del navegador (no está pregenerado).
      </p>
    </div>
  );
}

export { X };
