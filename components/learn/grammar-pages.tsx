"use client";
import { useMemo, useState } from "react";
import Link from "@/lib/languages/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Search } from "lucide-react";
import { db } from "@/lib/db";
import { grammarById } from "@/lib/course";
import { usePack } from "@/lib/languages/provider";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Input, PageHeader } from "@/components/ui/primitives";
import { ChineseText } from "@/components/target/target-text";
import { GrammarView } from "./grammar-view";
import { getActiveLang } from "@/lib/languages/registry";
import { targetLang } from "@/lib/languages/registry";
import { ui, culture } from "@/lib/languages/ui-text";
import { Mixed } from "@/components/target/mixed";

const GRAMMAR_HINT: Record<string, string> = { zh: "了, clasificadores, negación", ja: "は y が, て-forma, cortesía", ko: "은/는, 아요/어요, partículas" };

export function GrammarIndex() {
  const pack = usePack();
  const units = pack.curriculum.units;
  const grammarList = pack.grammar.points;
  const [q, setQ] = useState("");
  const attempts = useLiveQuery(() => db.exerciseAttempts.where("lang").equals(getActiveLang()).filter((a) => a.itemKind === "grammar").toArray(), []);
  const acc = useMemo(() => {
    const m = new Map<string, { n: number; ok: number }>();
    for (const a of attempts ?? []) {
      const cur = m.get(a.itemId) ?? { n: 0, ok: 0 };
      cur.n++;
      if (a.correct) cur.ok++;
      m.set(a.itemId, cur);
    }
    return m;
  }, [attempts]);
  const lessonOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of units) for (const l of u.lessons) for (const s of l.steps) if (s.type === "grammar" && !m.has(s.id)) m.set(s.id, l.title);
    return m;
  }, []);
  const list = grammarList.filter((g) => {
    if (!q) return true;
    const t = `${g.title} ${g.zh} ${g.pattern} ${g.summary}`.toLowerCase();
    return t.includes(q.toLowerCase());
  });
  return (
    <div>
      <PageHeader title={`Gramática ${pack.curriculum.levelTitle}`} zh={ui().grammar} subtitle={`${grammarList.length} puntos con explicación en español, fórmula, ejemplos, errores comunes y ejercicios. ${pack.id === "zh" ? "Basado en la estructura de la Chinese Grammar Wiki (AllSet Learning), reescrito." : "Explicaciones propias para hispanohablantes."}`} />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar: ${GRAMMAR_HINT[getActiveLang()]}…`} className="pl-9" aria-label="Buscar punto de gramática" />
      </div>
      {list.length === 0 ? (
        <EmptyState title="Sin resultados" description={`Nada coincide con «${q}».`} zh={{ zh: culture().emptyDict.text, py: culture().emptyDict.reading, es: culture().emptyDict.es }} />
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2">
          {list.map((g, i) => {
            const a = acc.get(g.id);
            return (
              <li key={g.id}>
                <Link href={`/aprender/gramatica/${g.id}`} className="card-paper group relative flex h-full flex-col gap-1.5 overflow-hidden p-4 transition-[border-color,box-shadow] duration-[var(--dur-ui)] hover:border-ink/30 hover:shadow-[var(--shadow-float)]">
                  <span className="absolute inset-x-5 top-0 h-[2px] rounded-b bg-cinnabar/70" aria-hidden="true" />
                  <span className="font-serif-es absolute right-3 top-2 text-sm text-ink-faint/70 tabular" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span lang={targetLang()} className="zh-kai text-xl leading-none text-cinnabar">
                    <Mixed>{g.zh}</Mixed>
                  </span>
                  <span className="font-serif-es pr-8 text-lg font-semibold leading-tight text-ink"><Mixed>{g.title}</Mixed></span>
                  <ChineseText text={g.pattern} size="sm" ruby={false} markUnknown={false} interactive={false} className="font-mono text-xs text-ink-faint" />
                  <p className="text-sm text-ink-soft"><Mixed>{g.summary}</Mixed></p>
                  <div className="mt-auto flex flex-wrap gap-1 pt-2">
                    <Badge variant="jade"><Mixed>{pack.curriculum.levelTitle}</Mixed></Badge>
                    {lessonOf.get(g.id) ? <Badge variant="outline">{lessonOf.get(g.id)}</Badge> : null}
                    {a ? <Badge variant={a.ok / a.n >= 0.8 ? "jade" : "gold"}>{Math.round((a.ok / a.n) * 100)} % en ejercicios</Badge> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function GrammarDetail({ id }: { id: string }) {
  const router = useRouter();
  const g = grammarById(id);
  if (!g) {
    return (
      <div>
        <PageHeader title="Punto de gramática no encontrado" />
        <Button asChild variant="secondary">
          <Link href="/aprender/gramatica">
            <ArrowLeft /> Volver
          </Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/aprender/gramatica" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Gramática
      </Link>
      <Card className="sm:p-7">
        <GrammarView g={g} onPractice={() => router.push(`/practicar?grammar=${g.id}`)} />
      </Card>
    </div>
  );
}
