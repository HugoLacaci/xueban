// Copia el wasm de sql.js a public/ para exportar .apkg sin red.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
try {
  if (!existsSync("public")) mkdirSync("public");
  copyFileSync("node_modules/sql.js/dist/sql-wasm.wasm", "public/sql-wasm.wasm");
} catch (e) {
  console.warn("postinstall: no se pudo copiar sql-wasm.wasm", e.message);
}
