/** Validación de los apuntes del profesor (content/zh/notes/*.json): forma, ids únicos, bloques xb-* con JSON válido, pinyin. */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pinyin as pp } from "pinyin-pro";

export interface NoteIssue {
  level: "error" | "warn";
  where: string;
  msg: string;
}
const TYPES = new Set(["free", "word", "character", "grammar", "particle", "question", "contrast", "phrase", "dialogue", "error", "class", "topic", "culture", "pronunciation", "lesson"]);
const HAN = /[㐀-鿿]/;
const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ü/g, "v").replace(/[^a-z]/g, "");

export function checkNotes(root: string): { issues: NoteIssue[]; summary: string } {
  const issues: NoteIssue[] = [];
  const dir = path.join(root, "content", "zh", "notes");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const ids = new Set<string>();
  let total = 0;
  let pending = 0;
  for (const f of files) {
    const where = `zh/notes/${f}`;
    let notes: Record<string, unknown>[];
    try {
      notes = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
    } catch (e) {
      issues.push({ level: "error", where, msg: `JSON inválido: ${(e as Error).message}` });
      continue;
    }
    for (const n of notes) {
      total++;
      const id = String(n.id);
      const w = `${where}#${id}`;
      if (ids.has(id)) issues.push({ level: "error", where: w, msg: "id duplicado" });
      ids.add(id);
      if (!TYPES.has(String(n.type))) issues.push({ level: "error", where: w, msg: `tipo desconocido ${n.type}` });
      if (!n.title) issues.push({ level: "error", where: w, msg: "sin título" });
      if (n.reviewed === false) pending++;
      if (!Array.isArray(n.cues) || (n.cues as unknown[]).length < 2) issues.push({ level: "warn", where: w, msg: "menos de 2 preguntas Cornell" });
      const md = String(n.markdown ?? "");
      for (const m of md.matchAll(/```xb-(\w+)\n([\s\S]*?)```/g)) {
        try {
          JSON.parse(m[2]);
        } catch {
          issues.push({ level: "error", where: w, msg: `bloque xb-${m[1]} con JSON inválido` });
        }
      }
      // pinyin de los ejemplos de los campos
      const walk = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") {
          const o = v as Record<string, unknown>;
          if (typeof o.zh === "string" && typeof o.py === "string" && HAN.test(o.zh)) {
            const han = Array.from(o.zh).filter((c) => HAN.test(c)).join("");
            const nAuto = pp(han, { type: "array", nonZh: "removed" }).length;
            const nGiven = (o.py.match(/[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+(ng|n|r)?/gi) ?? []).length;
            if (Math.abs(nAuto - nGiven) > 1) issues.push({ level: "warn", where: w, msg: `pinyin «${o.py}» (${nGiven} sílabas) no cuadra con «${han}» (${nAuto})` });
            void strip;
          }
          Object.values(o).forEach(walk);
        }
      };
      walk(n.fields);
    }
  }
  return { issues, summary: `${files.length} archivos · ${total} apuntes · ${pending} pendientes de validar` };
}
