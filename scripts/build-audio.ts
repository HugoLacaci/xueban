/**
 * npm run audio:build [-- --all | --words | --course | --readings | --limit N]
 * Pregenera MP3 de calidad (voz neuronal de Microsoft Edge, gratis, sin clave) en public/audio/<hash>.mp3
 * para el vocabulario, las frases del curso, la gramática y las lecturas. Caché por hash del texto:
 * reejecutar solo genera lo que falta. Sin este paso la app usa la voz del navegador.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { hashString } from "../lib/utils";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "audio");
mkdirSync(OUT, { recursive: true });
const VOICE = process.env.XUEBAN_VOICE ?? "zh-CN-XiaoxiaoNeural"; // alternativas: zh-CN-YunxiNeural (masculina), zh-CN-XiaoyiNeural

function collect(): string[] {
  const texts = new Set<string>();
  const args = process.argv.slice(2);
  const all = args.includes("--all") || args.length === 0;
  const add = (s?: string) => {
    if (s && /[一-鿿]/.test(s)) texts.add(s.trim());
  };
  if (all || args.includes("--words")) {
    const seed = JSON.parse(readFileSync(path.join(ROOT, "content", "seed", "hsk1_vocab.json"), "utf8")) as { words: { hanzi: string; example: string }[] };
    for (const w of seed.words) {
      add(w.hanzi);
      add(w.example);
    }
  }
  if (all || args.includes("--course")) {
    for (const f of readdirSync(path.join(ROOT, "content", "course")).filter((f) => f.endsWith(".json"))) {
      const u = JSON.parse(readFileSync(path.join(ROOT, "content", "course", f), "utf8")) as { lessons: { vocab: { hanzi: string }[]; steps: { type: string; lines?: { zh: string }[]; text?: string }[] }[] };
      for (const l of u.lessons) {
        for (const v of l.vocab) add(v.hanzi);
        for (const s of l.steps) {
          if (s.lines) for (const line of s.lines) add(line.zh);
          if (s.text) for (const sent of s.text.split(/(?<=[。！？])/)) add(sent);
        }
      }
    }
    const grammar = JSON.parse(readFileSync(path.join(ROOT, "content", "grammar.json"), "utf8")) as { examples: { zh: string }[]; practice: { order?: { zh: string }[] } }[];
    for (const g of grammar) {
      for (const e of g.examples) add(e.zh);
      for (const o of g.practice.order ?? []) add(o.zh);
    }
  }
  if (all || args.includes("--readings")) {
    const r = JSON.parse(readFileSync(path.join(ROOT, "content", "readings", "readings.json"), "utf8")) as { text: string }[];
    for (const x of r) for (const line of x.text.split("\n")) add(line);
  }
  const limitIdx = args.indexOf("--limit");
  const list = Array.from(texts);
  return limitIdx >= 0 ? list.slice(0, Number(args[limitIdx + 1])) : list;
}

async function main() {
  const texts = collect();
  const pending = texts.filter((t) => !existsSync(path.join(OUT, `${hashString(t).toString(16)}.mp3`)));
  console.log(`${texts.length} textos · ${pending.length} por generar · voz ${VOICE}`);
  if (!pending.length) return;
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  let ok = 0;
  for (const [i, text] of pending.entries()) {
    const file = path.join(OUT, `${hashString(text).toString(16)}.mp3`);
    try {
      const { audioStream } = tts.toStream(text);
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        audioStream.on("data", (c: Buffer) => chunks.push(c));
        audioStream.on("end", () => resolve());
        audioStream.on("error", reject);
      });
      writeFileSync(file, Buffer.concat(chunks));
      ok++;
      if (i % 25 === 0) console.log(`${i + 1}/${pending.length} ${text.slice(0, 20)}`);
    } catch (e) {
      console.error("✗", text, (e as Error).message);
    }
  }
  tts.close();
  console.log(`✓ ${ok} archivos en public/audio/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
