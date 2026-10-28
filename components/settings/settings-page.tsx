"use client";
import { useEffect, useRef, useState } from "react";
import { Download, PlugZap, RefreshCw, RotateCcw, Upload, Volume2 } from "lucide-react";
import { useSettings, DEFAULT_TONE_COLORS, type Settings } from "@/lib/settings";
import { listZhVoices, speak, warmVoices } from "@/lib/tts";
import { useAnkiStatus } from "@/lib/anki/client";
import { exportBackup, importBackup, resetProgress } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { CardDescription, Input, Label, PageHeader, Select, Slider, Switch } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { InkDivider } from "@/components/ornament";
import { Pinyin } from "@/components/zh/pinyin";
import { ChineseText } from "@/components/zh/chinese-text";
import { AnkiPanel } from "@/components/settings/anki-panel";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "perfil", zh: "我", label: "Perfil" },
  { id: "texto", zh: "文", label: "Texto y tonos" },
  { id: "voz", zh: "声", label: "Voz" },
  { id: "anki", zh: "卡", label: "Anki" },
  { id: "llm", zh: "译", label: "Traducción" },
  { id: "datos", zh: "库", label: "Datos" },
];

export function SettingsPage() {
  const { settings, update } = useSettings();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const anki = useAnkiStatus();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    warmVoices();
    const refresh = () => setVoices(listZhVoices());
    refresh();
    const t = setInterval(refresh, 1000);
    setTimeout(() => clearInterval(t), 5000);
    return () => clearInterval(t);
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => void update({ [key]: value } as Partial<Settings>);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ajustes" zh="设置" subtitle="Todo se guarda en este navegador (IndexedDB). Exporta una copia de seguridad de vez en cuando." />

      <nav aria-label="Secciones de ajustes" className="no-scrollbar -mx-4 mb-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-1.5">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-ink/40 hover:text-ink">
                <span lang="zh-CN" className="zh-serif text-sm leading-none text-cinnabar" aria-hidden="true">
                  {s.zh}
                </span>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="perfil" zh="我" title="Perfil y objetivo">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tu nombre" htmlFor="s-name">
            <Input id="s-name" value={settings.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Lista HSK que sigues" htmlFor="s-hsk">
            <Select id="s-hsk" value={settings.hskList} onChange={(e) => set("hskList", e.target.value as Settings["hskList"])} className="w-full">
              <option value="both">Ambas (HSK 2.0 + HSK 3.0)</option>
              <option value="3.0">HSK 3.0 (300 palabras en el nivel 1)</option>
              <option value="2.0">HSK 2.0 (150 palabras en el nivel 1)</option>
            </Select>
          </Field>
          <Field label="Fecha del examen" htmlFor="s-exam" hint="Última convocatoria HSK 2.0 en 2026: 7 nov. Primera HSK 3.0 oficial anunciada: 13 dic 2026.">
            <Input id="s-exam" type="date" value={settings.examDate} onChange={(e) => set("examDate", e.target.value)} className="tabular" />
          </Field>
          <Field label={`Objetivo diario: ${settings.dailyGoalMinutes} min`} htmlFor="s-goal">
            <Slider id="s-goal" min={10} max={120} step={5} value={[settings.dailyGoalMinutes]} onValueChange={([v]) => set("dailyGoalMinutes", v)} />
          </Field>
          <Field label={`Palabras nuevas al día: ${settings.newWordsPerDay}`} htmlFor="s-new">
            <Slider id="s-new" min={1} max={30} step={1} value={[settings.newWordsPerDay]} onValueChange={([v]) => set("newWordsPerDay", v)} />
          </Field>
          <Field label={`Retención objetivo FSRS: ${Math.round(settings.fsrs.retention * 100)} %`} htmlFor="s-ret" hint="0,90 es el valor recomendado. Más alto = más repasos.">
            <Slider id="s-ret" min={0.7} max={0.97} step={0.01} value={[settings.fsrs.retention]} onValueChange={([v]) => void update({ fsrs: { ...settings.fsrs, retention: v } })} />
          </Field>
        </div>
      </Section>

      <Section id="texto" zh="文" title="Texto chino, pinyin y tonos" description="Estos ajustes se aplican en toda la app (atajos: P pinyin, T traducción).">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pinyin por defecto" htmlFor="s-py">
            <Select id="s-py" value={settings.pinyinMode} onChange={(e) => set("pinyinMode", e.target.value as Settings["pinyinMode"])} className="w-full">
              <option value="show">Mostrar siempre</option>
              <option value="unknown">Solo en palabras desconocidas</option>
              <option value="hide">Ocultar</option>
            </Select>
          </Field>
          <Field label="Tipografía china (fuente de estudio)" htmlFor="s-font">
            <Select id="s-font" value={settings.zhFont} onChange={(e) => set("zhFont", e.target.value as Settings["zhFont"])} className="w-full">
              <option value="sans">Noto Sans SC (moderna)</option>
              <option value="serif">Noto Serif SC (宋体, imprenta)</option>
              <option value="kai">Kai / caligrafía (LXGW WenKai)</option>
            </Select>
          </Field>
          <Field label={`Tamaño del chino: ${Math.round(settings.zhFontScale * 100)} %`} htmlFor="s-scale">
            <Slider id="s-scale" min={0.8} max={1.8} step={0.05} value={[settings.zhFontScale]} onValueChange={([v]) => set("zhFontScale", v)} />
          </Field>
          <Field label="Tema" htmlFor="s-theme">
            <Select id="s-theme" value={settings.theme} onChange={(e) => set("theme", e.target.value as Settings["theme"])} className="w-full">
              <option value="system">Según el sistema</option>
              <option value="light">Claro (papel 宣纸)</option>
              <option value="dark">Oscuro (tinta de noche)</option>
            </Select>
          </Field>
          <Toggle label="Mostrar caracteres tradicionales como dato secundario" checked={settings.showTraditional} onChange={(v) => set("showTraditional", v)} />
          <Toggle label="Mostrar traducciones" checked={settings.showTranslation} onChange={(v) => set("showTranslation", v)} />
          <Toggle label="Sonidos de acierto/error (guqin, 木鱼, campanilla)" checked={settings.sounds} onChange={(v) => set("sounds", v)} />
        </div>

        <InkDivider label="声调" className="my-5" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Toggle label="Colorear sílabas por tono" checked={settings.toneColorsEnabled} onChange={(v) => set("toneColorsEnabled", v)} />
          <Toggle label="Indicador de tono adicional (marca grande)" hint="Para no depender solo del color." checked={settings.toneMarks} onChange={(v) => set("toneMarks", v)} />
          <Field label="Esquema de colores de tono" htmlFor="s-tones">
            <Select id="s-tones" value={settings.toneScheme} onChange={(e) => set("toneScheme", e.target.value as Settings["toneScheme"])} className="w-full" disabled={!settings.toneColorsEnabled}>
              <option value="xueban">学伴 (armonizado con el papel)</option>
              <option value="pleco">Pleco clásico</option>
              <option value="none">Sin colores</option>
              <option value="custom">Personalizado</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <ToneSwatches scheme={settings.toneScheme} custom={settings.toneColors} />
          </div>
        </div>
        {settings.toneScheme === "custom" ? (
          <div className="mt-4">
            <Label>Colores personalizados</Label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {([1, 2, 3, 4, 5] as const).map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="color"
                    value={settings.toneColors[t]}
                    onChange={(e) => void update({ toneColors: { ...settings.toneColors, [t]: e.target.value } })}
                    className="size-7 cursor-pointer rounded border border-line bg-transparent"
                    aria-label={`Color del tono ${t}`}
                  />
                  <span style={{ color: settings.toneColors[t] }}>{t === 5 ? "neutro" : `${t}.º`}</span>
                </label>
              ))}
              <Button size="sm" variant="ghost" onClick={() => void update({ toneColors: DEFAULT_TONE_COLORS })}>
                <RotateCcw /> Restablecer
              </Button>
            </div>
          </div>
        ) : null}
        <div className="card-sunk mt-4 p-4">
          <ChineseText text="妈妈骑马，马慢，妈妈骂马。" size="lg" />
          <Pinyin text="Māma qí mǎ, mǎ màn, māma mà mǎ." className="mt-1 block text-sm" />
          <p className="mt-1 text-xs text-ink-faint">Mamá monta a caballo; el caballo es lento; mamá regaña al caballo.</p>
        </div>
      </Section>

      <Section id="voz" zh="声" title="Voz (texto a voz)" description="Si hay audios pregenerados (npm run audio:build) se usan primero; si no, la voz del navegador. En Windows, instala la voz china: Configuración → Hora e idioma → Voz → Agregar voces → Chino (simplificado).">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Voz zh-CN del navegador" htmlFor="s-voice">
            <Select id="s-voice" value={settings.tts.voiceURI} onChange={(e) => void update({ tts: { ...settings.tts, voiceURI: e.target.value } })} className="w-full">
              <option value="">Automática (la mejor disponible)</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang}){v.localService ? "" : " · online"}
                </option>
              ))}
            </Select>
            {!voices.length ? <p className="mt-1 text-xs text-danger">No se ha encontrado ninguna voz china en este navegador.</p> : null}
          </Field>
          <Field label={`Velocidad: ${settings.tts.rate.toFixed(2)}×`} htmlFor="s-rate">
            <Slider id="s-rate" min={0.5} max={1.3} step={0.05} value={[settings.tts.rate]} onValueChange={([v]) => void update({ tts: { ...settings.tts, rate: v } })} />
          </Field>
          <Toggle label="Preferir audios MP3 pregenerados" checked={settings.tts.preferGenerated} onChange={(v) => void update({ tts: { ...settings.tts, preferGenerated: v } })} />
          <div className="flex items-end">
            <Button variant="outline" onClick={() => void speak("你好！我叫雨果，我是西班牙人。", { rate: settings.tts.rate, voiceURI: settings.tts.voiceURI, preferGenerated: settings.tts.preferGenerated })}>
              <Volume2 /> Probar voz
            </Button>
          </div>
        </div>
      </Section>

      <Section
        id="anki"
        zh="卡"
        title={
          <span className="inline-flex items-center gap-2">
            <PlugZap className={cn("size-5", anki.connected ? "text-celadon-ink" : "text-ink-faint")} /> Anki (AnkiConnect)
          </span>
        }
        action={
          <Button size="sm" variant="outline" onClick={() => void anki.check(settings.anki.url).then((ok) => toast[ok ? "success" : "error"](ok ? "Anki conectado" : "Anki no responde", ok ? `AnkiConnect v${useAnkiStatus.getState().version}` : useAnkiStatus.getState().error))}>
            <RefreshCw /> Probar conexión
          </Button>
        }
      >
        <AnkiPanel />
      </Section>

      <Section id="llm" zh="译" title="Traducción automática (opcional)" description="Solo para traducir subtítulos de vídeos frase a frase. Proveedor intercambiable; la clave se guarda en este navegador. Sin proveedor, se usan Tatoeba y el diccionario.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Proveedor" htmlFor="s-llm">
            <Select id="s-llm" value={settings.llm.provider} onChange={(e) => void update({ llm: { ...settings.llm, provider: e.target.value as Settings["llm"]["provider"] } })} className="w-full">
              <option value="none">Ninguno (gratis/offline)</option>
              <option value="ollama">Ollama (local, gratis)</option>
              <option value="openai">OpenAI (clave propia)</option>
              <option value="anthropic">Anthropic (clave propia)</option>
              <option value="custom">Compatible con OpenAI (URL propia)</option>
            </Select>
          </Field>
          <Field label="Modelo" htmlFor="s-model">
            <Input id="s-model" value={settings.llm.model} placeholder={settings.llm.provider === "ollama" ? "qwen2.5:7b" : settings.llm.provider === "anthropic" ? "claude-haiku-5-5" : "gpt-4o-mini"} onChange={(e) => void update({ llm: { ...settings.llm, model: e.target.value } })} />
          </Field>
          <Field label="URL base (Ollama / custom)" htmlFor="s-url">
            <Input id="s-url" value={settings.llm.baseUrl} placeholder="http://localhost:11434" onChange={(e) => void update({ llm: { ...settings.llm, baseUrl: e.target.value } })} />
          </Field>
          <Field label="Clave API" htmlFor="s-key">
            <Input id="s-key" type="password" value={settings.llm.apiKey} onChange={(e) => void update({ llm: { ...settings.llm, apiKey: e.target.value } })} autoComplete="off" />
          </Field>
        </div>
      </Section>

      <Section id="datos" zh="库" title="Datos" description="Copia de seguridad completa (palabras, tarjetas, progreso, ajustes) en JSON.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              const json = await exportBackup();
              const blob = new Blob([json], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `xueban-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
              toast.success("Copia exportada");
            }}
          >
            <Download /> Exportar copia
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload /> Importar copia
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                await importBackup(await f.text(), "merge");
                toast.success("Copia importada (fusionada)");
              } catch (err) {
                toast.error("No se pudo importar", (err as Error).message);
              }
              e.target.value = "";
            }}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-danger/30 bg-danger/5 p-3">
          <p className="text-sm text-ink-soft">Borra todo el progreso de este navegador y vuelve a cargar el vocabulario HSK 1.</p>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!window.confirm("¿Seguro? Se borra TODO el progreso de este navegador y se vuelve a cargar el vocabulario HSK 1.")) return;
              await resetProgress();
              await useSettings.getState().load();
              toast.success("Progreso reiniciado");
            }}
          >
            <RotateCcw /> Reiniciar progreso
          </Button>
        </div>
      </Section>
    </div>
  );
}

/** Sección de ajustes: divisor a pincel con el carácter y título editorial; el contenido sobre papel elevado. */
function Section({ id, zh, title, description, action, children }: { id: string; zh: string; title: React.ReactNode; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 pt-4">
      <InkDivider label={zh} className="my-3" />
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif-es text-xl font-semibold tracking-tight text-ink">{title}</h2>
          {description ? <CardDescription className="mt-1 max-w-2xl">{description}</CardDescription> : null}
        </div>
        {action}
      </div>
      <div className="card-paper p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-1.5 block">
        {label}
      </Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[8px] border border-line bg-paper-sunk/40 px-3 py-2 text-sm transition-colors hover:border-ink/30">
      <span>
        <span className="block text-ink">{label}</span>
        {hint ? <span className="block text-xs text-ink-faint">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Muestra los cinco tonos con el esquema activo (los colores los aplica el proveedor vía data-tones). */
function ToneSwatches({ scheme, custom }: { scheme: Settings["toneScheme"]; custom: Settings["toneColors"] }) {
  const syll = ["mā", "má", "mǎ", "mà", "ma"];
  return (
    <div className="flex w-full items-center gap-2 rounded-[8px] border border-line bg-paper-sunk/40 px-3 py-2" aria-label="Vista previa de los colores de tono">
      {syll.map((s, i) => {
        const t = i + 1;
        const color = scheme === "custom" ? custom[t as 1 | 2 | 3 | 4 | 5] : scheme === "none" ? "rgb(var(--ink))" : `rgb(var(--tone-${t}))`;
        return (
          <span key={t} className="flex flex-col items-center gap-1">
            <span className="size-3.5 rounded-full" style={{ background: color }} aria-hidden="true" />
            <span className="text-xs font-medium" style={{ color }}>
              {s}
            </span>
          </span>
        );
      })}
      <span className="ml-auto text-[11px] text-ink-faint">1 · 2 · 3 · 4 · neutro</span>
    </div>
  );
}
