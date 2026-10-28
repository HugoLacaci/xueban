import { numberedToMarked } from "@/lib/pinyin/tones";

export interface CedictLine {
  trad: string;
  simp: string;
  pinyin: string; // con diacríticos, sílabas separadas por espacio
  pinyinNum: string;
  defs: string[];
  cl?: string[];
}

const RE = /^(\S+) (\S+) \[([^\]]+)\] \/(.+)\/$/;

/** Parsea una línea de CC-CEDICT: `傳統 传统 [chuan2 tong3] /tradition/CL:個|个[ge4]/` */
export function parseCedictLine(raw: string): CedictLine | null {
  const line = raw.trim();
  if (!line || line.startsWith("#")) return null;
  const m = line.match(RE);
  if (!m) return null;
  const [, trad, simp, pyNum, defsRaw] = m;
  const all = defsRaw.split("/").filter(Boolean);
  const defs = all.filter((d) => !/^(variant of|old variant of|see also|see |CL:)/.test(d));
  const pinyin = numberedToMarked(pyNum.replace(/u:/g, "ü").replace(/U:/g, "Ü").replace(/\b([A-Za-zü]+)5\b/g, "$1")).replace(/\s+/g, " ");
  const clRaw = all.find((d) => d.startsWith("CL:"));
  const cl = clRaw
    ?.slice(3)
    .split(",")
    .map((c) => c.replace(/\[.*?\]/g, "").split("|").pop()!.trim())
    .filter(Boolean);
  return { trad, simp, pinyin, pinyinNum: pyNum, defs: defs.length ? defs : all, cl: cl?.length ? cl : undefined };
}
