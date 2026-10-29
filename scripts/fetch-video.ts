/**
 * Descarga transcripciones de YouTube para la biblioteca de vídeos curados.
 *
 *   npx tsx scripts/fetch-video.ts [--lang=zh|ja|ko] <id|url> [...] [--force]
 *       → public/videos/{lang}/<id>.json (subtítulos en la lengua meta + traducción española si existe)
 *         y regenera public/videos/{lang}/index.json (conserva level/description/tags ya editados).
 *   npx tsx scripts/fetch-video.ts [--lang=…] --search "consulta"  → candidatos (id, título, canal, duración, idiomas de subtítulos)
 *   npx tsx scripts/fetch-video.ts [--lang=…] --check <id>         → solo comprueba los subtítulos disponibles
 *
 * --lang (por defecto zh):
 *   zh → subtítulos chinos (manuales o automáticos si el audio es chino), convertidos a simplificado.
 *   ja → subtítulos manuales `ja`; si no hay, automáticos (se marca `auto: true`).
 *   ko → subtítulos manuales `ko`; si no hay, automáticos (se marca `auto: true`).
 * Español: pista manual `es` o la traducción automática de YouTube (tlang=es). Si YouTube la limita
 * (HTTP 429) el vídeo se guarda igualmente con `es: ""` y se puede reintentar con --force.
 * El texto en la lengua meta va siempre en el campo `zh` de cada línea (nombre histórico).
 *
 * Ejemplo: npm run videos:fetch -- --lang=ja 8FhnCK0q-3k
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { alignTranslation, fetchTranscript, parseYouTubeId, type TranscriptLang } from "../lib/videos/transcript";

const ROOT = path.resolve(import.meta.dirname, "..");
const LANGS: TranscriptLang[] = ["zh", "ja", "ko"];

function parseLang(args: string[]): TranscriptLang {
  const a = args.find((x) => x.startsWith("--lang"));
  if (!a) return "zh";
  const v = a.includes("=") ? a.split("=")[1] : args[args.indexOf(a) + 1];
  if (!LANGS.includes(v as TranscriptLang)) throw new Error(`--lang debe ser zh, ja o ko (recibido: ${v})`);
  return v as TranscriptLang;
}

// Algunas pistas "es" son bilingües (texto original + español): quitar la parte en la lengua meta.
const CJK_HEAD = /^[\sᄀ-ᇿ　-〿぀-ヿ㄰-㆏㐀-鿿가-힯＀-￯!?.,…~-]+/;
function cleanEs(es: string, target: string): string {
  let s = es;
  if (target && s.includes(target)) s = s.split(target).join(" ");
  if (CJK_HEAD.test(s) && /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-鿿가-힯]/.test(s.match(CJK_HEAD)![0])) s = s.replace(CJK_HEAD, "");
  return s.replace(/\s+/g, " ").trim();
}

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
  const raw = process.argv.slice(2);
  const lang = parseLang(raw);
  // quitar --lang y su valor (si se pasó como "--lang ja")
  const args = raw.filter((x, i) => !x.startsWith("--lang") && !(raw[i - 1] === "--lang"));
  const OUT = path.join(ROOT, "public", "videos", lang);
  mkdirSync(OUT, { recursive: true });

  if (args[0] === "--search") return search(args.slice(1).join(" "));
  if (args[0] === "--check") {
    const id = parseYouTubeId(args[1]);
    if (!id) throw new Error("id inválido");
    const r = await fetchTranscript(id, lang);
    console.log(r.meta.title, "·", r.lines.length, "líneas ·", r.language, r.auto ? "(auto)" : "(manual)", "· es:", r.translation?.lang ?? "no", "· idiomas:", r.availableLanguages.join(", "));
    return;
  }
  for (const a of args) {
    if (a.startsWith("--")) continue;
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
    // conservar metadatos editados a mano al regenerar con --force
    const prev = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as { level?: number; description?: string; tags?: string[] }) : {};
    try {
      const r = await fetchTranscript(id, lang);
      const esLines = r.translation?.lines ?? [];
      let lines;
      if (lang === "zh") {
        lines = r.lines.map((l) => {
          // traducción: línea española cuyo inicio esté más cerca
          const es = esLines.length ? esLines.reduce((best, x) => (Math.abs(x.start - l.start) < Math.abs(best.start - l.start) ? x : best), esLines[0]) : undefined;
          return { start: Math.round(l.start * 100) / 100, end: Math.round(l.end * 100) / 100, zh: l.zh, es: es && Math.abs(es.start - l.start) < 1.5 ? es.zh : undefined };
        });
      } else {
        // ja/ko: la traducción automática suele venir segmentada de otra forma → alinear por solapamiento
        const es = alignTranslation(r.lines, esLines);
        lines = r.lines.map((l, i) => ({ start: Math.round(l.start * 100) / 100, end: Math.round(l.end * 100) / 100, zh: l.zh, es: cleanEs(es[i] ?? "", l.zh) }));
        // un "¿"/"¡" huérfano al final de una línea pertenece a la siguiente
        for (let i = 0; i < lines.length - 1; i++) {
          const m = lines[i].es.match(/\s*([¿¡])$/);
          if (m && lines[i + 1].es) {
            lines[i].es = lines[i].es.slice(0, -m[0].length).trim();
            lines[i + 1].es = m[1] + lines[i + 1].es;
          }
        }
      }
      const doc = {
        id,
        title: r.meta.title,
        channel: r.meta.channel,
        thumbnail: r.meta.thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        durationSeconds: r.meta.durationSeconds,
        language: r.language,
        source: r.source,
        fetchedAt: new Date().toISOString(),
        level: prev.level ?? 1,
        lines,
        reviewed: false,
        ...(lang !== "zh" && r.auto ? { auto: true } : {}),
        ...(prev.description ? { description: prev.description } : {}),
        ...(prev.tags ? { tags: prev.tags } : {}),
      };
      writeFileSync(file, JSON.stringify(doc, null, 1));
      console.log("✓", id, r.meta.title, "·", lines.length, "líneas", r.auto ? "(auto)" : "(manual)", r.translation ? `· con traducción ${r.translation.lang}` : "· sin traducción es");
    } catch (e) {
      console.error("✗", id, (e as Error).message);
    }
  }
  // índice
  const ids = readdirSync(OUT).filter((f) => f.endsWith(".json") && f !== "index.json");
  const index = ids.map((f) => {
    const d = JSON.parse(readFileSync(path.join(OUT, f), "utf8")) as { id: string; title: string; channel?: string; thumbnail?: string; durationSeconds?: number; level?: number; lines: unknown[]; description?: string; tags?: string[] };
    return { id: d.id, title: d.title, channel: d.channel, thumbnail: d.thumbnail, durationSeconds: d.durationSeconds, level: d.level ?? 1, lines: d.lines.length, description: d.description, tags: d.tags ?? [] };
  });
  writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 1));
  console.log(`índice (${lang}):`, index.length, "vídeos");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
