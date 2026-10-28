"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChineseText } from "@/components/zh/chinese-text";
import { hasHanzi } from "@/lib/pinyin/convert";

/** Markdown en español con texto chino interactivo (popup + pinyin) dentro de los párrafos. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`prose-xb max-w-[68ch] text-[15px] leading-relaxed text-ink-soft ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h2 className="font-serif-es mb-2 mt-5 text-xl font-semibold text-ink" {...p} />,
          h2: (p) => <h3 className="font-serif-es mb-1.5 mt-5 text-lg font-semibold text-ink" {...p} />,
          h3: (p) => <h4 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-faint" {...p} />,
          p: (p) => <p className="my-2" {...p} />,
          ul: (p) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-ink-faint" {...p} />,
          ol: (p) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-ink-faint" {...p} />,
          strong: (p) => <strong className="font-semibold text-ink" {...p} />,
          em: (p) => <em className="italic" {...p} />,
          del: (p) => <del className="text-danger/80" {...p} />,
          code: (p) => <code className="rounded-[4px] bg-paper-sunk px-1 py-0.5 font-mono text-[13px] text-ink" {...p} />,
          a: (p) => <a className="text-indigo underline underline-offset-4 decoration-indigo/40 hover:decoration-indigo" target="_blank" rel="noreferrer" {...p} />,
          hr: () => <hr className="ink-rule my-4" />,
          table: (p) => (
            <div className="my-3 overflow-x-auto rounded-[8px] border border-line">
              <table className="w-full text-sm" {...p} />
            </div>
          ),
          th: (p) => <th className="border-b border-line bg-paper-sunk px-2.5 py-1.5 text-left font-medium text-ink" {...p} />,
          td: (p) => <td className="border-b border-line/70 px-2.5 py-1.5 align-top" {...p} />,
          blockquote: (p) => <blockquote className="my-3 border-l-[3px] border-cinnabar/60 bg-paper-sunk/50 py-1.5 pl-3 pr-2 text-ink-soft" {...p} />,
          text: ({ children }) => {
            const t = String(children);
            if (!hasHanzi(t)) return <>{t}</>;
            return <ChineseText text={t} size="sm" ruby={false} markUnknown={false} />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
