"use client";
/**
 * Editor de bloques de los apuntes (TipTap). Carga diferida desde note-page. Funciona en móvil: barra de
 * herramientas compacta, menú «+» para bloques, mover bloques con botones (además de arrastrar en escritorio).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, ListChecks, Heading2, Heading3, Quote, Table, Undo2, Redo2, Plus, ArrowUp, ArrowDown, Keyboard, Languages } from "lucide-react";
import { usePack } from "@/lib/languages/provider";
import { useSettings } from "@/lib/settings";
import { useDictionary } from "@/lib/dictionary/service";
import type { PMDoc } from "@/lib/notes/markdown";
import { Button } from "@/components/ui/button";
import { Kbd, Popover, PopoverContent, PopoverTrigger, Tooltip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { XB_NODES } from "./extensions";
import { HashtagSuggestion, PinyinKeyboard, SlashCommands, WikilinkSuggestion, slashItems, MenuList } from "./slash-menu";
import { NoteEditorContext } from "./blocks";

export interface NoteEditorProps {
  doc: PMDoc | undefined;
  onChange: (doc: PMDoc) => void;
  noteId?: string;
  readOnly?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /** Identificador para el tour («data-tour») */
  tour?: string;
}

export function useNoteEditor({ doc, onChange, readOnly, placeholder, autoFocus }: Pick<NoteEditorProps, "doc" | "onChange" | "readOnly" | "placeholder" | "autoFocus">): Editor | null {
  const pack = usePack();
  const last = useRef<string>("");
  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: {}, link: { openOnClick: false, autolink: true }, dropcursor: { color: "rgb(var(--cinnabar))", width: 2 } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: ({ editor }) => (editor.isEmpty ? (placeholder ?? "Escribe, o pulsa / para insertar un bloque…") : "/ para insertar · [[ enlazar · # etiqueta · pinyin con números + Tab") }),
      ...XB_NODES,
      SlashCommands,
      WikilinkSuggestion,
      HashtagSuggestion,
      PinyinKeyboard,
    ],
    [placeholder],
  );
  const editor = useEditor(
    {
      extensions,
      content: doc ?? { type: "doc", content: [{ type: "paragraph" }] },
      editable: !readOnly,
      autofocus: autoFocus ? "end" : false,
      immediatelyRender: false,
      editorProps: {
        attributes: { class: cn("xb-editor prose-xb outline-none", pack.theme.fontClasses.sans), lang: "es", "aria-label": "Contenido del apunte" },
      },
      onUpdate: ({ editor }) => {
        const json = editor.getJSON() as PMDoc;
        const s = JSON.stringify(json);
        if (s === last.current) return;
        last.current = s;
        onChange(json);
      },
    },
    [readOnly],
  );
  // si el documento cambia desde fuera (otro apunte), se recarga
  useEffect(() => {
    if (!editor || !doc) return;
    const s = JSON.stringify(doc);
    if (s !== last.current && s !== JSON.stringify(editor.getJSON())) {
      last.current = s;
      editor.commands.setContent(doc, { emitUpdate: false });
    }
  }, [doc, editor]);
  return editor;
}

function ToolButton({ label, active, onClick, children, disabled }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <Tooltip label={label}>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={active} className={cn("flex size-8 items-center justify-center rounded-[6px] text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink disabled:opacity-40", active && "bg-ink text-paper hover:bg-ink hover:text-paper")}>
        {children}
      </button>
    </Tooltip>
  );
}

/** Mueve el bloque de nivel superior donde está el cursor una posición arriba o abajo. */
function moveBlock(editor: Editor, dir: -1 | 1) {
  const { state } = editor;
  const $pos = state.selection.$from;
  const depth = 1;
  if ($pos.depth < depth) return;
  const index = $pos.index(0);
  const node = state.doc.child(index);
  const target = index + dir;
  if (target < 0 || target >= state.doc.childCount) return;
  const start = $pos.before(depth);
  const end = start + node.nodeSize;
  let tr = state.tr.delete(start, end);
  const other = state.doc.child(target);
  const insertAt = dir === -1 ? start - other.nodeSize : start + other.nodeSize;
  tr = tr.insert(insertAt, node);
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus(insertAt + 1);
}

