/**
 * npm run glyphs:fetch [-- --chars=人口日 | --hsk1 | --limit N]
 * Descarga de Wikimedia Commons las formas antiguas de cada carácter (oráculo 甲骨文, bronce 金文, sello 篆书,
 * clerical 隶书 y regular 楷书 cuando existen) como SVG, COMPROBANDO LA LICENCIA de cada archivo con la API
 * (extmetadata) y guardando la acreditación. Solo se aceptan licencias libres (dominio público, CC0, CC BY, CC BY-SA).
 * Salida: public/data/zh/glyphs/<char>/<stage>.svg y public/data/zh/glyphs/index.json (créditos por archivo).
 * Fuente de nombres: en Commons, las formas antiguas siguen el patrón «<char>-oracle.svg», «<char>-bronze.svg»,
 * «<char>-seal.svg», «<char>-bigseal.svg», «<char>-clerical.svg», «<char>-kaishu.svg» (proyecto de glifos chinos).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as OpenCC from "opencc-js";
const toTrad = OpenCC.Converter({ from: "cn", to: "tw" });

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "data", "zh", "glyphs");
mkdirSync(OUT, { recursive: true });
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "Xueban/1.0 (https://github.com/HugoLacaci/xueban; educational, contact via GitHub)";
const STAGES: [string, string][] = [
  ["oracle", "oracle"],
  ["bronze", "bronze"],
  ["bigseal", "bigseal"],
  ["seal", "seal"],
  ["clerical", "clerical"],
  ["kaishu", "kaishu"],
];
const FREE = /public domain|cc0|cc-by(?!-nc)|cc by(?!-nc)|attribution(?!.*non-?commercial)/i;

interface Credit {
  file: string;
  url: string;
  license: string;
  licenseUrl?: string;
  author: string;
  stage: string;
}
interface Index {
  generatedAt: string;
  chars: Record<string, { stages: string[]; credits: Credit[] }>;
}

function args(): { chars: string[]; limit: number } {
  const a = process.argv.slice(2);
  const c = a.find((x) => x.startsWith("--chars="))?.slice(8);
  const limit = Number(a.find((x) => x.startsWith("--limit="))?.slice(8) ?? 0);
  let chars: string[] = c ? Array.from(c) : [];
  if (!chars.length) {
    // por defecto: pictogramas + caracteres HSK 1 (semilla)
    const seed = JSON.parse(readFileSync(path.join(ROOT, "content", "zh", "seed", "hsk1_vocab.json"), "utf8")) as { words: { hanzi: string }[] };
    const set = new Set<string>();
    const pict = path.join(ROOT, "content", "zh", "pictograms.json");
    if (existsSync(pict)) for (const p of JSON.parse(readFileSync(pict, "utf8")) as { c: string }[]) set.add(p.c);
    for (const w of seed.words) for (const ch of w.hanzi) if (/[㐀-鿿]/.test(ch)) set.add(ch);
    chars = Array.from(set);
  }
  return { chars: limit ? chars.slice(0, limit) : chars, limit };
}

async function api(params: Record<string, string>): Promise<unknown> {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params })}`;
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

interface ImageInfo {
  title: string;
  missing?: boolean;
  imageinfo?: { url: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[];
}

async function info(char: string): Promise<Map<string, ImageInfo>> {
  // en Commons los glifos antiguos suelen estar bajo la forma tradicional (馬-oracle.svg): se prueban ambas
  const forms = Array.from(new Set([char, toTrad(char)]));
  const titles = forms.flatMap((f) => STAGES.map(([s]) => `File:${f}-${s}.svg`)).join("|");
  const data = (await api({ action: "query", titles, prop: "imageinfo", iiprop: "url|extmetadata", iiextmetadatafilter: "LicenseShortName|License|LicenseUrl|Artist|Attribution|Credit" })) as { query?: { pages?: ImageInfo[] } };
  const m = new Map<string, ImageInfo>();
  for (const p of data.query?.pages ?? []) m.set(p.title, p);
  return m;
}

async function main() {
  const { chars } = args();
  const indexPath = path.join(OUT, "index.json");
  const index: Index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, "utf8")) : { generatedAt: "", chars: {} };
  let files = 0;
  let skippedLicense = 0;
  for (const [i, ch] of chars.entries()) {
    if (index.chars[ch] && !process.argv.includes("--force")) continue;
    try {
      const m = await info(ch);
      const stages: string[] = [];
      const credits: Credit[] = [];
      const forms = Array.from(new Set([ch, toTrad(ch)]));
      for (const [stage] of STAGES) {
        const p = forms.map((f) => m.get(`File:${f}-${stage}.svg`)).find((x) => x && !x.missing && x.imageinfo?.[0]);
        const ii = p?.imageinfo?.[0];
        if (!p || p.missing || !ii) continue;
        const meta = ii.extmetadata ?? {};
        const license = meta.LicenseShortName?.value ?? meta.License?.value ?? "";
        if (!FREE.test(license)) {
          skippedLicense++;
          continue;
        }
        const svg = await fetch(ii.url, { headers: { "user-agent": UA } });
        if (!svg.ok) continue;
        const dir = path.join(OUT, ch);
        mkdirSync(dir, { recursive: true });
        writeFileSync(path.join(dir, `${stage}.svg`), await svg.text());
        stages.push(stage);
        credits.push({ file: p.title, url: ii.descriptionurl, license, licenseUrl: meta.LicenseUrl?.value, author: (meta.Artist?.value ?? meta.Attribution?.value ?? meta.Credit?.value ?? "").replace(/<[^>]+>/g, "").trim(), stage });
        files++;
      }
      index.chars[ch] = { stages, credits };
      if (i % 10 === 0) console.log(`${i + 1}/${chars.length} ${ch}: ${stages.join(", ") || "—"}`);
      await new Promise((r) => setTimeout(r, 250)); // cortesía con la API
    } catch (e) {
      console.error("✗", ch, (e as Error).message);
    }
  }
  index.generatedAt = new Date().toISOString();
  writeFileSync(indexPath, JSON.stringify(index, null, 1));
  console.log(`✓ ${files} SVG descargados · ${skippedLicense} descartados por licencia · índice en ${indexPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
