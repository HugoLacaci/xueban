/**
 * Obtención de transcripciones de YouTube (solo servidor).
 * 1) yt-dlp (gratis; binario en PATH, en .cache/bin/yt-dlp.exe o en XUEBAN_YTDLP) — el más fiable.
 * 2) youtubei.js (sin binario) como respaldo.
 * Prefiere subtítulos manuales en chino; si no hay, subtítulos automáticos SOLO si el vídeo es en chino.
 * Convierte tradicional → simplificado.
 */
import { execFile } from "node:child_process";
import { promises as fs, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import * as OpenCC from "opencc-js";

const execFileP = promisify(execFile);
const toSimp = OpenCC.Converter({ from: "tw", to: "cn" });

export interface TranscriptLine {
  start: number;
  end: number;
  zh: string;
}

export interface VideoMeta {
  id: string;
  title: string;
  channel?: string;
  thumbnail?: string;
  durationSeconds?: number;
}

export interface TranscriptResult {
  meta: VideoMeta;
  lines: TranscriptLine[];
  language: string;
  auto: boolean; // subtítulos automáticos
  source: "youtubei" | "yt-dlp";
  translation?: { lang: string; lines: TranscriptLine[] };
  availableLanguages: string[];
}

export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  } catch {
    /* no es URL */
  }
  return null;
}

