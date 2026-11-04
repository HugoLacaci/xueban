"use client";
import { useMemo } from "react";
import Link from "@/lib/languages/link";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { articleById, getArticles } from "@/lib/study-hall";
import { usePack } from "@/lib/languages/provider";
import { Button } from "@/components/ui/button";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { InkDivider } from "@/components/ornament";
import { Markdown } from "@/components/learn/markdown";
import { targetLang } from "@/lib/languages/registry";
import { Mixed } from "@/components/target/mixed";
import { OriginAnimation } from "@/components/characters/origin-animation";

/**
 * Artículo de Study Hall. Los marcadores «[animación: 女 + 子 → 好]» o «[animación: 马 甲骨文 → … → 马]» de la serie
 * sobre el origen de los caracteres se convierten en diagramas animados (formación, evolución, pictograma).
 */
const MARK = /\[animaci[oó]n:\s*([^\]]+)\]/g;

export function ArticleView({ id }: { id: string }) {
  const pack = usePack();
  const a = articleById(id);
  const parts = useMemo(() => {
    if (!a) return [];
    const out: { md?: string; anim?: string }[] = [];
    let last = 0;
    for (const m of a.markdown.matchAll(MARK)) {
      const i = m.index ?? 0;
      if (i > last) out.push({ md: a.markdown.slice(last, i) });
      out.push({ anim: m[1].trim() });
      last = i + m[0].length;
    }
    if (last < a.markdown.length) out.push({ md: a.markdown.slice(last) });
    return out;
  }, [a]);
  if (!a) {
    return (
      <div>
        <PageHeader title="Artículo no encontrado" />
        <Button asChild variant="secondary">
          <Link href="/study-hall">
            <ArrowLeft /> Study Hall
          </Link>
        </Button>
      </div>
    );
  }
  const all = getArticles();
  const idx = all.indexOf(a);
  const next = all[idx + 1];
  const series = a.category === "origen de los caracteres" ? all.filter((x) => x.category === a.category) : [];
  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/study-hall" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Study Hall
      </Link>
      <header className="mb-2">
        <span lang={targetLang()} className="zh-kai block text-lg text-cinnabar">
          {a.zh}
        </span>
        <h1 className="font-serif-es text-[30px] font-semibold leading-tight tracking-tight text-ink sm:text-[38px]"><Mixed>{a.title}</Mixed></h1>
        <p className="mt-2 max-w-2xl font-serif-es text-base text-ink-soft"><Mixed>{a.summary}</Mixed></p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{a.category}</Badge>
          <span className="tabular text-xs text-ink-faint">{a.minutes} min de lectura</span>
          {a.reviewed === false ? <Badge variant="muted">pendiente de validar con el profesor</Badge> : null}
        </div>
        {series.length ? (
          <ol className="mt-3 flex flex-wrap gap-1 text-xs">
            {series.map((s, i) => (
              <li key={s.id}>
                <Link href={`/study-hall/articulo/${s.id}`} className={`rounded-full border px-2 py-0.5 ${s.id === a.id ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink/40"}`}>
                  {i + 1}
                </Link>
              </li>
            ))}
            <li className="ml-1 self-center text-ink-faint">serie «De dónde vienen los caracteres»</li>
          </ol>
        ) : null}
      </header>
      <InkDivider />
      <div className="card-paper px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-[68ch] text-[15.5px] leading-[1.75]">
          {parts.map((p, i) => (p.md !== undefined ? <Markdown key={i}>{p.md}</Markdown> : pack.id === "zh" ? <OriginAnimation key={i} spec={p.anim!} /> : null))}
        </div>
        {a.sources?.length ? (
          <div className="mx-auto mt-6 max-w-[68ch] border-t border-line pt-3 text-xs text-ink-faint">
            Fuentes:{" "}
            {a.sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noreferrer" className="mr-2 inline-flex items-center gap-0.5 text-indigo underline underline-offset-2">
                <Mixed>{s.title}</Mixed> <ExternalLink className="size-3" />
              </a>
            ))}
          </div>
        ) : null}
      </div>
      {next ? (
        <div className="mt-5 flex justify-end">
          <Button asChild variant="outline">
            <Link href={`/study-hall/articulo/${next.id}`}>
              Siguiente: <Mixed>{next.title}</Mixed> <ArrowRight />
            </Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
}
