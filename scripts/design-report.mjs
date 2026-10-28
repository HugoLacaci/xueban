// Genera design/report.html: galería antes/después (escritorio y móvil, claro y oscuro) a partir de design/screenshots.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("design/screenshots");
const list = (d) => (fs.existsSync(path.join(root, d)) ? fs.readdirSync(path.join(root, d)).filter((f) => f.endsWith(".png")) : []);
const before = list("before");
const after = list("after");
// emparejado por nombre de pantalla: antes usaba la ruta, después un nombre corto
const MAP = { home: "hoy", bienvenida: "onboarding", aprender_gramatica_le: "gramatica-detalle", "aprender_leccion_u01-l3": "leccion", "diccionario_q_学": "diccionario", "flashcards_hsk1-谢谢": "palabra", flashcards_repasar: "repasar", lectura_r01: "lectura-texto", practicar_simulacro: "simulacro", "study-hall_cuaderno": "cuaderno", videos_gnCXffOg7T8: "video" };
const groups = new Map();
for (const f of after) {
  const [name, rest] = f.split("--");
  if (!groups.has(name)) groups.set(name, {});
  groups.get(name)[rest.replace(".png", "")] = `after/${f}`;
}
const beforeOf = (name, mode) => {
  const key = Object.entries(MAP).find(([, v]) => v === name)?.[0] ?? name;
  const f = `${key}--${mode}.png`;
  return before.includes(f) ? `before/${f}` : null;
};
const modes = ["desktop-light", "desktop-dark", "mobile-light", "mobile-dark"];
const order = ["hoy", "onboarding", "aprender", "leccion", "leccion-dialogo", "leccion-fin", "gramatica", "gramatica-detalle", "checkpoint", "flashcards", "repasar", "repasar-respuesta", "palabra", "diccionario", "caracteres", "videos", "video", "lectura", "lectura-texto", "study-hall", "cuaderno", "progreso", "ajustes", "practicar", "simulacro", "como-aprender", "design", "popup"];
const names = [...groups.keys()].sort((a, b) => (order.indexOf(a) === -1 ? 999 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 999 : order.indexOf(b)) || a.localeCompare(b));
let html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Xuébàn · antes / después</title>
<style>body{font-family:system-ui,sans-serif;background:#F5EFE3;color:#1C1A17;margin:0;padding:24px}h1{font-weight:600}h2{margin-top:40px;border-bottom:1px solid #D8CDBA;padding-bottom:6px}
.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin:10px 0 24px}figure{margin:0;background:#FBF7EF;border:1px solid #D8CDBA;border-radius:10px;padding:8px}figcaption{font-size:12px;color:#6A6156;margin-bottom:6px}img{width:100%;height:auto;display:block;border-radius:6px;max-height:70vh;object-fit:cover;object-position:top}
.none{display:grid;place-items:center;height:160px;color:#6A6156;font-size:12px;border:1px dashed #D8CDBA;border-radius:6px}</style>
<h1>学伴 Xuébàn · rediseño «宣纸与墨» — antes / después</h1><p>Capturas en <code>design/screenshots/before</code> y <code>design/screenshots/after</code>. Las pantallas de ejercicio no tenían captura «antes» por estado; se incluyen solo las finales.</p>`;
for (const name of names) {
  const g = groups.get(name);
  html += `<h2>${name}</h2>`;
  for (const mode of modes) {
    const a = g[mode];
    if (!a) continue;
    const b = beforeOf(name, mode);
    html += `<div class="row"><figure><figcaption>antes · ${mode}</figcaption>${b ? `<img loading="lazy" src="${b}">` : `<div class="none">sin captura previa</div>`}</figure><figure><figcaption>después · ${mode}</figcaption><img loading="lazy" src="${a}"></figure></div>`;
  }
}
fs.writeFileSync(path.join(root, "index.html"), html);
console.log("design/screenshots/index.html →", names.length, "pantallas");
