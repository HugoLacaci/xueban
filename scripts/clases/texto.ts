/** npx tsx scripts/clases/texto.ts ID → transcripciones\ID.txt (una línea por segmento: "mmm:ss [zh] texto"), para leer la clase entera. */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dirs } from "./config";

const id = process.argv[2];
if (!id) throw new Error("Uso: tsx scripts/clases/texto.ts AAAA-MM-DD_HHMM");
const t = JSON.parse(readFileSync(path.join(dirs().transcripciones, `${id}.json`), "utf8")) as { meta: { durationSec: number }; segments: { start: number; lang: string; text: string }[] };
const f = (s: number) => `${String(Math.floor(s / 60)).padStart(3, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const lines = t.segments.map((s) => `${f(s.start)} ${s.lang === "zh" ? "[zh] " : ""}${s.text}`);
const out = path.join(dirs().transcripciones, `${id}.txt`);
writeFileSync(out, lines.join("\n"));
console.log(`${out}  (${lines.length} líneas, ${Math.round(t.meta.durationSec / 60)} min)`);
