/**
 * npm run glyphs:normalize [-- --force]
 * Normaliza los SVG de Wikimedia Commons descargados por `npm run glyphs:fetch` para que todos los glifos se vean
 * del mismo tamaño visual:
 *   1. Limpia el SVG (prólogo XML, DOCTYPE, comentarios, metadatos de Inkscape/RDF).
 *   2. Lo rasteriza en Chromium (Playwright) y mide el bounding box REAL de la tinta (píxeles con alfa), lo que
 *      funciona igual con transformaciones, clipPath, patrones o marcadores (los SVG de Commons traen de todo).
 *   3. Reescribe el viewBox como un cuadrado centrado en ese bounding box, con un margen uniforme del 10 %, y lo
 *      encaja en 0 0 100 100 con un <g transform> (el resultado siempre declara viewBox="0 0 100 100").
 *   4. Sustituye los colores de relleno/trazo por currentColor (el modo oscuro hereda el color del texto; la app
 *      además lo usa como máscara CSS, así que no hace falta `invert`).
 * Entrada:  public/data/zh/glyphs/<char>/<stage>.svg   (originales, no se tocan)
 * Salida:   public/data/zh/glyphs/<char>/<stage>.n.svg (normalizados) + campo `normalized` en index.json
 * Caché:    .cache/glyphs-normalized.json (hash del original → bbox); sin --force solo procesa lo que cambió.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "public", "data", "zh", "glyphs");
const CACHE = path.join(ROOT, ".cache", "glyphs-normalized.json");
const MARGIN = 0.1; // 10 % a cada lado
const RASTER = 400; // px del lienzo de medida
const force = process.argv.includes("--force");

type BBox = { x: number; y: number; w: number; h: number; vb: [number, number, number, number] };
const cache: Record<string, BBox> = existsSync(CACHE)
  ? JSON.parse(readFileSync(CACHE, "utf8"))
  : {};

/** Quita lo que no es dibujo y devuelve el SVG con viewBox explícito. */
export function cleanSvg(raw: string): { svg: string; vb: [number, number, number, number] } {
  let s = raw
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!DOCTYPE[^>]*(\[[\s\S]*?\])?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<metadata[\s\S]*?<\/metadata>/g, "")
    .replace(/<sodipodi:namedview[\s\S]*?(\/>|<\/sodipodi:namedview>)/g, "")
    .trim();
  const open = s.match(/<svg\b[^>]*>/)?.[0] ?? "";
  const num = (re: RegExp) => Number.parseFloat(open.match(re)?.[1] ?? "");
  let vb = open
    .match(/viewBox="([^"]+)"/)?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number) as [number, number, number, number] | undefined;
  if (!vb || vb.length !== 4 || vb.some((n) => !Number.isFinite(n))) {
    const w = num(/\bwidth="([\d.]+)/) || 300;
    const h = num(/\bheight="([\d.]+)/) || 300;
    vb = [0, 0, w, h];
  }
  // raíz limpia: solo xmlns y el viewBox original (el tamaño lo decide quien lo muestra)
  const xmlns = Array.from(open.matchAll(/\sxmlns(:\w+)?="[^"]*"/g))
    .map((m) => m[0])
    .join("");
  s = s.replace(
    open,
    `<svg${xmlns.includes('xmlns="') ? xmlns : ` xmlns="http://www.w3.org/2000/svg"${xmlns}`} viewBox="${vb.join(" ")}">`,
  );
  return { svg: s, vb };
}

/** Colores fijos → currentColor (los blancos y «none» se respetan). */
export function recolor(svg: string): string {
  const dark = /^(#0{3}|#0{6}|black|#00f|#0000ff|#bababa|#000000ff)$/i;
  return svg
    .replace(/(fill|stroke)="([^"]+)"/g, (m, k: string, v: string) =>
      dark.test(v.trim()) ? `${k}="currentColor"` : m,
    )
    .replace(/(fill|stroke):\s*([^;"}]+)/g, (m, k: string, v: string) =>
      dark.test(v.trim()) ? `${k}:currentColor` : m,
    );
}

/** Construye el SVG final 0 0 100 100 a partir del original limpio y su bbox de tinta (en unidades del viewBox). */
export function buildNormalized(
  clean: string,
  bb: { x: number; y: number; w: number; h: number },
): string {
  const side = Math.max(bb.w, bb.h) / (1 - 2 * MARGIN);
  const cx = bb.x + bb.w / 2;
  const cy = bb.y + bb.h / 2;
  const k = 100 / side;
  const tx = 50 - cx * k;
  const ty = 50 - cy * k;
  const inner = clean.replace(/^<svg\b[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" fill="currentColor"><g transform="translate(${r(tx)} ${r(ty)}) scale(${r(k)})">${recolor(inner)}</g></svg>\n`;
}

async function main() {
  const indexPath = path.join(DIR, "index.json");
  if (!existsSync(indexPath)) {
    console.log("No hay index.json: ejecuta antes npm run glyphs:fetch");
    return;
  }
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    chars: Record<string, { stages: string[]; normalized?: string[] }>;
  };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: RASTER, height: RASTER } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><canvas id="c" width="${RASTER}" height="${RASTER}"></canvas></body></html>`,
  );
  let done = 0;
  let skipped = 0;
  const warnings: string[] = [];
  for (const ch of Object.keys(index.chars)) {
    const dir = path.join(DIR, ch);
    if (!existsSync(dir)) continue;
    const normalized: string[] = [];
    for (const f of readdirSync(dir).filter((x) => /^[a-z]+\.svg$/.test(x))) {
      const stage = f.replace(/\.svg$/, "");
      const raw = readFileSync(path.join(dir, f), "utf8");
      const hash = createHash("sha1").update(raw).digest("hex");
      const out = path.join(dir, `${stage}.n.svg`);
      const { svg, vb } = cleanSvg(raw);
      let bb = cache[hash];
      if (!bb || force || !existsSync(out)) {
        // rasterizar en negro y medir la tinta
        const measured = await page.evaluate(
          async ({ markup, size }) => {
            const blob = new Blob([markup], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            await new Promise<void>((res, rej) => {
              img.onload = () => res();
              img.onerror = () => rej(new Error("svg no cargable"));
              img.src = url;
            });
            const c = document.getElementById("c") as HTMLCanvasElement;
            const ctx = c.getContext("2d")!;
            ctx.clearRect(0, 0, size, size);
            ctx.drawImage(img, 0, 0, size, size);
            URL.revokeObjectURL(url);
            const data = ctx.getImageData(0, 0, size, size).data;
            let x0 = size,
              y0 = size,
              x1 = -1,
              y1 = -1;
            for (let y = 0; y < size; y++)
              for (let x = 0; x < size; x++)
                if (data[(y * size + x) * 4 + 3] > 24) {
                  if (x < x0) x0 = x;
                  if (x > x1) x1 = x;
                  if (y < y0) y0 = y;
                  if (y > y1) y1 = y;
                }
            return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
          },
          // el SVG se mide con su viewBox original estirado al lienzo cuadrado (preserveAspectRatio none)
          {
            markup: svg.replace(
              /^<svg\b/,
              `<svg width="${RASTER}" height="${RASTER}" preserveAspectRatio="none"`,
            ),
            size: RASTER,
          },
        );
        if (!measured) {
          warnings.push(`${ch}/${stage}: sin tinta visible`);
          continue;
        }
        const sx = vb[2] / RASTER;
        const sy = vb[3] / RASTER;
        bb = {
          x: vb[0] + measured.x0 * sx,
          y: vb[1] + measured.y0 * sy,
          w: (measured.x1 - measured.x0) * sx,
          h: (measured.y1 - measured.y0) * sy,
          vb,
        };
        if (measured.x1 - measured.x0 >= RASTER - 1 && measured.y1 - measured.y0 >= RASTER - 1)
          warnings.push(`${ch}/${stage}: la tinta ocupa todo el lienzo (¿fondo?)`);
        cache[hash] = bb;
        writeFileSync(out, buildNormalized(svg, bb));
        done++;
      } else skipped++;
      normalized.push(stage);
    }
    index.chars[ch].normalized = normalized.sort();
  }
  await browser.close();
  writeFileSync(indexPath, JSON.stringify(index, null, 1));
  mkdirSync(path.dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, JSON.stringify(cache));
  console.log(`Glifos normalizados: ${done} nuevos, ${skipped} en caché.`);
  for (const w of warnings) console.warn("  ⚠", w);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename))
  void main();
