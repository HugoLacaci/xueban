/**
 * npx tsx scripts/fetch-video.ts <id|url> [...]   → public/videos/<id>.json (transcripción china + traducción si existe)
 * npx tsx scripts/fetch-video.ts --search "consulta"  → lista vídeos candidatos (id, título, canal, duración, ¿subtítulos zh?)
 * npx tsx scripts/fetch-video.ts --check <id>         → solo comprueba idiomas de subtítulos disponibles
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fetchTranscript, parseYouTubeId } from "../lib/videos/transcript";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "videos");
mkdirSync(OUT, { recursive: true });

async function search(q: string) {
  const { Innertube, Log } = await import("youtubei.js");
  Log.setLevel(Log.Level.NONE);
  const yt = await Innertube.create({ retrieve_player: false });
  const res = await yt.search(q, { type: "video" });
  const items = (res.videos as unknown as { id?: string; title?: { text?: string }; author?: { name?: string }; duration?: { text?: string } }[]).slice(0, 15);
  for (const v of items) {
    if (!v.id) continue;
    let langs = "?";
    try {
      const info = await yt.getInfo(v.id);
      const tracks = info.captions?.caption_tracks ?? [];
      langs = tracks.map((c) => c.language_code + (c.kind === "asr" ? "(auto)" : "")).join(", ") || "(ninguno)";
    } catch {
      langs = "(error)";
    }
    console.log(`${v.id}\t${v.duration?.text ?? ""}\t${v.author?.name ?? ""}\t${v.title?.text ?? ""}\n\t↳ subtítulos: ${langs}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--search") return search(args.slice(1).join(" "));
  if (args[0] === "--check") {
    const id = parseYouTubeId(args[1]);
    if (!id) throw new Error("id inválido");
    const r = await fetchTranscript(id);
    console.log(r.meta.title, "·", r.lines.length, "líneas ·", r.language, "· idiomas:", r.availableLanguages.join(", "));
    return;
  }
  for (const a of args) {
    const id = parseYouTubeId(a);
    if (!id) {
      console.error("id inválido:", a);
      continue;
    }
    const file = path.join(OUT, `${id}.json`);
    if (existsSync(file) && !args.includes("--force")) {
      console.log("ya existe", file);
      continue;
    }
    try {
      const r = await fetchTranscript(id);
      const esLines = r.translation?.lines ?? [];
      const lines = r.lines.map((l) => {
        // traducción: línea española cuyo inicio esté más cerca
        const es = esLines.length ? esLines.reduce((best, x) => (Math.abs(x.start - l.start) < Math.abs(best.start - l.start) ? x : best), esLines[0]) : undefined;
        return { start: Math.round(l.start * 100) / 100, end: Math.round(l.end * 100) / 100, zh: l.zh, es: es && Math.abs(es.start - l.start) < 1.5 ? es.zh : undefined };
      });
      const doc = { id, title: r.meta.title, channel: r.meta.channel, thumbnail: r.meta.thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, durationSeconds: r.meta.durationSeconds, language: r.language, source: r.source, fetchedAt: new Date().toISOString(), level: 1, lines, reviewed: false };
      writeFileSync(file, JSON.stringify(doc, null, 1));
      console.log("✓", id, r.meta.title, "·", lines.length, "líneas", r.translation ? "· con traducción es" : "");
    } catch (e) {
      console.error("✗", id, (e as Error).message);
    }
  }
  // índice
  const { readdirSync } = await import("node:fs");
  const ids = readdirSync(OUT).filter((f) => f.endsWith(".json") && f !== "index.json");
  const index = ids.map((f) => {
    const d = JSON.parse(readFileSync(path.join(OUT, f), "utf8")) as { id: string; title: string; channel?: string; thumbnail?: string; durationSeconds?: number; level?: number; lines: unknown[]; description?: string; tags?: string[] };
    return { id: d.id, title: d.title, channel: d.channel, thumbnail: d.thumbnail, durationSeconds: d.durationSeconds, level: d.level ?? 1, lines: d.lines.length, description: d.description, tags: d.tags ?? [] };
  });
  writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 1));
  console.log("índice:", index.length, "vídeos");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
