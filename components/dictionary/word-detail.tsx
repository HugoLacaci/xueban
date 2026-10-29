"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "@/lib/languages/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Pencil, Plus, Star, StarOff } from "lucide-react";
import { db } from "@/lib/db";
import { lookup, useDictionary } from "@/lib/dictionary/service";
import { examplesFor, loadTatoeba, tatoebaLoaded } from "@/lib/examples";
import { useKnowledge } from "@/lib/knowledge";
import { useSettings } from "@/lib/settings";
import { usePack } from "@/lib/languages/provider";
import { externalLinks, levelLabel } from "@/lib/dictionary/service";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Pinyin } from "@/components/target/reading";
import { AudioButton } from "@/components/target/audio-button";
import { ChineseText, Hanzi } from "@/components/target/target-text";
import { SealTag } from "@/components/ornament/seal";
import { WritingGrid as TianZiGe } from "@/components/ornament/writing-grid";
import { QuickAddDialog } from "@/components/flashcards/quick-add";
import { onWordSaved } from "@/lib/anki/hooks";
import { Mixed } from "@/components/target/mixed";

const POS_ES: Record<string, string> = {
  n: "sustantivo",
  v: "verbo",
  a: "adjetivo",
  d: "adverbio",
  r: "pronombre",
  m: "numeral",
  q: "clasificador",
  p: "preposición",
  c: "conjunción",
  u: "partícula",
  e: "interjección",
  y: "partícula modal",
  t: "tiempo",
  s: "lugar",
  f: "localizador",
  nr: "nombre propio",
  ns: "topónimo",
  nz: "nombre propio",
  i: "expresión idiomática",
  l: "locución",
  o: "onomatopeya",
  w: "puntuación",
  x: "otro",
  k: "sufijo",
  h: "prefijo",
  j: "abreviatura",
  z: "estado",
  b: "distintivo",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">{children}</h3>;
}

