"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Check, Eye, RotateCcw, Undo2, Volume2, X } from "lucide-react";
import { db, logStudy, type Card, type CardType, type Word } from "@/lib/db";
import { buildQueue, interleave, previewRatings, Rating, reviewCard, undoReview, type Grade } from "@/lib/fsrs/scheduler";
import { useSettings } from "@/lib/settings";
import { normalizeZh } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Input, Kbd, Progress, Spinner } from "@/components/ui/primitives";
import { Pinyin } from "@/components/zh/pinyin";
import { AudioButton, playText, useSpaceToPlay } from "@/components/zh/audio-button";
import { ChineseText, Hanzi } from "@/components/zh/chinese-text";
import { StrokeOrder } from "@/components/zh/stroke-order";
import { Seal, SealTag } from "@/components/ornament/seal";
import { TianZiGe } from "@/components/ornament/tianzige";
import { playFeedback } from "@/lib/sounds";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<CardType, string> = {
  recognition: "Reconocimiento",
  production: "Producción",
  listening: "Escucha",
  sentence: "Frase",
  writing: "Escritura",
};

const SWIPE_THRESHOLD = 80;

/** Estilo de cada botón de valoración: 绛 (otra vez) · 赭金 (difícil) · 青瓷 (bien) · 黛蓝 (fácil). */
const GRADE_STYLE = [
  "border-danger/60 text-danger hover:bg-danger/8 focus-visible:ring-danger/30",
  "border-gold/70 text-gold-ink hover:bg-gold/10 focus-visible:ring-gold/30",
  "border-celadon/70 text-celadon-ink hover:bg-celadon/10 focus-visible:ring-celadon/30",
  "border-indigo/60 text-indigo hover:bg-indigo/10 focus-visible:ring-indigo/30",
];

