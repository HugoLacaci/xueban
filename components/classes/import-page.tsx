"use client";
/**
 * Apuntes → Clases → Importar (solo chino). Se arrastran (o se eligen) uno o varios paquetes .json con sus recortes
 * .opus → vista previa con casillas para desmarcar elementos sueltos y avisos de lo dudoso → importar.
 * En `next dev` además lista los «Paquetes encontrados en tu PC» a través de la ruta local /api/clases.
 * Los recortes se guardan solo en IndexedDB de este navegador (privados).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, ArrowLeft, Check, FileAudio, FileJson, FolderOpen, HardDrive, RefreshCw, Upload, X } from "lucide-react";
import Link from "@/lib/languages/link";
import { db } from "@/lib/db";
import { BASE_PATH } from "@/lib/base-path";
import { usePack } from "@/lib/languages/provider";
import { parseClassPackage, type ClassPackage } from "@/lib/classes/package-schema";
import { importClassPackage, previewClassPackage, referencedClips, type ClassPreview, type ImportResult, type ImportStatus } from "@/lib/classes/import";
import { ddmm, fmtTime, formatBytes } from "@/lib/classes/search";
import { loadLivingNotes } from "@/lib/notes/living";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader, Spinner } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Mixed } from "@/components/target/mixed";
import { cn } from "@/lib/utils";

const DEV_API = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_STATIC_EXPORT !== "1";
const AUDIO_RE = /\.(opus|ogg|m4a|mp3)$/i;

interface Staged {
  key: string; // nombre del archivo del paquete
  pkg: ClassPackage;
  clips: Map<string, Blob>;
  preview: ClassPreview;
  exclude: Set<string>;
  result?: ImportResult;
  resolve: Record<string, "keep" | "replace">;
  busy?: boolean;
}

interface LocalPkg {
  file: string;
  classDate?: string;
  title?: string;
  size: number;
  valid: boolean;
  errors?: string[];
  clipDir?: string;
  clips: string[];
  /** Paquetes que comparten la misma carpeta de recortes (dos clases el mismo día). */
  sameDay?: number;
}

export function ClassImportPage() {
  const pack = usePack();
  if (pack.id !== "zh") {
    return <Card className="text-sm text-ink-faint">La importación de clases grabadas solo existe para el chino.</Card>;
  }
  return <ImportInner />;
}

const STATUS_LABEL: Record<ImportStatus, { text: string; variant: "jade" | "muted" | "indigo" | "lacquer" }> = {
  new: { text: "nueva", variant: "jade" },
  same: { text: "ya importada, sin cambios", variant: "muted" },
  update: { text: "trae cambios", variant: "indigo" },
  conflict: { text: "conflicto", variant: "lacquer" },
};

