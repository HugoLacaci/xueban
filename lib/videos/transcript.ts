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

export type TranscriptLang = "zh" | "ja" | "ko";

export async function fetchTranscript(id: string, lang: TranscriptLang = "zh"): Promise<TranscriptResult> {
  const errors: string[] = [];
  try {
    return lang === "zh" ? await viaYtDlp(id) : await viaYtDlpLang(id, lang);
  } catch (e) {
    errors.push(`yt-dlp: ${(e as Error).message.split("\n")[0]}`);
  }
  try {
    return lang === "zh" ? await viaYoutubei(id) : await viaYoutubeiLang(id, lang);
  } catch (e) {
    errors.push(`youtubei: ${(e as Error).message}`);
  }
  if (lang !== "zh") throw new Error(`No se pudo obtener la transcripción (${errors.join(" · ")}). Comprueba que el vídeo tiene subtítulos en ${lang}.`);
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

/**
 * Japonés / coreano: prefiere subtítulos manuales `ja`/`ko`; si no hay, los automáticos
 * (`<lang>-orig`) solo si el audio está en ese idioma (`auto: true`).
 * El español se pide aparte (pista manual `es` o traducción automática de YouTube, tlang=es):
 * si falla (p. ej. 429) se devuelve sin traducción en vez de abortar.
 */
async function viaYtDlpLang(id: string, lang: Exclude<TranscriptLang, "zh">): Promise<TranscriptResult> {
  const bin = findYtDlp();
  const url = `https://www.youtube.com/watch?v=${id}`;
  const { stdout } = await execFileP(bin, ["-J", "--skip-download", "--no-warnings", url], { maxBuffer: 50 * 1024 * 1024 });
  const info = JSON.parse(stdout) as YtDlpInfo;
  const manual = Object.keys(info.subtitles ?? {});
  const auto = Object.keys(info.automatic_captions ?? {});
  const isLang = (k: string) => k === lang || k.startsWith(`${lang}-`);
  const manualT = manual.filter((k) => isLang(k) && !/-orig$/.test(k)).sort((a, b) => (a === lang ? -1 : b === lang ? 1 : 0));
  const origT = auto.find((k) => k === `${lang}-orig`);
  const videoIsLang = Boolean(origT) || isLang(info.language ?? "");
  const chosen = manualT[0] ?? (videoIsLang ? origT ?? auto.find((k) => k === lang) : undefined);
  if (!chosen) throw new Error(manual.length || auto.length ? `el vídeo no tiene subtítulos en ${lang} (manuales: ${manual.join(",") || "ninguno"}; idioma original: ${info.language ?? "?"})` : "el vídeo no tiene subtítulos");
  const isAuto = !manualT.length;
  const esManual = manual.find((k) => /^es/.test(k));
  const esKey = esManual ?? (videoIsLang ? auto.find((k) => k === "es") : undefined);

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "xb-yt-"));
  const dl = (key: string, autoSubs: boolean) =>
    execFileP(bin, ["--skip-download", "--no-warnings", autoSubs ? "--write-auto-subs" : "--write-subs", "--sub-langs", key, "--sub-format", "vtt", "-o", path.join(dir, "%(id)s.%(ext)s"), url], { maxBuffer: 20 * 1024 * 1024 });
  try {
    await dl(chosen, isAuto);
    let files = await fs.readdir(dir);
    const tFile = files.find((f) => f.includes(`.${chosen}.`) && f.endsWith(".vtt"));
    if (!tFile) throw new Error("yt-dlp no descargó el archivo de subtítulos");
    const lines = parseVtt(await fs.readFile(path.join(dir, tFile), "utf8"));
    let translation: TranscriptResult["translation"];
    if (esKey) {
      try {
        await dl(esKey, !esManual);
        files = await fs.readdir(dir);
        const esFile = files.find((f) => f.includes(`.${esKey}.`) && f.endsWith(".vtt"));
        if (esFile) translation = { lang: esManual ? esKey : `${esKey} (auto)`, lines: parseVtt(await fs.readFile(path.join(dir, esFile), "utf8")) };
      } catch {
        /* sin traducción (YouTube suele limitar tlang=es con 429) */
      }
    }
    return {
      meta: { id, title: info.title, channel: info.channel ?? info.uploader, thumbnail: info.thumbnail, durationSeconds: info.duration },
      lines: mergeShortLines(lines, 6, 28, lang === "ko" ? " " : ""),
      language: chosen.replace(/-orig$/, ""),
      auto: isAuto,
      source: "yt-dlp",
      translation,
      availableLanguages: [...manual.map((m) => `${m} (manual)`), ...auto.filter((a) => isLang(a) || /^(es|en)$/.test(a)).map((a) => `${a} (auto)`)],
    };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

const LANG_RE: Record<Exclude<TranscriptLang, "zh">, RegExp> = { ja: /japanese|日本語|^ja\b/i, ko: /korean|한국어|^ko\b/i };

async function viaYoutubeiLang(id: string, lang: Exclude<TranscriptLang, "zh">): Promise<TranscriptResult> {
  const { Innertube, Log } = await import("youtubei.js");
  Log.setLevel(Log.Level.NONE);
  const yt = await Innertube.create();
  const info = await yt.getInfo(id);
  const basic = info.basic_info;
  const meta: VideoMeta = { id, title: basic.title ?? id, channel: basic.author ?? undefined, thumbnail: basic.thumbnail?.[0]?.url, durationSeconds: basic.duration ?? undefined };
  const tinfo = await info.getTranscript();
  const languages: string[] = (tinfo.languages as string[] | undefined) ?? [];
  const tLang = languages.find((l) => LANG_RE[lang].test(l) && !/auto/i.test(l)) ?? languages.find((l) => LANG_RE[lang].test(l));
  if (!tLang) throw new Error(`sin subtítulos en ${lang}`);
  const chosen = tinfo.selectedLanguage === tLang ? tinfo : await tinfo.selectLanguage(tLang);
  const toLines = (t: typeof tinfo): TranscriptLine[] =>
    (t.transcript?.content?.body?.initial_segments ?? []).flatMap((s) => {
      const seg = s as unknown as { start_ms?: string | number; end_ms?: string | number; snippet?: { text?: string } };
      const text = (seg.snippet?.text ?? "").replace(/\s+/g, " ").trim();
      return text && seg.start_ms !== undefined ? [{ start: Number(seg.start_ms) / 1000, end: Number(seg.end_ms ?? seg.start_ms) / 1000, zh: text }] : [];
    });
  const lines = toLines(chosen);
  if (!lines.length) throw new Error("sin subtítulos");
  let translation: TranscriptResult["translation"];
  const esLang = languages.find((l) => ES_LANG.test(l));
  if (esLang) {
    try {
      translation = { lang: esLang, lines: toLines(await tinfo.selectLanguage(esLang)) };
    } catch {
      /* sin traducción */
    }
  }
  return { meta, lines: mergeShortLines(lines, 6, 28, lang === "ko" ? " " : ""), language: lang, auto: /auto/i.test(tLang), source: "youtubei", translation, availableLanguages: languages };
}

/**
 * Alinea una pista de traducción (segmentada de otra forma) con las líneas meta:
 * cada segmento va a la línea con la que más se solapa (o la más cercana, si está a < 2 s) y se concatenan.
 */
export function alignTranslation(lines: { start: number; end: number }[], tr: TranscriptLine[]): string[] {
  const out: string[][] = lines.map(() => []);
  for (const t of tr) {
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const overlap = Math.min(l.end, t.end) - Math.max(l.start, t.start);
      const score = overlap > 0 ? overlap : -Math.min(Math.abs(l.start - t.end), Math.abs(t.start - l.end));
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best >= 0 && bestScore > -2) out[best].push(t.zh);
  }
  return out.map((p) => p.join(" ").replace(/\s+/g, " ").trim());
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
    // solo el texto tras la línea de tiempos (antes puede ir el número de cue; una línea "40" del texto es contenido)
    const rows = b.split("\n");
    const text = rows
      .slice(rows.findIndex((l) => l.includes("-->")) + 1)
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
export function mergeShortLines(lines: TranscriptLine[], minChars = 6, maxChars = 28, joiner = ""): TranscriptLine[] {
  const out: TranscriptLine[] = [];
  for (const l of lines) {
    const last = out[out.length - 1];
    const endsSentence = /[。！？!?]$/.test(last?.zh ?? "");
    if (last && !endsSentence && Array.from(last.zh).length < minChars && Array.from(last.zh + joiner + l.zh).length <= maxChars && l.start - last.end < 1.2) {
      last.zh += joiner + l.zh;
      last.end = l.end;
    } else out.push({ ...l });
  }
  return out;
}
