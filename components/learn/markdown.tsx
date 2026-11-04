"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChineseText } from "@/components/target/target-text";
import { getActivePack, targetLang } from "@/lib/languages/registry";

type HNode = { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: HNode[] };

/** Plugin rehype: envuelve cada tramo de texto en la lengua meta en <span lang="…"> (lectores de pantalla, fuente, popup). */
function rehypeTargetLang() {
  const pack = getActivePack();
  const lang = targetLang();
  // la puntuación de ancho completo se queda dentro del tramo
  const isT = (c: string) => pack.isTargetChar(c) || /[　-〿！-～]/.test(c);
  const split = (s: string): HNode[] => {
    const out: HNode[] = [];
    let buf = "";
    let inT = false;
    const flush = () => {
      if (!buf) return;
      out.push(inT ? { type: "element", tagName: "span", properties: { lang, dataTarget: "1" }, children: [{ type: "text", value: buf }] } : { type: "text", value: buf });
      buf = "";
    };
    for (const c of Array.from(s)) {
      const t = isT(c);
      if (t !== inT && buf) flush();
      inT = t;
      buf += c;
    }
    flush();
    return out;
  };
  const walk = (n: HNode) => {
    if (!n.children || n.tagName === "code" || n.tagName === "pre") return;
    n.children = n.children.flatMap((c) => (c.type === "text" && c.value && pack.hasTargetText(c.value) ? split(c.value) : (walk(c), [c])));
  };
  return (tree: HNode) => walk(tree);
}

/** Markdown en español con texto chino interactivo (popup + pinyin) dentro de los párrafos. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`prose-xb max-w-[68ch] text-[15px] leading-relaxed text-ink-soft ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeTargetLang]}
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
          span: ({ node, ...p }) => {
            void node;
            const props = p as Record<string, unknown> & { children?: React.ReactNode };
            if (props["data-target"] === "1") return <ChineseText text={String(props.children ?? "")} size="sm" ruby={false} markUnknown={false} />;
            return <span {...p} />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
