"use client";
/** Hoy · «Repasa la clase de hoy (10 min)»: el día de una clase importada (o el día en que se importa). Solo chino. */
import { useLiveQuery } from "dexie-react-hooks";
import { NotebookPen } from "lucide-react";
import Link from "@/lib/languages/link";
import { db } from "@/lib/db";
import { classSetId } from "@/lib/classes/search";
import { todayKey } from "@/lib/utils-date";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Mixed } from "@/components/target/mixed";

export function TodayClassCard() {
  const note = useLiveQuery(async () => {
    const today = todayKey();
    const notes = await db.notes.where("[lang+kind]").equals(["zh", "class"]).toArray();
    const imported = notes.filter((n) => n.fields?.classPkg);
    const importedAt = (n: (typeof notes)[number]) => Number((n.fields.classImport as { importedAt?: number } | undefined)?.importedAt ?? 0);
    return imported.find((n) => n.classDate === today) ?? imported.filter((n) => todayKey(new Date(importedAt(n))) === today).sort((a, b) => importedAt(b) - importedAt(a))[0] ?? null;
  }, []);
  if (!note) return null;
  return (
    <Card className="flex flex-wrap items-center gap-3 border-cinnabar/30">
      <span lang="zh-CN" className="zh-serif flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-cinnabar/10 text-2xl text-cinnabar" aria-hidden="true">
        课
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-serif-es text-lg text-ink">Repasa la clase de hoy (10 min)</h2>
        <p className="truncate text-sm text-ink-soft">
          <Mixed>{note.title}</Mixed>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" asChild>
          <Link href={`/apuntes/cuaderno?vista=clase&set=${encodeURIComponent(classSetId(note.id))}`}>Ejercicios</Link>
        </Button>
        <Button size="sm" variant="ink" asChild>
          <Link href={`/apuntes/${encodeURIComponent(note.id)}`}>
            <NotebookPen /> Abrir la clase
          </Link>
        </Button>
      </div>
    </Card>
  );
}
