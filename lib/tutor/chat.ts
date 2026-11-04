"use client";
/**
 * Motor de conversación del tutor 老师: construye el prompt por modo (escenario, chat libre, explicador con búsqueda
 * local BM25 sobre content/zh y mis apuntes, generador, planificador), llama al proveedor, analiza etiquetas de
 * objetivos (<goal n="1"/>, <done/>) y llamadas a herramientas (siempre con confirmación), y persiste la conversación.
 */
import MiniSearch from "minisearch";
import { db, uuid, type Chat, type ChatMessage } from "@/lib/db";
import { getActiveLang, getActivePack } from "@/lib/languages/registry";
import { useSettings } from "@/lib/settings";
import { todaySummary } from "@/lib/stats";
import { docToText, type PMDoc } from "@/lib/notes/markdown";
import { chat as providerChat, extractJson, stripThinking, tutorConfigured, type ChatTurn } from "./providers";
import { explainerPrompt, freeChatPrompt, generatorPrompt, plannerPrompt, scenarioSystemPrompt, TUTOR_TOOLS, type Scenario } from "./prompts";
import { buildStudentModel } from "./student";

export type TutorMode = Chat["mode"];

export interface TurnResult {
  text: string; // texto para mostrar (sin etiquetas)
  goalsHit: number[]; // índices (desde 0)
  done: boolean;
  newWords: string[]; // palabras marcadas [[así]]
  actions: NonNullable<ChatMessage["actions"]>;
  citations: string[];
}

/* ------------------------------------------------------------------ búsqueda local (explicador) */

interface Doc {
  id: string;
  title: string;
  text: string;
  kind: "grammar" | "note" | "article";
}
let index: MiniSearch<Doc> | undefined;
let indexedAt = 0;

async function buildIndex(): Promise<MiniSearch<Doc>> {
  const pack = getActivePack();
  const docs: Doc[] = [];
  for (const g of pack.grammar.points) docs.push({ id: `grammar:${g.id}`, title: g.title, text: `${g.zh} ${g.pattern}\n${g.summary}\n${g.explanation}\n${g.examples.map((e) => `${e.zh} ${e.es}`).join("\n")}\n${g.mistakes.map((m) => `${m.wrong} → ${m.right}: ${m.why}`).join("\n")}`, kind: "grammar" });
  for (const a of pack.articles) docs.push({ id: `article:${a.id}`, title: a.title, text: a.markdown.slice(0, 6000), kind: "article" });
  const notes = await db.notes.where("lang").equals(pack.id).filter((n) => n.status === "active").toArray();
  for (const n of notes) docs.push({ id: `note:${n.id}`, title: n.title, text: `${JSON.stringify(n.fields).slice(0, 4000)}\n${docToText(n.doc as PMDoc).slice(0, 4000)}\n${n.cues.map((c) => `${c.q} ${c.a}`).join("\n")}`, kind: "note" });
  const ms = new MiniSearch<Doc>({
    fields: ["title", "text"],
    storeFields: ["id", "title", "text", "kind"],
    tokenize: (s) => {
      const out: string[] = [];
      for (const m of s.toLowerCase().matchAll(/[\p{L}\p{N}]+/gu)) {
        const t = m[0];
        if (/[㐀-鿿]/.test(t)) {
          const chars = Array.from(t);
          out.push(...chars);
          for (let i = 0; i < chars.length - 1; i++) out.push(chars[i] + chars[i + 1]);
        } else out.push(t.normalize("NFD").replace(/[̀-ͯ]/g, ""));
      }
      return out;
    },
    searchOptions: { boost: { title: 3 }, prefix: true, fuzzy: 0.1 },
  });
  ms.addAll(docs);
  return ms;
}

export async function searchKnowledge(query: string, k = 4): Promise<{ id: string; title: string; snippet: string; kind: Doc["kind"] }[]> {
  if (!index || Date.now() - indexedAt > 60000) {
    index = await buildIndex();
    indexedAt = Date.now();
  }
  const hits = index.search(query).slice(0, k);
  return hits.map((h) => ({ id: h.id as string, title: h.title as string, kind: h.kind as Doc["kind"], snippet: String(h.text).slice(0, 1200) }));
}

/* ------------------------------------------------------------------ análisis de la respuesta */

