import { NextResponse } from "next/server";
import { fetchTranscript, parseYouTubeId, type TranscriptLang } from "@/lib/videos/transcript";
import { alignTranslation } from "@/lib/videos/align";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/youtube/transcript?url=<url|id>&lang=zh|ja|ko → transcripción en la lengua meta
 * + traducción al español (pista manual o traducción automática de YouTube) alineada por tiempo.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = parseYouTubeId(searchParams.get("url") ?? searchParams.get("id") ?? "");
  if (!id) return NextResponse.json({ error: "URL o id de YouTube inválido" }, { status: 400 });
  const langParam = searchParams.get("lang");
  const lang: TranscriptLang = langParam === "ja" || langParam === "ko" ? langParam : "zh";
  try {
    const r = await fetchTranscript(id, lang);
    const lines = alignTranslation(
      r.lines.map((l) => ({ start: l.start, end: l.end, zh: l.zh })),
      r.translation?.lines ?? [],
    );
    return NextResponse.json({ id, title: r.meta.title, channel: r.meta.channel, thumbnail: r.meta.thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, durationSeconds: r.meta.durationSeconds, language: r.language, auto: r.auto, source: r.source, translation: r.translation?.lang, availableLanguages: r.availableLanguages, lines });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
