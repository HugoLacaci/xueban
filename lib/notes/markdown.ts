/**
 * Conversión Markdown ⇄ documento de bloques (JSON de ProseMirror/TipTap). Lógica pura, sin React ni TipTap,
 * para poder usarla en la migración de Dexie, en la exportación y en los tests.
 *
 * Bloques propios de Xuébàn (lib/notes/editor/extensions): se exportan como bloques de código con lenguaje
 * `xb-<tipo>` y JSON dentro, salvo `zhText` (párrafo normal) y `callout` (cita con emoji), que se escriben legibles.
 */

export interface PMMark {
  type: string;
  attrs?: Record<string, unknown>;
}
export interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: PMMark[];
}
export interface PMDoc {
  type: "doc";
  content: PMNode[];
}

export const CALLOUT_KINDS = {
  tip: { emoji: "💡", label: "Truco" },
  warn: { emoji: "⚠️", label: "Ojo" },
  teacher: { emoji: "👩‍🏫", label: "Lo dijo el profe" },
  error: { emoji: "❌", label: "Error típico" },
  mnemonic: { emoji: "🧠", label: "Mnemotecnia" },
  culture: { emoji: "🏮", label: "¿Sabías que…?" },
} as const;
export type CalloutKind = keyof typeof CALLOUT_KINDS;

/** Nodos propios que se serializan como bloque de código `xb-<tipo>` con JSON. */
export const FENCED_NODES = new Set(["formula", "example", "exercise", "wordCard", "drawing", "audio", "cue", "image", "dialogueLine"]);

/* ------------------------------------------------------------------ inline */

const text = (t: string, marks?: PMMark[]): PMNode => (marks?.length ? { type: "text", text: t, marks } : { type: "text", text: t });

/** Inline: **negrita**, *cursiva*, `código`, ~~tachado~~, [[enlace]], #etiqueta, [texto](url). */
export function parseInline(src: string): PMNode[] {
  const out: PMNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(~~([^~]+)~~)|(\[\[([^\]|]+)(?:\|([^\]]+))?\]\])|((?:^|(?<=\s))#([\p{L}\p{N}_-]+))|(\[([^\]]+)\]\(([^)\s]+)\))/gu;
  let last = 0;
  for (const m of src.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text(src.slice(last, i)));
    if (m[1]) out.push(text(m[2], [{ type: "bold" }]));
    else if (m[3]) out.push(text(m[4], [{ type: "italic" }]));
    else if (m[5]) out.push(text(m[6], [{ type: "code" }]));
    else if (m[7]) out.push(text(m[8], [{ type: "strike" }]));
    else if (m[9]) out.push({ type: "wikilink", attrs: { target: m[10].trim(), label: (m[11] ?? m[10]).trim() } });
    else if (m[12]) out.push({ type: "hashtag", attrs: { tag: m[13] } });
    else if (m[14]) out.push(text(m[15], [{ type: "link", attrs: { href: m[16] } }]));
    last = i + m[0].length;
  }
  if (last < src.length) out.push(text(src.slice(last)));
  return out.length ? out : [];
}

export function inlineToMarkdown(nodes: PMNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      if (n.type === "hardBreak") return "  \n";
      if (n.type === "wikilink") {
        const t = String(n.attrs?.target ?? "");
        const l = String(n.attrs?.label ?? t);
        return l && l !== t ? `[[${t}|${l}]]` : `[[${t}]]`;
      }
      if (n.type === "hashtag") return `#${String(n.attrs?.tag ?? "")}`;
      if (n.type !== "text") return "";
      let t = n.text ?? "";
      for (const m of n.marks ?? []) {
        if (m.type === "bold") t = `**${t}**`;
        else if (m.type === "italic") t = `*${t}*`;
        else if (m.type === "code") t = `\`${t}\``;
        else if (m.type === "strike") t = `~~${t}~~`;
        else if (m.type === "link") t = `[${t}](${String(m.attrs?.href ?? "")})`;
      }
      return t;
    })
    .join("");
}

