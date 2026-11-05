"use client";
/** Panel Hoy · «Novedades en tus apuntes»: secciones de los apuntes vivos desbloqueadas en los últimos 7 días. */
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "@/lib/languages/link";
import { Sprout } from "lucide-react";
import { db } from "@/lib/db";
import { getActiveLang } from "@/lib/languages/registry";
import { loadLivingNotes } from "@/lib/notes/living";
import { recentGrowth, unlockLabel, type LivingNote } from "@/lib/notes/living-model";
import { useNow } from "@/hooks/use-now";
import { Card } from "@/components/ui/primitives";
import { Mixed } from "@/components/target/mixed";

export function LivingNotesNews() {
  const [notes, setNotes] = useState<LivingNote[]>([]);
  const now = useNow();
  const rows = useLiveQuery(
    () => db.lessonProgress.where("lang").equals(getActiveLang()).toArray(),
    [],
  );
  useEffect(() => {
    void loadLivingNotes(getActiveLang()).then(setNotes);
  }, []);
  const items = useMemo(
    () => recentGrowth(notes, new Map((rows ?? []).map((r) => [r.lessonId, r])), now).slice(0, 6),
    [notes, rows, now],
  );
  if (!items.length) return null;
  return (
    <Card>
      <h2 className="font-serif-es text-ink mb-2 flex items-center gap-2 text-lg">
        <Sprout className="text-celadon-ink size-4" /> Novedades en tus apuntes
      </h2>
      <ul className="space-y-1.5">
        {items.map(({ note, section }) => (
          <li key={`${note.id}/${section.id}`}>
            <Link
              href={`/apuntes/vivos?n=${note.id}#${section.id}`}
              className="hover:bg-paper-sunk flex items-baseline gap-2 rounded-[8px] px-2 py-1 text-sm"
            >
              <span className="text-ink-faint shrink-0 text-xs">
                {unlockLabel(section.unlockedBy)}
              </span>
              <span className="text-ink min-w-0 truncate">
                <Mixed>{note.title}</Mixed> · <Mixed>{section.title}</Mixed>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
