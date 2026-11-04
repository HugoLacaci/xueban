/**
 * Sugerencia de plantilla para una captura de la bandeja (heurísticas sencillas sobre el texto).
 * Devuelve el tipo más probable y los campos prerrellenados.
 */
import type { NoteType } from "@/lib/db/schema";

export interface Suggestion {
  type: NoteType;
  title: string;
  fields: Record<string, unknown>;
  reason: string;
  /** Texto que queda para los bloques libres */
  rest: string;
}

const HAN = /[㐀-鿿]/;
const hanOnly = (s: string) => Array.from(s).filter((c) => HAN.test(c)).join("");

export function suggestTemplate(text: string, hint?: { fromWord?: string }): Suggestion {
  const t = text.trim();
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const first = lines[0] ?? "";
  const han = hanOnly(t);
  const vs = t.match(/([^\s]+)\s*(?:vs\.?|VS|frente a|o)\s+([^\s]+)/);
  // contraste A vs B (los dos lados en chino)
  if (vs && HAN.test(vs[1]) && HAN.test(vs[2])) {
    return { type: "contrast", title: `${hanOnly(vs[1])} vs ${hanOnly(vs[2])}`, fields: { a: hanOnly(vs[1]), b: hanOnly(vs[2]), rule: lines.slice(1).join(" ").slice(0, 200) }, reason: "parece una comparación A vs B", rest: lines.slice(1).join("\n") };
  }
  // error: «❌ … ✅ …» o «mal/bien»
  const err = t.match(/[❌✗x]\s*([^\n✅✓]+)[\s\n]*[✅✓]\s*([^\n]+)/i);
  if (err && HAN.test(err[1]) && HAN.test(err[2])) {
    return { type: "error", title: hanOnly(err[2]), fields: { mine: err[1].trim(), correct: err[2].trim(), explanation: lines.filter((l) => !/[❌✅✗✓]/.test(l)).join(" ") }, reason: "tiene una forma incorrecta y una correcta", rest: "" };
  }
  // pregunta: termina en ？ y hay respuesta debajo
  if (/[？?]\s*$/.test(first) && HAN.test(first) && lines.length >= 2 && HAN.test(lines[1])) {
    return { type: "question", title: first, fields: { structure: first, qa: [{ q: first, a: lines[1] }], answer: lines.slice(2).join(" ") }, reason: "una pregunta con su respuesta", rest: lines.slice(2).join("\n") };
  }
  // estructura: contiene «+» entre partes o mayúsculas S/V/O
  if (/\+/.test(first) && (/[SVO]\b/.test(first) || HAN.test(first))) {
    const parts = first.split("+").map((p) => p.trim()).filter(Boolean);
    const role = (p: string) => (/^s(ujeto)?$/i.test(p) ? "subject" : /^v(erbo)?$/i.test(p) ? "verb" : /^o(bjeto)?$/i.test(p) ? "object" : /lugar/i.test(p) ? "place" : /tiempo/i.test(p) ? "time" : "other");
    return { type: "grammar", title: first, fields: { name: first, formula: parts.map((p) => ({ text: p, role: role(p) })), function: lines[1] ?? "" }, reason: "parece una fórmula con huecos", rest: lines.slice(2).join("\n") };
  }
  // palabra suelta (1–4 hanzi) con o sin significado
  if (han.length >= 1 && han.length <= 4 && first.length <= 30 && lines.length <= 3) {
    const m = first.match(/^([㐀-鿿]+)\s*[,，:：\-–—]?\s*(.*)$/);
    return { type: "word", title: han, fields: { hanzi: hint?.fromWord ?? han, meaning: m?.[2]?.trim() ?? lines[1] ?? "" }, reason: "una palabra con su significado", rest: lines.slice(2).join("\n") };
  }
  // frase completa en chino (con puntuación)
  if (HAN.test(first) && /[。！？]/.test(first) && han.length >= 4) {
    return { type: "phrase", title: first, fields: { zh: first, natural: lines[1] ?? "" }, reason: "una frase completa", rest: lines.slice(2).join("\n") };
  }
  // diálogo: líneas con A: / B: o 甲/乙
  if (lines.length >= 2 && lines.every((l) => /^(A|B|甲|乙|[㐀-鿿]{1,3})\s*[:：]/.test(l))) {
    return { type: "dialogue", title: "Diálogo", fields: { topic: "", lines: lines.map((l) => { const m = l.match(/^([^:：]+)[:：]\s*(.*)$/); return { speaker: m?.[1] ?? "A", zh: m?.[2] ?? l, es: "" }; }) }, reason: "líneas de diálogo", rest: "" };
  }
  // deberes / clase
  if (/deberes|tarea|p[áa]g(ina)?\.?\s*\d+|ejercicio/i.test(t)) {
    return { type: "class", title: "Clase", fields: { homework: t }, reason: "menciona deberes", rest: "" };
  }
  return { type: "free", title: first.slice(0, 60), fields: {}, reason: "texto libre", rest: t };
}
