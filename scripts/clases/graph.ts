/**
 * Opción A: Microsoft Graph con el flujo de "código de dispositivo".
 *
 * - Cliente público conocido: "Microsoft Graph Command Line Tools" (el mismo que usa
 *   Connect-MgGraph de PowerShell). Se puede cambiar con XUEBAN_GRAPH_CLIENT_ID si
 *   registras una aplicación propia en Microsoft Entra.
 * - Permisos SOLO de lectura: Files.Read.All (+ offline_access, que MSAL añade solo).
 *   La transcripción de Teams (OnlineMeetingTranscript.Read.All, Calendars.Read,
 *   OnlineMeetings.Read) se pide aparte y, si la escuela no la permite, se sigue sin ella.
 * - Los tokens se guardan cifrados con DPAPI (Windows) fuera del repositorio.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { PublicClientApplication, type AccountInfo, type AuthenticationResult, type INetworkModule, type NetworkRequestOptions, type NetworkResponse } from "@azure/msal-node";
import { DataProtectionScope, FilePersistenceWithDataProtection, PersistenceCachePlugin } from "@azure/msal-node-extensions";
import { tokenCachePath } from "./config";

export const GRAPH_CLIENT_ID = process.env.XUEBAN_GRAPH_CLIENT_ID ?? "14d82eec-204b-4c2f-b7e8-296a70dab67e";
export const AUTHORITY = `https://login.microsoftonline.com/${process.env.XUEBAN_GRAPH_TENANT ?? "organizations"}`;
export const SCOPES_FILES = ["Files.Read.All"];
export const SCOPES_TRANSCRIPT = ["Calendars.Read", "OnlineMeetings.Read", "OnlineMeetingTranscript.Read.All"];
const GRAPH = "https://graph.microsoft.com/v1.0";

let pcaPromise: Promise<PublicClientApplication> | undefined;

/**
 * Cliente de red para MSAL con reintentos: mientras espera a que inicies sesión, MSAL consulta
 * cada pocos segundos y, si una conexión se corta (algo habitual en esperas largas), el
 * cliente por defecto aborta todo con "fetch failed". Aquí se reintenta con una conexión nueva.
 */
const retryingNetwork: INetworkModule = {
  async sendGetRequestAsync<T>(url: string, options?: NetworkRequestOptions) {
    return send<T>(url, "GET", options);
  },
  async sendPostRequestAsync<T>(url: string, options?: NetworkRequestOptions) {
    return send<T>(url, "POST", options);
  },
};

async function send<T>(url: string, method: "GET" | "POST", options?: NetworkRequestOptions): Promise<NetworkResponse<T>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, { method, headers: { ...(options?.headers ?? {}), Connection: "close" }, body: options?.body, signal: AbortSignal.timeout(30_000) });
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
      const text = await res.text();
      let body: unknown;
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { error: "invalid_json", error_description: text.slice(0, 200) };
      }
      return { headers, body: body as T, status: res.status };
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function pca(): Promise<PublicClientApplication> {
  pcaPromise ??= (async () => {
    const file = tokenCachePath();
    mkdirSync(path.dirname(file), { recursive: true });
    const persistence = await FilePersistenceWithDataProtection.create(file, DataProtectionScope.CurrentUser);
    return new PublicClientApplication({
      auth: { clientId: GRAPH_CLIENT_ID, authority: AUTHORITY },
      cache: { cachePlugin: new PersistenceCachePlugin(persistence) },
      system: { networkClient: retryingNetwork },
    });
  })();
  return pcaPromise;
}

export class GraphError extends Error {
  constructor(
    message: string,
    public code: "consent" | "admin" | "blocked" | "app" | "noaccess" | "expired" | "notfound" | "nologin" | "network" | "other",
    public raw?: string,
  ) {
    super(message);
  }
}

/** Traduce los errores de inicio de sesión y de Graph a algo comprensible. */
export function explainAuthError(e: unknown): GraphError {
  const raw = e instanceof Error ? `${e.message}` : String(e);
  if (/AADSTS90094|AADSTS900941|AADSTS65001|admin(istrator)? (approval|consent)|need admin/i.test(raw))
    return new GraphError("La escuela no permite que una aplicación externa lea tus archivos sin aprobación de un administrador (error de consentimiento).", "admin", raw);
  if (/AADSTS65004|consent_required|declined/i.test(raw)) return new GraphError("No se aceptó el permiso de lectura en la pantalla de consentimiento.", "consent", raw);
  if (/AADSTS53003|AADSTS530003|AADSTS50105|AADSTS53000|conditional access/i.test(raw))
    return new GraphError("Una política de la escuela (acceso condicional o asignación de usuarios) bloquea esta aplicación.", "blocked", raw);
  if (/AADSTS700016|AADSTS7000112|unauthorized_client/i.test(raw)) return new GraphError("La aplicación cliente no está disponible en el directorio de la escuela.", "app", raw);
  if (/expired_token|code_expired|AADSTS70020|AADSTS70019/i.test(raw)) return new GraphError("El código caducó antes de iniciar sesión. Vuelve a intentarlo.", "expired", raw);
  if (/ENOTFOUND|ECONNRESET|ETIMEDOUT|fetch failed/i.test(raw)) return new GraphError("No hay conexión con Microsoft.", "network", raw);
  return new GraphError(`Error de Microsoft: ${raw.split("\n")[0]}`, "other", raw);
}