export function parseTurn(raw: string, toolCalls: { id: string; name: string; args: Record<string, unknown> }[] = []): TurnResult {
  let text = stripThinking(raw);
  const goalsHit: number[] = [];
  for (const m of text.matchAll(/<goal\s+n="?(\d+)"?\s*\/?>/g)) goalsHit.push(Number(m[1]) - 1);
  const done = /<done\s*\/?>/.test(text);
  text = text.replace(/<goal[^>]*>/g, "").replace(/<done\s*\/?>/g, "").replace(/<\/?goal>/g, "").trim();
  const newWords = Array.from(text.matchAll(/\[\[([^\]]+)\]\]/g)).map((m) => m[1]);
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");
  const citations = Array.from(text.matchAll(/\[([^\]]{3,80})\]/g)).map((m) => m[1]).filter((c) => !/^\d+$/.test(c));
  const actions = toolCalls.map((c) => ({ id: c.id || uuid(), tool: c.name, args: c.args }));
  return { text, goalsHit, done, newWords, actions, citations };
}

/* ------------------------------------------------------------------ conversación */

export async function newChat(mode: TutorMode, title: string, extra: Partial<Chat> = {}): Promise<Chat> {
  const now = Date.now();
  const c: Chat = { id: uuid(), lang: getActiveLang(), mode, title, messages: [], createdAt: now, updatedAt: now, ...extra };
  await db.chats.put(c);
  return c;
}

export async function appendMessage(chatId: string, msg: ChatMessage, patch: Partial<Chat> = {}): Promise<Chat | undefined> {
  const c = await db.chats.get(chatId);
  if (!c) return undefined;
  const next = { ...c, ...patch, messages: [...c.messages, msg], updatedAt: Date.now() };
  await db.chats.put(next);
  return next;
}

function history(c: Chat, limit = 16): ChatTurn[] {
  return c.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-limit)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

export interface SendOptions {
  scenario?: Scenario;
  signal?: AbortSignal;
}

/** Envía un turno del alumno y devuelve la respuesta del tutor ya analizada (y guardada). */
export async function sendTurn(c: Chat, userText: string, opts: SendOptions = {}): Promise<{ chat: Chat; turn: TurnResult }> {
  const settings = useSettings.getState().settings;
  const t = settings.tutor;
  if (!tutorConfigured(t)) throw new Error("El tutor no está configurado (Ajustes → Tutor IA).");
  const student = (await buildStudentModel()).summary;
  let system: string;
  let userContent = userText;
  let citations: { id: string; title: string }[] = [];
  switch (c.mode) {
    case "scenario":
    case "roleplay":
      system = opts.scenario ? scenarioSystemPrompt(opts.scenario, student) : freeChatPrompt(student);
      break;
    case "explainer": {
      const hits = await searchKnowledge(userText, 4);
      citations = hits.map((h) => ({ id: h.id, title: h.title }));
      system = explainerPrompt(student, hits.map((h) => `[${h.title}] (${h.kind})\n${h.snippet}`).join("\n\n---\n\n") || "(sin fragmentos relevantes)");
      break;
    }
    case "planner": {
      const s = await todaySummary();
      system = plannerPrompt(student, `repasos pendientes: ${s.dueCards} · palabras conocidas: ${s.wordsKnown}/${s.wordsTotal} · minutos hoy: ${Math.round(s.minutesToday)} · racha: ${s.streak} días · bandeja de apuntes: ${s.inbox} · preguntas Cornell pendientes: ${s.noteCardsDue} · frases del cuaderno pendientes: ${s.workbookDue}`);
      userContent = userText || "¿Qué estudio hoy?";
      break;
    }
    case "generator":
      system = generatorPrompt(student, userText, "mezcla");
      userContent = "Genera los ejercicios.";
      break;
    default:
      system = freeChatPrompt(student);
  }
  const chatWithUser = (await appendMessage(c.id, { role: "user", content: userText, at: Date.now() })) ?? c;
  const messages: ChatTurn[] = [{ role: "system", content: system }, ...history(chatWithUser).slice(0, -1), { role: "user", content: userContent }];
  const useTools = c.mode !== "generator" && c.mode !== "planner";
  const r = await providerChat(t, messages, { tools: useTools ? TUTOR_TOOLS : undefined, temperature: c.mode === "generator" ? 0.5 : t.temperature, signal: opts.signal, json: c.mode === "generator" });
  const turn = parseTurn(r.text, r.toolCalls);
  if (!turn.text && !turn.actions.length) turn.text = "(sin respuesta del modelo)";
  const goals = c.goals?.map((g, i) => (turn.goalsHit.includes(i) ? { ...g, done: true } : g));
  const chat = (await appendMessage(c.id, { role: "assistant", content: turn.text, at: Date.now(), actions: turn.actions.length ? turn.actions : undefined, meta: { citations: citations.filter((x) => turn.citations.some((cit) => x.title.toLowerCase().includes(cit.toLowerCase()) || cit.toLowerCase().includes(x.title.toLowerCase()))), newWords: turn.newWords, done: turn.done } }, { goals, newWords: Array.from(new Set([...(c.newWords ?? []), ...turn.newWords])) })) ?? chatWithUser;
  return { chat, turn };
}

