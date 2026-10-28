"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check, Layers, Plus, Save, Trash2 } from "lucide-react";
import { db, upsertWord, uuid, type Note } from "@/lib/db";
import { parseImport } from "@/lib/import";
import { lookup, useDictionary } from "@/lib/dictionary/service";
import { wordPinyin } from "@/lib/pinyin/convert";
import { findExampleFor } from "@/lib/examples";
import { useKnowledge } from "@/lib/knowledge";
import { onWordSaved } from "@/lib/anki/hooks";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Label, PageHeader, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { InkDivider } from "@/components/ornament";
import { Markdown } from "@/components/learn/markdown";
import { Pinyin } from "@/components/zh/pinyin";
import { formatDate, todayKey } from "@/lib/utils-date";
import { cn } from "@/lib/utils";

/** Cuaderno de clase: una página por clase (fecha, vocabulario, gramática, deberes). El vocabulario pasa a flashcards con un clic. */
export function ClassNotebook() {
  const classes = useLiveQuery(() => db.notes.where("kind").equals("class").reverse().sortBy("classDate"), []) ?? [];
  const deck = useKnowledge((s) => s.deck);
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const [sel, setSel] = useState<string | null>(null);
  const [date, setDate] = useState(todayKey());
  const [title, setTitle] = useState("");
  const [vocab, setVocab] = useState("");
  const [grammar, setGrammar] = useState("");
  const [homework, setHomework] = useState("");
  const [busy, setBusy] = useState(false);
  const current = classes.find((c) => c.id === sel);

  useEffect(() => {
    if (dictStatus === "idle") void load();
  }, [dictStatus, load]);

  // estado derivado: al cambiar de clase se cargan sus campos (patrón "prev prop")
  const [prevSel, setPrevSel] = useState<string | null>(null);
  if (sel !== prevSel) {
    setPrevSel(sel);
    if (current) {
      setDate(current.classDate ?? todayKey());
      setTitle(current.title);
      setVocab(current.markdown);
      setGrammar(current.grammar ?? "");
      setHomework(current.homework ?? "");
    }
  }

  const rows = useMemo(() => parseImport(vocab).filter((r) => !r.error), [vocab, dictStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    const id = uuid();
    const n: Note = { id, title: `Clase ${formatDate(new Date(), { day: "numeric", month: "long" })}`, markdown: "", wordIds: [], kind: "class", classDate: todayKey(), createdAt: Date.now(), updatedAt: Date.now() };
    await db.notes.put(n);
    setSel(id);
  };
  const save = async () => {
    if (!current) return;
    await db.notes.update(current.id, { title: title.trim() || "Clase", classDate: date, markdown: vocab, grammar, homework, updatedAt: Date.now() });
    toast.success("Clase guardada");
  };
  const addAll = async () => {
    if (!current) return;
    setBusy(true);
    let n = 0;
    const ids: string[] = [];
    for (const r of rows) {
      if (deck.has(r.hanzi)) continue;
      const e = lookup(r.hanzi)[0];
      const ex = findExampleFor(r.hanzi);
      const w = await upsertWord({ hanzi: r.hanzi, pinyin: r.pinyin ?? e?.p ?? wordPinyin(r.hanzi), meaning: r.meaning ?? e?.es ?? e?.en?.slice(0, 2).join("; ") ?? "", category: r.category ?? "Clase", example: r.example ?? ex?.zh, exampleTranslation: r.exampleTranslation ?? ex?.es, source: "class", sourceRef: current.id, tags: ["clase", `clase_${date}`], meaningEn: e?.en?.join("; "), level: e?.hsk, hsk: e?.hsk ? ["HSK3.0"] : [] });
      void onWordSaved(w);
      ids.push(w.id);
      n++;
    }
    await db.notes.update(current.id, { wordIds: Array.from(new Set([...current.wordIds, ...ids])), markdown: vocab, updatedAt: Date.now() });
    setBusy(false);
    toast.success(`${n} palabras añadidas a flashcards${n ? " (y a Anki si está conectado)" : ""}`);
  };
  const remove = async () => {
    if (!current || !window.confirm("¿Eliminar esta clase del cuaderno? (Las palabras ya añadidas al mazo se conservan.)")) return;
    await db.notes.delete(current.id);
    setSel(null);
  };

  const pending = rows.filter((r) => !deck.has(r.hanzi)).length;

  return (
    <div className="space-y-4">
      <Link href="/study-hall" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Study Hall
      </Link>
      <PageHeader
        title="Cuaderno de clase"
        zh="课堂笔记"
        subtitle="Una página por clase de la escuela. Escribe el vocabulario (una palabra por línea: 咖啡 o 咖啡,kāfēi,café) y pásalo a flashcards y Anki con un clic."
        action={
          <Button onClick={() => void create()}>
            <Plus /> Nueva clase
          </Button>
        }
      />
      <div className="grid gap-3 md:grid-cols-[15rem_1fr]">
        <Card className="p-2 sm:p-2">
          <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto scrollbar-thin">
            {classes.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSel(c.id)}
                  aria-current={sel === c.id ? "true" : undefined}
                  className={cn("relative w-full rounded-[8px] px-2.5 py-1.5 text-left text-sm transition-colors duration-[var(--dur-ui)] hover:bg-paper-sunk", sel === c.id && "bg-paper-sunk")}
                >
                  {sel === c.id ? <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-cinnabar" aria-hidden="true" /> : null}
                  <span className="block truncate font-medium text-ink">{c.title}</span>
                  <span className="tabular block text-[11px] text-ink-faint">
                    {c.classDate} · {c.wordIds.length} palabras
                  </span>
                </button>
              </li>
            ))}
            {!classes.length ? (
              <li className="px-2 py-3 text-xs leading-relaxed text-ink-faint">
                <span lang="zh-CN" className="zh-kai block text-base text-ink">
                  温故而知新。
                </span>
                Pulsa «Nueva clase» después de cada clase. 2 minutos de apuntes = vocabulario en tu repaso de mañana.
              </li>
            ) : null}
          </ul>
        </Card>
        {current ? (
          <Card className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <Label htmlFor="cn-title" className="mb-1.5 block">
                  Título
                </Label>
                <Input id="cn-title" value={title} onChange={(e) => setTitle(e.target.value)} className="font-serif-es text-base font-medium" />
              </div>
              <div>
                <Label htmlFor="cn-date" className="mb-1.5 block">
                  Fecha
                </Label>
                <Input id="cn-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="tabular" />
              </div>
            </div>
            <InkDivider label="生词" className="my-1" />
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="cn-vocab">Vocabulario de la clase</Label>
                <Button size="sm" variant="jade" onClick={() => void addAll()} disabled={busy || !rows.length}>
                  <Layers /> Añadir {pending} a flashcards
                </Button>
              </div>
              <Textarea id="cn-vocab" lang="zh-CN" className="zh min-h-32 text-base leading-relaxed" value={vocab} onChange={(e) => setVocab(e.target.value)} placeholder={"地铁\n出租车,chūzūchē,taxi\n我坐地铁去学校。| wǒ zuò dìtiě qù xuéxiào | Voy a la escuela en metro"} />
              {rows.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {rows.map((r) => {
                    const e = lookup(r.hanzi)[0];
                    const inDeck = deck.has(r.hanzi);
                    return (
                      <li key={r.line} className={cn("flex items-center gap-1.5 rounded-[8px] border px-2 py-1 text-sm", inDeck ? "border-celadon/40 bg-celadon/8" : "border-line bg-paper-raised")}>
                        <span lang="zh-CN" className="zh-serif text-base text-ink">
                          {r.hanzi}
                        </span>
                        <Pinyin text={r.pinyin ?? e?.p ?? ""} className="text-xs" />
                        <span className="max-w-32 truncate text-xs text-ink-faint">{r.meaning ?? e?.es ?? e?.en?.[0] ?? "?"}</span>
                        {inDeck ? <Check className="size-3.5 text-celadon-ink" aria-label="ya en el mazo" /> : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
            <InkDivider label="语法 · 作业" className="my-1" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="cn-gram" className="mb-1.5 block">
                  Gramática vista (Markdown)
                </Label>
                <Textarea id="cn-gram" className="min-h-24" value={grammar} onChange={(e) => setGrammar(e.target.value)} placeholder="- 是…的 para preguntar cuándo/dónde" />
              </div>
              <div>
                <Label htmlFor="cn-hw" className="mb-1.5 block">
                  Deberes
                </Label>
                <Textarea id="cn-hw" className="min-h-24" value={homework} onChange={(e) => setHomework(e.target.value)} placeholder="- Libro p. 23, ejercicios 1–3 para el jueves" />
              </div>
            </div>
            {grammar ? (
              <div className="card-sunk p-4">
                <Markdown>{grammar}</Markdown>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => void remove()}>
                <Trash2 /> Eliminar
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                {current.wordIds.length ? (
                  <Badge variant="jade">
                    {current.wordIds.length} palabras en el mazo ·{" "}
                    <Link href={`/flashcards/repasar?words=${current.wordIds.map(encodeURIComponent).join(",")}&new=1`} className="underline underline-offset-2">
                      repasar
                    </Link>
                  </Badge>
                ) : null}
                <Button variant="ink" onClick={() => void save()}>
                  <Save /> Guardar
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center text-sm text-ink-faint">Selecciona una clase o crea una nueva.</Card>
        )}
      </div>
    </div>
  );
}
