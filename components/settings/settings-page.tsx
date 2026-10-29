"use client";
import { useEffect, useRef, useState } from "react";
import { Download, PlugZap, RefreshCw, RotateCcw, Trash2, Upload, Volume2 } from "lucide-react";
import { useSettings, DEFAULT_TONE_COLORS, type LangSettings, type Settings } from "@/lib/settings";
import { listVoices, speak, warmVoices } from "@/lib/tts";
import { useAnkiStatus } from "@/lib/anki/client";
import { exportBackup, importBackup, resetProgress } from "@/lib/db";
import { deleteBackup, getBackup, listBackups, type BackupRow } from "@/lib/db/backup";
import { LANG_META, LANGS } from "@/lib/languages/registry";
import type { Lang } from "@/lib/languages/types";
import { usePack } from "@/lib/languages/provider";
import { PAGE_NATIVE } from "@/lib/languages/glyphs";
import { Button } from "@/components/ui/button";
import { CardDescription, Input, Label, PageHeader, Select, Slider, Switch, Option } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { InkDivider } from "@/components/ornament";
import { TargetText } from "@/components/target/target-text";
import { AnkiPanel } from "@/components/settings/anki-panel";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

const SECTION_GLYPHS: Record<Lang, Record<string, string>> = {
  zh: { perfil: "我", idioma: "语", texto: "文", voz: "声", anki: "卡", llm: "译", datos: "库" },
  ja: { perfil: "私", idioma: "語", texto: "文", voz: "声", anki: "札", llm: "訳", datos: "庫" },
  ko: { perfil: "나", idioma: "말", texto: "글", voz: "음", anki: "카", llm: "번", datos: "저" },
};

const LEVEL_OPTIONS: Record<Lang, [string, string][]> = {
  zh: [["zero", "Empiezo de cero"], ["beginner", "Principiante (preparo HSK 1)"], ["hsk1", "Tengo HSK 1"], ["hsk2", "HSK 2 o más"]],
  ja: [["zero", "Empiezo de cero (aprendo kana)"], ["beginner", "Leo kana (preparo N5)"], ["n5", "Tengo el N5"], ["n4", "N4 o más"]],
  ko: [["zero", "Empiezo de cero (aprendo hangul)"], ["beginner", "Leo hangul (preparo TOPIK 1)"], ["topik1", "Tengo TOPIK 1"], ["topik2", "TOPIK 2 o más"]],
};

const EXAM_HINT: Record<Lang, string> = {
  zh: "Última convocatoria HSK 2.0 en 2026: 7 nov. Primera HSK 3.0 oficial anunciada: 13 dic 2026.",
  ja: "JLPT 2026: 5 de julio y 6 de diciembre (según sede). Consulta jlpt.jp.",
  ko: "TOPIK: varias convocatorias al año, en papel e IBT. Consulta topik.go.kr.",
};

const THEME_LABELS: Record<Lang, { light: string; dark: string }> = {
  zh: { light: "Claro (papel 宣纸)", dark: "Oscuro (tinta de noche)" },
  ja: { light: "Claro (和紙)", dark: "Oscuro (藍の夜)" },
  ko: { light: "Claro (한지)", dark: "Oscuro (먹의 밤)" },
};

const VOICE_SAMPLE: Record<Lang, string> = {
  zh: "你好！我叫雨果，我是西班牙人。",
  ja: "こんにちは！ウーゴです。スペイン人です。",
  ko: "안녕하세요! 저는 우고예요. 스페인 사람이에요.",
};

const VOICE_WINDOWS: Record<Lang, string> = {
  zh: "Chino (simplificado, China)",
  ja: "Japonés",
  ko: "Coreano",
};

const TEXT_SAMPLE: Record<Lang, { text: string; es: string }> = {
  zh: { text: "妈妈骑马，马慢，妈妈骂马。", es: "Mamá monta a caballo; el caballo es lento; mamá regaña al caballo." },
  ja: { text: "毎朝、駅で新聞を買います。", es: "Cada mañana compro el periódico en la estación." },
  ko: { text: "한국어를 공부해요. 같이 먹어요!", es: "Estudio coreano. ¡Comamos juntos!" },
};