/* ------------------------------------------------------------------ markdown → doc */

const paragraph = (src: string): PMNode => ({ type: "paragraph", content: parseInline(src) });

export function markdownToDoc(md: string): PMDoc {
  const lines = (md ?? "").replace(/\r\n?/g, "\n").split("\n");
  const content: PMNode[] = [];
  let i = 0;
  const flushPara = (buf: string[]) => {
    if (buf.length) content.push(paragraph(buf.join(" ")));
    buf.length = 0;
  };
  const buf: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    // bloque de código
    const fence = line.match(/^```\s*([\w-]*)\s*$/);
    if (fence) {
      flushPara(buf);
      const lang = fence[1];
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++;
      const raw = body.join("\n");
      if (lang.startsWith("xb-")) {
        const type = lang.slice(3);
        try {
          const attrs = JSON.parse(raw) as Record<string, unknown>;
          content.push({ type, attrs });
        } catch {
          content.push({ type: "codeBlock", attrs: { language: lang }, content: [text(raw)] });
        }
      } else content.push({ type: "codeBlock", attrs: { language: lang || null }, content: raw ? [text(raw)] : [] });
      continue;
    }
    if (!line.trim()) {
      flushPara(buf);
      i++;
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara(buf);
      content.push({ type: "heading", attrs: { level: Math.min(3, h[1].length) }, content: parseInline(h[2].trim()) });
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushPara(buf);
      content.push({ type: "horizontalRule" });
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara(buf);
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ""));
      const first = q[0] ?? "";
      const callout = Object.entries(CALLOUT_KINDS).find(([, v]) => first.startsWith(v.emoji));
      if (callout) {
        const [kind, v] = callout;
        const rest = first.slice(v.emoji.length).replace(new RegExp(`^\\s*\\*\\*${v.label}\\*\\*\\s*:?\\s*`), "").trim();
        const inner = [rest, ...q.slice(1)].filter((s, k) => k === 0 ? true : true);
        const innerDoc = markdownToDoc(inner.join("\n"));
        content.push({ type: "callout", attrs: { kind }, content: innerDoc.content.length ? innerDoc.content : [{ type: "paragraph" }] });
      } else {
        const innerDoc = markdownToDoc(q.join("\n"));
        content.push({ type: "blockquote", content: innerDoc.content.length ? innerDoc.content : [{ type: "paragraph" }] });
      }
      continue;
    }
    const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (li) {
      flushPara(buf);
      const ordered = /\d/.test(li[2]);
      const items: PMNode[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (!m || /\d/.test(m[2]) !== ordered) break;
        const task = m[3].match(/^\[( |x|X)\]\s+(.*)$/);
        if (task) items.push({ type: "taskItem", attrs: { checked: task[1] !== " " }, content: [paragraph(task[2])] });
        else items.push({ type: "listItem", content: [paragraph(m[3])] });
        i++;
      }
      const isTask = items.every((it) => it.type === "taskItem");
      content.push({ type: isTask ? "taskList" : ordered ? "orderedList" : "bulletList", content: items });
      continue;
    }
    // tabla GFM
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flushPara(buf);
      const rows: string[][] = [];
      const split = (s: string) => s.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
      rows.push(split(line));
      i += 2;
      while (i < lines.length && lines[i].includes("|")) rows.push(split(lines[i++]));
      content.push({
        type: "table",
        content: rows.map((cells, r) => ({ type: "tableRow", content: cells.map((c) => ({ type: r === 0 ? "tableHeader" : "tableCell", content: [paragraph(c)] })) })),
      });
      continue;
    }
    buf.push(line.trim());
    i++;
  }
  flushPara(buf);
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

/* ------------------------------------------------------------------ doc → markdown */

function blockToMarkdown(n: PMNode, depth = 0): string {
  const pad = "  ".repeat(depth);
  switch (n.type) {
    case "paragraph":
    case "zhText":
      return pad + inlineToMarkdown(n.content);
    case "heading":
      return `${"#".repeat(Number(n.attrs?.level ?? 2))} ${inlineToMarkdown(n.content)}`;
    case "horizontalRule":
      return "---";
    case "codeBlock":
      return `\`\`\`${String(n.attrs?.language ?? "")}\n${inlineToMarkdown(n.content)}\n\`\`\``;
    case "blockquote":
      return (n.content ?? []).map((c) => blockToMarkdown(c)).join("\n\n").split("\n").map((l) => `> ${l}`).join("\n");
    case "callout": {
      const k = CALLOUT_KINDS[(n.attrs?.kind as CalloutKind) ?? "tip"] ?? CALLOUT_KINDS.tip;
      const inner = (n.content ?? []).map((c) => blockToMarkdown(c)).join("\n\n").split("\n");
      return [`> ${k.emoji} **${k.label}**: ${inner[0] ?? ""}`, ...inner.slice(1).map((l) => `> ${l}`)].join("\n");
    }
    case "bulletList":
    case "orderedList":
    case "taskList":
      return (n.content ?? [])
        .map((it, k) => {
          const marker = n.type === "orderedList" ? `${k + 1}.` : "-";
          const check = it.type === "taskItem" ? (it.attrs?.checked ? "[x] " : "[ ] ") : "";
          const parts = (it.content ?? []).map((c, j) => (j === 0 ? `${pad}${marker} ${check}${blockToMarkdown(c).trimStart()}` : blockToMarkdown(c, depth + 1)));
          return parts.join("\n");
        })
        .join("\n");
    case "table": {
      const rows = (n.content ?? []).map((r) => (r.content ?? []).map((c) => (c.content ?? []).map((p) => inlineToMarkdown(p.content)).join(" ")));
      if (!rows.length) return "";
      const w = Math.max(...rows.map((r) => r.length));
      const line = (cells: string[]) => `| ${Array.from({ length: w }, (_, k) => cells[k] ?? "").join(" | ")} |`;
      return [line(rows[0]), `| ${Array.from({ length: w }, () => "---").join(" | ")} |`, ...rows.slice(1).map(line)].join("\n");
    }
    default:
      if (FENCED_NODES.has(n.type)) return `\`\`\`xb-${n.type}\n${JSON.stringify(n.attrs ?? {}, null, 0)}\n\`\`\``;
      return inlineToMarkdown(n.content);
  }
}

