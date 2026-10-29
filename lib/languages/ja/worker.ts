/// <reference lib="webworker" />
/**
 * Web Worker con kuromoji (IPADIC): la carga del diccionario (≈17 MB) y el análisis morfológico
 * no bloquean la interfaz. Mensajes: {type:"init", dicPath} → {type:"ready"} | {type:"error"};
 * {type:"tokenize", id, texts[]} → {type:"tokens", id, results: KToken[][]}.
 */
import kuromoji from "@sglkc/kuromoji";

export interface KToken {
  s: string; // surface_form
  b: string; // basic_form
  r: string; // reading (katakana)
  p: string; // pos
  d: string; // pos_detail_1
  c: string; // conjugated_type
}

type Tok = { tokenize(t: string): { surface_form: string; basic_form: string; reading?: string; pos: string; pos_detail_1: string; conjugated_type: string }[] };
let tokenizer: Tok | null = null;
const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent) => {
  const msg = e.data as { type: string; dicPath?: string; id?: number; texts?: string[] };
  if (msg.type === "init") {
    kuromoji.builder({ dicPath: msg.dicPath! }).build((err: Error | null, t: unknown) => {
      if (err) ctx.postMessage({ type: "error", error: String(err) });
      else {
        tokenizer = t as Tok;
        ctx.postMessage({ type: "ready" });
      }
    });
  } else if (msg.type === "tokenize" && tokenizer) {
    const results = (msg.texts ?? []).map((text) =>
      tokenizer!.tokenize(text).map((k) => ({ s: k.surface_form, b: k.basic_form === "*" ? k.surface_form : k.basic_form, r: k.reading && k.reading !== "*" ? k.reading : "", p: k.pos, d: k.pos_detail_1, c: k.conjugated_type })),
    );
    ctx.postMessage({ type: "tokens", id: msg.id, results });
  }
};
