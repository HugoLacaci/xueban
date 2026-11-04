"use client";
/**
 * Role-play por turnos (sin IA): diálogos ramificados escritos a mano (content/zh/roleplays). La app habla (audio
 * pregenerado con la voz del personaje), Hugo responde hablando o escribiendo (o elige una opción) y la conversación
 * avanza según lo que dice; los objetivos de la misión se van tachando.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Keyboard, Mic, RotateCcw, Square, Target } from "lucide-react";
import { usePack } from "@/lib/languages/provider";
import { recognizeOnce, speak, speechRecognitionAvailable, stopSpeaking } from "@/lib/tts";
import { useSettings } from "@/lib/settings";
import { matchOption, type Scenario, type UserOption } from "@/lib/tutor/roleplays";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Progress } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { TargetText } from "@/components/target/target-text";
import { AudioButton } from "@/components/target/audio-button";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

interface Turn {
  who: "npc" | "me";
  zh: string;
  py?: string;
  es?: string;
  matched?: boolean;
}

export function RoleplayPlayer({ scenario, onExit, onFinish }: { scenario: Scenario; onExit: () => void; onFinish?: (r: { goals: boolean[]; turns: Turn[] }) => void }) {
  const pack = usePack();
  const pinyinMode = useSettings((s) => s.settings.pinyinMode);
  const [nodeId, setNodeId] = useState(scenario.start);
  const npcTurn = (id: string): Turn => {
    const n = scenario.nodes[id];
    return { who: "npc", zh: n?.npc.zh ?? "", py: n?.npc.py, es: n?.npc.es };
  };
  const [turns, setTurns] = useState<Turn[]>(() => [npcTurn(scenario.start)]);
  const [goals, setGoals] = useState<boolean[]>(scenario.goals.map(() => false));
  const [mode, setMode] = useState<"speak" | "type" | "pick">(speechRecognitionAvailable() ? "speak" : "pick");
  const [typed, setTyped] = useState("");
  const [listening, setListening] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [done, setDone] = useState(false);
  const node = scenario.nodes[nodeId];
  const endRef = useRef<HTMLDivElement>(null);

  // el personaje habla al empezar (solo efecto de audio; los turnos se añaden al elegir)
  useEffect(() => {
    const first = scenario.nodes[scenario.start];
    if (first) void speak(first.npc.zh, { voice: scenario.voice ?? "f", rate: 0.9 });
  }, [scenario]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);
  useEffect(() => () => stopSpeaking(), []);

  const choose = (opt: UserOption, said?: string) => {
    const nextNode = scenario.nodes[opt.next];
    const nextGoals = opt.goal !== undefined ? goals.map((x, i) => (i === opt.goal ? true : x)) : goals;
    const nextTurns: Turn[] = [...turns, { who: "me", zh: said ?? opt.zh, py: opt.py, es: opt.es, matched: true }, ...(nextNode ? [npcTurn(opt.next)] : [])];
    setTurns(nextTurns);
    setGoals(nextGoals);
    setTyped("");
    setShowOptions(false);
    setNodeId(opt.next);
    if (nextNode) void speak(nextNode.npc.zh, { voice: scenario.voice ?? "f", rate: 0.9 });
    if (nextNode?.end) {
      setDone(true);
      onFinish?.({ goals: nextGoals, turns: nextTurns });
    }
  };
  const respond = (said: string) => {
    const opt = matchOption(said, node);
    if (opt) choose(opt, said);
    else {
      setTurns((t) => [...t, { who: "me", zh: said, matched: false }]);
      toast.info("No te he entendido", node.hint ?? "Prueba con una de las opciones.");
      setShowOptions(true);
    }
  };
  const listen = async () => {
    setListening(true);
    try {
      const r = await recognizeOnce({ timeoutMs: 8000 });
      if (r.text) respond(r.text);
      else toast.info("No se reconoció nada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setListening(false);
    }
  };
  const restart = () => {
    setTurns([npcTurn(scenario.start)]);
    setGoals(scenario.goals.map(() => false));
    setDone(false);
    setNodeId(scenario.start);
    const first = scenario.nodes[scenario.start];
    if (first) void speak(first.npc.zh, { voice: scenario.voice ?? "f", rate: 0.9 });
  };
  const pct = useMemo(() => (goals.filter(Boolean).length / Math.max(1, goals.length)) * 100, [goals]);

  if (!node) return <Card className="text-sm text-danger">Nodo «{nodeId}» no encontrado en el escenario.</Card>;

  return (
    <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-[1fr_15rem]">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-ink-faint">
          <button type="button" onClick={onExit} className="inline-flex items-center gap-1 hover:text-ink">
            <ArrowLeft className="size-4" /> Escenarios
          </button>
          <span>
            <span lang="zh-CN" className="zh-kai mr-1 text-cinnabar">{scenario.zh}</span>
            <Mixed>{scenario.title}</Mixed>
          </span>
        </div>
        <Card className="bg-paper-sunk/40 text-sm text-ink-soft">
          <Mixed>{scenario.setting}</Mixed> Tú eres tú; la app hace de <strong>{scenario.role}</strong>.
        </Card>
        <div className="card-paper max-h-[50vh] space-y-2 overflow-y-auto p-3 scrollbar-thin" aria-live="polite">
          {turns.map((t, i) => (
            <div key={i} className={cn("flex", t.who === "me" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-[12px] px-3 py-2", t.who === "me" ? (t.matched === false ? "border border-danger/40 bg-danger/8" : "bg-ink text-paper") : "bg-paper-sunk")}>
                {t.who === "npc" ? (
                  <div className="flex items-start gap-2">
                    <AudioButton text={t.zh} size="sm" voice={scenario.voice ?? "f"} className="mt-0.5" />
                    <TargetText text={t.zh} size="md" pinyinLine={pinyinMode !== "hide" ? t.py : undefined} translation={t.es} as="div" />
                  </div>
                ) : (
                  <div>
                    <span lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-lg")}>
                      {t.zh}
                    </span>
                    {t.py ? <span className="ml-2 text-xs opacity-70">{t.py}</span> : null}
                    {t.matched === false ? <span className="block text-xs text-danger">no encaja con ninguna respuesta prevista</span> : null}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {done ? (
          <Card className="border-celadon/50 bg-celadon/8">
            <p className="font-medium text-ink">
              <Check className="mr-1 inline size-4 text-celadon-ink" /> Fin del diálogo
            </p>
            {node.feedback ? <p className="mt-1 text-sm text-ink-soft"><Mixed>{node.feedback}</Mixed></p> : null}
            <p className="mt-1 text-xs text-ink-faint">
              Objetivos: {goals.filter(Boolean).length} de {goals.length}.
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={restart}>
                <RotateCcw /> Otra vez
              </Button>
              <Button size="sm" variant="ink" onClick={onExit}>
                Elegir otro escenario
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-ink-soft">
                Tu turno{node.hint ? <span className="text-ink-faint"> · pista: <Mixed>{node.hint}</Mixed></span> : null}
              </p>
              <div className="ml-auto flex gap-1" role="radiogroup" aria-label="Cómo responder">
                {speechRecognitionAvailable() ? (
                  <Button size="sm" variant={mode === "speak" ? "ink" : "ghost"} onClick={() => setMode("speak")} role="radio" aria-checked={mode === "speak"}>
                    <Mic /> hablar
                  </Button>
                ) : null}
                <Button size="sm" variant={mode === "type" ? "ink" : "ghost"} onClick={() => setMode("type")} role="radio" aria-checked={mode === "type"}>
                  <Keyboard /> escribir
                </Button>
                <Button size="sm" variant={mode === "pick" ? "ink" : "ghost"} onClick={() => { setMode("pick"); setShowOptions(true); }} role="radio" aria-checked={mode === "pick"}>
                  opciones
                </Button>
              </div>
            </div>
            {mode === "speak" ? (
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => void listen()} disabled={listening} className={cn("flex size-14 items-center justify-center rounded-full text-paper shadow-[var(--shadow-float)]", listening ? "bg-cinnabar motion-safe:animate-pulse" : "bg-ink")} aria-label="Hablar">
                  {listening ? <Square className="size-5" /> : <Mic className="size-6" />}
                </button>
                <p className="text-sm text-ink-faint">{listening ? "Escuchando…" : "Pulsa y responde en chino."}</p>
              </div>
            ) : null}
            {mode === "type" ? (
              <div className="flex gap-2">
                <Input value={typed} onChange={(e) => setTyped(e.target.value)} lang={pack.bcp47} className={cn(pack.meta.cssClass, "text-lg")} placeholder="Escribe tu respuesta en chino" onKeyDown={(e) => e.key === "Enter" && typed.trim() && respond(typed)} aria-label="Respuesta" />
                <Button variant="ink" onClick={() => typed.trim() && respond(typed)}>
                  Decir
                </Button>
              </div>
            ) : null}
            {mode === "pick" || showOptions ? (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {(node.user ?? []).map((o, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => choose(o)} className="w-full rounded-[8px] border border-line bg-paper-raised p-2 text-left hover:border-ink/40">
                      <TargetText text={o.zh} size="md" pinyinLine={pinyinMode !== "hide" ? o.py : undefined} translation={o.es} as="div" interactive={false} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        )}
      </div>
      <aside className="space-y-3">
        <Card>
          <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            <Target className="size-3" /> Misión
          </p>
          <Progress value={pct} className="mb-2 h-1.5" />
          <ul className="space-y-1 text-sm">
            {scenario.goals.map((g, i) => (
              <li key={i} className={cn("flex items-start gap-2", goals[i] && "text-ink-faint line-through")}>
                <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", goals[i] ? "border-celadon bg-celadon text-paper" : "border-line")}>{goals[i] ? <Check className="size-3" /> : null}</span>
                <Mixed>{g}</Mixed>
              </li>
            ))}
          </ul>
        </Card>
        {scenario.vocab?.length ? (
          <Card>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Palabras útiles</p>
            <div className="flex flex-wrap gap-1">
              {scenario.vocab.map((v) => (
                <Badge key={v} variant="outline">
                  <TargetText text={v} size="sm" ruby={false} />
                </Badge>
              ))}
            </div>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}