export function EditorToolbar({ editor }: { editor: Editor }) {
  const pack = usePack();
  const settings = useSettings((s) => s.settings);
  const cyclePinyin = useSettings((s) => s.cyclePinyin);
  const [insertOpen, setInsertOpen] = useState(false);
  const dictStatus = useDictionary((s) => s.status);
  const loadDict = useDictionary((s) => s.load);
  useEffect(() => {
    if (dictStatus === "idle") void loadDict();
  }, [dictStatus, loadDict]);
  const items = slashItems("");
  return (
    <div className="xb-toolbar sticky top-14 z-20 -mx-1 mb-2 flex flex-wrap items-center gap-0.5 rounded-[10px] border border-line bg-paper-raised/95 p-1 backdrop-blur" role="toolbar" aria-label="Herramientas del editor">
      <Popover open={insertOpen} onOpenChange={setInsertOpen}>
        <PopoverTrigger asChild>
          <button type="button" onMouseDown={(e) => e.preventDefault()} className="flex h-8 items-center gap-1 rounded-[6px] bg-ink px-2 text-xs font-medium text-paper" aria-label="Insertar bloque">
            <Plus className="size-4" /> Bloque
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <MenuList
            items={items}
            command={(it) => {
              setInsertOpen(false);
              const { from, to } = editor.state.selection;
              it.run(editor, { from, to });
            }}
          />
        </PopoverContent>
      </Popover>
      <span className="mx-0.5 h-5 w-px bg-line" aria-hidden="true" />
      <ToolButton label="Negrita (Ctrl+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" />
      </ToolButton>
      <ToolButton label="Cursiva (Ctrl+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </ToolButton>
      <ToolButton label="Título" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-4" />
      </ToolButton>
      <ToolButton label="Subtítulo" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="size-4" />
      </ToolButton>
      <ToolButton label="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="size-4" />
      </ToolButton>
      <ToolButton label="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="size-4" />
      </ToolButton>
      <ToolButton label="Tareas" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListChecks className="size-4" />
      </ToolButton>
      <ToolButton label="Cita" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="size-4" />
      </ToolButton>
      <ToolButton label="Tabla" active={editor.isActive("table")} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <Table className="size-4" />
      </ToolButton>
      {editor.isActive("table") ? (
        <>
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addColumnAfter().run()}>
            + col
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().addRowAfter().run()}>
            + fila
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().deleteTable().run()}>
            quitar tabla
          </Button>
        </>
      ) : null}
      <span className="mx-0.5 h-5 w-px bg-line" aria-hidden="true" />
      <ToolButton label="Subir bloque" onClick={() => moveBlock(editor, -1)}>
        <ArrowUp className="size-4" />
      </ToolButton>
      <ToolButton label="Bajar bloque" onClick={() => moveBlock(editor, 1)}>
        <ArrowDown className="size-4" />
      </ToolButton>
      <ToolButton label="Deshacer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo2 className="size-4" />
      </ToolButton>
      <ToolButton label="Rehacer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo2 className="size-4" />
      </ToolButton>
      <span className="ml-auto flex items-center gap-1">
        {pack.id === "zh" ? (
          <Tooltip label="Teclado pinyin: escribe ni3hao3 y pulsa Tab para elegir los hanzi (Shift+Tab: solo tildes)">
            <span className="hidden items-center gap-1 rounded-[6px] px-2 text-[11px] text-ink-faint lg:flex">
              <Keyboard className="size-3.5" /> ni3hao3 + <Kbd>Tab</Kbd>
            </span>
          </Tooltip>
        ) : null}
        <Tooltip label={`${pack.readingAid.modes[settings.pinyinMode]} (P)`}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => void cyclePinyin()} className={cn("flex h-8 items-center gap-1 rounded-[6px] border px-2 text-xs", settings.pinyinMode === "show" ? "border-ink bg-ink text-paper" : settings.pinyinMode === "unknown" ? "border-cinnabar/50 text-cinnabar-ink" : "border-line text-ink-faint")} aria-label={`Ayuda de lectura: ${pack.readingAid.modes[settings.pinyinMode]}`}>
            <Languages className="size-3.5" />
            <span lang={pack.bcp47} className={pack.meta.cssClass}>
              {pack.readingAid.label}
            </span>
          </button>
        </Tooltip>
      </span>
    </div>
  );
}

export function NoteEditor(props: NoteEditorProps) {
  const editor = useNoteEditor(props);
  return (
    <NoteEditorContext.Provider value={{ noteId: props.noteId, readOnly: props.readOnly }}>
      <div className={cn("xb-editor-wrap", props.className)} data-tour={props.tour}>
        {editor && !props.readOnly ? <EditorToolbar editor={editor} /> : null}
        <EditorContent editor={editor} className={cn("min-h-[12rem] md:pl-7", props.readOnly && "min-h-0 md:pl-0")} />
      </div>
    </NoteEditorContext.Provider>
  );
}

export default NoteEditor;