export function ReviewSession() {
  const params = useSearchParams();
  const settings = useSettings((s) => s.settings);
  const reduced = useReducedMotion();
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState<{ total: number; again: number; good: number } | null>(null);
  const [history, setHistory] = useState<{ prev: Card; rating: Grade }[]>([]);
  const [swipe, setSwipe] = useState<{ dx: number; active: boolean }>({ dx: 0, active: false });
  const swipeStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const startedAt = useRef(0);
  const cardShownAt = useRef(0);
  const counts = useRef({ again: 0, good: 0 });
  const words = useLiveQuery(() => db.words.toArray(), []);
  const wordMap = useMemo(() => new Map((words ?? []).map((w) => [w.id, w])), [words]);

  const categories = params.get("cat")?.split(",").filter(Boolean);
  const types = params.get("types")?.split(",").filter(Boolean) as CardType[] | undefined;
  const onlyNew = params.get("new") === "1";
  const wordIds = params.get("words")?.split(",").filter(Boolean);
  const limit = Number(params.get("limit") ?? 0) || undefined;

  useEffect(() => {
    startedAt.current = Date.now();
    cardShownAt.current = Date.now();
    void buildQueue({
      newPerDay: onlyNew ? Math.max(settings.newWordsPerDay, 5) : settings.newWordsPerDay,
      categories,
      types,
      wordIds,
      ankiIsSource: settings.anki.enabled && settings.anki.srsSource === "anki",
      limit,
      includeNew: true,
    }).then(({ due, fresh }) => {
      const q = onlyNew ? fresh : interleave(due, fresh);
      setQueue(q);
      if (!q.length) setDone({ total: 0, again: 0, good: 0 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = queue?.[idx];
  const word = card ? wordMap.get(card.wordId) : undefined;
  const previews = useMemo(() => (card ? previewRatings(card, settings.fsrs) : []), [card, settings.fsrs]);

  const finish = useCallback(async () => {
    const minutes = (Date.now() - startedAt.current) / 60000;
    if (minutes > 0.2) await logStudy({ start: startedAt.current, end: Date.now(), minutes, kind: "review" });
    setDone({ total: idx, again: counts.current.again, good: counts.current.good });
  }, [idx]);

  const rate = useCallback(
    async (g: Grade) => {
      if (!card || !queue) return;
      const prev = card;
      const next = await reviewCard(card, g, settings.fsrs, Date.now() - cardShownAt.current);
      if (g === Rating.Again) counts.current.again++;
      else counts.current.good++;
      playFeedback(g >= Rating.Good ? "ok" : "fail", settings.sounds);
      setHistory((h) => [...h.slice(-20), { prev, rating: g }]);
      let q = queue;
      // Si falla (o es nueva en aprendizaje), vuelve a la cola más adelante en esta misma sesión
      if (next.state === 1 || next.state === 3) {
        q = [...queue];
        q.splice(Math.min(queue.length, idx + 4), 0, next);
        setQueue(q);
      }
      setRevealed(false);
      setSwipe({ dx: 0, active: false });
      cardShownAt.current = Date.now();
      if (idx + 1 >= q.length) void finish();
      else setIdx(idx + 1);
    },
    [card, queue, idx, settings.fsrs, settings.sounds, finish],
  );

  const undo = async () => {
    const last = history[history.length - 1];
    if (!last || !queue) return;
    await undoReview(last.prev);
    if (last.rating === Rating.Again) counts.current.again--;
    else counts.current.good--;
    setHistory((h) => h.slice(0, -1));
    // quitar la copia reinsertada si existe
    const q = queue.filter((c, i) => !(i > idx - 1 && c.id === last.prev.id));
    const i = Math.max(0, idx - 1);
    q[i] = last.prev;
    setQueue(q);
    setIdx(i);
    setRevealed(false);
  };

  // atajos: Enter/Espacio revela, 1–4 valora
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
        if (e.key === "Enter" && !revealed) {
          e.preventDefault();
          setRevealed(true);
        }
        return;
      }
      if (!card) return;
      if (!revealed && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        void rate(Number(e.key) as Grade);
      }
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) void undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, revealed, rate]);

  useSpaceToPlay(revealed && word ? word.hanzi : undefined, revealed);

  // Deslizar la tarjeta (solo con la respuesta a la vista): izquierda = Otra vez, derecha = Bien
  const canSwipe = revealed && card?.type !== "writing";
  const isInteractive = (el: EventTarget | null) => el instanceof Element && Boolean(el.closest("button, a, input, textarea, select, audio, [role=button]"));
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipe || isInteractive(e.target)) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swipeStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    setSwipe({ dx: 0, active: true });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = swipeStart.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    // gesto vertical → es scroll, no deslizamiento
    if (Math.abs(dx) < 8 && Math.abs(dy) > 12) {
      swipeStart.current = null;
      setSwipe({ dx: 0, active: false });
      return;
    }
    setSwipe({ dx, active: true });
  };
  const endSwipe = (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const s = swipeStart.current;
    if (!s || s.id !== e.pointerId) return;
    swipeStart.current = null;
    const dx = e.clientX - s.x;
    setSwipe({ dx: 0, active: false });
    if (!commit) return;
    if (dx <= -SWIPE_THRESHOLD) void rate(Rating.Again);
    else if (dx >= SWIPE_THRESHOLD) void rate(Rating.Good);
  };

  if (queue === null) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (done) {
    const total = done.total;
    const accuracy = Math.round((done.good / Math.max(1, total)) * 100);
    return (
      <div className="mx-auto max-w-md pt-6 text-center">
        <div className="card-paper relative overflow-hidden px-6 py-10">
          <span className="absolute inset-x-8 top-0 h-[2px] rounded-b bg-cinnabar/85" aria-hidden="true" />
          <Seal text={total ? "完" : "闲"} size={72} stamped={!reduced} rotate={-6} className="mx-auto" title={total ? "Sesión terminada" : "Nada que repasar"} />
          <h1 className="font-serif-es mt-4 text-[28px] font-semibold leading-tight text-ink">{total ? "Sesión terminada" : "Nada que repasar"}</h1>
          {total ? (
            <>
              <p className="tabular mt-5 text-5xl font-semibold leading-none text-ink">{total}</p>
              <p className="mt-1 text-sm text-ink-faint">tarjetas repasadas</p>
              <div className="tabular mt-4 flex justify-center gap-6 text-sm">
                <span className="text-celadon-ink">
                  <Check className="mr-1 inline size-4" aria-hidden="true" />
                  {done.good} bien
                </span>
                <span className="text-danger">
                  <X className="mr-1 inline size-4" aria-hidden="true" />
                  {done.again} otra vez
                </span>
              </div>
              <p className="mt-3 text-xs text-ink-faint">Precisión: {accuracy} %. Los fallos vuelven antes según FSRS.</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-faint">No hay tarjetas pendientes ahora mismo. Puedes añadir palabras nuevas o practicar ejercicios.</p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild variant="secondary">
              <Link href="/flashcards">Volver al mazo</Link>
            </Button>
            <Button asChild>
              <Link href="/practicar">Practicar</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">Hoy</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!card || !word) return <Spinner />;

  const remaining = queue.length - idx - 1;
  const swipeHint = Math.min(1, Math.abs(swipe.dx) / SWIPE_THRESHOLD);
  const showRevealButton = !revealed && card.type !== "writing";

  const actions = revealed ? (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Valorar la tarjeta">
      {previews.map((p, i) => (
        <button
          key={p.rating}
          type="button"
          onClick={() => void rate(p.rating)}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[10px] border bg-paper-raised px-1 py-2 text-sm font-medium shadow-[var(--shadow-paper)] transition-[background-color,transform] duration-[var(--dur-ui)] ease-[var(--ease-ink)] focus-visible:outline-none focus-visible:ring-2 active:translate-y-px",
            GRADE_STYLE[i],
          )}
        >
          <span className="flex items-center gap-1.5">
            <Kbd className="hidden sm:inline-flex">{i + 1}</Kbd>
            {p.label}
          </span>
          <span className="tabular text-[11px] font-normal text-ink-faint">{p.interval}</span>
        </button>
      ))}
    </div>
  ) : showRevealButton ? (
    <Button size="xl" variant="ink" className="w-full" onClick={() => setRevealed(true)}>
      <Eye /> Mostrar respuesta <Kbd className="ml-1 hidden border-paper/30 bg-paper/15 text-paper sm:inline-flex">Enter</Kbd>
    </Button>
  ) : null;

  return (
    <div className="mx-auto max-w-2xl pb-28 md:pb-0">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 text-ink-faint">
          <span className="tabular font-medium text-ink">
            {idx + 1} / {queue.length}
          </span>
          <span aria-hidden="true">·</span>
          <span>{TYPE_LABEL[card.type]}</span>
          {card.state === 0 ? (
            <SealTag tone="celadon" className="ml-1">
              新
            </SealTag>
          ) : null}
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => void undo()} disabled={!history.length} aria-label="Deshacer">
            <Undo2 /> <span className="hidden sm:inline">Deshacer</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void finish()}>
            <X /> Terminar
          </Button>
        </div>
      </div>
      <Progress value={(idx / queue.length) * 100} className="mb-6 h-1.5" />

      {/* Pila de tarjetas: las siguientes asoman debajo, ligeramente giradas */}
      <div className="relative">
        {remaining > 1 ? <div aria-hidden="true" className="card-paper absolute inset-x-4 -bottom-3 top-3 rotate-[2.2deg] opacity-60" /> : null}
        {remaining > 0 ? <div aria-hidden="true" className="card-paper absolute inset-x-2 -bottom-1.5 top-1.5 -rotate-[1.4deg] opacity-80" /> : null}
        <div
          className={cn("card-paper relative overflow-hidden touch-pan-y", swipe.active && "select-none", canSwipe && "cursor-grab", swipe.active && "cursor-grabbing")}
          style={{
            transform: `translateX(${swipe.dx}px) rotate(${swipe.dx / 22}deg)`,
            transition: swipe.active || reduced ? "none" : "transform 220ms var(--ease-ink)",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endSwipe(e, true)}
          onPointerCancel={(e) => endSwipe(e, false)}
          onPointerLeave={(e) => endSwipe(e, false)}
        >
          <span className="absolute inset-x-6 top-0 h-[2px] rounded-b bg-cinnabar/80" aria-hidden="true" />
          {/* pistas del deslizamiento */}
          <span aria-hidden="true" className="zh-display pointer-events-none absolute left-4 top-4 rounded-md border-2 border-danger px-2 py-0.5 text-xl text-danger" style={{ opacity: swipe.dx < 0 ? swipeHint : 0, transform: "rotate(-8deg)" }}>
            再
          </span>
          <span aria-hidden="true" className="zh-display pointer-events-none absolute right-4 top-4 rounded-md border-2 border-celadon px-2 py-0.5 text-xl text-celadon-ink" style={{ opacity: swipe.dx > 0 ? swipeHint : 0, transform: "rotate(8deg)" }}>
            好
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={card.id + idx} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -10 }} transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}>
            <CardFace card={card} word={word} revealed={revealed} onReveal={() => setRevealed(true)} onAutoRate={(g) => void rate(g)} />
          </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Acciones: en móvil fijas en la zona del pulgar, sobre la barra de navegación */}
      {actions ? (
        <div className="fixed inset-x-0 z-30 border-t border-line/70 bg-paper/95 px-3 pt-2 backdrop-blur md:static md:mt-5 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-0" style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))", paddingBottom: "0.5rem" }}>
          <div className="mx-auto max-w-2xl">{actions}</div>
        </div>
      ) : null}
      <p className="mt-3 hidden text-center text-xs text-ink-faint md:block">
        <Kbd>Espacio</Kbd> audio · <Kbd>1</Kbd>–<Kbd>4</Kbd> valorar · <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd> deshacer
      </p>
      {canSwipe ? <p className="mt-2 text-center text-xs text-ink-faint md:hidden">Desliza la tarjeta: ← repetir · bien →</p> : null}
    </div>
  );
}

