"use client";
/**
 * Menú de comandos «/» del editor (insertar bloques), sugerencias de [[enlaces]] y de #etiquetas,
 * y el «teclado pinyin»: escribir ni3hao3 y pulsar Tab convierte a nǐhǎo o propone los hanzi.
 */
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import { db } from "@/lib/db";
import { getActiveLang, getActivePackOrNull } from "@/lib/languages/registry";
import { search as dictSearch } from "@/lib/dictionary/service";
import { CALLOUT_KINDS } from "@/lib/notes/markdown";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

/* ------------------------------------------------------------------ lista flotante genérica */

export interface MenuItem {
  id: string;
  title: string;
  hint?: string;
  glyph?: string;
  group?: string;
  run: (editor: Editor, range: Range) => void;
}

export interface MenuListHandle {
  onKeyDown: (p: SuggestionKeyDownProps) => boolean;
}

export const MenuList = forwardRef<MenuListHandle, { items: MenuItem[]; command: (item: MenuItem) => void; empty?: string }>(function MenuList({ items, command, empty = "Sin resultados" }, ref) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [items]);
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowDown") {
        setIndex((i) => (i + 1) % Math.max(1, items.length));
        return true;
      }
      if (event.key === "ArrowUp") {
        setIndex((i) => (i - 1 + items.length) % Math.max(1, items.length));
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        if (items[index]) command(items[index]);
        return true;
      }
      return false;
    },
  }));
  const lang = getActivePackOrNull()?.bcp47;
  return (
    <div className="xb-menu z-[60] max-h-72 w-72 overflow-y-auto rounded-[10px] border border-line bg-paper-raised p-1 shadow-[var(--shadow-float)] scrollbar-thin" role="listbox">
      {items.length ? (
        items.map((it, i) => (
          <button key={it.id} type="button" role="option" aria-selected={i === index} onMouseEnter={() => setIndex(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => command(it)} className={cn("flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-sm", i === index ? "bg-paper-sunk text-ink" : "text-ink-soft")}>
            {it.glyph ? (
              <span lang={lang} className="zh-serif flex size-6 shrink-0 items-center justify-center rounded bg-paper-sunk/80 text-base leading-none text-cinnabar">
                {it.glyph}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                <Mixed>{it.title}</Mixed>
              </span>
              {it.hint ? (
                <span className="block truncate text-[11px] text-ink-faint">
                  <Mixed>{it.hint}</Mixed>
                </span>
              ) : null}
            </span>
          </button>
        ))
      ) : (
        <p className="px-2 py-2 text-xs text-ink-faint">{empty}</p>
      )}
    </div>
  );
});

/** Posiciona el menú junto al cursor (fijo en la ventana, sin librerías). */
function renderer(empty?: string) {
  let component: ReactRenderer<MenuListHandle, { items: MenuItem[]; command: (i: MenuItem) => void; empty?: string }> | null = null;
  let el: HTMLDivElement | null = null;
  const place = (rect: DOMRect | null) => {
    if (!el || !rect) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = 288;
    const h = Math.min(288, el.offsetHeight || 288);
    let left = Math.min(rect.left, vw - w - 8);
    left = Math.max(8, left);
    let top = rect.bottom + 6;
    if (top + h > vh - 8) top = Math.max(8, rect.top - h - 6);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };
  return {
    onStart: (props: SuggestionProps<MenuItem>) => {
      component = new ReactRenderer(MenuList, { props: { items: props.items, command: props.command, empty }, editor: props.editor });
      el = document.createElement("div");
      el.style.position = "fixed";
      el.style.zIndex = "60";
      el.appendChild(component.element);
      document.body.appendChild(el);
      place(props.clientRect?.() ?? null);
    },
    onUpdate: (props: SuggestionProps<MenuItem>) => {
      component?.updateProps({ items: props.items, command: props.command, empty });
      place(props.clientRect?.() ?? null);
    },
    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === "Escape") {
        el?.remove();
        return true;
      }
      return component?.ref?.onKeyDown(props) ?? false;
    },
    onExit: () => {
      el?.remove();
      component?.destroy();
      component = null;
      el = null;
    },
  };
}

