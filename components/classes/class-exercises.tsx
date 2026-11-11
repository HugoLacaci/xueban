"use client";
/**
 * Cuaderno 练习本 → «Corregidos en clase»: fichas de los ejercicios que corrigió el profesor en clase.
 * Mi respuesta en clase tachada (diferencias con el alineador del motor de corrección), la corrección del profesor con
 * pinyin, voz sintética y su propia voz (recorte), explicación, otras formas, gramática, avisos de confianza baja y
 * propuesta de Claude marcada como tal. «Practicar otra vez» usa la sesión normal del cuaderno (SRS).
 */
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, BookOpen, Check, Dumbbell, Pencil, Sparkles } from "lucide-react";
import Link from "@/lib/languages/link";
import { db, type ExerciseItem, type ExerciseSet } from "@/lib/db";
import { usePack } from "@/lib/languages/provider";
import { alignHanzi } from "@/lib/correction/align";
import { sentencePinyin } from "@/lib/correction";
import { getLexicon } from "@/lib/dictionary/service";
import { answerDiffers, ddmm } from "@/lib/classes/search";
import { updateItem } from "@/lib/notes/workbook";
import { onChangeWithTones } from "@/lib/correction/live-tones";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Input } from "@/components/ui/primitives";
import { TargetText } from "@/components/target/target-text";
import { AudioButton } from "@/components/target/audio-button";
import { Mixed } from "@/components/target/mixed";
import { cn } from "@/lib/utils";
import { ClipButton } from "./clip-button";

const EMPTY_ITEMS: ExerciseItem[] = [];
const EMPTY_SETS: ExerciseSet[] = [];

