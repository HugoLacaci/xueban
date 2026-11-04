"use client";
/**
 * Memorizar 记: palabras clave propias por componente (editables), mnemotecnia sugerida + historia y dibujo propios
 * (se guardan como apunte de tipo Carácter), método de la «película» para pinyin y tono (actor por inicial,
 * escenario por final, habitación por tono: asignaciones propias), comparador de caracteres parecidos con minitest,
 * práctica de escritura con repetición espaciada y tonos con color, gesto y palabra ancla.
 */
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Pencil, Save, Search, Shuffle, Sparkles, X } from "lucide-react";
import Link from "@/lib/languages/link";
import { useLangRouter } from "@/lib/languages/link";
import { db } from "@/lib/db";
import { getCharInfo, loadCharInfo, lookupFirst, useDictionary } from "@/lib/languages/zh/dictionary";
import { wordPinyin } from "@/lib/languages/zh/pinyin/convert";
import { useKnowledge } from "@/lib/knowledge";
import { FINALS, INITIALS, loadComponentKeywords, loadPalace, movieFor, savePalace, setUserKeyword, SIMILAR_PAIRS, suggestMnemonic, TONE_ROOMS, userKeywords, type ComponentKeyword, type PalaceAssignments } from "@/lib/hanzi/origin";
import { createNote } from "@/lib/notes/repo";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Textarea, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Hanzi } from "@/components/target/target-text";
import { Reading, toneClass } from "@/components/target/reading";
import { AudioButton } from "@/components/target/audio-button";
import { StrokeOrder } from "@/components/target/stroke-order";
import { cn, shuffle } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

export function MemorizeTab() {
  return (
    <Tabs defaultValue="keywords">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="keywords">Palabras clave</TabsTrigger>
        <TabsTrigger value="mnemonic">Mnemotecnia</TabsTrigger>
        <TabsTrigger value="palace">Pinyin y tono: la película</TabsTrigger>
        <TabsTrigger value="similar">Parecidos</TabsTrigger>
        <TabsTrigger value="tones">Tonos</TabsTrigger>
        <TabsTrigger value="writing">Escritura</TabsTrigger>
      </TabsList>
      <TabsContent value="keywords">
        <KeywordsPanel />
      </TabsContent>
      <TabsContent value="mnemonic">
        <MnemonicPanel />
      </TabsContent>
      <TabsContent value="palace">
        <PalacePanel />
      </TabsContent>
      <TabsContent value="similar">
        <SimilarPanel />
      </TabsContent>
      <TabsContent value="tones">
        <TonesPanel />
      </TabsContent>
      <TabsContent value="writing">
        <WritingPanel />
      </TabsContent>
    </Tabs>
  );
}

/* ------------------------------------------------------------------ palabras clave */

function useKeywordMap() {
  const [list, setList] = useState<ComponentKeyword[]>([]);
  const [mine, setMine] = useState<Record<string, string>>({});
  useEffect(() => {
    void loadComponentKeywords().then(setList);
    void userKeywords().then(setMine);
  }, []);
  const map = useMemo(() => {
    const m = new Map<string, string>();
    for (const k of list) m.set(k.c, k.keyword);
    for (const [c, k] of Object.entries(mine)) m.set(c, k);
    return m;
  }, [list, mine]);
  return { list, mine, map, setMine };
}

