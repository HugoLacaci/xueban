"use client";
/**
 * Exportación .apkg sin Anki (sql.js + JSZip) con el tipo de nota del idioma (pack.anki), y exportación CSV.
 * Formato: collection.anki2 (esquema legado v11) + media. La lógica común (web y Node) está en apkg-core.ts.
 */
import type { Word } from "@/lib/db";
import { activeSpec } from "./sync";
import { withBase } from "@/lib/base-path";
import { buildApkgZip } from "./apkg-core";

export async function buildApkg(words: Word[], ctx = activeSpec()): Promise<Blob> {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({ locateFile: (f: string) => withBase(`/${f}`) });
  return buildApkgZip(SQL, words, ctx).generateAsync({ type: "blob", compression: "DEFLATE" });
}

export async function downloadApkg(words: Word[], ctx = activeSpec()) {
  const blob = await buildApkg(words, ctx);
  triggerDownload(blob, `${ctx.spec.apkgFileName}_${new Date().toISOString().slice(0, 10)}.apkg`);
}

export function buildCsv(words: Word[], ctx = activeSpec()): string {
  const { spec } = ctx;
  const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
  const header = [...spec.fields, "Tags"].join(",");
  const rows = words.map((w) => {
    const f = spec.toFields(w);
    return [...spec.fields.map((k) => esc(f[k] ?? "")), esc(spec.tags(w).join(" "))].join(",");
  });
  return "\ufeff" + [header, ...rows].join("\n");
}

export async function downloadCsv(words: Word[], ctx = activeSpec()) {
  triggerDownload(new Blob([buildCsv(words, ctx)], { type: "text/csv;charset=utf-8" }), `${ctx.spec.apkgFileName}_${new Date().toISOString().slice(0, 10)}.csv`);
}

function triggerDownload(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