async function account(): Promise<AccountInfo | undefined> {
  const accounts = await (await pca()).getTokenCache().getAllAccounts();
  return accounts[0];
}

export async function signedInAs(): Promise<string | undefined> {
  return (await account())?.username;
}

/** Token silencioso (caché DPAPI). Lanza GraphError("nologin") si hace falta iniciar sesión. */
export async function tokenSilent(scopes = SCOPES_FILES): Promise<string> {
  const acc = await account();
  if (!acc) throw new GraphError("No has iniciado sesión con la cuenta de la escuela.", "nologin");
  try {
    const r = await (await pca()).acquireTokenSilent({ account: acc, scopes });
    return r.accessToken;
  } catch (e) {
    const err = explainAuthError(e);
    if (err.code === "other") err.code = "nologin";
    throw err;
  }
}

/** Inicio de sesión interactivo con código de dispositivo (una sola vez; luego se renueva solo). */
export async function loginDeviceCode(scopes = SCOPES_FILES, onCode: (msg: { url: string; code: string }) => void): Promise<AuthenticationResult> {
  try {
    const r = await (await pca()).acquireTokenByDeviceCode({
      scopes,
      deviceCodeCallback: (resp) => onCode({ url: resp.verificationUri, code: resp.userCode }),
    });
    if (!r) throw new Error("Sin respuesta del inicio de sesión");
    return r;
  } catch (e) {
    throw explainAuthError(e);
  }
}

export async function logout(): Promise<void> {
  const app = await pca();
  for (const a of await app.getTokenCache().getAllAccounts()) await app.getTokenCache().removeAccount(a);
}

/* ------------------------------------------------------------------ */
/* Llamadas de solo lectura a Graph                                    */
/* ------------------------------------------------------------------ */

async function graphFetch(url: string, init: RequestInit & { scopes?: string[] } = {}): Promise<Response> {
  const token = await tokenSilent(init.scopes);
  const full = url.startsWith("http") ? url : `${GRAPH}${url}`;
  // Único POST permitido: /search/query (es una consulta, no escribe nada).
  if (init.method && init.method !== "GET" && !full.endsWith("/search/query")) throw new Error(`Graph: solo lectura (${init.method} ${full})`);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(full, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      const wait = Number(res.headers.get("retry-after") ?? 2 ** attempt * 2);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    return res;
  }
}

export async function graphJson<T = Record<string, unknown>>(url: string, init: RequestInit & { scopes?: string[] } = {}): Promise<T> {
  const res = await graphFetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 403) throw new GraphError("Sin permiso para leer ese recurso en Microsoft 365.", "noaccess", text);
    if (res.status === 404) throw new GraphError("El recurso ya no existe (¿grabación caducada o borrada?).", "notfound", text);
    if (res.status === 401) throw new GraphError("La sesión ha caducado. Vuelve a iniciar sesión.", "nologin", text);
    throw new GraphError(`Graph respondió ${res.status}`, "other", text);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export interface RemoteRecording {
  driveId: string;
  itemId: string;
  name: string;
  /** Título de la reunión deducido del nombre del archivo. */
  title: string;
  /** Fecha de la clase (YYYY-MM-DD) y hora de inicio si viene en el nombre. */
  date: string;
  startedAt?: string;
  createdAt: string;
  durationSec?: number;
  size?: number;
  webUrl?: string;
  folder?: string;
  /** Estimación de caducidad (fecha de creación + días de retención). */
  expiresAt: string;
  via: string[];
}

type DriveItem = {
  id: string;
  name: string;
  size?: number;
  createdDateTime?: string;
  webUrl?: string;
  file?: { mimeType?: string };
  video?: { duration?: number };
  parentReference?: { driveId?: string; path?: string; name?: string };
  remoteItem?: DriveItem;
};

const VIDEO_RE = /\.(mp4|m4v|mov|webm|mkv)$/i;
const RECORDING_RE = /(meeting recording|grabaci[oó]n de la reuni[oó]n|recording|grabaci[oó]n|会议录制|录制)/i;