export function docToMarkdown(doc: PMDoc | PMNode | undefined | null): string {
  if (!doc || !("content" in doc) || !doc.content) return "";
  return doc.content.map((n) => blockToMarkdown(n)).filter((s) => s !== undefined).join("\n\n").trim();
}

/** Texto plano del documento (para búsqueda y vínculos de palabras). */
export function docToText(doc: PMDoc | PMNode | undefined | null): string {
  if (!doc) return "";
  const out: string[] = [];
  const walk = (n: PMNode) => {
    if (n.type === "text") out.push(n.text ?? "");
    if (n.attrs) for (const v of Object.values(n.attrs)) if (typeof v === "string") out.push(v);
    for (const c of n.content ?? []) walk(c);
    if (!n.content && n.type !== "text") out.push("");
    if (["paragraph", "heading", "zhText", "listItem", "tableRow"].includes(n.type)) out.push("\n");
  };
  walk(doc as PMNode);
  return out.join(" ").replace(/[ \t]+/g, " ").trim();
}

/** Enlaces [[…]] y etiquetas # de un documento. */
export function docRefs(doc: PMDoc | PMNode | undefined | null): { links: string[]; tags: string[] } {
  const links = new Set<string>();
  const tags = new Set<string>();
  const walk = (n: PMNode) => {
    if (n.type === "wikilink" && n.attrs?.target) links.add(String(n.attrs.target));
    if (n.type === "hashtag" && n.attrs?.tag) tags.add(String(n.attrs.tag));
    for (const c of n.content ?? []) walk(c);
  };
  if (doc) walk(doc as PMNode);
  return { links: Array.from(links), tags: Array.from(tags) };
}
