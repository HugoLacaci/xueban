"use client";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Sparkles } from "lucide-react";
import { db, upsertWord, type CardType } from "@/lib/db";
import { lookup, useDictionary } from "@/lib/dictionary/service";
import { wordPinyin, hanziOnly } from "@/lib/pinyin/convert";
import { numberedToMarked } from "@/lib/pinyin/tones";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, Input, Label, Select, Switch, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Pinyin } from "@/components/zh/pinyin";
import { onWordSaved } from "@/lib/anki/hooks";
import { findExampleFor } from "@/lib/examples";

export interface QuickAddProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialHanzi?: string;
  initialExample?: string;
  sourceRef?: string;
  source?: "class" | "video" | "reading" | "dictionary" | "manual";
  onSaved?: (id: string) => void;
}

export function QuickAddDialog({ open, onOpenChange, initialHanzi = "", initialExample = "", sourceRef, source = "dictionary", onSaved }: QuickAddProps) {
  const categories = useLiveQuery(() => db.categories.orderBy("order").toArray(), []) ?? [];
  const dictStatus = useDictionary((s) => s.status);
  const load = useDictionary((s) => s.load);
  const [hanzi, setHanzi] = useState(initialHanzi);
  // Valores escritos por el usuario (null = usar el autocompletado derivado del diccionario)
  const [pinyinInput, setPinyinInput] = useState<string | null>(null);
  const [meaningInput, setMeaningInput] = useState<string | null>(null);
  const [exampleInput, setExampleInput] = useState<string | null>(initialExample && initialExample !== initialHanzi ? initialExample : null);
  const [exampleTrInput, setExampleTrInput] = useState<string | null>(null);
  const [category, setCategory] = useState("Clase");
  const [production, setProduction] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && dictStatus === "idle") void load();
  }, [open, dictStatus, load]);

  const clean = hanziOnly(hanzi);
  // Derivado del diccionario (se recalcula cuando el diccionario termina de cargar)
  const entries = useMemo(() => (clean ? lookup(clean) : []), [clean, dictStatus]); // eslint-disable-line react-hooks/exhaustive-deps
  const autoExample = useMemo(() => (clean ? findExampleFor(clean) : undefined), [clean]);
  const pinyin = pinyinInput ?? (clean ? (entries[0]?.p ?? wordPinyin(clean)) : "");
  const meaning = meaningInput ?? entries[0]?.es ?? (entries[0]?.en?.length ? entries[0].en.slice(0, 2).join("; ") : "");
  const example = exampleInput ?? autoExample?.zh ?? "";
  const exampleTranslation = exampleTrInput ?? (exampleInput === null ? (autoExample?.es ?? "") : "");

  const save = async () => {
    const h = hanziOnly(hanzi);
    if (!h) return toast.error("Escribe la palabra en caracteres chinos.");
    if (!meaning.trim()) return toast.error("Falta el significado.");
    setSaving(true);
    try {
      const e = entries[0];
      const types: CardType[] = production ? ["recognition", "production", "listening"] : ["recognition", "listening"];
      if ((source === "video" || source === "reading") && example.trim()) types.push("sentence");
      const w = await upsertWord(
        {
          hanzi: h,
          pinyin: numberedToMarked(pinyin.trim()),
          meaning: meaning.trim(),
          meaningEn: e?.en?.join("; "),
          category,
          example: example.trim() || undefined,
          exampleTranslation: exampleTranslation.trim() || undefined,
          traditional: e?.t,
          hsk: e?.hsk ? [`HSK3.0`] : [],
          level: e?.hsk,
          tags: [source === "class" ? "clase" : source],
          source,
          sourceRef,
          createProduction: production,
        },
        types,
      );
      toast.success(`${h} añadida a flashcards`, `Categoría: ${category}`);
      void onWordSaved(w);
      onSaved?.(w.id);
      onOpenChange(false);
    } catch (err) {
      toast.error("No se pudo guardar", (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Añadir palabra" description="Escribe el hanzi y el resto se autocompleta. Enter para guardar." side="bottom">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <Label htmlFor="qa-hanzi">Hanzi</Label>
              <Input id="qa-hanzi" lang="zh-CN" className="zh zh-serif mt-1 h-12 text-2xl" value={hanzi} onChange={(e) => setHanzi(e.target.value)} autoFocus placeholder="咖啡" />
            </div>
            <div className="flex items-end pb-1">
              {entries[0] ? (
                <span className="inline-flex items-center gap-1 text-xs text-celadon-ink">
                  <Sparkles className="size-3.5" /> diccionario
                </span>
              ) : null}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="qa-pinyin">Pinyin</Label>
              <Input id="qa-pinyin" className="mt-1" value={pinyin} onChange={(e) => setPinyinInput(e.target.value)} placeholder="kāfēi o ka1fei1" />
              {pinyin ? <Pinyin text={numberedToMarked(pinyin)} className="mt-1 block text-sm" /> : null}
            </div>
            <div>
              <Label htmlFor="qa-cat">Categoría</Label>
              <Select id="qa-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full">
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="qa-meaning">Significado (español)</Label>
            <Input id="qa-meaning" className="mt-1" value={meaning} onChange={(e) => setMeaningInput(e.target.value)} placeholder="café" />
            {entries[0]?.en?.length && !entries[0].es ? <p className="mt-1 text-xs text-ink-faint">EN: {entries[0].en.slice(0, 3).join("; ")}</p> : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="qa-ex">Frase de ejemplo</Label>
              <Textarea id="qa-ex" lang="zh-CN" className="zh mt-1 min-h-[56px]" value={example} onChange={(e) => setExampleInput(e.target.value)} placeholder="我想喝咖啡。" />
            </div>
            <div>
              <Label htmlFor="qa-ext">Traducción del ejemplo</Label>
              <Textarea id="qa-ext" className="mt-1 min-h-[56px]" value={exampleTranslation} onChange={(e) => setExampleTrInput(e.target.value)} placeholder="Quiero tomar un café." />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <Switch checked={production} onCheckedChange={setProduction} /> Crear tarjeta de producción (español → 汉字)
            </label>
            <Button type="submit" disabled={saving}>
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
