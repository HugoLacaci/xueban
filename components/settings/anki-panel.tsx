"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDownToLine, ArrowUpFromLine, CloudUpload, FileDown, RefreshCw } from "lucide-react";
import { db } from "@/lib/db";
import { useSettings, type Settings } from "@/lib/settings";
import { useAnkiStatus } from "@/lib/anki/client";
import { applySync, ankiWebSync, planSync, pullCardStates, pushWordsToAnki, type SyncPlan } from "@/lib/anki/sync";
import { Button } from "@/components/ui/button";
import { Badge, Dialog, DialogContent, Input, Label, Select, Switch } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

export function AnkiPanel() {
  const { settings, update } = useSettings();
  const anki = useAnkiStatus();
  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [resolution, setResolution] = useState<"auto" | "web" | "anki">("auto");
  const last = useLiveQuery(() => db.syncState.bulkGet(["anki:lastSync", "anki:lastPull", "anki:lastPush"]), []);
  const a = settings.anki;
  const setA = (patch: Partial<Settings["anki"]>) => void update({ anki: { ...a, ...patch } });

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(label);
    try {
      const msg = await fn();
      toast.success(label, msg);
    } catch (e) {
      toast.error(`${label}: error`, (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {!anki.connected ? (
        <div className="card-sunk border-dashed p-4 text-sm">
          <p className="font-medium text-ink">Anki no está conectado.</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-ink-soft">
            <li>Abre Anki en este PC.</li>
            <li>
              Instala AnkiConnect: Herramientas → Complementos → Obtener complementos → código <code className="rounded bg-paper-raised px-1 text-ink">2055492159</code> → reinicia Anki.
            </li>
            <li>
              Herramientas → Complementos → AnkiConnect → Configuración → en <code className="rounded bg-paper-raised px-1 text-ink">webCorsOriginList</code> añade{" "}
              <code className="rounded bg-paper-raised px-1 text-ink">{typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}</code>.
            </li>
            <li>Pulsa «Probar conexión». Más detalles en GUIA_ANKI.md.</li>
          </ol>
          {anki.error ? <p className="mt-2 text-xs text-danger">{anki.error}</p> : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="jade">Conectado · AnkiConnect v{anki.version}</Badge>
          {last?.[0]?.value ? <span className="text-ink-faint">Última sincronización: {formatDate(last[0].value as number, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span> : null}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="a-url" className="mb-1.5 block">
            URL de AnkiConnect
          </Label>
          <Input id="a-url" value={a.url} onChange={(e) => setA({ url: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="a-src" className="mb-1.5 block">
            Fuente de verdad del SRS de vocabulario
          </Label>
          <Select id="a-src" className="w-full" value={a.srsSource} onChange={(e) => setA({ srsSource: e.target.value as "anki" | "web" })}>
            <option value="web">SRS propio de la web (FSRS)</option>
            <option value="anki">Anki (la web no duplica los repasos de esas tarjetas)</option>
          </Select>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[8px] border border-line bg-paper-sunk/40 px-3 py-2 text-sm transition-colors hover:border-ink/30 sm:col-span-2">
          <span className="text-ink">Integración con Anki activada (indicador en la barra superior, envío automático al guardar palabras)</span>
          <Switch checked={a.enabled} onCheckedChange={(v) => setA({ enabled: v })} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="ink"
          disabled={!anki.connected || busy !== null}
          onClick={() =>
            run("Analizar diferencias", async () => {
              const p = await planSync();
              setPlan(p);
              return `${p.newInAnki.length} nuevas en Anki · ${p.newInWeb.length} nuevas en la web · ${p.conflicts.length} conflictos`;
            })
          }
        >
          <RefreshCw /> Sincronizar palabras…
        </Button>
        <Button variant="secondary" disabled={!anki.connected || busy !== null} onClick={() => run("Enviar todo a Anki", async () => { const r = await pushWordsToAnki(await db.words.toArray()); return `${r.created} creadas · ${r.updated} actualizadas${r.errors.length ? ` · ${r.errors.length} errores` : ""}`; })}>
          <ArrowUpFromLine /> Web → Anki (todo)
        </Button>
        <Button variant="secondary" disabled={!anki.connected || busy !== null} onClick={() => run("Leer estado de aprendizaje", async () => `${await pullCardStates()} tarjetas actualizadas desde Anki`)}>
          <ArrowDownToLine /> Leer estado de Anki
        </Button>
        <Button variant="secondary" disabled={!anki.connected || busy !== null} onClick={() => run("Sincronizar con AnkiWeb", async () => { await ankiWebSync(); return "Anki ha sincronizado con AnkiWeb"; })}>
          <CloudUpload /> Sincronizar con AnkiWeb
        </Button>
        <Button variant="outline" disabled={busy !== null} onClick={() => run("Exportar .apkg", async () => { const { downloadApkg } = await import("@/lib/anki/apkg"); await downloadApkg(await db.words.toArray()); return "Paquete .apkg descargado (impórtalo en Anki si no usas AnkiConnect)"; })}>
          <FileDown /> Exportar .apkg
        </Button>
        <Button variant="outline" disabled={busy !== null} onClick={() => run("Exportar CSV", async () => { const { downloadCsv } = await import("@/lib/anki/apkg"); await downloadCsv(await db.words.toArray()); return "CSV descargado"; })}>
          <FileDown /> Exportar CSV
        </Button>
      </div>

      <Dialog open={plan !== null} onOpenChange={(o) => !o && setPlan(null)}>
        <DialogContent title="Sincronizar con Anki" description="Resumen de diferencias. Elige qué aplicar.">
          {plan ? (
            <div className="space-y-3 text-sm">
              <ul className="space-y-1">
                <li>
                  <strong className="tabular">{plan.newInAnki.length}</strong> palabras nuevas en Anki → se importarán a la web.
                </li>
                <li>
                  <strong className="tabular">{plan.newInWeb.length}</strong> palabras nuevas en la web → se crearán en Anki.
                </li>
                <li>
                  <strong className="tabular">{plan.conflicts.length}</strong> con diferencias en ambos lados.
                </li>
                <li className="text-ink-faint">{plan.unchanged} sin cambios · {plan.missingWebId.length} notas de Anki sin WebID (se les asignará uno).</li>
              </ul>
              {plan.conflicts.length ? (
                <div>
                  <Label htmlFor="a-res" className="mb-1 block">
                    Conflictos
                  </Label>
                  <Select id="a-res" className="w-full" value={resolution} onChange={(e) => setResolution(e.target.value as typeof resolution)}>
                    <option value="auto">Último modificado gana (recomendado)</option>
                    <option value="web">Gana siempre la web</option>
                    <option value="anki">Gana siempre Anki</option>
                  </Select>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-[8px] border border-line p-2 text-xs scrollbar-thin">
                    {plan.conflicts.slice(0, 50).map((c) => (
                      <li key={c.web.id}>
                        <span lang="zh-CN" className="zh text-sm">
                          {c.web.hanzi}
                        </span>{" "}
                        · web: «{c.web.meaning}» · Anki: «{c.anki.meaning}» → <Badge variant="outline">{resolution === "auto" ? c.winner : resolution}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setPlan(null)}>
                  Cancelar
                </Button>
                <Button
                  disabled={busy !== null}
                  onClick={() =>
                    run("Sincronización", async () => {
                      const r = await applySync(plan, { importNewFromAnki: true, pushNewToAnki: true, conflictResolution: resolution });
                      setPlan(null);
                      return `${r.imported} importadas · ${r.pushed} enviadas · ${r.resolved} conflictos resueltos`;
                    })
                  }
                >
                  Aplicar
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
