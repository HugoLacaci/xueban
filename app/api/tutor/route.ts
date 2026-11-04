/**
 * Proxy local del tutor IA (solo en el servidor de desarrollo / Node; en la exportación estática no existe y el
 * navegador llama directamente al proveedor). Reenvía la petición al proveedor con las cabeceras que manda el cliente
 * (la clave viene del navegador y no se guarda aquí). Evita el CORS de Ollama/Groq.
 */
import { NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: Request) {
  const tags = new URL(req.url).searchParams.get("tags");
  if (!tags) return NextResponse.json({ error: "uso: ?tags=http://localhost:11434" }, { status: 400 });
  try {
    const r = await fetch(`${tags.replace(/\/+$/, "")}/api/tags`);
    return NextResponse.json(await r.json(), { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const { url, headers, body } = (await req.json()) as { url: string; headers?: Record<string, string>; body: unknown };
  if (!/^https?:\/\//.test(url ?? "")) return NextResponse.json({ error: "URL no permitida" }, { status: 400 });
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...(headers ?? {}) }, body: JSON.stringify(body) });
    const text = await r.text();
    return new NextResponse(text, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "application/json" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