/** Extrae fecha y título de un nombre de grabación de Teams ("Clase de chino-20261014_183012-Grabación de la reunión.mp4"). */
export function parseRecordingName(name: string, createdAt?: string): { title: string; date: string; startedAt?: string } {
  const base = name.replace(VIDEO_RE, "");
  const m = base.match(/^(.*?)[-_ ]*(\d{4})(\d{2})(\d{2})[_ -]?(\d{2})(\d{2})(\d{2})?/);
  if (m) {
    const title = m[1].replace(/[-_ ]+$/, "").trim() || "Clase";
    return { title, date: `${m[2]}-${m[3]}-${m[4]}`, startedAt: `${m[2]}-${m[3]}-${m[4]}T${m[5]}:${m[6]}:${m[7] ?? "00"}` };
  }
  const title = base.replace(/[-_ ]*(meeting recording|grabaci[oó]n de la reuni[oó]n)\s*$/i, "").trim() || "Clase";
  return { title, date: (createdAt ?? new Date().toISOString()).slice(0, 10) };
}

export function looksLikeRecording(item: { name: string; mimeType?: string; folder?: string }): boolean {
  const isVideo = VIDEO_RE.test(item.name) || /^video\//.test(item.mimeType ?? "");
  if (!isVideo) return false;
  return RECORDING_RE.test(item.name) || /recordings|grabaciones/i.test(item.folder ?? "");
}

function toRecording(it: DriveItem, via: string, expiryDays: number): RemoteRecording | undefined {
  const real = it.remoteItem ?? it;
  const driveId = real.parentReference?.driveId ?? it.parentReference?.driveId;
  if (!driveId) return undefined;
  const folder = real.parentReference?.path ?? real.parentReference?.name ?? it.parentReference?.path;
  const name = real.name ?? it.name;
  if (!looksLikeRecording({ name, mimeType: real.file?.mimeType, folder })) return undefined;
  const createdAt = real.createdDateTime ?? it.createdDateTime ?? new Date().toISOString();
  const { title, date, startedAt } = parseRecordingName(name, createdAt);
  const expires = new Date(new Date(createdAt).getTime() + expiryDays * 86400_000).toISOString();
  return {
    driveId,
    itemId: real.id,
    name,
    title,
    date,
    startedAt,
    createdAt,
    durationSec: real.video?.duration ? Math.round(real.video.duration / 1000) : undefined,
    size: real.size ?? it.size,
    webUrl: real.webUrl ?? it.webUrl,
    folder,
    expiresAt: expires,
    via: [via],
  };
}

/** Busca grabaciones de Teams accesibles: búsqueda de Microsoft Search, compartidos conmigo y mi OneDrive. */
export async function findRecordings(opts: { expiryDays: number; log?: (s: string) => void }): Promise<{ recordings: RemoteRecording[]; warnings: string[] }> {
  const found = new Map<string, RemoteRecording>();
  const warnings: string[] = [];
  const add = (r: RemoteRecording | undefined) => {
    if (!r) return;
    const key = `${r.driveId}:${r.itemId}`;
    const prev = found.get(key);
    if (prev) prev.via = [...new Set([...prev.via, ...r.via])];
    else found.set(key, r);
  };

  // 1) Microsoft Search (encuentra también lo del SharePoint del equipo y el OneDrive del profesor).
  for (const q of ['"Meeting Recording"', '"Grabación de la reunión"', "Recording filetype:mp4", "Grabación filetype:mp4"]) {
    try {
      for (let from = 0; from < 500; from += 50) {
        const body = { requests: [{ entityTypes: ["driveItem"], query: { queryString: q }, from, size: 50 }] };
        const r = await graphJson<{ value: { hitsContainers: { hits?: { resource: DriveItem }[]; moreResultsAvailable?: boolean }[] }[] }>("/search/query", {
          method: "POST",
          body: JSON.stringify(body),
        });
        const c = r.value?.[0]?.hitsContainers?.[0];
        for (const h of c?.hits ?? []) add(toRecording(h.resource, "búsqueda", opts.expiryDays));
        if (!c?.moreResultsAvailable) break;
      }
    } catch (e) {
      warnings.push(`Búsqueda «${q}»: ${e instanceof Error ? e.message : e}`);
    }
  }
  // 2) Compartido conmigo.
  try {
    let next: string | undefined = "/me/drive/sharedWithMe?$top=200";
    while (next) {
      const r: { value: DriveItem[]; "@odata.nextLink"?: string } = await graphJson(next);
      for (const it of r.value ?? []) add(toRecording(it, "compartido", opts.expiryDays));
      next = r["@odata.nextLink"];
    }
  } catch (e) {
    warnings.push(`Compartido conmigo: ${e instanceof Error ? e.message : e}`);
  }
  // 3) Mi OneDrive (si yo organicé la reunión, la grabación está en mi carpeta Recordings/Grabaciones).
  for (const folder of ["Recordings", "Grabaciones"]) {
    try {
      const r = await graphJson<{ value: DriveItem[] }>(`/me/drive/root:/${folder}:/children?$top=200`);
      for (const it of r.value ?? []) add(toRecording({ ...it, parentReference: { ...it.parentReference, path: folder } }, "mi OneDrive", opts.expiryDays));
    } catch {
      /* la carpeta no existe: normal */
    }
  }
  // Completar duración/tamaño que la búsqueda no siempre trae.
  for (const r of found.values()) {
    if (r.durationSec && r.size) continue;
    try {
      const it = await graphJson<DriveItem>(`/drives/${r.driveId}/items/${r.itemId}?$select=id,size,video,webUrl`);
      r.durationSec ??= it.video?.duration ? Math.round(it.video.duration / 1000) : undefined;
      r.size ??= it.size;
      r.webUrl ??= it.webUrl;
    } catch (e) {
      if (e instanceof GraphError && e.code === "notfound") warnings.push(`${r.name}: ya no está disponible (¿caducada?)`);
    }
  }
  const recordings = [...found.values()].sort((a, b) => (a.startedAt ?? a.createdAt).localeCompare(b.startedAt ?? b.createdAt));
  return { recordings, warnings };
}

