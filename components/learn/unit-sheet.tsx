"use client";
/**
 * Ficha resumen imprimible de una unidad (/aprender/ficha?u=<unitId>): objetivos de cada lección, vocabulario,
 * gramática con su esqueleto y las frases largas de «Construye la frase». Estilo de la app y clases de impresión
 * (xb-print / xb-no-print): se imprime o se guarda en PDF desde el navegador.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "@/lib/languages/link";
import { ArrowLeft, Printer } from "lucide-react";
import { ensureUnit, unitById } from "@/lib/course";
import { joinPy, joinZh } from "@/lib/course/skeleton";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Spinner } from "@/components/ui/primitives";
import { Reading } from "@/components/target/reading";
import { Mixed } from "@/components/target/mixed";
import { SentenceSkeleton } from "./sentence-skeleton";

export function UnitSheet() {
  const params = useSearchParams();
  const id = params.get("u") ?? "";
  const unit = unitById(id);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void ensureUnit(id).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [id]);
  if (!unit) return <PageHeader title="Unidad no encontrada" />;
  if (!ready)
    return (
      <div className="text-ink-faint flex items-center gap-2 py-16">
        <Spinner /> Preparando la ficha…
      </div>
    );
  const vocab = unit.lessons.flatMap((l) => l.vocab.map((v) => ({ ...v, lesson: l.title })));
  const skeletons = unit.lessons.flatMap((l) =>
    l.steps
      .filter((s) => s.type === "skeleton")
      .map((s) => ({ lesson: l, step: s as Extract<typeof s, { type: "skeleton" }> })),
  );
  const long = unit.lessons.flatMap((l) =>
    l.steps
      .filter((s) => s.type === "sentence-builder")
      .flatMap((s) =>
        (s as Extract<typeof s, { type: "sentence-builder" }>).items.map((i) => i.sentence),
      ),
  );
  const longest = [...long].sort((a, b) => joinZh(b).length - joinZh(a).length).slice(0, 8);
  return (
    <div className="xb-print mx-auto max-w-4xl space-y-6">
      <div className="xb-no-print flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/aprender">
            <ArrowLeft /> Aprender
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer /> Imprimir / PDF
        </Button>
      </div>
      <PageHeader
        title={<Mixed>{`Ficha resumen · ${unit.title}`}</Mixed>}
        zh={unit.zh}
        subtitle={<Mixed>{unit.description}</Mixed>}
      />

      <section>
        <h2 className="font-serif-es text-ink mb-2 text-xl font-semibold">Qué sabes hacer</h2>
        <ol className="text-ink-soft list-decimal space-y-1 pl-5 text-sm">
          {unit.lessons.map((l) => (
            <li key={l.id}>
              <span className="text-ink font-medium">
                <Mixed>{l.title}</Mixed>
              </span>{" "}
              — <Mixed>{l.goal}</Mixed>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="font-serif-es text-ink mb-2 text-xl font-semibold">
          Vocabulario ({vocab.length})
        </h2>
        <div className="grid gap-x-6 sm:grid-cols-2">
          {vocab.map((v) => (
            <div
              key={v.hanzi + v.lesson}
              className="border-line/60 flex [break-inside:avoid] items-baseline gap-2 border-b py-1 text-sm"
            >
              <span lang="zh-CN" className="zh text-ink w-20 shrink-0 text-lg">
                {v.hanzi}
              </span>
              <Reading text={v.pinyin} className="w-28 shrink-0 text-xs" />
              <span className="text-ink-soft min-w-0">
                <Mixed>{v.es}</Mixed>
              </span>
            </div>
          ))}
        </div>
      </section>

      {skeletons.length ? (
        <section className="space-y-3">
          <h2 className="font-serif-es text-ink text-xl font-semibold">Gramática</h2>
          {skeletons.map(({ lesson, step }) => (
            <div key={lesson.id + step.title} className="[break-inside:avoid]">
              <SentenceSkeleton
                title={step.title}
                sentences={[
                  ...step.sentences.slice(0, 2),
                  ...(step.negative ?? []).slice(0, 1),
                  ...(step.question ?? []).slice(0, 1),
                ]}
                focus={step.focus}
                at={lesson.id}
              />
              {step.mistakes?.length ? (
                <p className="text-ink-soft mt-1 text-xs">
                  <span className="text-ink-faint font-semibold">Ojo: </span>
                  <span lang="zh-CN" className="zh text-cinnabar line-through">
                    {step.mistakes[0].wrong}
                  </span>{" "}
                  →{" "}
                  <span lang="zh-CN" className="zh text-celadon-ink">
                    {step.mistakes[0].right}
                  </span>{" "}
                  · <Mixed>{step.mistakes[0].why}</Mixed>
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {longest.length ? (
        <section>
          <h2 className="font-serif-es text-ink mb-2 text-xl font-semibold">
            Frases completas de la unidad
          </h2>
          <Card className="space-y-2">
            {longest.map((s, i) => (
              <div key={i} className="[break-inside:avoid]">
                <p lang="zh-CN" className="zh text-ink text-lg">
                  {joinZh(s)}
                </p>
                {joinPy(s) ? <Reading text={joinPy(s)!} className="block text-xs" /> : null}
                <p className="text-ink-soft text-xs">{s.es}</p>
              </div>
            ))}
          </Card>
        </section>
      ) : null}
      <p className="text-ink-faint text-[11px]">
        Contenido pendiente de revisar con tu profesor · Xuébàn
      </p>
    </div>
  );
}
