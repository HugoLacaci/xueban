/**
 * npm run data:build [-- --lang=zh|ja|ko]
 * Descarga y procesa los datos abiertos de cada idioma a public/data/<lang>/ (caché en .cache/data/).
 * Sin --lang construye los tres.
 */
const arg = process.argv.find((a) => a.startsWith("--lang="))?.slice(7);
const langs = arg ? arg.split(",") : ["zh", "ja", "ko"];

async function run() {
  for (const lang of langs) {
    if (!["zh", "ja", "ko"].includes(lang)) throw new Error(`Idioma desconocido: ${lang}`);
    console.log(`\n=== Datos: ${lang} ===`);
    const mod = (await import(`./data/${lang}.ts`)) as { default: () => Promise<void> };
    await mod.default();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
