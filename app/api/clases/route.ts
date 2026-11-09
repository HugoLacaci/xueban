/**
 * Ruta SOLO DE DESARROLLO (`next dev`): lee la carpeta local de clases (C:\CHINA\IDIOMA\clases o XUEBAN_CLASES_DIR)
 * para que «Apuntes → Clases → Importar» muestre los paquetes encontrados en el PC y descargue sus recortes.
 * En producción responde 404, y en la exportación estática (GitHub Pages) no existe: el workflow borra app/api
 * antes del build. Nada de esto se copia a public/: los recortes pasan del disco a IndexedDB del navegador.
 *
 *   GET /api/clases                       → { dir, paquetes: [...], estado }
 *   GET /api/clases?paquete=<archivo.json> → el paquete (JSON)
 *   GET /api/clases?recorte=<carpeta>/<archivo.opus> → el audio
 *       (carpeta = recortes\<id del paquete>\ si existe; si no, recortes\AAAA-MM-DD\)
 */
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { parseClassPackage } from "@/lib/classes/package-schema";

const PKG_RE = /^[\w.-]+\.json$/;
const CLIP_RE = /^(\d{4}-\d{2}-\d{2}(?:_[\w-]+)?)\/([\w.-]+\.(opus|ogg|m4a|mp3))$/;
const MIME: Record<string, string> = { opus: "audio/ogg; codecs=opus", ogg: "audio/ogg", m4a: "audio/mp4", mp3: "audio/mpeg" };

// Ojo: la ruta se construye en tiempo de ejecución a propósito. Con `path.join(process.cwd(), "..", "clases")`
// Turbopack la analiza, vigila toda la carpeta de clases (audios, transcripciones en curso…) y `next dev` entra en
// un bucle de recompilación y recarga de la página.
function root(): string {
  const fallback = [process.cwd(), "..", "clases"].join(path.sep);
  return path.resolve(process.env.XUEBAN_CLASES_DIR || fallback);
}

const notFound = () => NextResponse.json({ error: "no disponible" }, { status: 404 });

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") return notFound();
  const dir = root();
  const sp = new URL(req.url).searchParams;

  const pkgName = sp.get("paquete");
  if (pkgName !== null) {
    if (!PKG_RE.test(pkgName)) return NextResponse.json({ error: "nombre no válido" }, { status: 400 });
    const f = path.join(dir, "paquetes", pkgName);
    if (!existsSync(f)) return notFound();
    return NextResponse.json(await readJson(f), { headers: { "cache-control": "no-store" } });
  }

  const clip = sp.get("recorte");
  if (clip !== null) {
    const m = clip.match(CLIP_RE);
    if (!m) return NextResponse.json({ error: "nombre no válido" }, { status: 400 });
    const f = path.join(dir, "recortes", m[1], m[2]);
    if (!existsSync(f)) return notFound();
    const buf = await readFile(f);
    return new NextResponse(new Uint8Array(buf), { headers: { "content-type": MIME[m[3]] ?? "application/octet-stream", "cache-control": "no-store" } });
  }

  let estado: unknown = null;
  try {
    estado = await readJson(path.join(dir, "estado.json"));
  } catch {
    estado = null;
  }
  const pdir = path.join(dir, "paquetes");
  const paquetes: { file: string; classDate?: string; title?: string; size: number; mtime: number; valid: boolean; errors?: string[]; clipDir?: string; clips: string[]; sameDay?: number }[] = [];
  if (existsSync(pdir)) {
    for (const name of (await readdir(pdir)).filter((n) => PKG_RE.test(n) && !n.startsWith("_")).sort().reverse()) {
      const f = path.join(pdir, name);
      const st = await stat(f);
      try {
        const r = parseClassPackage(await readJson(f));
        const classDate = r.ok ? r.data.classDate : name.slice(0, 10);
        // recortes\<id del paquete>\ si existe (dos clases el mismo día); si no, recortes\AAAA-MM-DD\
        const own = name.replace(/\.json$/, "");
        const clipDir = existsSync(path.join(dir, "recortes", own)) ? own : classDate;
        const cdir = path.join(dir, "recortes", clipDir);
        const clips = existsSync(cdir) ? (await readdir(cdir)).filter((n) => /\.(opus|ogg|m4a|mp3)$/.test(n)) : [];
        paquetes.push({ file: name, classDate, title: r.ok ? r.data.title : undefined, size: st.size, mtime: st.mtimeMs, valid: r.ok, errors: r.ok ? undefined : r.errors.slice(0, 5), clipDir, clips });
      } catch (e) {
        paquetes.push({ file: name, size: st.size, mtime: st.mtimeMs, valid: false, errors: [(e as Error).message], clips: [] });
      }
    }
  }
  // varias clases el mismo día que comparten carpeta de recortes: los nombres de archivo pueden pisarse
  for (const p of paquetes) p.sameDay = paquetes.filter((q) => q.clipDir && q.clipDir === p.clipDir).length;
  return NextResponse.json({ dir, exists: existsSync(dir), paquetes, estado }, { headers: { "cache-control": "no-store" } });
}
