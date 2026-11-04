"use client";
/**
 * Nodos propios del editor de apuntes (TipTap/ProseMirror). Cada bloque se pinta con un componente React
 * (./blocks). Los atributos se serializan a Markdown en lib/notes/markdown.ts (bloques `xb-<tipo>`).
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import type { ComponentType } from "react";
import { ZhTextView, ExampleView, FormulaView, CalloutView, ExerciseView, WordCardView, DrawingView, ImageView, AudioView, CueView, DialogueLineView, WikilinkView, HashtagView } from "./blocks";

type Attrs = Record<string, { default: unknown }>;

/** Bloque atómico (sin contenido editable dentro): todo vive en los atributos. */
function atomBlock(name: string, attrs: Attrs, View: ComponentType<ReactNodeViewProps>, extra: Partial<Parameters<typeof Node.create>[0]> = {}) {
  return Node.create({
    name,
    group: "block",
    atom: true,
    draggable: true,
    selectable: true,
    addAttributes: () => attrs,
    parseHTML: () => [{ tag: `div[data-xb="${name}"]`, getAttrs: (el) => JSON.parse((el as HTMLElement).getAttribute("data-attrs") ?? "{}") }],
    renderHTML: ({ node, HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-xb": name, "data-attrs": JSON.stringify(node.attrs) })],
    addNodeView: () => ReactNodeViewRenderer(View),
    ...extra,
  });
}

const str = (d = "") => ({ default: d });
const arr = () => ({ default: [] as unknown[] });

/** Texto chino con pinyin automático, colores de tono, popup y audio. */
export const ZhText = atomBlock("zhText", { text: str(), es: str(), py: str() }, ZhTextView);

/** Ejemplo zh / pinyin / es con audio y «minar». */
export const Example = atomBlock("example", { zh: str(), py: str(), es: str(), note: str() }, ExampleView);

/** Fórmula gramatical con fichas de colores y generador de ejemplos. */
export const Formula = atomBlock("formula", { parts: arr(), name: str() }, FormulaView);

/** Ejercicio incrustado (se practica dentro del apunte). */
export const ExerciseBlock = atomBlock("exercise", { kind: str("fill"), data: { default: {} } }, ExerciseView);

/** Ficha de palabra o carácter incrustada (trazos, origen, audio). */
export const WordCardBlock = atomBlock("wordCard", { text: str(), kind: str("word") }, WordCardView);

/** Lienzo de dibujo a mano (PNG en base64, pequeño). */
export const Drawing = atomBlock("drawing", { data: str(), width: { default: 480 }, height: { default: 240 } }, DrawingView);

/** Imagen (foto del cuaderno) desde la tabla assets o un data URL. */
export const ImageBlock = atomBlock("image", { assetId: str(), src: str(), alt: str() }, ImageView);

/** Grabación de audio (profesor o yo). */
export const AudioBlock = atomBlock("audio", { assetId: str(), label: str() }, AudioView);

/** Pregunta Cornell con respuesta oculta. */
export const Cue = atomBlock("cue", { q: str(), a: str() }, CueView);

/** Línea de diálogo (hablante, zh, es) con voz asignada. */
export const DialogueLine = atomBlock("dialogueLine", { speaker: str("A"), zh: str(), py: str(), es: str() }, DialogueLineView);

/** Aviso con contenido editable: 💡 Truco · ⚠️ Ojo · 👩‍🏫 Lo dijo el profe · ❌ Error típico · 🧠 Mnemotecnia · 🏮 ¿Sabías que…? */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  draggable: true,
  addAttributes: () => ({ kind: { default: "tip" } }),
  parseHTML: () => [{ tag: "div[data-xb=callout]", getAttrs: (el) => ({ kind: (el as HTMLElement).getAttribute("data-kind") ?? "tip" }) }],
  renderHTML: ({ node, HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-xb": "callout", "data-kind": node.attrs.kind }), 0],
  addNodeView: () => ReactNodeViewRenderer(CalloutView),
});

/** Enlace [[…]] a otro apunte o palabra (inline, atómico). */
export const Wikilink = Node.create({
  name: "wikilink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: () => ({ target: str(), label: str() }),
  parseHTML: () => [{ tag: "span[data-xb=wikilink]", getAttrs: (el) => ({ target: (el as HTMLElement).getAttribute("data-target") ?? "", label: (el as HTMLElement).textContent ?? "" }) }],
  renderHTML: ({ node, HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes, { "data-xb": "wikilink", "data-target": node.attrs.target }), `[[${node.attrs.label || node.attrs.target}]]`],
  addNodeView: () => ReactNodeViewRenderer(WikilinkView, { as: "span" }),
});

/** Etiqueta #tema (inline, atómica). */
export const Hashtag = Node.create({
  name: "hashtag",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: () => ({ tag: str() }),
  parseHTML: () => [{ tag: "span[data-xb=hashtag]", getAttrs: (el) => ({ tag: (el as HTMLElement).getAttribute("data-tag") ?? "" }) }],
  renderHTML: ({ node, HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes, { "data-xb": "hashtag", "data-tag": node.attrs.tag }), `#${node.attrs.tag}`],
  addNodeView: () => ReactNodeViewRenderer(HashtagView, { as: "span" }),
});

export const XB_NODES = [ZhText, Example, Formula, ExerciseBlock, WordCardBlock, Drawing, ImageBlock, AudioBlock, Cue, DialogueLine, Callout, Wikilink, Hashtag];