/* ------------------------------------------------------------------ comandos «/» */

const K = CALLOUT_KINDS;

export function slashItems(query: string): MenuItem[] {
  const ins = (type: string, attrs: Record<string, unknown> = {}) => (editor: Editor, range: Range) => {
    editor.chain().focus().deleteRange(range).insertContent({ type, attrs }).run();
  };
  const items: MenuItem[] = [
    { id: "zh", title: "Texto chino", hint: "con pinyin, tonos y audio", glyph: "文", group: "Chino", run: ins("zhText") },
    { id: "example", title: "Ejemplo", hint: "zh · pinyin · es · minar", glyph: "例", group: "Chino", run: ins("example") },
    { id: "formula", title: "Fórmula gramatical", hint: "fichas de colores + generador", glyph: "式", group: "Chino", run: ins("formula", { parts: [{ text: "Sujeto", role: "subject" }, { text: "在", role: "other" }, { text: "lugar", role: "place" }, { text: "V", role: "verb" }, { text: "O", role: "object" }] }) },
    { id: "dialogue", title: "Línea de diálogo", hint: "A / B con audio", glyph: "话", group: "Chino", run: ins("dialogueLine", { speaker: "A" }) },
    { id: "word", title: "Ficha de palabra", hint: "trazos, origen, audio", glyph: "词", group: "Chino", run: ins("wordCard", { kind: "word" }) },
    { id: "char", title: "Ficha de carácter", hint: "componentes y trazos", glyph: "字", group: "Chino", run: ins("wordCard", { kind: "character" }) },
    { id: "exercise", title: "Ejercicio", hint: "hueco, ordenar, traducir, elegir", glyph: "练", group: "Práctica", run: ins("exercise", { kind: "fill", data: {} }) },
    { id: "cue", title: "Pregunta Cornell", hint: "pregunta con respuesta oculta", glyph: "问", group: "Práctica", run: ins("cue") },
    { id: "table", title: "Tabla comparativa", hint: "2 columnas (A vs B)", glyph: "表", group: "Bloques", run: (e, r) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    ...Object.entries(K).map(([id, v]) => ({ id: `callout-${id}`, title: `${v.emoji} ${v.label}`, hint: "aviso", group: "Avisos", run: (e: Editor, r: Range) => e.chain().focus().deleteRange(r).insertContent({ type: "callout", attrs: { kind: id }, content: [{ type: "paragraph" }] }).run() })),
    { id: "drawing", title: "Dibujo a mano", hint: "lienzo para copiar caracteres", glyph: "画", group: "Multimedia", run: ins("drawing") },
    { id: "image", title: "Imagen", hint: "foto del cuaderno o la pizarra", glyph: "图", group: "Multimedia", run: ins("image") },
    { id: "audio", title: "Grabación de audio", hint: "al profe o a mí", glyph: "音", group: "Multimedia", run: ins("audio") },
    { id: "h2", title: "Título", hint: "sección del apunte", group: "Texto", run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 2 }).run() },
    { id: "h3", title: "Subtítulo", group: "Texto", run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 3 }).run() },
    { id: "ul", title: "Lista", group: "Texto", run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
    { id: "ol", title: "Lista numerada", group: "Texto", run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
    { id: "task", title: "Lista de tareas", hint: "deberes", group: "Texto", run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
    { id: "quote", title: "Cita", group: "Texto", run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
    { id: "hr", title: "Separador", group: "Texto", run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
  ];
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((i) => `${i.title} ${i.hint ?? ""} ${i.group ?? ""}`.toLowerCase().includes(q));
}

export const SlashCommands = Extension.create({
  name: "slashCommands",
  addProseMirrorPlugins() {
    return [
      Suggestion<MenuItem>({
        editor: this.editor,
        char: "/",
        pluginKey: new PluginKey("slash"),
        startOfLine: false,
        allowSpaces: false,
        items: ({ query }) => slashItems(query).slice(0, 14),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => renderer("Sin comandos para esa búsqueda"),
      }),
    ];
  },
});

/* ------------------------------------------------------------------ [[enlaces]] */

async function linkItems(query: string): Promise<MenuItem[]> {
  const lang = getActiveLang();
  const q = query.trim().toLowerCase();
  const notes = await db.notes.where("lang").equals(lang).filter((n) => n.status !== "inbox").toArray();
  const scored = notes
    .map((n) => ({ n, s: !q ? 1 : n.title.toLowerCase().includes(q) ? 3 : n.tags.some((t) => t.toLowerCase().includes(q)) ? 1 : 0 }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.n.updatedAt - a.n.updatedAt)
    .slice(0, 8);
  const items: MenuItem[] = scored.map(({ n }) => ({ id: n.id, title: n.title, hint: n.type, glyph: n.builtin ? "师" : "笔", run: (e, r) => e.chain().focus().deleteRange(r).insertContent([{ type: "wikilink", attrs: { target: n.id, label: n.title } }, { type: "text", text: " " }]).run() }));
  if (q) items.push({ id: `new-${q}`, title: `Enlazar «${query.trim()}»`, hint: "apunte nuevo o palabra", run: (e, r) => e.chain().focus().deleteRange(r).insertContent([{ type: "wikilink", attrs: { target: query.trim(), label: query.trim() } }, { type: "text", text: " " }]).run() });
  return items;
}

export const WikilinkSuggestion = Extension.create({
  name: "wikilinkSuggestion",
  addProseMirrorPlugins() {
    return [
      Suggestion<MenuItem>({
        editor: this.editor,
        char: "[[",
        pluginKey: new PluginKey("wikilink"),
        allowSpaces: true,
        items: ({ query }) => linkItems(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => renderer("Escribe para buscar un apunte"),
      }),
    ];
  },
});

/* ------------------------------------------------------------------ #etiquetas */

async function tagItems(query: string): Promise<MenuItem[]> {
  const lang = getActiveLang();
  const q = query.trim().toLowerCase();
  const notes = await db.notes.where("lang").equals(lang).toArray();
  const counts = new Map<string, number>();
  for (const n of notes) for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  const tags = Array.from(counts.entries())
    .filter(([t]) => !q || t.toLowerCase().includes(q))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const items: MenuItem[] = tags.map(([t, c]) => ({ id: t, title: `#${t}`, hint: `${c} apuntes`, run: (e, r) => e.chain().focus().deleteRange(r).insertContent([{ type: "hashtag", attrs: { tag: t } }, { type: "text", text: " " }]).run() }));
  if (q && !counts.has(query.trim())) items.unshift({ id: `new-${q}`, title: `#${query.trim()}`, hint: "etiqueta nueva", run: (e, r) => e.chain().focus().deleteRange(r).insertContent([{ type: "hashtag", attrs: { tag: query.trim() } }, { type: "text", text: " " }]).run() });
  return items;
}

export const HashtagSuggestion = Extension.create({
  name: "hashtagSuggestion",
  addProseMirrorPlugins() {
    return [
      Suggestion<MenuItem>({
        editor: this.editor,
        char: "#",
        pluginKey: new PluginKey("hashtag"),
        allowSpaces: false,
        allow: ({ state, range }) => {
          // solo al principio o tras un espacio (no dentro de «#1»)
          const before = state.doc.textBetween(Math.max(0, range.from - 1), range.from);
          return before === "" || /\s/.test(before);
        },
        items: ({ query }) => tagItems(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => renderer("Escribe una etiqueta"),
      }),
    ];
  },
});

/* ------------------------------------------------------------------ teclado pinyin (Tab) */

export const PINYIN_RUN = /(?:[a-zA-ZüÜ:v]+[1-5]?)+$/;
export const PINYIN_NUMBERED = /[a-zA-ZüÜ:v]+[1-5]/;

/** Candidatos de hanzi para un pinyin (con o sin números): primero coincidencias exactas de lectura. */
export function hanziCandidates(pinyin: string, limit = 8): { s: string; p: string; es?: string }[] {
  const pack = getActivePackOrNull();
  if (!pack || pack.id !== "zh") return [];
  const results = dictSearch(pinyin, 40);
  const seen = new Set<string>();
  const out: { s: string; p: string; es?: string }[] = [];
  for (const r of results) {
    if (seen.has(r.s)) continue;
    seen.add(r.s);
    out.push({ s: r.s, p: r.p, es: r.es ?? r.en?.[0] });
    if (out.length >= limit) break;
  }
  return out;
}

export const PinyinKeyboard = Extension.create({
  name: "pinyinKeyboard",
  addKeyboardShortcuts() {
    const convert = (openCandidates: boolean) => () => {
      const editor = this.editor;
      const pack = getActivePackOrNull();
      if (!pack || pack.id !== "zh") return false;
      const { state } = editor;
      const { from } = state.selection;
      const $from = state.selection.$from;
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
      const m = textBefore.match(PINYIN_RUN);
      if (!m || !PINYIN_NUMBERED.test(m[0])) return false;
      const raw = m[0];
      const start = from - raw.length;
      const marked = pack.normalizeInput(raw);
      if (!openCandidates) {
        editor.chain().focus().insertContentAt({ from: start, to: from }, marked).run();
        return true;
      }
      const cands = hanziCandidates(raw);
      if (!cands.length) {
        editor.chain().focus().insertContentAt({ from: start, to: from }, marked).run();
        return true;
      }
      // menú de candidatos: se inserta el primero con Tab; con Shift+Tab solo se convierte a pinyin con tildes
      const items: MenuItem[] = [
        ...cands.map((c) => ({ id: c.s, title: c.s, hint: `${c.p}${c.es ? ` · ${c.es}` : ""}`, run: (e: Editor, r: Range) => e.chain().focus().insertContentAt(r, c.s).run() })),
        { id: "pinyin", title: marked, hint: "dejar en pinyin", run: (e: Editor, r: Range) => e.chain().focus().insertContentAt(r, marked).run() },
      ];
      openPinyinMenu(editor, { from: start, to: from }, items);
      return true;
    };
    return { Tab: convert(true), "Shift-Tab": convert(false), "Mod-Space": convert(true) };
  },
});

let pinyinMenu: { el: HTMLDivElement; component: ReactRenderer<MenuListHandle, { items: MenuItem[]; command: (i: MenuItem) => void }>; onKey: (e: KeyboardEvent) => void } | null = null;

function closePinyinMenu() {
  if (!pinyinMenu) return;
  window.removeEventListener("keydown", pinyinMenu.onKey, true);
  pinyinMenu.el.remove();
  pinyinMenu.component.destroy();
  pinyinMenu = null;
}

function openPinyinMenu(editor: Editor, range: Range, items: MenuItem[]) {
  closePinyinMenu();
  const command = (it: MenuItem) => {
    closePinyinMenu();
    it.run(editor, range);
  };
  const component = new ReactRenderer(MenuList, { props: { items, command }, editor });
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.zIndex = "60";
  el.appendChild(component.element);
  document.body.appendChild(el);
  const coords = editor.view.coordsAtPos(range.to);
  el.style.left = `${Math.max(8, Math.min(coords.left, window.innerWidth - 296))}px`;
  el.style.top = `${coords.bottom + 6}px`;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closePinyinMenu();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Enter", "Tab"].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      component.ref?.onKeyDown({ event: e, view: editor.view, range });
      return;
    }
    // cualquier otra tecla cierra el menú y sigue escribiendo
    closePinyinMenu();
  };
  window.addEventListener("keydown", onKey, true);
  pinyinMenu = { el, component, onKey };
}
