/**
 * Importación masiva de vocabulario: una palabra por línea o CSV/TSV con columnas.
 * Formatos aceptados por línea:
 *   咖啡
 *   咖啡,kāfēi,café
 *   咖啡 | kāfēi | café | Comida y bebida | 我想喝咖啡。 | Quiero tomar un café.
 *   咖啡\tkāfēi\tcafé
 * Cabecera opcional (hanzi,pinyin,significado,categoria,ejemplo,traduccion).
 */
import { hanziOnly, hasHanzi } from "@/lib/pinyin/convert";
import { numberedToMarked } from "@/lib/pinyin/tones";

export interface ImportRow {
  hanzi: string;
  pinyin?: string;
  meaning?: string;
  category?: string;
  example?: string;
  exampleTranslation?: string;
  line: number;
  error?: string;
}

const HEADER_WORDS = ["hanzi", "汉字", "pinyin", "significado", "meaning", "categoria", "categoría", "ejemplo", "traduccion"];

function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes("|")) return line.split("|");
  if (line.includes(",") || line.includes("，")) return parseCsvLine(line.replace(/，/g, ","));
  if (line.includes(";")) return line.split(";");
  // "咖啡 kāfēi café" → separar hanzi del resto por el primer espacio tras los hanzi
  const m = line.match(/^([一-鿿]+)\s+(.+)$/);
  if (m) {
    const rest = m[2];
    const m2 = rest.match(/^([a-zA-ZüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s'’1-5]+?)\s{2,}(.+)$/) ?? rest.match(/^([a-zA-ZüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'’1-5]+)\s+(.+)$/);
    if (m2 && /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ1-5]/.test(m2[1])) return [m[1], m2[1], m2[2]];
    return [m[1], "", rest];
  }
  return [line];
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseImport(text: string): ImportRow[] {
  const rows: ImportRow[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const cells = splitLine(line).map((c) => c.trim());
    if (i === 0 && cells.length > 1 && cells.every((c) => !hasHanzi(c)) && cells.some((c) => HEADER_WORDS.includes(c.toLowerCase()))) return; // cabecera
    const hanzi = hanziOnly(cells[0] ?? "");
    const row: ImportRow = { hanzi, line: i + 1 };
    if (!hanzi) {
      row.error = "sin caracteres chinos";
      rows.push(row);
      return;
    }
    const [, pinyin, meaning, category, example, tr] = cells;
    if (pinyin) row.pinyin = numberedToMarked(pinyin);
    if (meaning) row.meaning = meaning;
    if (category) row.category = category;
    if (example) row.example = example;
    if (tr) row.exampleTranslation = tr;
    rows.push(row);
  });
  // duplicados dentro del propio texto
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r.hanzi) continue;
    if (seen.has(r.hanzi)) r.error = "duplicado en la lista";
    seen.add(r.hanzi);
  }
  return rows;
}
