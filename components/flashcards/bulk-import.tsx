"use client";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, upsertWord } from "@/lib/db";
import { parseImport, type ImportRow } from "@/lib/import";
import { lookup, useDictionary } from "@/lib/dictionary/service";
import { readingOf as wordPinyin } from "@/lib/languages/helpers";
import { findExampleFor } from "@/lib/examples";
import { onWordSaved } from "@/lib/anki/hooks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, Label, Select, Textarea, Option } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Pinyin } from "@/components/target/reading";
import { cn } from "@/lib/utils";
import { getActiveLang } from "@/lib/languages/registry";
import { targetLang } from "@/lib/languages/registry";
import { ui } from "@/lib/languages/ui-text";
import { getActivePack } from "@/lib/languages/registry";
import { Mixed } from "@/components/target/mixed";

export function BulkImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Clase");
  const [step, setStep] = useState<"paste" | "preview">("paste");
  const [busy, setBusy] = useState(false);
  const categories = useLiveQuery(() => db.categories.where("lang").equals(getActiveLang()).sortBy("order"), []) ?? [];
  const existingLive = useLiveQuery(() => db.words.where("lang").equals(getActiveLang()).toArray(), []);
  const existing = useMemo(() => existingLive ?? [], [existingLive]);
  const dict = useDictionary();
  useEffect(() => {
    if (open && dict.status === "idle") void dict.load();
  }, [open, dict]);
  const existingSet = useMemo(() => new Set(existing.map((w) => w.hanzi)), [existing]);
  const rows = useMemo(() => {
    const parsed = parseImport(text);
    return parsed.map((r) => {
      if (r.error) return r;
      const e = lookup(r.hanzi)[0];
      const row: ImportRow & { exists?: boolean; auto?: boolean } = { ...r };
      if (!row.pinyin) {
        row.pinyin = e?.p ?? wordPinyin(r.hanzi);
        row.auto = true;
      }
      if (!row.meaning) row.meaning = e?.es ?? e?.en?.slice(0, 2).join("; ") ?? "";
      if (!row.example) {
        const ex = findExampleFor(r.hanzi);
        if (ex) {
          row.example = ex.zh;
          row.exampleTranslation = ex.es;
        }
      }
      row.exists = existingSet.has(r.hanzi);
      return row;
    });
  }, [text, existingSet, dict.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const valid = rows.filter((r) => !r.error && r.meaning);
  const missingMeaning = rows.filter((r) => !r.error && !r.meaning);

  const doImport = async () => {
    setBusy(true);
    let n = 0;
    try {
      for (const r of valid) {
        const w = await upsertWord({
          hanzi: r.hanzi,
          pinyin: r.pinyin!,
          meaning: r.meaning!,
          category: r.category || category,
          example: r.example,
          exampleTranslation: r.exampleTranslation,
          source: "import",
          tags: ["importado"],
        });
        void onWordSaved(w);
        n++;
      }
      toast.success(`${n} palabras importadas`);
      onOpenChange(false);
      setText("");
      setStep("paste");
    } catch (e) {
      toast.error("Error al importar", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Importar lista de palabras" description="Pega una palabra por línea, o CSV (hanzi, pinyin, significado, categoría, ejemplo, traducción). Lo que falte se autocompleta con el diccionario." side="bottom" className="sm:max-w-2xl">
        {step === "paste" ? (
          <div className="space-y-3">
            <Textarea lang={targetLang()} className="zh min-h-40 text-base" value={text} onChange={(e) => setText(e.target.value)} placeholder={(() => { const x = ui().examples; const r = getActivePack().reading; return `${x.word}\n${x.word2},${r(x.word2)},té\n${x.word3} | ${r(x.word3)} | bebida | Comida y bebida`; })()} />
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <Label htmlFor="bi-cat">Categoría por defecto</Label>
                <Select id="bi-cat" className="mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => (
                    <Option key={c.id} value={c.name}>
                      {c.name}
                    </Option>
                  ))}
                </Select>
              </div>
              <Button onClick={() => setStep("preview")} disabled={!rows.length}>
                Previsualizar ({rows.filter((r) => !r.error).length})
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-[50vh] overflow-y-auto rounded-[10px] border border-line bg-paper-raised scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-paper-sunk text-left text-xs text-ink-faint">
                  <tr>
                    <th className="p-2">{ui().wordLabel}</th>
                    <th className="p-2">{getActivePack().readingAid.name}</th>
                    <th className="p-2">Significado</th>
                    <th className="p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={cn("border-t border-line", r.error && "bg-danger/8")}>
                      <td className="p-2">
                        <span lang={targetLang()} className="zh zh-serif text-lg">
                          {r.hanzi || "—"}
                        </span>
                      </td>
                      <td className="p-2">{r.pinyin ? <Pinyin text={r.pinyin} /> : ""}</td>
                      <td className="p-2">{r.meaning || <span className="text-danger">sin significado</span>}</td>
                      <td className="p-2 text-xs text-ink-faint">{r.error ?? ((r as { exists?: boolean }).exists ? "ya existe: se actualiza" : "nueva")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {missingMeaning.length ? <p className="text-xs text-danger">{missingMeaning.length} palabras sin significado (no están en el diccionario): añade el significado en la lista para importarlas.</p> : null}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("paste")}>
                ← Editar
              </Button>
              <Button onClick={() => void doImport()} disabled={busy || !valid.length}>
                Importar {valid.length} palabras
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
