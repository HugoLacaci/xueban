"use client";
/** Fotos, audios y dibujos de los apuntes guardados como Blob en IndexedDB (tabla assets). */
import { db, uuid, type Asset } from "@/lib/db";
import { getActiveLang } from "@/lib/languages/registry";

export async function saveAsset(input: { kind: Asset["kind"]; blob: Blob; mime: string; name?: string; noteId?: string }): Promise<Asset> {
  const a: Asset = { id: uuid(), lang: getActiveLang(), noteId: input.noteId, kind: input.kind, mime: input.mime, blob: input.blob, name: input.name, createdAt: Date.now() };
  await db.assets.put(a);
  return a;
}

export async function assetUrl(id: string): Promise<string | undefined> {
  const a = await db.assets.get(id);
  return a ? URL.createObjectURL(a.blob) : undefined;
}

export async function attachAsset(id: string, noteId: string): Promise<void> {
  await db.assets.update(id, { noteId });
}

export async function deleteAsset(id: string): Promise<void> {
  await db.assets.delete(id);
}