/** Carácter protagonista en 宋体 sobre 田字格 tenue: 96–160 px en escritorio, 72–112 px en móvil. */
function HeroHanzi({ text, className }: { text: string; className?: string }) {
  const zhFont = useSettings((s) => s.settings.zhFont);
  const chars = Array.from(text);
  const n = chars.length;
  const font = zhFont === "kai" ? "kai" : "serif";
  if (n > 4) {
    return <Hanzi text={text} size="2xl" font={font} className={cn("text-center", className)} />;
  }
  const cell = n <= 2 ? "clamp(104px, 26vw, 152px)" : n === 3 ? "clamp(84px, 22vw, 124px)" : "clamp(70px, 19vw, 104px)";
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-1.5 sm:gap-2", className)}>
      {chars.map((c, i) => (
        <TianZiGe key={i} faint size={cell}>
          <span lang="zh-CN" className={cn("zh font-medium leading-none", font === "serif" ? "zh-serif" : "zh-kai")} style={{ fontSize: `calc(${cell} * 0.72)` }}>
            {c}
          </span>
        </TianZiGe>
      ))}
    </div>
  );
}

function Prompt({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">{children}</p>;
}

function CardFace({ card, word, revealed, onReveal, onAutoRate }: { card: Card; word: Word; revealed: boolean; onReveal: () => void; onAutoRate: (g: Grade) => void }) {
  const settings = useSettings((s) => s.settings);
  const reduced = useReducedMotion();
  const [typed, setTyped] = useState("");

  const back = (
    <motion.div className="mt-5 space-y-3 border-t border-line/70 pt-4" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {card.type !== "recognition" ? <Hanzi text={word.hanzi} size="2xl" font={settings.zhFont === "kai" ? "kai" : "serif"} /> : null}
        <div className="text-center">
          <Pinyin text={word.pinyin} className="block text-2xl" />
          {settings.showTraditional && word.traditional ? (
            <span className="text-sm text-ink-faint">
              繁 <span lang="zh-CN">{word.traditional}</span>
            </span>
          ) : null}
        </div>
        <AudioButton text={word.hanzi} size="lg" autoPlay={card.type !== "listening"} />
      </div>
      <p className="font-serif-es text-center text-2xl text-ink">{word.meaning}</p>
      {word.example ? (
        <div className="rounded-[10px] border-l-[3px] border-cinnabar/70 bg-paper-sunk/60 px-3 py-2">
          <div className="flex items-start gap-2">
            <AudioButton text={word.example} size="sm" className="mt-1" />
            <ChineseText text={word.example} size="lg" pinyinLine={word.examplePinyin} translation={word.exampleTranslation} as="div" highlight={[word.hanzi]} />
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {word.radical ? <Badge variant="outline">部首 {word.radical}</Badge> : null}
        <Badge variant="outline">{word.category}</Badge>
        {word.hsk
          .filter((h) => h !== "Extra")
          .map((h) => (
            <SealTag key={h} tone="celadon">
              <span className="font-sans text-[10px] font-semibold tracking-wide">{h.replace("HSK", "HSK ")}</span>
            </SealTag>
          ))}
        <Link href={`/flashcards/${encodeURIComponent(word.id)}`} className="text-xs text-indigo underline underline-offset-2">
          ficha
        </Link>
      </div>
      {word.notes ? <p className="text-center text-sm text-ink-faint">{word.notes}</p> : null}
    </motion.div>
  );

  const face = (prompt: string, body: React.ReactNode) => (
    <div className="min-h-[18rem] p-5 pt-6 sm:p-7 sm:pt-7">
      <Prompt>{prompt}</Prompt>
      <div className="mt-5">{body}</div>
      {revealed ? back : null}
    </div>
  );

  if (card.type === "recognition") {
    return face(
      "¿Qué significa?",
      <div className="flex flex-col items-center gap-3">
        <HeroHanzi text={word.hanzi} />
        <span aria-hidden={settings.pinyinMode !== "show"} className={cn("transition-opacity", settings.pinyinMode !== "show" && "opacity-0")}>
          <Pinyin text={word.pinyin} className="text-xl" />
        </span>
      </div>,
    );
  }
  if (card.type === "production") {
    const ok = normalizeZh(typed) === normalizeZh(word.hanzi);
    return face(
      "¿Cómo se dice en chino?",
      <>
        <p className="font-serif-es text-center text-3xl text-ink sm:text-4xl">{word.meaning}</p>
        <p className="mt-1 text-center text-sm text-ink-faint">{word.category}</p>
        {!revealed ? (
          <div className="mx-auto mt-5 max-w-xs">
            <Input
              lang="zh-CN"
              className="zh h-12 text-center text-xl"
              placeholder="escríbelo (opcional) y Enter"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onReveal();
              }}
            />
            <p className="mt-1.5 text-center text-xs text-ink-faint">Dilo en voz alta antes de mostrar la respuesta.</p>
          </div>
        ) : typed ? (
          <p className={cn("mt-3 text-center text-sm font-medium", ok ? "text-celadon-ink" : "text-danger")}>
            {ok ? <Check className="mr-1 inline size-4" /> : <X className="mr-1 inline size-4" />}
            Escribiste:{" "}
            <span lang="zh-CN" className="zh text-lg">
              {typed}
            </span>
          </p>
        ) : null}
      </>,
    );
  }
  if (card.type === "listening") {
    return face(
      "Escucha: ¿qué palabra es?",
      <div className="flex flex-col items-center gap-3">
        <AudioButton text={word.hanzi} size="lg" variant="solid" autoPlay />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => void playText(word.hanzi, 0.7)}>
            <Volume2 /> despacio
          </Button>
          {word.example ? (
            <Button size="sm" variant="ghost" onClick={() => void playText(word.example!)}>
              <Volume2 /> en una frase
            </Button>
          ) : null}
        </div>
      </div>,
    );
  }
  if (card.type === "sentence") {
    const ex = word.example ?? word.hanzi;
    const cloze = ex.split(word.hanzi).join("＿".repeat(Math.max(2, Array.from(word.hanzi).length)));
    return face(
      "Completa la frase",
      <div className="text-center">
        {!revealed ? <ChineseText text={cloze} size="xl" interactive={false} markUnknown={false} /> : <ChineseText text={ex} size="xl" highlight={[word.hanzi]} />}
        {word.exampleTranslation ? <p className="mt-2 text-sm text-ink-faint">{word.exampleTranslation}</p> : null}
      </div>,
    );
  }
  // writing
  return face(
    "Escribe el carácter",
    <>
      <div className="text-center">
        <Pinyin text={word.pinyin} className="text-xl" />
        <p className="font-serif-es text-lg text-ink">{word.meaning}</p>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {Array.from(word.hanzi).map((c, i) => (
          <WritingQuiz key={c + i} ch={c} onDone={(mistakes) => onAutoRate(mistakes === 0 ? Rating.Good : mistakes <= 2 ? Rating.Hard : Rating.Again)} last={i === Array.from(word.hanzi).length - 1} />
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-ink-faint">Se valora automáticamente según los fallos de trazo.</p>
      <div className="mt-2 text-center">
        <Button size="sm" variant="ghost" onClick={onReveal}>
          <RotateCcw /> Mostrar respuesta y valorar a mano
        </Button>
      </div>
    </>,
  );
}

function WritingQuiz({ ch, onDone, last }: { ch: string; onDone: (mistakes: number) => void; last: boolean }) {
  const total = useRef(0);
  return (
    <StrokeOrder
      char={ch}
      mode="quiz"
      size={180}
      controls={false}
      onMistake={() => total.current++}
      onQuizComplete={(r) => {
        if (last) onDone(r.totalMistakes + total.current - r.totalMistakes);
      }}
    />
  );
}