export default function ClassCorrectedView({ setId, itemId, onPractice }: { setId?: string | null; itemId?: string | null; onPractice: (items: ExerciseItem[], title: string) => void }) {
  const items = useLiveQuery(() => db.exerciseItems.where("origin").equals("class").toArray(), []) ?? EMPTY_ITEMS;
  const sets = useLiveQuery(() => db.exerciseSets.where("lang").equals("zh").toArray(), []) ?? EMPTY_SETS;
  const [onlyReview, setOnlyReview] = useState(false);
  const groups = useMemo(() => {
    const filtered = items.filter((i) => (!setId || i.setId === setId) && (!onlyReview || (i.confidence === "baja" && !i.confirmed)));
    const by = new Map<string, ExerciseItem[]>();
    for (const it of filtered) by.set(it.setId, [...(by.get(it.setId) ?? []), it]);
    return [...by.entries()]
      .map(([sid, list]) => ({ set: sets.find((s) => s.id === sid), items: list.sort((a, b) => a.order - b.order) }))
      .sort((a, b) => (b.set?.date ?? "").localeCompare(a.set?.date ?? ""));
  }, [items, sets, setId, onlyReview]);
  const pending = items.filter((i) => i.confidence === "baja" && !i.confirmed).length;
  const all = groups.flatMap((g) => g.items);

  if (!items.length)
    return (
      <EmptyState
        icon={<Dumbbell />}
        title="Aún no hay ejercicios corregidos en clase"
        zh={{ zh: "温故而知新。", py: "Wēn gù ér zhī xīn.", es: "Repasar lo viejo para aprender lo nuevo." }}
        description="Al importar una clase grabada, cada frase que corrigió el profesor aparece aquí con su voz."
        action={
          <Button variant="ink" asChild>
            <Link href="/apuntes/clases/importar">Importar una clase</Link>
          </Button>
        }
      />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {setId ? (
          <Link href="/apuntes/cuaderno?vista=clase" className="text-xs text-indigo hover:underline">
            ver todas las clases
          </Link>
        ) : null}
        {pending ? (
          <button type="button" onClick={() => setOnlyReview((v) => !v)} aria-pressed={onlyReview} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", onlyReview ? "border-gold bg-gold/15 text-gold-ink" : "border-line text-ink-soft hover:border-ink/40")}>
            <AlertTriangle className="size-3.5" /> {pending} por revisar
          </button>
        ) : null}
        <Button size="sm" variant="ink" className="ml-auto" disabled={!all.length} onClick={() => onPractice(all, setId ? (groups[0]?.set?.title ?? "Corregidos en clase") : "Corregidos en clase")}>
          <Dumbbell /> Practicar {all.length}
        </Button>
      </div>
      {groups.map((g) => (
        <section key={g.set?.id ?? "x"} aria-label={g.set?.title}>
          <h2 className="mb-2 flex flex-wrap items-baseline gap-2 font-serif-es text-lg font-semibold text-ink">
            <Mixed>{g.set?.title ?? "Clase"}</Mixed>
            {g.items[0]?.classNoteId ? (
              <Link href={`/apuntes/${encodeURIComponent(g.items[0].classNoteId)}`} className="inline-flex items-center gap-1 text-xs font-normal text-indigo hover:underline">
                <BookOpen className="size-3" /> apunte de la clase
              </Link>
            ) : null}
          </h2>
          <ol className="space-y-3">
            {g.items.map((it) => (
              <ClassExerciseCard key={it.id} item={it} highlight={it.id === itemId} onPractice={() => onPractice([it], g.set?.title ?? "Corregido en clase")} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** Mi respuesta en clase con las diferencias tachadas en rojo (alineación palabra a palabra con la corrección). */
function MyClassAnswer({ mine, teacher }: { mine: string; teacher: string }) {
  const tokens = useMemo(() => {
    try {
      return alignHanzi(mine, teacher, getLexicon() ?? undefined).tokens;
    } catch {
      return null;
    }
  }, [mine, teacher]);
  if (!tokens) return <span className="text-danger line-through decoration-danger/70">{mine}</span>;
  return (
    <span>
      {tokens.map((t, i) =>
        t.status === "ok" ? (
          <span key={i} className="text-ink-soft">{t.user}</span>
        ) : t.status === "missing" ? (
          <span key={i} className="mx-px align-super text-[0.6em] text-celadon-ink" title={`faltaba «${t.ref}»`}>
            ‸{t.ref}
          </span>
        ) : (
          <span key={i} className="text-danger line-through decoration-danger decoration-2" title={t.ref ? `→ ${t.ref}` : "sobra"}>
            {t.user}
          </span>
        ),
      )}
    </span>
  );
}

function ClassExerciseCard({ item, highlight, onPractice }: { item: ExerciseItem; highlight?: boolean; onPractice: () => void }) {
  const pack = usePack();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.answers.join(" · "));
  const main = item.answers[0] ?? "";
  const others = item.answers.slice(1);
  const wrong = answerDiffers(item.classAnswer, item.answers);
  const needsReview = item.confidence === "baja" && !item.confirmed;
  const py = useMemo(() => (main ? sentencePinyin(main) : ""), [main]);
  const minePy = useMemo(() => (item.classAnswer ? sentencePinyin(item.classAnswer) : ""), [item.classAnswer]);
  const proposalPy = useMemo(() => (item.claudeProposal ? sentencePinyin(item.claudeProposal) : ""), [item.claudeProposal]);
  const grammar = item.grammarIds.map((id) => ({ id, g: pack.grammar.byId(id) }));
  const date = item.classNoteId?.match(/class-(\d{4}-\d{2}-\d{2})/)?.[1];

  const save = async () => {
    const answers = draft.split(/\s*[·;]\s*/).map((a) => a.trim()).filter(Boolean);
    if (!answers.length) return;
    await updateItem(item.id, { answers, confirmed: true });
    setEditing(false);
  };

  return (
    <li id={item.id} className={cn("card-paper scroll-mt-20 p-4", highlight && "ring-2 ring-cinnabar/40", needsReview && "border-gold/60")}>
      <div className="flex flex-wrap items-start gap-2">
        <p className="min-w-0 flex-1 font-serif-es text-lg leading-snug text-ink"><Mixed>{item.es}</Mixed></p>
        {item.confidence && item.confidence !== "alta" ? <Badge variant={item.confidence === "baja" ? "lacquer" : "gold"}>confianza {item.confidence}</Badge> : null}
        {date ? <Badge variant="outline">clase {ddmm(date)}</Badge> : null}
      </div>

      {item.classAnswer ? (
        <div className="mt-2 text-sm">
          <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">En clase dije</span>
          <span lang={pack.bcp47} className={cn("text-lg", pack.meta.cssClass)}>
            {wrong ? <MyClassAnswer mine={item.classAnswer} teacher={main} /> : <span className="text-celadon-ink">{item.classAnswer} ✓</span>}
          </span>
          {minePy ? <p className="mt-0.5 text-xs text-ink-soft">{minePy}</p> : null}
        </div>
      ) : null}

      <div className="mt-3 rounded-[10px] border border-celadon/40 bg-celadon/6 p-3">
        <p className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-celadon-ink">
          Corrección del profesor
          {item.confirmed && item.confidence === "baja" ? <span className="font-normal normal-case tracking-normal text-ink-faint">· revisada por ti</span> : null}
        </p>
        {editing ? (
          <div className="flex flex-wrap gap-2">
            <Input value={draft} onChange={(e) => onChangeWithTones(e, setDraft)} lang={pack.bcp47} className={cn("min-w-0 flex-1 text-lg", pack.meta.cssClass)} aria-label="Corrección del profesor (separa varias con ·)" />
            <Button size="sm" variant="ink" onClick={() => void save()}>
              Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <AudioButton text={main} size="sm" />
            <div className="min-w-0 flex-1">
              <TargetText text={main} size="lg" ruby={false} as="div" />
              <p className="mt-0.5 text-sm text-ink-soft">{py}</p>
            </div>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ClipButton assetId={item.clipAssetId} t={item.classTimestamp} variant="button" label="Escuchar al profesor" />
          {!item.clipAssetId && item.classTimestamp !== undefined ? <span className="text-[11px] text-ink-faint">sin recorte · minuto <ClipButton t={item.classTimestamp} /></span> : null}
        </div>
      </div>

      {needsReview ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[8px] border border-gold/50 bg-gold/10 p-2.5 text-sm text-gold-ink" role="note">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="min-w-[12rem] flex-1">Revisa: el audio no estaba claro. ¿Es esto lo que dijo el profesor?</span>
          <Button size="sm" variant="jade" onClick={() => void updateItem(item.id, { confirmed: true })}>
            <Check /> Confirmar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            <Pencil /> Corregir
          </Button>
        </div>
      ) : null}

      {item.claudeProposal ? (
        <p className="mt-3 rounded-[8px] border border-indigo/30 bg-indigo/6 p-2.5 text-sm">
          <span className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo">
            <Sparkles className="size-3" /> Propuesta de Claude, no del profesor
          </span>
          <span lang={pack.bcp47} className={cn("text-base text-ink", pack.meta.cssClass)}>{item.claudeProposal}</span>
          {proposalPy ? <span className="block text-xs text-ink-soft">{proposalPy}</span> : null}
        </p>
      ) : null}

      {item.teacherExplanation ? <p className="mt-3 text-sm text-ink"><Mixed>{item.teacherExplanation}</Mixed></p> : null}

      {others.length ? (
        <div className="mt-2 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">También vale</p>
          <ul className="mt-1 space-y-1">
            {others.map((o) => (
              <li key={o} className="flex items-start gap-1.5">
                <AudioButton text={o} size="sm" />
                <span className="min-w-0">
                  <span lang={pack.bcp47} className={cn("block", pack.meta.cssClass)}>{o}</span>
                  <span className="block text-xs text-ink-soft">{sentencePinyin(o)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/70 pt-2.5 text-xs text-ink-faint">
        {grammar.map(({ id, g }) =>
          g ? (
            <Link key={id} href={`/aprender/gramatica/${g.id}`} className="inline-flex items-center gap-1 text-indigo hover:underline">
              <BookOpen className="size-3" /> <Mixed>{g.title}</Mixed>
            </Link>
          ) : (
            <Badge key={id} variant="outline">{id}</Badge>
          ),
        )}
        <span className="tabular">{item.attempts ? `${item.attempts} intento${item.attempts > 1 ? "s" : ""} · última nota ${item.lastScore ?? "—"}` : "sin practicar"}</span>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={onPractice}>
          <Dumbbell /> Practicar otra vez
        </Button>
      </div>
    </li>
  );
}