function download(name: string, json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function SettingsPage() {
  const { settings, update, updateLang } = useSettings();
  const pack = usePack();
  const lang = pack.id;
  const meta = LANG_META[lang];
  const ls = settings.langs[lang];
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [backups, setBackups] = useState<Omit<BackupRow, "json">[]>([]);
  const anki = useAnkiStatus();
  const fileRef = useRef<HTMLInputElement>(null);
  const G = SECTION_GLYPHS[lang];

  useEffect(() => {
    warmVoices();
    const refresh = () => setVoices(listVoices(lang));
    refresh();
    const t = setInterval(refresh, 1000);
    const stop = setTimeout(() => clearInterval(t), 5000);
    void listBackups().then(setBackups);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [lang]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => void update({ [key]: value } as Partial<Settings>);
  const setL = (patch: Partial<LangSettings>) => {
    void updateLang(lang, patch);
    // campos heredados del chino: se mantienen en sintonía
    if (lang === "zh") {
      const legacy: Partial<Settings> = {};
      if (patch.examDate !== undefined) legacy.examDate = patch.examDate;
      if (patch.newWordsPerDay !== undefined) legacy.newWordsPerDay = patch.newWordsPerDay;
      if (patch.font !== undefined && ["sans", "serif", "kai"].includes(patch.font)) legacy.zhFont = patch.font as Settings["zhFont"];
      if (patch.level !== undefined && ["zero", "beginner", "hsk1", "hsk2"].includes(patch.level)) legacy.level = patch.level as Settings["level"];
      if (Object.keys(legacy).length) void update(legacy);
    }
  };

  const toggleActive = (l: Lang, on: boolean) => {
    const next = on ? [...settings.activeLangs.filter((x) => x !== l), l] : settings.activeLangs.filter((x) => x !== l);
    if (!next.length) return toast.error("Necesitas al menos un idioma activo");
    void update({ activeLangs: next });
    void updateLang(l, { active: on });
  };
  const makePrimary = (l: Lang) => void update({ activeLangs: [l, ...settings.activeLangs.filter((x) => x !== l)] });

  const sections = [
    { id: "perfil", label: "Perfil" },
    { id: "idioma", label: meta.names.es },
    { id: "texto", label: `Texto y ${pack.readingAid.name.toLowerCase()}` },
    { id: "voz", label: "Voz" },
    { id: "anki", label: "Anki" },
    { id: "llm", label: "Traducción" },
    { id: "datos", label: "Datos" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ajustes" zh={PAGE_NATIVE[lang].settings} subtitle="Todo se guarda en este navegador (IndexedDB). Los ajustes generales valen para todos los idiomas; los de cada idioma, solo para ese." />

      <nav aria-label="Secciones de ajustes" className="no-scrollbar -mx-4 mb-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-1.5">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-ink/40 hover:text-ink">
                <span lang={pack.bcp47} className="zh-serif text-sm leading-none text-cinnabar" aria-hidden="true">
                  <Mixed>{G[s.id]}</Mixed>
                </span>
                <Mixed>{s.label}</Mixed>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="perfil" glyph={G.perfil} title="Perfil e idiomas (general)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tu nombre" htmlFor="s-name">
            <Input id="s-name" value={settings.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label={`Objetivo total diario: ${settings.dailyGoalMinutes} min`} htmlFor="s-goal" hint="Suma de todos los idiomas; cada idioma tiene además su propio objetivo.">
            <Slider id="s-goal" min={10} max={180} step={5} value={[settings.dailyGoalMinutes]} onValueChange={([v]) => set("dailyGoalMinutes", v)} />
          </Field>
          <Field label={`Retención objetivo FSRS: ${Math.round(settings.fsrs.retention * 100)} %`} htmlFor="s-ret" hint="0,90 es el valor recomendado. Más alto = más repasos.">
            <Slider id="s-ret" min={0.7} max={0.97} step={0.01} value={[settings.fsrs.retention]} onValueChange={([v]) => void update({ fsrs: { ...settings.fsrs, retention: v } })} />
          </Field>
          <Field label="Tema" htmlFor="s-theme">
            <Select id="s-theme" value={settings.theme} onChange={(e) => set("theme", e.target.value as Settings["theme"])} className="w-full">
              <option value="system">Según el sistema</option>
              <Option value="light">{THEME_LABELS[lang].light}</Option>
              <Option value="dark">{THEME_LABELS[lang].dark}</Option>
            </Select>
          </Field>
          <Toggle label="Sonidos de acierto y error" checked={settings.sounds} onChange={(v) => set("sounds", v)} />
        </div>
        <InkDivider className="my-5" />
        <Label className="mb-2 block">Idiomas que estudias</Label>
        <ul className="grid gap-2 sm:grid-cols-3">
          {LANGS.map((l) => {
            const on = settings.activeLangs.includes(l);
            const m = LANG_META[l];
            return (
              <li key={l} className={cn("rounded-[10px] border p-3", on ? "border-ink/40 bg-paper-sunk/50" : "border-line")}>
                <div className="flex items-center justify-between gap-2">
                  <span>
                    <span lang={m.bcp47} className={cn(m.cssClass, "block text-lg text-ink")}>
                      <Mixed>{m.names.native}</Mixed>
                    </span>
                    <span className="text-xs text-ink-faint"><Mixed>{m.names.es}</Mixed></span>
                  </span>
                  <Switch checked={on} onCheckedChange={(v) => toggleActive(l, v)} aria-label={`Estudiar ${m.names.adjective}`} />
                </div>
                {on ? (
                  settings.activeLangs[0] === l ? (
                    <p className="mt-1 text-xs text-celadon-ink">Idioma principal</p>
                  ) : (
                    <button type="button" className="mt-1 text-xs text-ink-soft underline-offset-2 hover:underline" onClick={() => makePrimary(l)}>
                      Hacer principal
                    </button>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section id="idioma" glyph={G.idioma} title={<>Tu <Mixed>{meta.names.adjective}</Mixed> <span lang={pack.bcp47} className="ml-1 text-base text-ink-faint"><Mixed>{meta.names.native}</Mixed></span></>} description={`Solo afecta a ${meta.names.adjective}. Cambia de idioma en la cabecera para ajustar los demás.`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nivel" htmlFor="s-level">
            <Select id="s-level" value={ls.level} onChange={(e) => setL({ level: e.target.value })} className="w-full">
              {LEVEL_OPTIONS[lang].map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Objetivo" htmlFor="s-lgoal">
            <Input id="s-lgoal" value={ls.goal} onChange={(e) => setL({ goal: e.target.value })} placeholder={`p. ej. ${pack.exam.name} en diciembre`} />
          </Field>
          <Field label={`Fecha del examen (${pack.exam.name})`} htmlFor="s-exam" hint={EXAM_HINT[lang]}>
            <Input id="s-exam" type="date" value={ls.examDate} onChange={(e) => setL({ examDate: e.target.value })} className="tabular" />
          </Field>
          <Field label={`Minutos al día: ${ls.dailyGoalMinutes}`} htmlFor="s-lmin">
            <Slider id="s-lmin" min={5} max={120} step={5} value={[ls.dailyGoalMinutes]} onValueChange={([v]) => setL({ dailyGoalMinutes: v })} />
          </Field>
          <Field label={`Palabras nuevas al día: ${ls.newWordsPerDay}`} htmlFor="s-new">
            <Slider id="s-new" min={1} max={30} step={1} value={[ls.newWordsPerDay]} onValueChange={([v]) => setL({ newWordsPerDay: v })} />
          </Field>
          {lang === "zh" ? (
            <Field label="Lista HSK que sigues" htmlFor="s-hsk">
              <Select id="s-hsk" value={settings.hskList} onChange={(e) => set("hskList", e.target.value as Settings["hskList"])} className="w-full">
                <option value="both">Ambas (HSK 2.0 + HSK 3.0)</option>
                <option value="3.0">HSK 3.0 (300 palabras en el nivel 1)</option>
                <option value="2.0">HSK 2.0 (150 palabras en el nivel 1)</option>
              </Select>
            </Field>
          ) : null}
        </div>
      </Section>

      <Section id="texto" glyph={G.texto} title={`Texto, ${pack.readingAid.name.toLowerCase()} y escritura`} description={`Atajos: P ${pack.readingAid.name.toLowerCase()}, T traducción.`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`${pack.readingAid.name} por defecto`} htmlFor="s-py">
            <Select id="s-py" value={settings.pinyinMode} onChange={(e) => set("pinyinMode", e.target.value as Settings["pinyinMode"])} className="w-full">
              <Option value="show">{pack.readingAid.modes.show}</Option>
              <Option value="unknown">{pack.readingAid.modes.unknown}</Option>
              <Option value="hide">{pack.readingAid.modes.hide}</Option>
            </Select>
          </Field>
          <Field label="Tipografía de estudio" htmlFor="s-font">
            <Select id="s-font" value={ls.font} onChange={(e) => setL({ font: e.target.value })} className="w-full">
              {pack.theme.fontOptions.map((f) => (
                <Option key={f.id} value={f.id}>
                  {f.label}
                </Option>
              ))}
            </Select>
          </Field>
          <Field label={`Tamaño del texto en ${meta.names.adjective}: ${Math.round(settings.zhFontScale * 100)} %`} htmlFor="s-scale">
            <Slider id="s-scale" min={0.8} max={1.8} step={0.05} value={[settings.zhFontScale]} onValueChange={([v]) => set("zhFontScale", v)} />
          </Field>
          {pack.readingAid.options.map((o) => (
            <Toggle key={o.id} label={o.label} hint={o.description} checked={ls.readingOptions?.[o.id] ?? o.default} onChange={(v) => setL({ readingOptions: { ...ls.readingOptions, [o.id]: v } })} />
          ))}
          {pack.readingAid.altScript ? <Toggle label={pack.readingAid.altScript.label} hint={pack.readingAid.altScript.description} checked={settings.showTraditional} onChange={(v) => set("showTraditional", v)} /> : null}
          <Toggle label="Mostrar traducciones" checked={settings.showTranslation} onChange={(v) => set("showTranslation", v)} />
        </div>
        {pack.readingAid.weanMessage ? <p className="mt-3 text-xs text-ink-faint"><Mixed>{pack.readingAid.weanMessage}</Mixed></p> : null}

        {lang === "zh" ? (
          <>
            <InkDivider label="声调" className="my-5" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Toggle label="Colorear sílabas por tono" checked={settings.toneColorsEnabled} onChange={(v) => set("toneColorsEnabled", v)} />
              <Toggle label="Indicador de tono adicional (marca grande)" hint="Para no depender solo del color." checked={settings.toneMarks} onChange={(v) => set("toneMarks", v)} />
              <Field label="Esquema de colores de tono" htmlFor="s-tones">
                <Select id="s-tones" value={settings.toneScheme} onChange={(e) => set("toneScheme", e.target.value as Settings["toneScheme"])} className="w-full" disabled={!settings.toneColorsEnabled}>
                  <Option value="xueban">学伴 (armonizado con el papel)</Option>
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
          </>
        ) : null}
        <div className="card-sunk mt-4 p-4">
          <TargetText text={TEXT_SAMPLE[lang].text} size="lg" />
          <p className="mt-1 text-xs text-ink-faint"><Mixed>{TEXT_SAMPLE[lang].es}</Mixed></p>
        </div>
      </Section>

      <Section
        id="voz"
        glyph={G.voz}
        title="Voz (texto a voz)"
        description={`Si hay audios pregenerados (npm run audio:build) se usan primero; si no, la voz del navegador. En Windows, instala la voz: Configuración → Hora e idioma → Voz → Agregar voces → ${VOICE_WINDOWS[lang]}.`}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Voz ${pack.bcp47} del navegador`} htmlFor="s-voice">
            <Select id="s-voice" value={ls.voiceURI ?? (lang === "zh" ? settings.tts.voiceURI : "")} onChange={(e) => setL({ voiceURI: e.target.value })} className="w-full">
              <option value="">Automática (la mejor disponible)</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  <Mixed>{v.name}</Mixed> ({v.lang}){v.localService ? "" : " · online"}
                </option>
              ))}
            </Select>
            {!voices.length ? <p className="mt-1 text-xs text-danger">No se ha encontrado ninguna voz para {meta.names.adjective} en este navegador.</p> : null}
          </Field>
          <Field label={`Velocidad: ${settings.tts.rate.toFixed(2)}×`} htmlFor="s-rate">
            <Slider id="s-rate" min={0.5} max={1.3} step={0.05} value={[settings.tts.rate]} onValueChange={([v]) => void update({ tts: { ...settings.tts, rate: v } })} />
          </Field>
          <Toggle label="Preferir audios MP3 pregenerados" checked={settings.tts.preferGenerated} onChange={(v) => void update({ tts: { ...settings.tts, preferGenerated: v } })} />
          <div className="flex items-end">
            <Button variant="outline" onClick={() => void speak(VOICE_SAMPLE[lang], { rate: settings.tts.rate, preferGenerated: false })}>
              <Volume2 /> Probar voz
            </Button>
          </div>
        </div>
      </Section>

      <Section
        id="anki"
        glyph={G.anki}
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
        <div className="mb-4">
          <Label className="mb-2 block">Sincronizar con Anki por idioma</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {LANGS.map((l) => (
              <Toggle
                key={l}
                label={`${LANG_META[l].names.es}`}
                hint={settings.langs[l].anki.deckPrefix}
                checked={settings.anki.langs?.[l] !== false}
                onChange={(v) => void update({ anki: { ...settings.anki, langs: { ...settings.anki.langs, [l]: v } } })}
              />
            ))}
          </div>
        </div>
        <p className="mb-3 text-xs text-ink-faint">
          Los botones de abajo actúan sobre <Mixed>{meta.names.adjective}</Mixed> (tipo de nota «<Mixed>{pack.anki.modelName}</Mixed>», mazo «<Mixed>{pack.anki.deckRoot}</Mixed>»).
        </p>
        <AnkiPanel />
      </Section>

      <Section id="llm" glyph={G.llm} title="Traducción automática (opcional)" description="Solo para traducir subtítulos de vídeos frase a frase. Proveedor intercambiable; la clave se guarda en este navegador. Sin proveedor, se usan Tatoeba y el diccionario.">
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

      <Section id="datos" glyph={G.datos} title="Datos y copias de seguridad" description="Copia en JSON con palabras, tarjetas, progreso y ajustes: de todos los idiomas o solo de uno.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              download(`xueban-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportBackup());
              toast.success("Copia exportada (todos los idiomas)");
            }}
          >
            <Download /> Exportar todo
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              download(`xueban-${lang}-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportBackup(lang));
              toast.success(`Copia exportada (${meta.names.adjective})`);
            }}
          >
            <Download /> Exportar solo <Mixed>{meta.names.adjective}</Mixed>
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

        {backups.length ? (
          <div className="mt-4">
            <Label className="mb-1 block">Copias automáticas antes de actualizar la base de datos</Label>
            <ul className="space-y-1 text-sm">
              {backups.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-line px-3 py-1.5">
                  <span className="text-ink-soft">
                    {new Date(b.id).toLocaleString("es-ES")} · <Mixed>{b.reason}</Mixed> · {(b.size / 1024).toFixed(0)} KB
                  </span>
                  <span className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const row = await getBackup(b.id);
                        if (row) download(`xueban-auto-${b.id.slice(0, 10)}.json`, row.json);
                      }}
                    >
                      <Download /> Descargar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await deleteBackup(b.id);
                        setBackups(await listBackups());
                      }}
                      aria-label="Borrar copia"
                    >
                      <Trash2 />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-danger/30 bg-danger/5 p-3">
          <p className="text-sm text-ink-soft">Borra el progreso de {meta.names.adjective} en este navegador y vuelve a cargar su vocabulario base. Los demás idiomas no se tocan.</p>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!window.confirm(`¿Seguro? Se borra todo el progreso de ${meta.names.adjective} en este navegador.`)) return;
              await resetProgress(lang);
              toast.success("Progreso reiniciado");
            }}
          >
            <RotateCcw /> Reiniciar <Mixed>{meta.names.adjective}</Mixed>
          </Button>
        </div>
      </Section>
    </div>
  );
}

/** Sección de ajustes: divisor a pincel con el glifo y título editorial; el contenido sobre papel elevado. */
function Section({ id, glyph, title, description, action, children }: { id: string; glyph: string; title: React.ReactNode; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 pt-4">
      <InkDivider label={glyph} className="my-3" />
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif-es text-xl font-semibold tracking-tight text-ink">{title}</h2>
          {description ? <CardDescription className="mt-1 max-w-2xl"><Mixed>{description}</Mixed></CardDescription> : null}
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
      {hint ? <p className="mt-1 text-xs text-ink-faint"><Mixed>{hint}</Mixed></p> : null}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[8px] border border-line bg-paper-sunk/40 px-3 py-2 text-sm transition-colors hover:border-ink/30">
      <span>
        <span className="block text-ink">{label}</span>
        {hint ? <span className="block text-xs text-ink-faint"><Mixed>{hint}</Mixed></span> : null}
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
              <Mixed>{s}</Mixed>
            </span>
          </span>
        );
      })}
      <span className="ml-auto text-[11px] text-ink-faint">1 · 2 · 3 · 4 · neutro</span>
    </div>
  );
}
