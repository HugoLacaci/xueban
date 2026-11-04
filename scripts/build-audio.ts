/**
 * npm run audio:build [-- --all | --words | --course | --readings | --banks | --notes | --limit N | --lang=zh]
 * Pregenera MP3 de calidad (voces neuronales de Microsoft Edge, gratis, sin clave) en public/audio/<hash>[-voz].mp3
 * para el vocabulario, las frases del curso, la gramática, las lecturas, los bancos de ejercicios (con la voz de cada
 * ítem: f = Xiaoxiao, m = Yunxi, child = Xiaoyou; a los personajes de los diálogos se les asigna una voz fija) y los
 * apuntes del profesor. Caché por hash del texto: reejecutar solo genera lo que falta. Sin este paso la app usa Web Speech.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { hashString } from "../lib/utils";

type Voice = "f" | "m" | "child";
const VOICES: Record<Voice, string> = { f: process.env.XUEBAN_VOICE ?? "zh-CN-XiaoxiaoNeural", m: "zh-CN-YunxiNeural", child: "zh-CN-XiaoyouNeural" };
/** Voz por personaje de los diálogos (bancos y apuntes). */
const SPEAKER_VOICE: Record<string, Voice> = { 雨果: "m", 王明: "m", 大卫: "m", 李老师: "f", 老师: "f", 安娜: "f", 妈妈: "f", 爸爸: "m", 服务员: "f", 司机: "m", 医生: "m", A: "f", B: "m", 甲: "f", 乙: "m" };

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "audio");
mkdirSync(OUT, { recursive: true });
const HAN = /[㐀-鿿]/;

function fileFor(text: string, voice: Voice): string {
  return path.join(OUT, `${hashString(text.trim()).toString(16)}${voice === "f" ? "" : `-${voice}`}.mp3`);
}

