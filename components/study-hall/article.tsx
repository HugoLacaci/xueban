"use client";
import Link from "@/lib/languages/link";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { articleById, getArticles } from "@/lib/study-hall";
import { Button } from "@/components/ui/button";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { InkDivider } from "@/components/ornament";
import { Markdown } from "@/components/learn/markdown";
import { targetLang } from "@/lib/languages/registry";
import { Mixed } from "@/components/target/mixed";

export function ArticleView({ id }: { id: string }) {
  const a = articleById(id);
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
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline">{a.category}</Badge>
          <span className="tabular text-xs text-ink-faint">{a.minutes} min de lectura</span>
        </div>
      </header>
      <InkDivider />
      <div className="card-paper px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-[68ch] text-[15.5px] leading-[1.75]">
          <Markdown>{a.markdown}</Markdown>
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
