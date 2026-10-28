"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ArrowUpFromLine, Play, Save, Trash2 } from "lucide-react";
import { db, deleteWord, newCard, type CardType, type Word } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { useAnkiStatus } from "@/lib/anki/client";
import { numberedToMarked } from "@/lib/pinyin/tones";
import { formatInterval } from "@/lib/fsrs/scheduler";
import { onWordSaved } from "@/lib/anki/hooks";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Label, PageHeader, Select, Switch, Textarea, Spinner } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Pinyin } from "@/components/zh/pinyin";
import { AudioButton } from "@/components/zh/audio-button";
import { ChineseText, Hanzi } from "@/components/zh/chinese-text";
import { SealTag } from "@/components/ornament/seal";
import { TianZiGe } from "@/components/ornament/tianzige";
import { CharDetail } from "@/components/dictionary/char-detail";
import { cn, formatDate, nowMs } from "@/lib/utils";

const TYPES: { t: CardType; label: string; desc: string }[] = [
  { t: "recognition", label: "Reconocimiento", desc: "汉字 → significado" },
  { t: "production", label: "Producción", desc: "español → 汉字" },
  { t: "listening", label: "Escucha", desc: "audio → significado" },
  { t: "sentence", label: "Frase (cloze)", desc: "completa el hueco en el ejemplo" },
  { t: "writing", label: "Escritura", desc: "traza el carácter" },
];

const STATE_LABEL = ["nueva", "aprendiendo", "repaso", "reaprendiendo"];
const RATING_LABEL = ["", "Otra vez", "Difícil", "Bien", "Fácil"];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif-es text-lg font-semibold tracking-tight text-ink">{children}</h2>;
}