function ImportInner() {
  const [staged, setStaged] = useState<Staged[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const livingIds = useRef<Set<string> | undefined>(undefined);

  const getLivingIds = async () => {
    if (!livingIds.current) livingIds.current = new Set((await loadLivingNotes("zh")).map((n) => n.id));
    return livingIds.current;
  };

  /** Añade paquetes (con sus recortes) a la vista previa. */
  const stage = useCallback(async (pkgs: { key: string; pkg: ClassPackage; clips: Map<string, Blob> }[]) => {
    const ids = await getLivingIds();
    const rows: Staged[] = [];
    for (const p of pkgs) rows.push({ ...p, preview: await previewClassPackage(p.pkg, db, { livingIds: ids }), exclude: new Set(), resolve: {} });
    setStaged((cur) => [...cur.filter((c) => !rows.some((r) => r.key === c.key)), ...rows].sort((a, b) => a.pkg.classDate.localeCompare(b.pkg.classDate)));
  }, []);

  const onFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);
    if (!files.length) return;
    setLoading(true);
    const errs: string[] = [];
    const audio = new Map<string, Blob>(files.filter((f) => AUDIO_RE.test(f.name)).map((f) => [f.name, f]));
    const pkgs: { key: string; pkg: ClassPackage; clips: Map<string, Blob> }[] = [];
    for (const f of files.filter((x) => /\.json$/i.test(x.name))) {
      try {
        const r = parseClassPackage(JSON.parse(await f.text()));
        if (!r.ok) {
          errs.push(`${f.name}: no es un paquete de clase válido (${r.errors.slice(0, 2).join("; ")})`);
          continue;
        }
        pkgs.push({ key: f.name, pkg: r.data, clips: new Map() });
      } catch (e) {
        errs.push(`${f.name}: ${(e as Error).message}`);
      }
    }
    // recortes sueltos: se asignan a los paquetes que los citan (los ya en la vista previa también)
    const targets = [...pkgs, ...staged.map((s) => ({ key: s.key, pkg: s.pkg, clips: new Map(s.clips) }))];
    const used = new Set<string>();
    for (const t of targets) {
      const refs = new Set(referencedClips(t.pkg));
      for (const [name, blob] of audio) {
        if (!refs.has(name)) continue;
        t.clips.set(name, blob);
        used.add(name);
      }
    }
    const unused = [...audio.keys()].filter((n) => !used.has(n));
    if (unused.length) errs.push(`${unused.length} audio${unused.length > 1 ? "s" : ""} que ningún paquete cita: ${unused.slice(0, 5).join(", ")}${unused.length > 5 ? "…" : ""}`);
    const sharedNames = targets.length > 1 && audio.size ? targets.flatMap((t) => [...t.clips.keys()]).filter((n, i, a) => a.indexOf(n) !== i) : [];
    if (sharedNames.length) errs.push("Varios paquetes usan los mismos nombres de recorte: importa cada clase con sus recortes por separado para no mezclarlos.");
    setProblems(errs);
    await stage([...pkgs, ...targets.slice(pkgs.length).filter((t) => t.clips.size !== staged.find((s) => s.key === t.key)?.clips.size)]);
    setLoading(false);
  };

  const update = (key: string, patch: Partial<Staged>) => setStaged((cur) => cur.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const toggle = (key: string, k: string, on: boolean) =>
    setStaged((cur) =>
      cur.map((s) => {
        if (s.key !== key) return s;
        const ex = new Set(s.exclude);
        if (on) ex.delete(k);
        else ex.add(k);
        return { ...s, exclude: ex };
      }),
    );
  const setMany = (key: string, keys: string[], on: boolean) =>
    setStaged((cur) =>
      cur.map((s) => {
        if (s.key !== key) return s;
        const ex = new Set(s.exclude);
        for (const k of keys) if (on) ex.delete(k);
        else ex.add(k);
        return { ...s, exclude: ex };
      }),
    );

  const runImport = async (s: Staged, resolve = s.resolve) => {
    update(s.key, { busy: true });
    try {
      const result = await importClassPackage(s.pkg, s.clips, { exclude: s.exclude, resolve });
      const preview = await previewClassPackage(s.pkg, db, { livingIds: await getLivingIds() });
      update(s.key, { result, preview, busy: false, resolve });
      toast.success(`Clase del ${ddmm(s.pkg.classDate)} importada`, `${result.words.added} palabras nuevas · ${result.exercises.added + result.exercises.updated} ejercicios · ${result.clips.saved} recortes${result.conflicts.length ? ` · ${result.conflicts.length} conflictos` : ""}`);
    } catch (e) {
      update(s.key, { busy: false });
      toast.error("No se pudo importar", (e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <Link href="/apuntes/clases" className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="size-4" /> Mis clases
      </Link>
      <PageHeader title="Importar clases" zh="导入" subtitle="El paquete .json que genera Claude Code a partir de la grabación, con sus recortes .opus de la voz del profesor. Revisa lo que entra y desmarca lo que no quieras." />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void onFiles(e.dataTransfer.files);
        }}
        className={cn("flex flex-col items-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-line bg-paper-raised px-4 py-8 text-center transition-colors", drag && "border-cinnabar/60 bg-cinnabar/5")}
      >
        <Upload className="size-6 text-ink-faint" aria-hidden="true" />
        <p className="text-sm text-ink">Arrastra aquí el paquete (.json) y sus recortes (.opus)</p>
        <p className="text-xs text-ink-faint">Puedes soltar varias clases a la vez. Los recortes están en clases\recortes\AAAA-MM-DD\.</p>
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={loading}>
          <FolderOpen /> Elegir archivos
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".json,.opus,.ogg,.m4a,.mp3,application/json,audio/*"
          className="hidden"
          aria-label="Archivos del paquete de clase"
          onChange={(e) => {
            if (e.target.files) void onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {loading ? <Spinner /> : null}
      </div>

      {problems.length ? (
        <Card className="border-danger/40 text-sm">
          <ul className="space-y-1 text-danger">
            {problems.map((p) => (
              <li key={p} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> <Mixed>{p}</Mixed>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {DEV_API ? <LocalPackages onStage={stage} staged={staged.map((s) => s.key)} /> : null}

      {staged.map((s) => (
        <PreviewCard key={s.key} s={s} onToggle={(k, on) => toggle(s.key, k, on)} onMany={(keys, on) => setMany(s.key, keys, on)} onImport={(resolve) => void runImport(s, resolve)} onRemove={() => setStaged((cur) => cur.filter((c) => c.key !== s.key))} onResolve={(k, v) => update(s.key, { resolve: { ...s.resolve, [k]: v } })} />
      ))}

      {!staged.length && !DEV_API ? (
        <EmptyState icon={<FileJson />} title="Nada que importar todavía" description="Cuando Claude Code termine de analizar una clase, encontrarás su paquete en clases\paquetes\ y los recortes en clases\recortes\." />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ paquetes del PC (solo next dev) */

function LocalPackages({ onStage, staged }: { onStage: (p: { key: string; pkg: ClassPackage; clips: Map<string, Blob> }[]) => Promise<void>; staged: string[] }) {
  const [data, setData] = useState<{ dir: string; exists: boolean; paquetes: LocalPkg[] } | null | "off">(null);
  const [busy, setBusy] = useState<string | null>(null);
  const imported = useLiveQuery(async () => {
    const notes = await db.notes.where("[lang+kind]").equals(["zh", "class"]).toArray();
    return new Set(notes.map((n) => (n.source?.ref ?? "").replace(/\.[^.]+$/, "")).filter(Boolean));
  }, []);

  const load = useCallback(
    () =>
      fetch(`${BASE_PATH}/api/clases`, { cache: "no-store" })
        .then(async (r) => setData(r.ok ? await r.json() : "off"))
        .catch(() => setData("off")),
    [],
  );
  useEffect(() => {
    fetch(`${BASE_PATH}/api/clases`, { cache: "no-store" })
      .then(async (r) => setData(r.ok ? await r.json() : "off"))
      .catch(() => setData("off"));
  }, []);

  const fetchPkg = async (p: LocalPkg) => {
    setBusy(p.file);
    try {
      const r = await fetch(`${BASE_PATH}/api/clases?paquete=${encodeURIComponent(p.file)}`, { cache: "no-store" });
      const parsed = parseClassPackage(await r.json());
      if (!parsed.ok) throw new Error(parsed.errors.slice(0, 2).join("; "));
      const pkg = parsed.data;
      const wanted = new Set(referencedClips(pkg));
      const clips = new Map<string, Blob>();
      await Promise.all(
        p.clips
          .filter((c) => wanted.has(c))
          .map(async (c) => {
            const a = await fetch(`${BASE_PATH}/api/clases?recorte=${encodeURIComponent(`${p.clipDir ?? pkg.classDate}/${c}`)}`, { cache: "no-store" });
            if (a.ok) clips.set(c, await a.blob());
          }),
      );
      await onStage([{ key: p.file, pkg, clips }]);
    } catch (e) {
      toast.error(`No se pudo leer ${p.file}`, (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (data === "off") return null;
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif-es text-lg font-semibold text-ink">
          <HardDrive className="size-4 text-ink-faint" /> Paquetes encontrados en tu PC
        </h2>
        <Button size="sm" variant="ghost" onClick={() => void load()}>
          <RefreshCw /> Actualizar
        </Button>
      </div>
      {data === null ? (
        <Spinner />
      ) : !data.exists ? (
        <p className="text-sm text-ink-faint">No existe la carpeta {data.dir}.</p>
      ) : !data.paquetes.length ? (
        <p className="text-sm text-ink-faint">No hay paquetes en {data.dir}\paquetes.</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {data.paquetes.map((p) => {
            const done = imported?.has(p.file.replace(/\.json$/, ""));
            return (
              <li key={p.file} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {p.classDate ? <span className="tabular mr-2 text-ink-faint">{ddmm(p.classDate)}</span> : null}
                    <Mixed>{p.title ?? p.file}</Mixed>
                  </p>
                  <p className="text-[11px] text-ink-faint">
                    {p.file} · {formatBytes(p.size)} · <FileAudio className="inline size-3" /> {p.clips.length} recortes
                    {!p.valid && p.errors ? <span className="text-danger"> · no válido: {p.errors[0]}</span> : null}
                    {p.sameDay && p.sameDay > 1 ? <span className="text-gold-ink"> · comparte carpeta de recortes con otra clase del mismo día: los audios pueden no ser de esta</span> : null}
                  </p>
                </div>
                {done ? <Badge variant="jade"><Check className="size-3" /> importado</Badge> : null}
                <Button size="sm" variant={done ? "secondary" : "ink"} disabled={!p.valid || busy === p.file || staged.includes(p.file)} onClick={() => void fetchPkg(p)}>
                  {busy === p.file ? "Leyendo…" : staged.includes(p.file) ? "En la vista previa" : done ? "Revisar de nuevo" : "Revisar e importar"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[11px] text-ink-faint">Solo en el servidor de desarrollo: la web publicada no puede leer tu disco. Los audios pasan a este navegador y no salen de él.</p>
    </Card>
  );
}

/* ------------------------------------------------------------------ vista previa */

function GroupHeader({ title, keys, exclude, onMany, extra }: { title: string; keys: string[]; exclude: Set<string>; onMany: (keys: string[], on: boolean) => void; extra?: React.ReactNode }) {
  const on = keys.filter((k) => !exclude.has(k)).length;
  return (
    <div className="mb-1.5 mt-4 flex flex-wrap items-center gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {title} <span className="tabular font-normal normal-case tracking-normal">{on}/{keys.length}</span>
      </h3>
      {extra}
      {keys.length > 1 ? (
        <span className="ml-auto flex gap-1 text-[11px]">
          <button type="button" className="text-indigo hover:underline" onClick={() => onMany(keys, true)}>todas</button>·
          <button type="button" className="text-indigo hover:underline" onClick={() => onMany(keys, false)}>ninguna</button>
        </span>
      ) : null}
    </div>
  );
}

function Check1({ k, exclude, onToggle, children, className }: { k: string; exclude: Set<string>; onToggle: (k: string, on: boolean) => void; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2 rounded-[8px] px-1.5 py-1 text-sm hover:bg-paper-sunk", exclude.has(k) && "opacity-55", className)}>
      <input type="checkbox" checked={!exclude.has(k)} onChange={(e) => onToggle(k, e.target.checked)} className="mt-1 size-4 shrink-0 accent-[rgb(var(--cinnabar))]" />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

function PreviewCard({ s, onToggle, onMany, onImport, onRemove, onResolve }: { s: Staged; onToggle: (k: string, on: boolean) => void; onMany: (keys: string[], on: boolean) => void; onImport: (resolve?: Record<string, "keep" | "replace">) => void; onRemove: () => void; onResolve: (k: string, v: "keep" | "replace") => void }) {
  const p = s.preview;
  const newWords = p.words.filter((w) => !w.inDeck);
  const oldWords = p.words.filter((w) => w.inDeck);
  const loaded = p.clips.filter((c) => s.clips.has(c)).length;
  const toError = p.exercises.filter((e) => e.wrong && !s.exclude.has(e.key)).length;
  const st = STATUS_LABEL[p.noteStatus];
  const conflicts = s.result?.conflicts ?? [];
  const exByStatus = useMemo(() => p.exercises.reduce<Record<string, number>>((m, e) => ((m[e.status] = (m[e.status] ?? 0) + 1), m), {}), [p.exercises]);

  return (
    <Card className="space-y-2">
      <div className="flex flex-wrap items-start gap-3">
        <div className="tabular flex w-14 shrink-0 flex-col items-center rounded-[10px] border border-line py-1 leading-tight">
          <span className="font-serif-es text-xl text-ink">{p.classDate.slice(8)}</span>
          <span className="text-[11px] text-cinnabar-ink">{new Date(`${p.classDate}T12:00:00`).toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif-es text-lg font-semibold leading-snug text-ink"><Mixed>{p.title}</Mixed></h2>
          <p className="text-[11px] text-ink-faint">
            {s.key} → {p.duplicate ? (p.duplicate.target ? <>se suma a <code>{p.duplicate.target}</code> · <Badge variant="indigo">repite otra clase</Badge></> : <Badge variant="lacquer">falta la clase original</Badge>) : <><code>{p.noteId}</code> · <Badge variant={st.variant}>{st.text}</Badge></>}
            {s.pkg.group === "otro" ? <> · <Badge variant="gold">de otro grupo{s.pkg.coversDate ? ` · cubre tu clase del ${ddmm(s.pkg.coversDate)}` : ""}</Badge></> : null}
          </p>
          <p className="mt-1 line-clamp-3 text-sm text-ink-soft"><Mixed>{p.summary}</Mixed></p>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onRemove} aria-label="Quitar de la vista previa">
          <X />
        </Button>
      </div>

      {p.warnings.length ? (
        <ul className="space-y-1 rounded-[8px] border border-gold/40 bg-gold/8 p-3 text-xs text-gold-ink">
          {p.warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> <Mixed>{w}</Mixed>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
        <FileAudio className="size-3.5" /> Recortes del profesor: <strong className="tabular">{loaded}/{p.clips.length}</strong> cargados
        {p.clips.length && loaded < p.clips.length ? <span className="text-ink-faint">(arrastra los .opus que faltan; sin ellos se muestra el minuto como texto)</span> : null}
        {p.clips.length ? (
          <label className="ml-auto inline-flex items-center gap-1.5">
            <input type="checkbox" checked={!s.exclude.has("clips")} onChange={(e) => onToggle("clips", e.target.checked)} className="size-4 accent-[rgb(var(--cinnabar))]" /> guardar recortes
          </label>
        ) : null}
      </p>

      <GroupHeader title="Palabras nuevas" keys={newWords.map((w) => w.key)} exclude={s.exclude} onMany={onMany} extra={<span className="text-[11px] text-ink-faint">van a flashcards (y a Anki si está conectado)</span>} />
      <div className="grid gap-x-3 sm:grid-cols-2 lg:grid-cols-3">
        {newWords.map((w) => (
          <Check1 key={w.key} k={w.key} exclude={s.exclude} onToggle={onToggle}>
            <span lang="zh-CN" className="zh-serif text-base text-ink">{w.hanzi}</span> <span className="text-xs text-ink-soft">{w.pinyin}</span> <span className="text-xs text-ink-faint"><Mixed>{w.es}</Mixed></span>
          </Check1>
        ))}
      </div>
      {oldWords.length ? (
        <details className="text-xs text-ink-faint">
          <summary className="cursor-pointer">{oldWords.length} ya están en tu mazo: solo se les añade la etiqueta de la clase</summary>
          <p className="mt-1 leading-relaxed">
            <span lang="zh-CN" className="zh">{oldWords.map((w) => w.hanzi).join("、")}</span>
          </p>
        </details>
      ) : null}

      {p.structures.length ? (
        <>
          <GroupHeader title="Estructuras" keys={p.structures.map((x) => x.key)} exclude={s.exclude} onMany={onMany} />
          {p.structures.map((g) => (
            <Check1 key={g.key} k={g.key} exclude={s.exclude} onToggle={onToggle}>
              <span className="font-medium text-ink"><Mixed>{g.title}</Mixed></span> <span className="text-xs text-ink-soft"><Mixed>{g.pattern}</Mixed></span>
            </Check1>
          ))}
        </>
      ) : null}

      {p.exercises.length ? (
        <>
          <GroupHeader
            title="Ejercicios corregidos en clase"
            keys={p.exercises.map((x) => x.key)}
            exclude={s.exclude}
            onMany={onMany}
            extra={
              <span className="text-[11px] text-ink-faint">
                al cuaderno 练习本{toError ? ` · ${toError} al 错题本` : ""}
                {exByStatus.same ? ` · ${exByStatus.same} sin cambios` : ""}
              </span>
            }
          />
          {p.exercises.map((e) => (
            <Check1 key={e.key} k={e.key} exclude={s.exclude} onToggle={onToggle}>
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-ink"><Mixed>{e.es}</Mixed></span>
                {e.confidence !== "alta" ? <Badge variant={e.confidence === "baja" ? "lacquer" : "gold"}>confianza {e.confidence}</Badge> : null}
                {e.status !== "new" ? <Badge variant={STATUS_LABEL[e.status].variant}>{STATUS_LABEL[e.status].text}</Badge> : null}
              </span>
              <span className="block text-sm">
                {e.wrong && e.myAnswer ? (
                  <span lang="zh-CN" className="zh mr-2 text-danger line-through decoration-danger/60">{e.myAnswer}</span>
                ) : null}
                <span lang="zh-CN" className="zh text-celadon-ink">{e.teacherAnswer.join(" · ")}</span>
                {e.claudeProposal ? <span className="ml-2 text-xs text-indigo">propuesta de Claude: <span lang="zh-CN" className="zh">{e.claudeProposal}</span></span> : null}
              </span>
            </Check1>
          ))}
        </>
      ) : null}

      {p.living.length ? (
        <>
          <GroupHeader title="Aportaciones a tus apuntes vivos" keys={p.living.map((x) => x.key)} exclude={s.exclude} onMany={onMany} />
          {p.living.map((l) => (
            <Check1 key={l.key} k={l.key} exclude={s.exclude} onToggle={onToggle}>
              <span className="text-ink"><Mixed>{l.title ?? "Nota del profesor"}</Mixed></span>{" "}
              <span className="text-xs text-ink-faint">
                → {l.noteId}
                {l.sectionId ? ` / ${l.sectionId}` : ""}
                {l.orphan ? " (no existe)" : ""}
              </span>
              {l.status !== "new" ? <Badge variant={STATUS_LABEL[l.status].variant} className="ml-1">{STATUS_LABEL[l.status].text}</Badge> : null}
            </Check1>
          ))}
        </>
      ) : null}

      {p.doubts.length ? (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Dudas y lo que no se oyó bien ({p.doubts.length})</summary>
          <ul className="mt-1 space-y-1">
            {p.doubts.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-ink-soft">
                {d.kind === "uncertain" ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-gold-ink" /> : <span className="mt-0.5 text-xs">?</span>}
                <span className="min-w-0 flex-1"><Mixed>{d.text}</Mixed></span>
                {d.t !== undefined ? <span className="tabular text-[11px] text-ink-faint">{fmtTime(d.t)}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {conflicts.length ? (
        <div className="mt-3 space-y-2 rounded-[8px] border border-cinnabar/40 bg-cinnabar/5 p-3">
          <p className="text-sm font-medium text-cinnabar-ink">Has editado cosas que el paquete también cambia. Elige qué versión quieres:</p>
          {conflicts.map((c) => (
            <div key={c.key} className="rounded-[8px] border border-line bg-paper-raised p-2 text-sm">
              <p className="mb-1 font-medium text-ink"><Mixed>{c.label}</Mixed></p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["keep", "replace"] as const).map((v) => (
                  <label key={v} className={cn("cursor-pointer rounded-[8px] border p-2", s.resolve[c.key] === v ? "border-ink" : "border-line")}>
                    <input type="radio" name={`${s.key}-${c.key}`} className="mr-1.5 accent-[rgb(var(--cinnabar))]" checked={s.resolve[c.key] === v} onChange={() => onResolve(c.key, v)} />
                    <span className="text-xs font-medium text-ink-soft">{v === "keep" ? "Lo mío" : "Lo del paquete"}</span>
                    <span className="mt-1 block line-clamp-3 text-xs text-ink"><Mixed>{v === "keep" ? c.mine : c.theirs}</Mixed></span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button size="sm" variant="ink" disabled={s.busy || conflicts.some((c) => !s.resolve[c.key])} onClick={() => onImport(s.resolve)}>
              Aplicar mi elección
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
        {s.result ? (
          <span className="mr-auto text-xs text-celadon-ink">
            <Check className="mr-1 inline size-3.5" />
            {s.result.words.added} palabras nuevas · {s.result.exercises.added} ejercicios nuevos{s.result.exercises.updated ? ` · ${s.result.exercises.updated} actualizados` : ""} · {s.result.errorsAdded} al 错题本 · {s.result.clips.saved} recortes
          </span>
        ) : null}
        {s.result ? (
          <Button variant="secondary" asChild>
            <Link href={`/apuntes/${encodeURIComponent(s.result.noteId)}`}>Abrir el apunte</Link>
          </Button>
        ) : null}
        <Button variant={s.result ? "secondary" : "default"} onClick={() => onImport()} disabled={s.busy || (p.duplicate && !p.duplicate.target)}>
          {s.busy ? "Importando…" : s.result ? "Importar de nuevo" : p.duplicate ? "Sumar a esa clase" : p.noteStatus === "new" ? "Importar la clase" : "Actualizar la clase"}
        </Button>
      </div>
    </Card>
  );
}
