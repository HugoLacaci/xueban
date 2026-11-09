/**
 * npm run clases:conectar                 → inicia sesión (código de dispositivo) y lista las grabaciones
 * npm run clases:conectar -- --transcripciones  → pide además permiso para las transcripciones de Teams
 * npm run clases:conectar -- --salir      → borra la sesión guardada
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirs, CADUCIDAD_DIAS } from "./config";
import { findRecordings, GRAPH_CLIENT_ID, loginDeviceCode, logout, SCOPES_FILES, SCOPES_TRANSCRIPT, signedInAs, tokenSilent, GraphError } from "./graph";
import { printRecordings } from "./listado";
import { leerRegistro } from "./registro";

const args = new Set(process.argv.slice(2));

async function main() {
  if (args.has("--salir")) {
    await logout();
    console.log("Sesión de Microsoft borrada de este PC.");
    return;
  }
  const scopes = args.has("--transcripciones") ? SCOPES_TRANSCRIPT : SCOPES_FILES;
  let user = await signedInAs();
  let needLogin = !user;
  if (user) {
    try {
      await tokenSilent(scopes);
    } catch {
      needLogin = true;
    }
  }
  if (needLogin) {
    console.log(`Iniciando sesión con Microsoft (cliente ${GRAPH_CLIENT_ID}, solo lectura: ${scopes.join(", ")})…\n`);
    const r = await loginDeviceCode(scopes, ({ url, code }) => {
      console.log("┌──────────────────────────────────────────────────────────┐");
      console.log(`│  1. Abre  ${url.padEnd(47)}│`);
      console.log(`│  2. Escribe el código:  ${code.padEnd(33)}│`);
      console.log("│  3. Entra con tu cuenta de la escuela y acepta.          │");
      console.log("└──────────────────────────────────────────────────────────┘");
      console.log("(Esperando… el código caduca en 15 minutos)\n");
      writeEstado({ estado: "esperando-codigo", url, code });
    });
    user = r.account?.username;
    console.log(`✔ Sesión iniciada como ${user}. El token queda cifrado (DPAPI) en este PC.\n`);
  } else {
    console.log(`✔ Ya hay sesión: ${user}\n`);
  }
  if (args.has("--transcripciones")) {
    console.log("✔ Permiso para transcripciones de Teams concedido.");
  }
  const { recordings, warnings } = await findRecordings({ expiryDays: CADUCIDAD_DIAS });
  const reg = leerRegistro();
  printRecordings(recordings, reg);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  writeEstado({ estado: "conectado", metodo: "graph", usuario: user, grabaciones: recordings.length });
}

function writeEstado(e: Record<string, unknown>) {
  const d = dirs();
  mkdirSync(d.root, { recursive: true });
  writeFileSync(`${d.root}/estado.json`, JSON.stringify({ ...e, actualizado: new Date().toISOString() }, null, 2));
}

main().catch((e) => {
  if (e instanceof GraphError) {
    console.error(`\n✖ ${e.message}`);
    if (e.code === "admin" || e.code === "blocked" || e.code === "app") {
      console.error("  → No se puede usar Microsoft Graph con esta cuenta. Pasa a la opción B: npm run clases:navegador");
    }
    if (process.env.DEBUG) console.error(e.raw);
    writeEstado({ estado: "error", metodo: "graph", error: e.message, codigo: e.code });
  } else console.error(e);
  process.exit(1);
});