function KeywordsPanel() {
  const { list, mine, map, setMine } = useKeywordMap();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [val, setVal] = useState("");
  const visible = list.filter((k) => !q || k.c.includes(q) || k.keyword.toLowerCase().includes(q.toLowerCase()) || k.es.toLowerCase().includes(q.toLowerCase()));
  const save = async (c: string) => {
    await setUserKeyword(c, val);
    setMine(await userKeywords());
    setEditing(null);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">Una palabra clave en español por componente (lista propia de Xuébàn, no copiada de ningún libro). Si otra palabra te funciona mejor, cámbiala: tu palabra manda en las mnemotecnias.</p>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar componente o palabra" className="pl-9" aria-label="Buscar componente" />
      </div>
      {!list.length ? <p className="text-sm text-ink-faint">La lista de componentes (content/zh/components-keywords.json) aún no está disponible.</p> : null}
      <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.slice(0, 120).map((k) => (
          <li key={k.c} className="card-paper flex items-start gap-2 p-2">
            <Hanzi text={k.c} size="xl" font="serif" className="w-10 text-center" />
            <div className="min-w-0 flex-1 text-sm">
              {editing === k.c ? (
                <div className="flex gap-1">
                  <Input value={val} onChange={(e) => setVal(e.target.value)} className="h-8 text-sm" autoFocus onKeyDown={(e) => e.key === "Enter" && void save(k.c)} aria-label={`Palabra clave de ${k.c}`} />
                  <Button size="icon-sm" variant="jade" onClick={() => void save(k.c)} aria-label="Guardar">
                    <Check />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => setEditing(null)} aria-label="Cancelar">
                    <X />
                  </Button>
                </div>
              ) : (
                <p className="flex items-center gap-1 font-medium text-ink">
                  <Mixed>{map.get(k.c) ?? k.keyword}</Mixed>
                  {mine[k.c] ? <Badge variant="gold">mía</Badge> : null}
                  <button type="button" onClick={() => { setEditing(k.c); setVal(map.get(k.c) ?? k.keyword); }} className="ml-auto rounded p-0.5 text-ink-faint hover:text-ink" aria-label="Editar palabra clave">
                    <Pencil className="size-3.5" />
                  </button>
                </p>
              )}
              <p className="text-xs text-ink-faint">
                <Reading text={k.pinyin} className="text-xs" /> · <Mixed>{k.es}</Mixed> · <Badge variant="muted">{k.kind === "radical" ? "significado" : k.kind === "phonetic" ? "sonido" : k.kind === "both" ? "ambos" : "forma"}</Badge>
              </p>
              <p lang="zh-CN" className="zh-serif text-base text-ink-soft">
                {k.examples.join(" ")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ mnemotecnia */

function MnemonicPanel() {
  const { map } = useKeywordMap();
  const [ch, setCh] = useState("好");
  const [story, setStory] = useState("");
  const [ready, setReady] = useState(false);
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const router = useLangRouter();
  useEffect(() => {
    void loadCharInfo().then(() => setReady(true));
    if (dictStatus === "idle") void load();
  }, [dictStatus, load]);
  const c = Array.from(ch).find((x) => /[㐀-鿿]/.test(x)) ?? "";
  const s = useMemo(() => (ready && c ? suggestMnemonic(c, map) : null), [c, map, ready]);
  const saveAsNote = async () => {
    if (!c || !s) return;
    const info = getCharInfo(c);
    const n = await createNote({ type: "character", title: c, fields: { char: c, pinyin: wordPinyin(c), meaning: lookupFirst(c)?.es ?? "", radical: info?.radical ?? "", components: s.parts.map((p) => p.c), origin: info?.etymology?.hint ?? "", mnemonic: story || s.text, words: [], similar: [] }, markdown: `## Mi historia\n\n${story || s.text}\n\n\`\`\`xb-drawing\n{"data":"","width":480,"height":240}\n\`\`\``, tags: ["caracteres", "mnemotecnia"], source: { kind: "manual" } });
    toast.success("Guardado como apunte de tipo Carácter", "Añade tu dibujo en el lienzo del apunte");
    router.push(`/apuntes/${encodeURIComponent(n.id)}`);
  };
  return (
    <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
      <div className="space-y-2">
        <Input value={ch} onChange={(e) => setCh(e.target.value)} lang="zh-CN" className="zh text-2xl" maxLength={2} aria-label="Carácter" />
        {c ? (
          <div className="flex flex-col items-center gap-1">
            <StrokeOrder char={c} size={140} controls={false} />
            <Reading text={wordPinyin(c)} className="text-lg" />
            <AudioButton text={c} size="sm" />
          </div>
        ) : null}
      </div>
      <div className="space-y-3">
        {s ? (
          <Card>
            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              <Sparkles className="size-3" /> Sugerencia automática (por las palabras clave)
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {s.parts.map((p) => (
                <span key={p.c} className="inline-flex items-center gap-1 rounded-[6px] border border-line bg-paper-raised px-2 py-0.5">
                  <Hanzi text={p.c} size="md" font="serif" /> <span className="text-xs text-ink-soft"><Mixed>{p.keyword}</Mixed></span>
                </span>
              ))}
            </div>
            <p className="text-sm text-ink"><Mixed>{s.text}</Mixed></p>
          </Card>
        ) : null}
        <Card className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Mi historia (lo que inventas tú se recuerda mejor)</p>
          <Textarea value={story} onChange={(e) => setStory(e.target.value)} className="min-h-24" placeholder="Una escena absurda y concreta con las palabras clave, que termine en el significado…" aria-label="Mi historia" />
          <div className="flex justify-end">
            <Button variant="jade" onClick={() => void saveAsNote()} disabled={!c}>
              <Save /> Guardar como apunte (con lienzo para dibujar)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ la película (pinyin + tono) */

function PalacePanel() {
  const [p, setP] = useState<PalaceAssignments | null>(null);
  const [word, setWord] = useState("妈妈");
  useEffect(() => {
    void loadPalace().then(setP);
  }, []);
  if (!p) return null;
  const set = (kind: "actors" | "sets", key: string, v: string) => {
    const next = { ...p, [kind]: { ...p[kind], [key]: v } };
    setP(next);
    void savePalace(next);
  };
  const movie = movieFor(word, p);
  return (
    <div className="space-y-4">
      <Card className="text-sm text-ink-soft">
        <p className="mb-1 font-medium text-ink">El método de la «película» (palacio de la memoria para pinyin y tono)</p>
        <p>
          Cada sílaba china es <strong>inicial + final + tono</strong>. Asigna un <strong>actor</strong> a cada inicial (una persona que conozcas o un personaje), un <strong>escenario</strong> a cada final (un lugar concreto) y una <strong>habitación</strong> a cada tono. Para recordar cómo se lee un carácter, imagina a ese actor haciendo algo relacionado con el significado del carácter en ese escenario y en esa habitación. Es un método genérico: las asignaciones son tuyas (no se copia ninguna lista comercial), y funcionan mejor cuanto más personales sean.
        </p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Actores (iniciales)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {INITIALS.map((i) => (
              <label key={i} className="flex items-center gap-1 text-sm">
                <span className="w-7 font-mono text-ink-soft">{i}</span>
                <Input value={p.actors[i] ?? ""} onChange={(e) => set("actors", i, e.target.value)} className="h-8 text-sm" placeholder={i === "∅" ? "sin inicial" : "actor"} aria-label={`Actor de ${i}`} />
              </label>
            ))}
          </div>
        </Card>
        <Card>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Escenarios (finales)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {FINALS.map((f) => (
              <label key={f} className="flex items-center gap-1 text-sm">
                <span className="w-9 font-mono text-ink-soft">{f}</span>
                <Input value={p.sets[f] ?? ""} onChange={(e) => set("sets", f, e.target.value)} className="h-8 text-sm" placeholder="lugar" aria-label={`Escenario de ${f}`} />
              </label>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Habitaciones (tonos)</p>
        <ul className="grid gap-1 text-sm sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((t) => (
            <li key={t} className={cn("rounded-[8px] border border-line p-2", toneClass(t as 1 | 2 | 3 | 4 | 5))}>
              <span className="font-medium">Tono {t === 5 ? "neutro" : t}</span>
              <span className="block text-xs text-ink-faint">{p.rooms[t] ?? TONE_ROOMS[t]}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Prueba con una palabra</p>
        <Input value={word} onChange={(e) => setWord(e.target.value)} lang="zh-CN" className="zh max-w-xs text-xl" aria-label="Palabra" />
        <ul className="space-y-1 text-sm">
          {movie.map((m, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <Hanzi text={m.hanzi} size="lg" font="serif" />
              <Reading text={m.syllable} />
              <span className="text-ink-soft">
                → <strong>{m.actor ?? "¿actor?"}</strong> en <strong>{m.set ?? "¿escenario?"}</strong>, en {m.room}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ parecidos */

function SimilarPanel() {
  const [i, setI] = useState(0);
  const [quiz, setQuiz] = useState<{ target: string; options: string[]; picked: string | null } | null>(null);
  const pair = SIMILAR_PAIRS[i];
  const start = () => {
    const target = pair.chars[Math.floor(Math.random() * pair.chars.length)];
    setQuiz({ target, options: shuffle(pair.chars), picked: null });
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {SIMILAR_PAIRS.map((p, k) => (
          <button key={k} type="button" onClick={() => { setI(k); setQuiz(null); }} className={cn("rounded-full border px-2.5 py-1 text-base", i === k ? "border-ink bg-ink text-paper" : "border-line hover:border-ink/40")} lang="zh-CN">
            {p.chars.join(" / ")}
          </button>
        ))}
      </div>
      <Card>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${pair.chars.length}, minmax(0, 1fr))` }}>
          {pair.chars.map((c, k) => (
            <div key={c} className="flex flex-col items-center gap-1 text-center">
              <StrokeOrder char={c} size={120} controls={false} autoplay={false} />
              <Hanzi text={c} size="xl" font="serif" />
              <Reading text={wordPinyin(c)} />
              <span className="text-xs text-ink-soft"><Mixed>{pair.es[k]}</Mixed></span>
              <AudioButton text={c} size="sm" />
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-[8px] bg-gold/10 px-3 py-2 text-sm text-gold-ink">💡 <Mixed>{pair.diff}</Mixed></p>
        <div className="mt-3">
          {quiz ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">
                ¿Cuál es «<Mixed>{pair.es[pair.chars.indexOf(quiz.target)]}</Mixed>»?
              </span>
              {quiz.options.map((o) => (
                <button key={o} type="button" disabled={quiz.picked !== null} onClick={() => setQuiz({ ...quiz, picked: o })} className={cn("rounded-[8px] border px-3 py-1 text-2xl", quiz.picked === null ? "border-line hover:border-ink/40" : o === quiz.target ? "border-celadon bg-celadon/14" : quiz.picked === o ? "border-danger bg-danger/10" : "border-line opacity-50")} lang="zh-CN">
                  {o}
                </button>
              ))}
              {quiz.picked !== null ? (
                <Button size="sm" variant="secondary" onClick={start}>
                  <Shuffle /> otra
                </Button>
              ) : null}
            </div>
          ) : (
            <Button size="sm" variant="ink" onClick={start}>
              Minitest
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ tonos */

const TONES = [
  { t: 1 as const, name: "Primer tono", shape: "alto y plano", gesture: "mano horizontal a la altura de la frente, que avanza recta", anchor: "mā 妈 (mamá) — como un médico diciendo «aaaa»", path: "M 10 20 L 90 20" },
  { t: 2 as const, name: "Segundo tono", shape: "ascendente", gesture: "la mano sube en diagonal, como una ceja que se levanta", anchor: "má 麻 (cáñamo) — como preguntar «¿qué?»", path: "M 10 70 L 90 20" },
  { t: 3 as const, name: "Tercer tono", shape: "baja y (a veces) sube", gesture: "la mano baja, toca fondo y rebota un poco", anchor: "mǎ 马 (caballo) — como un «hmm…» de duda, grave", path: "M 10 50 Q 40 95 60 85 T 90 45" },
  { t: 4 as const, name: "Cuarto tono", shape: "descendente", gesture: "la mano cae de golpe, como dar un golpe en la mesa", anchor: "mà 骂 (regañar) — como un «¡no!» tajante", path: "M 10 20 L 90 85" },
  { t: 5 as const, name: "Tono neutro", shape: "corto y suave", gesture: "un toque breve con un dedo", anchor: "ma 吗 (partícula de pregunta) — se apaga", path: "M 40 55 L 60 55" },
];

function TonesPanel() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">Cada tono con su color (el mismo que ves en todo el pinyin de la app), su gesto con la mano y una palabra ancla. Haz el gesto mientras dices la sílaba: el cuerpo recuerda.</p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {TONES.map((x) => (
          <li key={x.t} className={cn("card-paper p-3", toneClass(x.t))}>
            <button type="button" onClick={() => setActive(active === x.t ? null : x.t)} className="w-full text-left" aria-pressed={active === x.t}>
              <svg viewBox="0 0 100 100" className="mb-1 h-16 w-full" aria-hidden="true">
                <path d={x.path} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className={cn(active === x.t && "motion-safe:animate-[dash_1.2s_ease-out_infinite]")} strokeDasharray={active === x.t ? "160" : undefined} strokeDashoffset={active === x.t ? "160" : undefined} />
                <circle r="5" fill="currentColor" className={cn(active === x.t ? "" : "opacity-0")}>
                  <animateMotion dur="1.2s" repeatCount="indefinite" path={x.path} />
                </circle>
              </svg>
              <span className="block font-medium">{x.name}</span>
              <span className="block text-xs text-ink-soft">{x.shape}</span>
            </button>
            <p className="mt-1 text-xs text-ink-soft">✋ {x.gesture}</p>
            <p className="mt-1 text-xs text-ink"><Mixed>{x.anchor}</Mixed></p>
            <AudioButton text={x.anchor.split(" ")[1] ?? "妈"} size="sm" />
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-faint">Pulsa un tono para animar el gesto. Practica los tonos en Practicar → Listening → pares de tonos y sandhi.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ escritura con repetición espaciada */

function WritingPanel() {
  const statesLive = useLiveQuery(() => db.charStates.where("lang").equals("zh").toArray(), []);
  const [now] = useState(() => Date.now());
  const deck = useKnowledge((s) => s.deck);
  const due = useMemo(() => {
    const states = statesLive ?? [];
    const chars = new Set<string>();
    for (const w of deck.values()) for (const c of w.hanzi) if (/[㐀-鿿]/.test(c)) chars.add(c);
    const byChar = new Map(states.map((s) => [s.hanzi, s]));
    // intervalo sencillo: 1, 3, 7, 14, 30 días según intentos sin fallos; los fallados vuelven antes
    const list = Array.from(chars).map((c) => {
      const s = byChar.get(c);
      const ok = Math.max(0, (s?.writingAttempts ?? 0) - (s?.writingMistakes ?? 0));
      const days = [1, 3, 7, 14, 30][Math.min(4, ok)] ?? 30;
      const next = (s?.lastPracticed ?? 0) + days * 86400000;
      return { c, s, next, canWrite: s?.canWrite ?? false };
    });
    return list.filter((x) => x.next <= now || !x.s).sort((a, b) => a.next - b.next);
  }, [statesLive, deck, now]);
  const [queue, setQueue] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [key, setKey] = useState(0);
  const start = () => {
    setQueue(due.slice(0, 10).map((x) => x.c));
    setIdx(0);
  };
  const done = async (mistakes: number) => {
    const c = queue?.[idx];
    if (!c) return;
    const cur = await db.charStates.get(`zh:${c}`);
    await db.charStates.put({ id: `zh:${c}`, lang: "zh", hanzi: c, known: cur?.known ?? true, canWrite: mistakes <= 2, writingAttempts: (cur?.writingAttempts ?? 0) + 1, writingMistakes: (cur?.writingMistakes ?? 0) + (mistakes > 2 ? 1 : 0), mnemonic: cur?.mnemonic, lastPracticed: Date.now(), updatedAt: Date.now() });
    setIdx((i) => i + 1);
    setKey((k) => k + 1);
  };
  const c = queue?.[idx];
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        Escritura con repetición espaciada: los caracteres de tu mazo vuelven a los 1, 3, 7, 14 y 30 días; los que fallas, antes. Para «descomponer y reconstruir», usa Practicar → Por tipo → Caracteres (construir el carácter).
      </p>
      {!queue ? (
        <Card className="flex flex-wrap items-center gap-3">
          <span className="font-serif-es text-3xl text-ink tabular">{due.length}</span>
          <span className="text-sm text-ink-soft">caracteres pendientes de escribir</span>
          <Button variant="ink" onClick={start} disabled={!due.length} className="ml-auto">
            Practicar 10
          </Button>
          <Button variant="outline" asChild>
            <Link href="/practicar?mode=type">Descomponer y reconstruir</Link>
          </Button>
        </Card>
      ) : c ? (
        <Card className="flex flex-col items-center gap-3">
          <p className="text-xs text-ink-faint tabular">
            {idx + 1} / {queue.length}
          </p>
          <p className="text-sm text-ink">
            Escribe <strong className="font-serif-es text-lg"><Mixed>{lookupFinal(c)}</Mixed></strong> · <Reading text={wordPinyin(c)} />
          </p>
          <StrokeOrder key={key} char={c} size={200} mode="quiz" showOutline={false} controls={false} onQuizComplete={(r) => void done(r.totalMistakes)} />
          <AudioButton text={c} size="sm" />
        </Card>
      ) : (
        <Card className="text-center">
          <p className="font-serif-es text-lg text-ink">Ronda terminada</p>
          <Button className="mt-2" variant="secondary" onClick={() => setQueue(null)}>
            Volver
          </Button>
        </Card>
      )}
    </div>
  );
}

function lookupFinal(c: string): string {
  return lookupFirst(c)?.es?.split(/[;(]/)[0].trim() ?? c;
}