/**
 * URL de descarga temporal (pre-autenticada, caduca en minutos). No se guarda en ningún sitio:
 * se le pasa directamente a ffmpeg para que lea solo el audio.
 * Si el organizador ha bloqueado la descarga, Graph responde 403 y se pasa a la opción B.
 */
export async function downloadUrl(driveId: string, itemId: string): Promise<string> {
  const it = await graphJson<Record<string, unknown>>(`/drives/${driveId}/items/${itemId}?$select=id,@microsoft.graph.downloadUrl`);
  const url = it["@microsoft.graph.downloadUrl"];
  if (typeof url === "string") return url;
  const res = await graphFetch(`/drives/${driveId}/items/${itemId}/content`, { redirect: "manual" });
  const loc = res.headers.get("location");
  if (loc) return loc;
  if (res.status === 403) throw new GraphError("El organizador ha desactivado la descarga de esta grabación.", "noaccess", await res.text());
  throw new GraphError(`No se pudo obtener la URL de descarga (${res.status}).`, "other", await res.text());
}

/** Intenta bajar la transcripción de Teams (.vtt) de la reunión de esa grabación. Devuelve undefined si no se puede. */
export async function tryTeamsTranscript(rec: RemoteRecording, log: (s: string) => void): Promise<string | undefined> {
  let token: string;
  try {
    token = await tokenSilent(SCOPES_TRANSCRIPT);
  } catch {
    return undefined; // la escuela no concede esos permisos; se sigue solo con Whisper
  }
  const h = { Authorization: `Bearer ${token}` };
  const day = rec.date;
  try {
    const start = `${day}T00:00:00Z`;
    const end = `${day}T23:59:59Z`;
    const ev = (await (await fetch(`${GRAPH}/me/calendarView?startDateTime=${start}&endDateTime=${end}&$select=subject,onlineMeeting,start`, { headers: h })).json()) as {
      value?: { subject?: string; onlineMeeting?: { joinUrl?: string } }[];
    };
    const cands = (ev.value ?? []).filter((e) => e.onlineMeeting?.joinUrl);
    for (const e of cands) {
      const join = encodeURIComponent(e.onlineMeeting!.joinUrl!);
      const m = (await (await fetch(`${GRAPH}/me/onlineMeetings?$filter=JoinWebUrl%20eq%20'${join}'`, { headers: h })).json()) as { value?: { id: string }[] };
      const meetingId = m.value?.[0]?.id;
      if (!meetingId) continue;
      const t = (await (await fetch(`${GRAPH}/me/onlineMeetings/${meetingId}/transcripts`, { headers: h })).json()) as { value?: { id: string }[] };
      const tid = t.value?.at(-1)?.id;
      if (!tid) continue;
      const vtt = await fetch(`${GRAPH}/me/onlineMeetings/${meetingId}/transcripts/${tid}/content?$format=text/vtt`, { headers: h });
      if (vtt.ok) return await vtt.text();
    }
  } catch (e) {
    log(`  (sin transcripción de Teams: ${e instanceof Error ? e.message : e})`);
  }
  return undefined;
}