export function WordPage({ id }: { id: string }) {
  const router = useRouter();
  const word = useLiveQuery(() => db.words.get(id), [id]);
  const cards = useLiveQuery(() => db.cards.where("wordId").equals(id).toArray(), [id]) ?? [];
  const logs = useLiveQuery(() => db.reviewLogs.where("wordId").equals(id).reverse().sortBy("review"), [id]) ?? [];
  const categories = useLiveQuery(() => db.categories.orderBy("order").toArray(), []) ?? [];
  const settings = useSettings((s) => s.settings);
  const anki = useAnkiStatus();
  const [draft, setDraft] = useState<Partial<Word> | null>(null);

  if (word === undefined) return <Spinner />;
  if (word === null) {
    return (
      <div>
        <PageHeader title="Palabra no encontrada" />
        <Button asChild variant="secondary">
          <Link href="/flashcards">
            <ArrowLeft /> Volver
          </Link>
        </Button>
      </div>
    );
  }
  const d = { ...word, ...(draft ?? {}) };
  const dirty = draft !== null;
  const chars = Array.from(word.hanzi);
  const cell = chars.length <= 2 ? "clamp(96px, 22vw, 128px)" : chars.length === 3 ? "clamp(80px, 20vw, 108px)" : "clamp(64px, 17vw, 92px)";
  const zhFont = settings.zhFont === "kai" ? "zh-kai" : "zh-serif";

  const save = async () => {
    const next: Word = { ...word, ...draft, pinyin: numberedToMarked((draft?.pinyin ?? word.pinyin).trim()), updatedAt: Date.now() };
    await db.words.put(next);
    setDraft(null);
    toast.success("Guardado");
    void onWordSaved(next);
  };

  const toggleType = async (t: CardType, on: boolean) => {
    const cid = `${word.id}:${t}`;
    if (on) {
      if (!(await db.cards.get(cid))) await db.cards.put(newCard(word.id, t));
      if (t === "production" && !word.createProduction) await db.words.update(word.id, { createProduction: true, updatedAt: nowMs() });
    } else {
      await db.cards.delete(cid);
      if (t === "production") await db.words.update(word.id, { createProduction: false, updatedAt: nowMs() });
    }
  };

  const remove = async () => {
    if (!window.confirm(`¿Eliminar «${word.hanzi}» y sus tarjetas de la web? (No se borra de Anki.)`)) return;
    await deleteWord(word.id);
    router.push("/flashcards");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/flashcards">
            <ArrowLeft /> Mazo
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/flashcards/repasar?words=${encodeURIComponent(word.id)}&new=1`}>
              <Play /> Repasar esta palabra
            </Link>
          </Button>
          {settings.anki.enabled && anki.connected ? (
            <Button size="sm" variant="secondary" onClick={() => void import("@/lib/anki/sync").then((m) => m.pushWordsToAnki([word])).then((r) => toast.success("Enviado a Anki", `${r.created} creada · ${r.updated} actualizada`))}>
              <ArrowUpFromLine /> Anki
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => void remove()}>
            <Trash2 /> Eliminar
          </Button>
        </div>
      </div>

      {/* Lámina de la palabra: carácter grande en 田字格, pinyin, significado editorial */}
      <section className="card-paper relative overflow-hidden p-5 sm:p-7" aria-label="Ficha de la palabra">
        <span className="absolute inset-x-8 top-0 h-[2px] rounded-b bg-cinnabar/85" aria-hidden="true" />
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
          <div className="flex flex-wrap justify-center gap-1.5">
            {chars.length <= 4 ? (
              chars.map((c, i) => (
                <TianZiGe key={c + i} faint size={cell}>
                  <span lang="zh-CN" className={cn("zh font-medium leading-none text-ink", zhFont)} style={{ fontSize: `calc(${cell} * 0.72)` }}>
                    {c}
                  </span>
                </TianZiGe>
              ))
            ) : (
              <Hanzi text={word.hanzi} size="2xl" font={settings.zhFont === "kai" ? "kai" : "serif"} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <Pinyin text={word.pinyin} className="text-2xl sm:text-3xl" />
              <AudioButton text={word.hanzi} size="lg" />
            </div>
            <p className="font-serif-es mt-2 text-2xl text-ink sm:text-3xl">{word.meaning}</p>
            {settings.showTraditional && word.traditional && word.traditional !== word.hanzi ? (
              <p className="mt-1 text-sm text-ink-faint">
                繁{" "}
                <span lang="zh-TW" className="zh">
                  {word.traditional}
                </span>
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              {word.hsk
                .filter((h) => h !== "Extra")
                .map((h) => (
                  <SealTag key={h} tone="celadon">
                    <span className="font-sans text-[10px] font-semibold tracking-wide">{h.replace("HSK", "HSK ")}</span>
                  </SealTag>
                ))}
              <Badge variant="outline">{word.category}</Badge>
              <Badge variant="muted">fuente: {word.source}</Badge>
              {word.ankiNoteId ? <Badge variant="muted">Anki #{word.ankiNoteId}</Badge> : null}
              {word.tags.map((t) => (
                <Badge key={t} variant="muted">
                  #{t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        {word.example ? (
          <div className="mt-5 rounded-[10px] border-l-[3px] border-cinnabar/70 bg-paper-sunk/60 px-3 py-2">
            <div className="flex items-start gap-2">
              <AudioButton text={word.example} size="sm" className="mt-1" />
              <ChineseText text={word.example} size="lg" pinyinLine={word.examplePinyin} translation={word.exampleTranslation} as="div" highlight={[word.hanzi]} />
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeading>Editar</SectionHeading>
          <div className="mt-3 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="w-pinyin">Pinyin</Label>
                <Input id="w-pinyin" className="mt-1" value={d.pinyin} onChange={(e) => setDraft({ ...draft, pinyin: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="w-cat">Categoría</Label>
                <Select id="w-cat" className="mt-1 w-full" value={d.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="w-meaning">Significado (español)</Label>
              <Input id="w-meaning" className="mt-1" value={d.meaning} onChange={(e) => setDraft({ ...draft, meaning: e.target.value })} />
              {word.meaningEn ? <p className="mt-1 text-xs text-ink-faint">EN: {word.meaningEn}</p> : null}
            </div>
            <div>
              <Label htmlFor="w-ex">Ejemplo</Label>
              <Textarea id="w-ex" lang="zh-CN" className="zh mt-1 min-h-14" value={d.example ?? ""} onChange={(e) => setDraft({ ...draft, example: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="w-exp">Pinyin del ejemplo</Label>
                <Input id="w-exp" className="mt-1" value={d.examplePinyin ?? ""} onChange={(e) => setDraft({ ...draft, examplePinyin: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="w-ext">Traducción</Label>
                <Input id="w-ext" className="mt-1" value={d.exampleTranslation ?? ""} onChange={(e) => setDraft({ ...draft, exampleTranslation: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="w-rad">Radical</Label>
                <Input id="w-rad" lang="zh-CN" className="mt-1" value={d.radical ?? ""} onChange={(e) => setDraft({ ...draft, radical: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="w-tags">Etiquetas (separadas por espacio)</Label>
                <Input id="w-tags" className="mt-1" value={d.tags.join(" ")} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(/\s+/).filter(Boolean) })} />
              </div>
            </div>
            <div>
              <Label htmlFor="w-notes">Mis notas</Label>
              <Textarea id="w-notes" className="mt-1" value={d.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Mnemotecnia, matices, lo que dijo el profesor…" />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void save()} disabled={!dirty}>
                <Save /> Guardar cambios
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <SectionHeading>Tarjetas y estado</SectionHeading>
            <ul className="mt-2 divide-y divide-line/70">
              {TYPES.map(({ t, label, desc }) => {
                const c = cards.find((x) => x.type === t);
                return (
                  <li key={t} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{label}</p>
                      <p className="text-xs text-ink-faint">{desc}</p>
                      {c ? (
                        <p className="tabular mt-0.5 text-xs text-ink-faint">
                          {c.ankiState && settings.anki.srsSource === "anki"
                            ? `Anki: ${c.ankiState} · intervalo ${c.ankiInterval ?? 0} d`
                            : `${STATE_LABEL[c.state]} · ${c.reps} repasos · ${c.lapses} fallos · estabilidad ${c.stability.toFixed(1)} d · próximo ${c.state === 0 ? "—" : formatDate(c.due, { day: "numeric", month: "short" })}`}
                        </p>
                      ) : null}
                    </div>
                    <Switch checked={Boolean(c)} onCheckedChange={(on) => void toggleType(t, on)} aria-label={`Tarjeta ${label}`} />
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card>
            <SectionHeading>Historial de repaso</SectionHeading>
            {logs.length ? (
              <ul className="tabular mt-2 max-h-56 space-y-1.5 overflow-y-auto text-xs scrollbar-thin">
                {logs.map((l) => (
                  <li key={l.id} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-ink-faint">{formatDate(l.review, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="w-24 shrink-0 text-ink-soft">{TYPES.find((t) => `${id}:${t.t}` === l.cardId)?.label ?? l.cardId}</span>
                    <span className={cn("font-medium", l.rating === 1 ? "text-danger" : l.rating === 2 ? "text-gold-ink" : "text-celadon-ink")}>{RATING_LABEL[l.rating]}</span>
                    <span className="text-ink-faint">{l.scheduled_days ? `→ ${formatInterval(l.scheduled_days * 86400000)}` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-faint">Todavía no has repasado esta palabra.</p>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from(new Set(chars)).map((c, i) => (
          <CharDetail key={c + i} ch={c} compact onNavigate={(w) => router.push(`/diccionario?q=${encodeURIComponent(w)}`)} />
        ))}
      </div>
    </div>
  );
}
