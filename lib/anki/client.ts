"use client";
/**
 * Cliente AnkiConnect (API versión 6). El navegador habla directamente con
 * http://127.0.0.1:8765 (CORS: añade el origen de la web en webCorsOriginList).
 */
import { create } from "zustand";

export const ANKI_API_VERSION = 6;
export const ANKI_DEFAULT_URL = "http://127.0.0.1:8765";

export class AnkiError extends Error {
  constructor(message: string, public readonly kind: "offline" | "cors" | "api" = "api") {
    super(message);
  }
}

export interface AnkiInvoker {
  <T = unknown>(action: string, params?: Record<string, unknown>): Promise<T>;
}

export function createInvoker(url: string = ANKI_DEFAULT_URL, fetchImpl: typeof fetch = fetch): AnkiInvoker {
  return async function invoke<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, version: ANKI_API_VERSION, params }),
      });
    } catch {
      throw new AnkiError("No se puede conectar con Anki. ¿Está Anki abierto con AnkiConnect instalado?", "offline");
    }
    let json: { result?: T; error?: string | null };
    try {
      json = (await res.json()) as { result?: T; error?: string | null };
    } catch {
      throw new AnkiError("Respuesta inválida de AnkiConnect (¿CORS? añade el origen de la web en webCorsOriginList).", "cors");
    }
    if (json.error) throw new AnkiError(json.error, "api");
    return json.result as T;
  };
}

interface AnkiStatus {
  connected: boolean;
  version?: number;
  error?: string;
  checking: boolean;
  lastCheck: number;
  check: (url?: string) => Promise<boolean>;
}

export const useAnkiStatus = create<AnkiStatus>((set) => ({
  connected: false,
  checking: false,
  lastCheck: 0,
  check: async (url = ANKI_DEFAULT_URL) => {
    set({ checking: true });
    try {
      const invoke = createInvoker(url);
      const version = await Promise.race([
        invoke<number>("version"),
        new Promise<number>((_, rej) => setTimeout(() => rej(new AnkiError("Tiempo de espera agotado", "offline")), 2500)),
      ]);
      set({ connected: true, version, error: undefined, checking: false, lastCheck: Date.now() });
      return true;
    } catch (e) {
      set({ connected: false, error: (e as Error).message, checking: false, lastCheck: Date.now() });
      return false;
    }
  },
}));
