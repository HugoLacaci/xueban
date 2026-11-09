"use client";
/**
 * Apunte de clase importado: las secciones del paquete (resumen, vocabulario, estructuras, frases, trucos, dudas,
 * deberes…) con marcas «▶ 12:34» que reproducen el recorte del profesor si existe.
 */
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, BookOpen, Dumbbell, ExternalLink, Sprout } from "lucide-react";
import Link from "@/lib/languages/link";
import { db, type Note } from "@/lib/db";
import type { ClassPackage } from "@/lib/classes/package-schema";
import { classSetId, clipAssetId, ddmm, fmtTime } from "@/lib/classes/search";
import { usePack } from "@/lib/languages/provider";
import { Badge } from "@/components/ui/primitives";
import { TargetText } from "@/components/target/target-text";
import { AudioButton } from "@/components/target/audio-button";
import { Mixed } from "@/components/target/mixed";
import { ClipButton } from "./clip-button";

export const classPackageOf = (n: Pick<Note, "fields">) => n.fields?.classPkg as ClassPackage | undefined;

function Heading({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="mb-2 flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
      {children}
      {count !== undefined ? <span className="tabular font-normal normal-case tracking-normal">{count}</span> : null}
    </h2>
  );
}

export function ClassNoteView({ note }: { note: Note }) {
  const pkg = classPackageOf(note);
  const pack = usePack();
  const excluded = new Set((note.fields.classExcluded as string[] | undefined) ?? []);
  const exercises = useLiveQuery(() => db.exerciseItems.where("setId").equals(classSetId(note.id)).toArray(), [note.id]) ?? [];
  if (!pkg) return null;
  const clip = (file?: string) => (file ? clipAssetId(note.id, file) : undefined);
  const vocab = pkg.vocab.filter((v) => !excluded.has(`word:${v.hanzi}`));
  const grammar = pkg.grammar.map((g, i) => ({ g, i })).filter(({ i }) => !excluded.has(`grammar:${i}`));
  const practiced = exercises.filter((e) => e.attempts > 0).length;

  return (
    <div className="space-y-5">
      <section className="card-paper p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
          <Badge variant="seal">课 {ddmm(pkg.classDate)}</Badge>
          {pkg.teacher ? <span>con {pkg.teacher}</span> : null}
          <span>· {fmtTime(pkg.source.durationSec)} de clase</span>
          {pkg.source.onlyTeamsTranscript ? <Badge variant="gold">solo transcripción de Teams</Badge> : null}
        </div>
        <p className="text-[15px] leading-relaxed text-ink"><Mixed>{pkg.summary}</Mixed></p>
        {pkg.topics.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {pkg.topics.map((t) => (
              <li key={t} className="rounded-full border border-line bg-paper-raised px-2 py-0.5 text-xs text-ink-soft"><Mixed>{t}</Mixed></li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {exercises.length ? (
            <Link href={`/apuntes/cuaderno?vista=clase&set=${encodeURIComponent(classSetId(note.id))}`} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper-sunk px-3 py-1.5 text-xs font-medium text-ink hover:border-ink/30">
              <Dumbbell className="size-3.5" /> {exercises.length} ejercicios corregidos · {practiced} practicados
            </Link>
          ) : null}
          {note.wordIds.length ? (
            <Link href={`/flashcards/repasar?words=${note.wordIds.map(encodeURIComponent).join(",")}&new=1`} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper-sunk px-3 py-1.5 text-xs font-medium text-ink hover:border-ink/30">
              <BookOpen className="size-3.5" /> Repasar {note.wordIds.length} palabras
            </Link>
          ) : null}
        </div>
      </section>

      {vocab.length ? (
        <section className="card-paper p-4 sm:p-5">
          <Heading count={vocab.length}>Vocabulario</Heading>
          <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {vocab.map((v) => (
              <li key={v.hanzi} className="flex min-w-0 items-start gap-2 border-b border-line/50 py-1.5">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <TargetText text={v.hanzi} size="md" ruby={false} />
                    <span className="text-xs text-ink-soft">{v.pinyin}</span>
                    <span className="text-sm text-ink"><Mixed>{v.es}</Mixed></span>
                  </span>
                  {v.example ? (
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      <span lang={pack.bcp47} className={pack.meta.cssClass}>{v.example.zh}</span> · <Mixed>{v.example.es}</Mixed>
                    </span>
                  ) : null}
                </span>
                <ClipButton assetId={clip(v.clip)} t={v.t} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {grammar.length ? (
        <section className="card-paper p-4 sm:p-5">
          <Heading count={grammar.length}>Estructuras</Heading>
          <ul className="space-y-4">
            {grammar.map(({ g, i }) => {
              const gp = g.grammarId ? pack.grammar.byId(g.grammarId) : undefined;
              return (
                <li key={i} className="border-l-2 border-cinnabar/40 pl-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif-es text-base font-semibold text-ink"><Mixed>{g.title}</Mixed></h3>
                    <ClipButton assetId={clip(g.clip)} t={g.t} />
                    {gp ? (
                      <Link href={`/aprender/gramatica/${gp.id}`} className="inline-flex items-center gap-1 text-xs text-indigo hover:underline">
                        <ExternalLink className="size-3" /> ficha de gramática
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-1 inline-block rounded-[6px] bg-paper-sunk px-2 py-0.5 text-sm text-ink"><Mixed>{g.pattern}</Mixed></p>
                  <p className="mt-1.5 text-sm text-ink-soft"><Mixed>{g.explanationEs}</Mixed></p>
                  {g.teacherSaid ? <blockquote className="mt-1.5 border-l border-line pl-2 text-sm italic text-ink-soft">«<Mixed>{g.teacherSaid}</Mixed>»</blockquote> : null}
                  {g.examples.length ? (
                    <ul className="mt-2 space-y-1">
                      {g.examples.map((e) => (
                        <li key={e.zh} className="flex items-center gap-2">
                          <AudioButton text={e.zh} size="sm" />
                          <TargetText text={e.zh} size="md" translation={e.es} as="div" />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {pkg.phrases.length ? (
        <section className="card-paper p-4 sm:p-5">
          <Heading count={pkg.phrases.length}>Frases de la clase</Heading>
          <ul className="space-y-2">
            {pkg.phrases.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <AudioButton text={p.zh} size="sm" />
                <div className="min-w-0 flex-1">
                  <TargetText text={p.zh} size="md" translation={p.es} as="div" />
                  {p.situation ? <p className="text-xs text-ink-faint"><Mixed>{p.situation}</Mixed></p> : null}
                </div>
                <ClipButton assetId={clip(p.clip)} t={p.t} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pkg.teacherTips.length ? (
        <section className="card-paper p-4 sm:p-5">
          <Heading count={pkg.teacherTips.length}>Trucos del profesor</Heading>
          <ul className="space-y-2">
            {pkg.teacherTips.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <span aria-hidden="true" className="mt-0.5 text-gold-ink">💡</span>
                <span className="min-w-0 flex-1"><Mixed>{t.text}</Mixed></span>
                <ClipButton assetId={clip(t.clip)} t={t.t} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pkg.myDoubts.length || pkg.uncertain.length ? (
        <section className="card-paper p-4 sm:p-5">
          <Heading>Dudas</Heading>
          {pkg.myDoubts.length ? (
            <ul className="space-y-2">
              {pkg.myDoubts.map((d, i) => (
                <li key={i} className="text-sm">
                  <p className="flex items-start gap-2 font-medium text-ink">
                    <span className="min-w-0 flex-1"><Mixed>{d.q}</Mixed></span>
                    <ClipButton t={d.t} />
                  </p>
                  {d.a ? <p className="text-ink-soft"><Mixed>{d.a}</Mixed></p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {pkg.uncertain.length ? (
            <div className="mt-3 rounded-[8px] border border-gold/40 bg-gold/8 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gold-ink">
                <AlertTriangle className="size-3.5" /> Lo que no se oyó bien (revísalo con el profesor)
              </p>
              <ul className="space-y-1 text-sm text-ink-soft">
                {pkg.uncertain.map((u, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="min-w-0 flex-1"><Mixed>{u.what}</Mixed></span>
                    <ClipButton t={u.t} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {pkg.homework ? (
        <section className="card-paper p-4 sm:p-5">
          <Heading>Deberes</Heading>
          <p className="text-sm text-ink"><Mixed>{pkg.homework}</Mixed></p>
        </section>
      ) : null}

      {pkg.livingNoteAdds.length ? (
        <section className="card-paper p-4 sm:p-5">
          <Heading count={pkg.livingNoteAdds.length}>Añadido a tus apuntes vivos</Heading>
          <ul className="space-y-1 text-sm">
            {pkg.livingNoteAdds.map((a, i) => (
              <li key={i}>
                <Link href={`/apuntes/vivos?n=${encodeURIComponent(a.noteId)}${a.sectionId ? `#${a.sectionId}` : ""}`} className="inline-flex items-center gap-1.5 text-indigo hover:underline">
                  <Sprout className="size-3.5" /> <Mixed>{a.title ?? a.noteId}</Mixed>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