export function WordDetail({ word, onNavigate }: { word: string; onNavigate?: (w: string) => void }) {
  const pack = usePack();
  const CharDetail = pack.ui.CharacterDetail;
  const dictStatus = useDictionary((s) => s.status);
  const full = useDictionary((s) => s.full);
  const deck = useKnowledge((s) => s.deck);
  const showTrad = useSettings((s) => s.settings.showTraditional);
  const entries = useMemo(() => lookup(word), [word, dictStatus, full, deck]); // eslint-disable-line react-hooks/exhaustive-deps
  const inDeck = deck.get(word);
  const fav = useLiveQuery(() => db.favorites.get(`${pack.id}:${word}`), [word, pack.id]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tatoebaTick, setTatoebaTick] = useState(0);
  const chars = pack.characters.charsOf(word);

  useEffect(() => {
    if (!tatoebaLoaded()) void loadTatoeba().then(() => setTatoebaTick((t) => t + 1));
  }, []);
  const examples = useMemo(() => examplesFor(word, 8), [word, tatoebaTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = entries[0];
  const pinyin = first?.p ?? pack.reading(word);

  const toggleFav = async () => {
    if (fav) {
      await db.favorites.delete(`${pack.id}:${word}`);
      toast.info("Quitado de favoritos");
    } else {
      await db.favorites.put({ id: `${pack.id}:${word}`, lang: pack.id, hanzi: word, pinyin, meaning: first?.es ?? first?.en?.slice(0, 2).join("; ") ?? "", at: Date.now() });
      toast.success("Añadido a favoritos");
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera de la ficha: palabra protagonista sobre 田字格 tenue */}
      <Card className="relative overflow-hidden">
        <span className="absolute inset-x-6 top-0 h-[2px] rounded-b bg-cinnabar/85" aria-hidden="true" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              {chars.length <= 4 && chars.length === Array.from(word).length ? (
                <div className="flex items-center gap-1.5" lang={pack.bcp47}>
                  {chars.map((c, i) => (
                    <TianZiGe key={i} faint size={chars.length > 2 ? 64 : 84}>
                      <Hanzi text={c} size={chars.length > 2 ? "xl" : "2xl"} font="serif" className={`leading-none ${pack.theme.fontClasses.serif}`} />
                    </TianZiGe>
                  ))}
                </div>
              ) : (
                <Hanzi text={word} size="xl" className={pack.theme.fontClasses.serif} />
              )}
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <Pinyin text={pinyin} className="block text-2xl" />
                  <AudioButton text={word} size="lg" />
                </div>
                {showTrad && first?.t && pack.readingAid.altScript ? (
                  <span className="text-sm text-ink-faint">
                    <Mixed>{pack.readingAid.altScript.glyph}</Mixed> <span lang={pack.bcp47} className={`${pack.meta.cssClass} text-ink-soft`}><Mixed>{first.t}</Mixed></span>
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {first && levelLabel(first) ? <SealTag>{levelLabel(first)}</SealTag> : null}
              {pack.id === "zh" && first?.hsk && first?.hsk2 ? <Badge variant="outline">HSK 2.0 · nivel {first.hsk2}</Badge> : null}
              {first?.freq ? <Badge variant="muted">frecuencia #{first.freq.toLocaleString("es")}</Badge> : null}
              {first?.pos?.length ? <Badge variant="outline">{first.pos.map((p) => (pack.id === "zh" ? (POS_ES[p] ?? p) : p)).join(", ")}</Badge> : null}
              {inDeck ? <Badge variant="jade">en tu mazo · <Mixed>{inDeck.category}</Mixed></Badge> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button size="icon" variant="ghost" onClick={() => void toggleFav()} aria-label={fav ? "Quitar de favoritos" : "Añadir a favoritos"} aria-pressed={Boolean(fav)}>
              {fav ? <Star className="fill-gold text-gold-ink" /> : <StarOff />}
            </Button>
            {inDeck ? (
              <Button size="sm" variant="secondary" asChild>
                <Link href={`/flashcards/${encodeURIComponent(inDeck.id)}`}>
                  <Check /> Ver tarjeta
                </Link>
              </Button>
            ) : (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus /> Añadir
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-ink-faint">{dictStatus === "ready" ? "Sin entrada en el diccionario. Pulsa cada carácter abajo para ver su ficha." : "Cargando diccionario…"}</p>
          ) : null}
          {entries.map((e, i) => (
            <div key={i} className={i > 0 ? "border-t border-line/80 pt-3" : ""}>
              {i > 0 ? (
                <div className="mb-1 flex items-center gap-2">
                  <Pinyin text={e.p} className="text-base font-medium" />
                  <AudioButton text={word} size="sm" />
                </div>
              ) : null}
              {e.es ? (
                <div className="flex items-start gap-2">
                  <p className="font-serif-es text-[22px] leading-snug text-ink"><Mixed>{e.es}</Mixed></p>
                  {inDeck ? (
                    <button className="mt-1 rounded p-1 text-ink-faint hover:bg-paper-sunk hover:text-ink" onClick={() => setEditing(true)} aria-label="Editar significado">
                      <Pencil className="size-4" />
                    </button>
                  ) : null}
                </div>
              ) : null}
              {e.en?.length ? (
                <ol className={e.es ? "mt-1.5 space-y-0.5 text-sm text-ink-faint" : "font-serif-es space-y-1 text-lg text-ink"}>
                  {e.en.map((d, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="w-4 shrink-0 text-right text-xs tabular-nums text-ink-faint">{j + 1}</span>
                      <span>
                        {e.es && j === 0 ? <span className="mr-1.5 rounded-[3px] border border-line px-1 text-[10px] uppercase tracking-wide text-ink-faint">en</span> : null}
                        <Mixed>{d}</Mixed>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
              {e.cl?.length ? (
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-ink-faint">
                  {pack.counters.name}:
                  {e.cl.map((c) => (
                    <button key={c} className="min-h-8 font-medium rounded-[6px] border border-line bg-paper-raised px-2 text-base leading-none text-ink hover:border-ink/40 hover:bg-paper-sunk" lang={pack.bcp47} onClick={() => onNavigate?.(c)}>
                      <Mixed>{c}</Mixed>
                    </button>
                  ))}
                </p>
              ) : null}
              {!e.es && i === 0 ? <p className="mt-1.5 text-xs text-ink-faint">Definición en inglés ({pack.dictionary.name}). Al añadirla al mazo podrás escribir tu significado en español.</p> : null}
            </div>
          ))}
        </div>
      </Card>

      {inDeck?.example ? (
        <Card>
          <SectionLabel>Tu ejemplo</SectionLabel>
          <div className="rounded-[10px] border-l-[3px] border-cinnabar/70 bg-paper-sunk/50 px-3 py-2">
            <ChineseText text={inDeck.example} size="lg" pinyinLine={inDeck.examplePinyin} translation={inDeck.exampleTranslation} as="div" highlight={[word]} />
          </div>
        </Card>
      ) : null}

      {examples.length ? (
        <Card>
          <SectionLabel>Ejemplos {examples.some((e) => e.source === "tatoeba") ? "(semilla + Tatoeba)" : ""}</SectionLabel>
          <ul className="space-y-2">
            {examples.map((ex, i) => (
              <li key={i} className="flex items-start gap-2 rounded-[10px] border border-line/80 bg-paper-sunk/40 px-3 py-2">
                <AudioButton text={ex.zh} size="sm" className="mt-1 shrink-0" />
                <ChineseText text={ex.zh} size="md" highlight={[word]} translation={ex.es} as="div" className="min-w-0 flex-1" />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {chars.length > 1 ? (
        <Card>
          <h3 className="mb-3 font-serif-es text-lg font-semibold tracking-tight text-ink">Caracteres</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {chars.map((c, i) => (
              <CharMini key={i} ch={c} onNavigate={onNavigate} />
            ))}
          </div>
        </Card>
      ) : chars.length === 1 ? (
        <CharDetail char={word} onNavigate={onNavigate} />
      ) : null}

      {externalLinks(word).length ? (
        <p className="flex flex-wrap gap-3 px-1 text-xs text-ink-faint">
          {externalLinks(word).map((l) => (
            <a key={l.name} href={l.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
              <Mixed>{l.name}</Mixed>
            </a>
          ))}
        </p>
      ) : null}


      {adding ? <QuickAddDialog open={adding} onOpenChange={setAdding} initialHanzi={word} source="dictionary" /> : null}
      {editing && inDeck ? <EditMeaning word={inDeck} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}

function CharMini({ ch, onNavigate }: { ch: string; onNavigate?: (w: string) => void }) {
  const pack = usePack();
  const status = useDictionary((s) => s.status);
  const e = useMemo(() => lookup(ch)[0], [ch, status]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <button onClick={() => onNavigate?.(ch)} className="flex items-center gap-3 rounded-[10px] border border-line bg-paper-raised p-2 text-left shadow-[var(--shadow-paper)] transition-colors hover:border-ink/40 hover:bg-paper-sunk">
      <TianZiGe faint size={64}>
        <Hanzi text={ch} size="xl" className={`leading-none ${pack.theme.fontClasses.serif}`} />
      </TianZiGe>
      <span className="min-w-0">
        <Pinyin text={e?.p ?? pack.reading(ch)} className="block text-base" />
        <span className="font-serif-es block truncate text-sm text-ink-soft"><Mixed>{e?.es ?? e?.en?.slice(0, 2).join("; ") ?? ""}</Mixed></span>
      </span>
    </button>
  );
}

function EditMeaning({ word, onClose }: { word: { id: string; meaning: string; notes?: string }; onClose: () => void }) {
  const [meaning, setMeaning] = useState(word.meaning);
  const [notes, setNotes] = useState(word.notes ?? "");
  return (
    <Card className="border-cinnabar/40">
      <h3 className="mb-2 text-sm font-medium text-ink">Editar significado en español</h3>
      <Input value={meaning} onChange={(e) => setMeaning(e.target.value)} aria-label="Significado" />
      <Textarea className="mt-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (mnemotecnia, matices, lo que dijo el profesor…)" aria-label="Notas" />
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={async () => {
            await db.words.update(word.id, { meaning: meaning.trim(), notes: notes.trim() || undefined, updatedAt: Date.now() });
            const w = await db.words.get(word.id);
            if (w) void onWordSaved(w);
            toast.success("Guardado");
            onClose();
          }}
        >
          Guardar
        </Button>
      </div>
    </Card>
  );
}
