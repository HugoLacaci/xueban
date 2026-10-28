import { NextResponse } from "next/server";
import { fetchTranscript, parseYouTubeId } from "@/lib/videos/transcript";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/youtube/transcript?url=<url|id> → transcripción china (+ traducción si el vídeo la tiene). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = parseYouTubeId(searchParams.get("url") ?? searchParams.get("id") ?? "");
  if (!id) return NextResponse.json({ error: "URL o id de YouTube inválido" }, { status: 400 });
  try {
    const r = await fetchTranscript(id);
    const esLines = r.translation?.lines ?? [];
    const lines = r.lines.map((l) => {
      const es = esLines.length ? esLines.reduce((best, x) => (Math.abs(x.start - l.start) < Math.abs(best.start - l.start) ? x : best), esLines[0]) : undefined;
      return { start: l.start, end: l.end, zh: l.zh, es: es && Math.abs(es.start - l.start) < 1.5 ? es.zh : undefined };
    });
    return NextResponse.json({ id, title: r.meta.title, channel: r.meta.channel, thumbnail: r.meta.thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, durationSeconds: r.meta.durationSeconds, language: r.language, source: r.source, availableLanguages: r.availableLanguages, lines });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