/** Ejecuta una acción propuesta por el tutor (tras la confirmación del alumno). */
export async function runAction(action: { id: string; tool: string; args: Record<string, unknown> }, chatId: string): Promise<string> {
  const a = action.args;
  switch (action.tool) {
    case "crear_tarjeta": {
      const { minePhrase } = await import("@/lib/notes/practice");
      await minePhrase({ zh: String(a.zh ?? ""), es: String(a.es ?? ""), noteId: "tutor" });
      return "Tarjeta creada";
    }
    case "crear_apunte": {
      const { createNote } = await import("@/lib/notes/repo");
      const n = await createNote({ type: (a.type as "grammar") ?? "free", title: String(a.title ?? "Apunte del tutor"), markdown: String(a.markdown ?? ""), source: { kind: "tutor", ref: chatId }, tags: ["tutor"] });
      return `Apunte «${n.title}» creado`;
    }
    case "registrar_error": {
      const { recordError } = await import("@/lib/notes/error-book");
      await recordError({ mine: String(a.mine ?? ""), correct: String(a.correct ?? ""), explanation: String(a.explanation ?? ""), origin: "tutor", source: { kind: "tutor", ref: chatId } });
      return "Error anotado en el 错题本";
    }
    case "abrir_ejercicio":
      return `/practicar?grammar=${encodeURIComponent(String(a.grammarId ?? ""))}`;
    default:
      return "Acción desconocida";
  }
}

/** Marca una acción como hecha en el historial. */
export async function markActionDone(chatId: string, actionId: string): Promise<void> {
  const c = await db.chats.get(chatId);
  if (!c) return;
  await db.chats.put({ ...c, messages: c.messages.map((m) => (m.actions ? { ...m, actions: m.actions.map((x) => (x.id === actionId ? { ...x, done: true } : x)) } : m)) });
}

/** Al terminar: guarda la conversación como apunte de tipo Diálogo, mina las frases del tutor y pide un resumen de errores. */
export async function saveChatAsNote(c: Chat): Promise<string> {
  const { createNote } = await import("@/lib/notes/repo");
  const pack = getActivePack();
  const lines = c.messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ speaker: m.role === "user" ? "雨果" : "老师", zh: m.content, es: "" }));
  let summary = "";
  try {
    const t = useSettings.getState().settings.tutor;
    const r = await providerChat(t, [{ role: "system", content: "Eres un profesor de chino. Resume en español, en 3–6 líneas, los errores del alumno en esta conversación y qué debería practicar. Devuelve JSON: {\"summary\":\"…\",\"errors\":[{\"mine\":\"…\",\"correct\":\"…\",\"explanation\":\"…\"}]}" }, { role: "user", content: c.messages.map((m) => `${m.role}: ${m.content}`).join("\n") }], { json: true, temperature: 0.2, maxTokens: 600 });
    const j = extractJson(r.text) as { summary?: string; errors?: { mine: string; correct: string; explanation: string }[] };
    summary = j.summary ?? "";
    if (j.errors?.length) {
      const { recordError } = await import("@/lib/notes/error-book");
      for (const e of j.errors.slice(0, 5)) if (e.mine && e.correct) await recordError({ mine: e.mine, correct: e.correct, explanation: e.explanation ?? "", origin: `tutor · ${c.title}`, source: { kind: "tutor", ref: c.id } });
    }
  } catch {
    /* sin resumen */
  }
  const note = await createNote({ type: "dialogue", title: `Conversación: ${c.title}`, fields: { topic: c.title, lines, vocab: c.newWords ?? [], grammar: [] }, markdown: summary ? `## Resumen del tutor\n\n${summary}` : "", source: { kind: "tutor", ref: c.id, href: "/tutor" }, tags: ["tutor", "conversación"] });
  await db.chats.update(c.id, { savedNoteId: note.id });
  // minar frases del tutor en chino
  const { minePhrase } = await import("@/lib/notes/practice");
  for (const m of c.messages.filter((m) => m.role === "assistant" && pack.hasTargetText(m.content)).slice(0, 8)) {
    const zh = (m.content.match(/[㐀-鿿，、！？。]{3,30}/g) ?? [])[0];
    if (zh) await minePhrase({ zh, noteId: note.id });
  }
  return note.id;
}