export function findYtDlp(): string {
  const env = process.env.XUEBAN_YTDLP;
  if (env && existsSync(env)) return env;
  const local = path.join(process.cwd(), ".cache", "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
  if (existsSync(local)) return local;
  return "yt-dlp"; // confiar en PATH
}

export async function fetchTranscript(id: string): Promise<TranscriptResult> {
  const errors: string[] = [];
  try {
    return await viaYtDlp(id);
  } catch (e) {
    errors.push(`yt-dlp: ${(e as Error).message.split("\n")[0]}`);
  }
  try {
    return await viaYoutubei(id);
  } catch (e) {
    errors.push(`youtubei: ${(e as Error).message}`);
  }
  throw new Error(`No se pudo obtener la transcripción (${errors.join(" · ")}). Instala yt-dlp (winget install yt-dlp.yt-dlp) o comprueba que el vídeo tiene subtítulos en chino.`);
}

interface YtDlpInfo {
  id: string;
  title: string;
  uploader?: string;
  channel?: string;
  thumbnail?: string;
  duration?: number;
  language?: string | null;
  subtitles?: Record<string, { ext: string; url: string }[]>;
  automatic_captions?: Record<string, { ext: string; url: string }[]>;
}

const ZH_KEYS = (keys: string[]) => keys.filter((k) => /^zh/i.test(k) && !/-orig$/.test(k));

async function viaYtDlp(id: string): Promise<TranscriptResult> {
  const bin = findYtDlp();
  const url = `https://www.youtube.com/watch?v=${id}`;
  const { stdout } = await execFileP(bin, ["-J", "--skip-download", "--no-warnings", url], { maxBuffer: 50 * 1024 * 1024 });
  const info = JSON.parse(stdout) as YtDlpInfo;
  const manual = Object.keys(info.subtitles ?? {});
  const auto = Object.keys(info.automatic_captions ?? {});
  const manualZh = ZH_KEYS(manual).sort((a, b) => (a.includes("Hans") ? -1 : b.includes("Hans") ? 1 : 0));
  const origZh = auto.find((k) => /^zh.*-orig$/.test(k));
  const videoIsZh = Boolean(origZh) || /^zh/i.test(info.language ?? "");
  const autoZh = videoIsZh ? ZH_KEYS(auto).sort((a, b) => (a.includes("Hans") ? -1 : b.includes("Hans") ? 1 : 0)) : [];
  const chosen = manualZh[0] ?? origZh ?? autoZh[0];
  if (!chosen) throw new Error(manual.length || auto.length ? `el vídeo no tiene subtítulos en chino (manuales: ${manual.join(",") || "ninguno"}; idioma original: ${info.language ?? "?"})` : "el vídeo no tiene subtítulos");
  const isAuto = !manualZh.length;
  const esKey = manual.find((k) => /^es/.test(k)) ?? (videoIsZh ? auto.find((k) => /^es$/.test(k)) : undefined);

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "xb-yt-"));
  try {
    const langs = [chosen, esKey].filter(Boolean).join(",");
    await execFileP(bin, ["--skip-download", "--no-warnings", isAuto || (esKey && !manual.includes(esKey)) ? "--write-auto-subs" : "--write-subs", ...(isAuto ? [] : ["--write-subs"]), "--write-auto-subs", "--sub-langs", langs, "--sub-format", "vtt", "-o", path.join(dir, "%(id)s.%(ext)s"), url], { maxBuffer: 20 * 1024 * 1024 });
    const files = await fs.readdir(dir);
    const zhFile = files.find((f) => f.includes(`.${chosen}.`) && f.endsWith(".vtt")) ?? files.find((f) => /\.zh/.test(f) && f.endsWith(".vtt"));
    if (!zhFile) throw new Error("yt-dlp no descargó el archivo de subtítulos");
    const lines = parseVtt(await fs.readFile(path.join(dir, zhFile), "utf8")).map((l) => ({ ...l, zh: toSimp(l.zh) }));
    const esFile = esKey ? files.find((f) => f.includes(`.${esKey}.`) && f.endsWith(".vtt")) : undefined;
    const translation = esFile ? { lang: esKey!, lines: parseVtt(await fs.readFile(path.join(dir, esFile), "utf8")) } : undefined;
    return {
      meta: { id, title: info.title, channel: info.channel ?? info.uploader, thumbnail: info.thumbnail, durationSeconds: info.duration },
      lines: mergeShortLines(lines),
      language: chosen,
      auto: isAuto,
      source: "yt-dlp",
      translation,
      availableLanguages: [...manual.map((m) => `${m} (manual)`), ...auto.filter((a) => /^(zh|es|en)/.test(a)).map((a) => `${a} (auto)`)],
    };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

const ZH_LANG = /chinese|中文|^zh|汉语|漢語|mandarin|普通话/i;
const ES_LANG = /spanish|español|^es\b/i;

async function viaYoutubei(id: string): Promise<TranscriptResult> {
  const { Innertube, Log } = await import("youtubei.js");
  Log.setLevel(Log.Level.NONE);
  const yt = await Innertube.create();
  const info = await yt.getInfo(id);
  const basic = info.basic_info;
  const meta: VideoMeta = { id, title: basic.title ?? id, channel: basic.author ?? undefined, thumbnail: basic.thumbnail?.[0]?.url, durationSeconds: basic.duration ?? undefined };
  const tinfo = await info.getTranscript();
  const languages: string[] = (tinfo.languages as string[] | undefined) ?? [];
  let chosen = tinfo;
  const zhLang = languages.find((l) => ZH_LANG.test(l));
  if (zhLang && tinfo.selectedLanguage !== zhLang) chosen = await tinfo.selectLanguage(zhLang);
  const segs = chosen.transcript?.content?.body?.initial_segments ?? [];
  const lines: TranscriptLine[] = [];
  for (const s of segs) {
    const seg = s as unknown as { start_ms?: string | number; end_ms?: string | number; snippet?: { text?: string } };
    const text = (seg.snippet?.text ?? "").replace(/\s+/g, " ").trim();
    if (!text || seg.start_ms === undefined) continue;
    lines.push({ start: Number(seg.start_ms) / 1000, end: Number(seg.end_ms ?? seg.start_ms) / 1000, zh: toSimp(text) });
  }
  if (!lines.length) throw new Error("sin subtítulos");
  let translation: TranscriptResult["translation"];
  const esLang = languages.find((l) => ES_LANG.test(l));
  if (esLang) {
    try {
      const t = await tinfo.selectLanguage(esLang);
      const es = (t.transcript?.content?.body?.initial_segments ?? []).map((s) => {
        const seg = s as unknown as { start_ms?: string | number; end_ms?: string | number; snippet?: { text?: string } };
        return { start: Number(seg.start_ms ?? 0) / 1000, end: Number(seg.end_ms ?? 0) / 1000, zh: (seg.snippet?.text ?? "").trim() };
      });
      translation = { lang: esLang, lines: es };
    } catch {
      /* sin traducción */
    }
  }
  return { meta, lines: mergeShortLines(lines), language: chosen.selectedLanguage ?? zhLang ?? "?", auto: false, source: "youtubei", translation, availableLanguages: languages };
}

export function parseVtt(vtt: string): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  const blocks = vtt.replace(/\r/g, "").split(/\n\n+/);
  const ts = (s: string) => {
    const p = s.split(":").map(Number);
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
  };
  for (const b of blocks) {
    const m = b.match(/(\d+:\d+:\d+\.\d+|\d+:\d+\.\d+) --> (\d+:\d+:\d+\.\d+|\d+:\d+\.\d+)/);
    if (!m) continue;
    const text = b
      .split("\n")
      .filter((l) => !l.includes("-->") && !/^\d+$/.test(l) && !l.startsWith("WEBVTT") && !l.startsWith("Kind:") && !l.startsWith("Language:"))
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    const last = lines[lines.length - 1];
    if (last && last.zh === text) {
      last.end = ts(m[2]);
      continue;
    }
    // los auto-subs repiten la línea anterior como primera línea del bloque: quitarla
    const cleaned = last && text.startsWith(last.zh) && text.length > last.zh.length ? text.slice(last.zh.length).trim() : text;
    if (!cleaned) continue;
    lines.push({ start: ts(m[1]), end: ts(m[2]), zh: cleaned });
  }
  return lines;
}

/** Une segmentos muy cortos (auto-subs de YouTube) hasta formar frases legibles. */
export function mergeShortLines(lines: TranscriptLine[], minChars = 6, maxChars = 28): TranscriptLine[] {
  const out: TranscriptLine[] = [];
  for (const l of lines) {
    const last = out[out.length - 1];
    const endsSentence = /[。！？!?]$/.test(last?.zh ?? "");
    if (last && !endsSentence && Array.from(last.zh).length < minChars && Array.from(last.zh + l.zh).length <= maxChars && l.start - last.end < 1.2) {
      last.zh += l.zh;
      last.end = l.end;
    } else out.push({ ...l });
  }
  return out;
}