function collect(): { text: string; voice: Voice }[] {
  const wanted = new Map<string, Voice>();
  const args = process.argv.slice(2);
  const all = args.includes("--all") || !args.some((a) => a.startsWith("--") && a !== "--limit");
  const add = (s: string | undefined, voice: Voice = "f") => {
    if (s && HAN.test(s)) {
      const key = `${s.trim()}|${voice}`;
      if (!wanted.has(key)) wanted.set(key, voice);
    }
  };
  const zh = path.join(ROOT, "content", "zh");
  if (all || args.includes("--words")) {
    const seed = JSON.parse(readFileSync(path.join(zh, "seed", "hsk1_vocab.json"), "utf8")) as { words: { hanzi: string; example: string }[] };
    for (const w of seed.words) {
      add(w.hanzi);
      add(w.example);
    }
  }
  if (all || args.includes("--course")) {
    for (const f of readdirSync(path.join(zh, "course")).filter((f) => f.endsWith(".json"))) {
      const u = JSON.parse(readFileSync(path.join(zh, "course", f), "utf8")) as { lessons: { vocab: { hanzi: string }[]; steps: { type: string; lines?: { zh: string; speaker?: string }[]; text?: string }[] }[] };
      for (const l of u.lessons) {
        for (const v of l.vocab) add(v.hanzi);
        for (const s of l.steps) {
          if (s.lines) for (const line of s.lines) add(line.zh, line.speaker ? (SPEAKER_VOICE[line.speaker] ?? "f") : "f");
          if (s.text) for (const sent of s.text.split(/(?<=[。！？])/)) add(sent);
        }
      }
    }
    const grammar = JSON.parse(readFileSync(path.join(zh, "grammar.json"), "utf8")) as { examples: { zh: string }[]; practice: { order?: { zh: string }[] } }[];
    for (const g of grammar) {
      for (const e of g.examples) add(e.zh);
      for (const o of g.practice.order ?? []) add(o.zh);
    }
  }
  if (all || args.includes("--readings")) {
    const r = JSON.parse(readFileSync(path.join(zh, "readings", "readings.json"), "utf8")) as { text: string }[];
    for (const x of r) for (const line of x.text.split("\n")) add(line);
  }
  if (all || args.includes("--banks")) {
    const dir = path.join(zh, "exercises");
    if (existsSync(dir)) {
      for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
        const b = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as { items: Record<string, unknown>[] };
        for (const it of b.items) {
          const v = ((it.voice as Voice) ?? "f") as Voice;
          const listening = /^(listen-|dictation-|speak-|tone-)/.test(String(it.type));
          for (const k of ["zh", "question", "sample", "text", "correct", "answer"]) if (typeof it[k] === "string") add(it[k] as string, listening ? v : "f");
          for (const k of ["options", "answers", "alternatives"]) for (const s of (it[k] as unknown[]) ?? []) if (typeof s === "string") add(s);
          for (const l of (it.lines as { zh: string; speaker?: string }[]) ?? []) add(l.zh, l.speaker ? (SPEAKER_VOICE[l.speaker] ?? (l.speaker === "B" ? "m" : "f")) : "f");
          for (const p of (it.pairs as { zh: string }[]) ?? []) add(p.zh);
        }
      }
    }
  }
  if (all || args.includes("--notes")) {
    const dir = path.join(zh, "notes");
    if (existsSync(dir)) {
      for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
        const notes = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Record<string, unknown>[];
        const walk = (v: unknown, voice: Voice) => {
          if (Array.isArray(v)) v.forEach((x) => walk(x, voice));
          else if (v && typeof v === "object") {
            const o = v as Record<string, unknown>;
            const sp = typeof o.speaker === "string" ? (SPEAKER_VOICE[o.speaker] ?? (o.speaker === "B" ? "m" : "f")) : voice;
            for (const k of ["zh", "q", "a", "right", "hanzi", "char", "particle", "correct", "answer"]) if (typeof o[k] === "string") add(o[k] as string, sp);
            Object.values(o).forEach((x) => walk(x, voice));
          }
        };
        for (const n of notes) {
          walk(n.fields, "f");
          for (const m of String(n.markdown ?? "").matchAll(/```xb-(?:example|dialogueLine|exercise)\n([\s\S]*?)```/g)) {
            try {
              walk(JSON.parse(m[1]), "f");
            } catch {
              /* bloque inválido: lo señala content:check */
            }
          }
        }
      }
    }
  }
  const limitIdx = args.indexOf("--limit");
  const list = Array.from(wanted.entries()).map(([key, voice]) => ({ text: key.slice(0, key.lastIndexOf("|")), voice }));
  return limitIdx >= 0 ? list.slice(0, Number(args[limitIdx + 1])) : list;
}

async function main() {
  const texts = collect();
  const pending = texts.filter((t) => !existsSync(fileFor(t.text, t.voice)));
  console.log(`${texts.length} textos · ${pending.length} por generar (f ${pending.filter((p) => p.voice === "f").length} · m ${pending.filter((p) => p.voice === "m").length} · child ${pending.filter((p) => p.voice === "child").length})`);
  if (!pending.length) return;
  let ok = 0;
  let fail = 0;
  for (const voice of ["f", "m", "child"] as Voice[]) {
    const batch = pending.filter((p) => p.voice === voice);
    if (!batch.length) continue;
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(VOICES[voice], OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    } catch (e) {
      console.error(`✗ no se pudo abrir la voz ${VOICES[voice]}: ${(e as Error).message}`);
      continue;
    }
    for (const [i, { text }] of batch.entries()) {
      const file = fileFor(text, voice);
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
        if (i % 50 === 0) console.log(`[${voice}] ${i + 1}/${batch.length} ${text.slice(0, 20)}`);
      } catch (e) {
        fail++;
        console.error("✗", text.slice(0, 30), (e as Error).message);
        if (fail > 20 && ok === 0) {
          console.error("Demasiados fallos seguidos: ¿sin conexión? Se detiene.");
          tts.close();
          return;
        }
      }
    }
    tts.close();
  }
  console.log(`✓ ${ok} archivos en public/audio/ (${fail} fallos)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
