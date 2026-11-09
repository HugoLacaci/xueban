"use client";
/**
 * Ajustes → Clases (solo chino): espacio que ocupan los recortes de audio de las clases en IndexedDB, borrado de los
 * recortes de clases antiguas y estado de la conexión local con Teams (estado.json, leído por la ruta de desarrollo).
 */
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { FileAudio, PlugZap, Trash2 } from "lucide-react";
import Link from "@/lib/languages/link";
import { db } from "@/lib/db";
import { BASE_PATH } from "@/lib/base-path";
import { classClipStats, deleteOldClassClips } from "@/lib/classes/import";
import { formatBytes } from "@/lib/classes/search";
import { todayKey } from "@/lib/utils-date";
import { Button } from "@/components/ui/button";
import { Badge, Select } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

const DEV_API = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_STATIC_EXPORT !== "1";

interface Estado {
  estado?: string;
  metodo?: string;
  error?: string;
  actualizado?: string;
}

export function ClassSettingsPanel() {
  const stats = useLiveQuery(async () => {
    const s = await classClipStats();
    const classes = await db.notes.where("[lang+kind]").equals(["zh", "class"]).count();
    return { ...s, classes };
  }, []);
  const [days, setDays] = useState("90");
  const [estado, setEstado] = useState<Estado | null | "off">(DEV_API ? null : "off");

  useEffect(() => {
    if (!DEV_API) return;
    fetch(`${BASE_PATH}/api/clases`, { cache: "no-store" })
      .then(async (r) => (r.ok ? ((await r.json()) as { estado: Estado | null }).estado ?? "off" : "off"))
      .then(setEstado)
      .catch(() => setEstado("off"));
  }, []);

  const purge = async () => {
    const before = todayKey(new Date(Date.now() - Number(days) * 86400000));
    if (!window.confirm(`¿Borrar los recortes de audio de las clases anteriores al ${before.split("-").reverse().join("/")}? Los apuntes, palabras y ejercicios se conservan; solo desaparece el botón «escuchar al profesor».`)) return;
    const n = await deleteOldClassClips(before);
    toast.success(n ? `${n} recortes borrados` : "No había recortes tan antiguos");
  };

  const ok = estado && estado !== "off" && !estado.error && estado.estado !== "error";
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <FileAudio className="size-5 text-ink-faint" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">Recortes de la voz del profesor</p>
          <p className="text-xs text-ink-faint">
            {stats ? `${stats.count} recortes de ${stats.byNote.size} clase${stats.byNote.size === 1 ? "" : "s"} · ${formatBytes(stats.bytes)} en este navegador (IndexedDB)` : "Calculando…"}
            {stats ? ` · ${stats.classes} clases en total` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          Clases de hace más de
          <Select value={days} onChange={(e) => setDays(e.target.value)} className="w-auto" aria-label="Antigüedad">
            <option value="30">1 mes</option>
            <option value="90">3 meses</option>
            <option value="180">6 meses</option>
            <option value="365">1 año</option>
          </Select>
        </label>
        <Button size="sm" variant="secondary" className="text-danger hover:text-danger" onClick={() => void purge()} disabled={!stats?.count}>
          <Trash2 /> Borrar recortes de clases antiguas
        </Button>
      </div>
      <p className="text-xs text-ink-faint">Los recortes son privados: solo se guardan en este navegador (el audio no entra en las copias de seguridad JSON).</p>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <PlugZap className="size-4 text-ink-faint" />
        <span className="text-ink">Conexión con las clases del PC:</span>
        {estado === null ? (
          <span className="text-ink-faint">comprobando…</span>
        ) : estado === "off" ? (
          <Badge variant="muted">sin conexión local</Badge>
        ) : (
          <>
            <Badge variant={ok ? "jade" : "lacquer"}>{estado.estado ?? "desconocido"}</Badge>
            {estado.metodo ? <span className="text-xs text-ink-faint">método: {estado.metodo}</span> : null}
            {estado.actualizado ? <span className="text-xs text-ink-faint">· {new Date(estado.actualizado).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span> : null}
            {estado.error ? <p className="w-full text-xs text-danger">{estado.error}</p> : null}
          </>
        )}
        <Link href="/apuntes/clases/importar" className="ml-auto text-xs text-indigo hover:underline">
          Importar clases
        </Link>
      </div>
    </div>
  );
}
