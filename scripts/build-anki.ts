/**
 * npm run anki:build -- --lang=ja|ko [--out=ruta.apkg]
 *
 * Genera el mazo .apkg de un idioma con EXACTAMENTE el mismo tipo de nota, mapeo de campos, etiquetas,
 * subdecks y WebID que usa la web (lib/languages/<lang>/anki.ts + lib/anki/apkg-core.ts +
 * lib/db/seed-word.ts), para que la sincronización por AnkiConnect empareje las notas por WebID.
 *
 * Salida por defecto: ../<apkgFileName>.apkg  (C:\CHINA\IDIOMA\Japones_N5_Hugo.apkg, Coreano_TOPIK1_Hugo.apkg).
 * El chino (Chino_HSK1_Hugo.apkg) lo genera anki_fuente/build_deck.py: aquí solo se admite con --out
 * explícito y nunca se sobrescribe ese archivo.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";
import type { AnkiModelSpec, Lang, SeedData } from "../lib/languages/types";
import { seedToWord } from "../lib/db/seed-word";
import { buildApkgZip } from "../lib/anki/apkg-core";

const ROOT = path.resolve(import.meta.dirname, "..");

function arg(name: string): string | undefined {
  const pre = `--${name}=`;
  const a = process.argv.slice(2).find((x) => x.startsWith(pre));
  return a?.slice(pre.length);
}

async function loadLang(lang: Lang): Promise<{ spec: AnkiModelSpec; seed: SeedData }> {
  switch (lang) {
    case "ja": {
      const [{ jaAnki }, { SEED }] = await Promise.all([import("../lib/languages/ja/anki"), import("../lib/languages/ja/content")]);
      return { spec: jaAnki, seed: SEED };
    }
    case "ko": {
      const [{ koAnki }, { SEED }] = await Promise.all([import("../lib/languages/ko/anki"), import("../lib/languages/ko/content")]);
      return { spec: koAnki, seed: SEED };
    }
    case "zh": {
      const [{ zhAnki }, { SEED }] = await Promise.all([import("../lib/languages/zh/anki"), import("../lib/languages/zh/content")]);
      return { spec: zhAnki, seed: SEED };
    }
    default:
      throw new Error(`Idioma no soportado: ${lang}`);
  }
}

async function main() {
  const lang = (arg("lang") ?? "") as Lang;
  if (!["ja", "ko", "zh"].includes(lang)) {
    console.error("Uso: npm run anki:build -- --lang=ja|ko [--out=ruta.apkg]");
    process.exit(1);
  }
  const { spec, seed } = await loadLang(lang);
  const outArg = arg("out");
  if (lang === "zh" && !outArg) {
    console.error("El mazo chino oficial lo genera anki_fuente/build_deck.py. Usa --out=otra_ruta.apkg si solo quieres una prueba.");
    process.exit(1);
  }
  const out = path.resolve(outArg ?? path.join(ROOT, "..", `${spec.apkgFileName}.apkg`));
  if (path.basename(out).toLowerCase() === "chino_hsk1_hugo.apkg") {
    console.error("No se sobrescribe Chino_HSK1_Hugo.apkg.");
    process.exit(1);
  }

  const now = Date.now();
  const words = seed.words.map((w) => seedToWord({ ...w, lang }, lang, seed.levelTag, now));
  const categoryNames: string[] = [];
  for (const w of seed.words) if (!categoryNames.includes(w.category)) categoryNames.push(w.category);

  const SQL = await initSqlJs();
  const zip = buildApkgZip(SQL, words, { spec, categoryNames }, now);
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  writeFileSync(out, buf);

  const cards = words.reduce((n, w) => n + spec.cardOrds(w).length, 0);
  const decks = new Set(words.map((w) => spec.deckFor(w, categoryNames)));
  console.log(`✓ ${out}`);
  console.log(`  Tipo de nota: ${spec.modelName} (id ${spec.modelId}, ${spec.fields.length} campos, ${spec.templates.length} plantillas)`);
  console.log(`  ${words.length} notas · ${cards} tarjetas · ${decks.size} subdecks bajo «${spec.deckRoot}» · ${(buf.length / 1024).toFixed(0)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
