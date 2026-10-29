"use client";
/**
 * Onboarding multi-idioma: «¿Qué quieres aprender?» (selección múltiple), y para cada idioma elegido
 * nivel, objetivo, minutos diarios y fecha de examen; después el objetivo total y Anki.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check, PlugZap } from "lucide-react";
import { useSettings, type LangSettings, type Settings } from "@/lib/settings";
import { useAnkiStatus } from "@/lib/anki/client";
import { LANG_META, LANGS } from "@/lib/languages/registry";
import type { Lang } from "@/lib/languages/types";
import { usePack } from "@/lib/languages/provider";
import { CULTURE } from "@/lib/languages/culture";
import { Button } from "@/components/ui/button";
import { Input, Label, Slider, Spinner } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Seal, XiaoMo, InkDivider } from "@/components/ornament";
import { cn } from "@/lib/utils";
import { LangPortalCompact } from "@/components/layout/lang-portal";
import { dayPhase } from "@/components/ornament/shan-shui";

const STEPS = ["Idiomas", "Nivel y objetivo", "Tiempo", "Anki"] as const;
const MOODS = ["happy", "think", "happy", "cheer"] as const;

import { LEVELS, EXAM_INFO, GOAL_HINT } from "@/lib/onboarding-data";

type Draft = Record<Lang, Pick<LangSettings, "level" | "goal" | "examDate" | "dailyGoalMinutes">>;

export function Onboarding() {
  const { settings, update } = useSettings();
  const pack = usePack();
  const router = useRouter();
  const anki = useAnkiStatus();
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState(settings.name);
  const [langs, setLangs] = useState<Lang[]>(settings.onboardingDone ? settings.activeLangs : []);
  const [tab, setTab] = useState<Lang>(settings.activeLangs[0] ?? "zh");
  const [hskList, setHskList] = useState(settings.hskList);
  const [ankiEnabled, setAnkiEnabled] = useState(settings.anki.enabled);
  const [draft, setDraft] = useState<Draft>(() => {
    const d = {} as Draft;
    for (const l of LANGS) {
      const s = settings.langs[l];
      d[l] = { level: s.level, goal: s.goal, examDate: s.examDate, dailyGoalMinutes: s.dailyGoalMinutes };
    }
    return d;
  });
  const last = step === STEPS.length - 1;
  const first = langs[0] ?? "zh";
  const sealText = !name.trim() || /^hugo$/i.test(name.trim()) ? LANG_META[first].sealUser : LANG_META[first].emblem;
  const total = langs.reduce((n, l) => n + draft[l].dailyGoalMinutes, 0);
  const culture = CULTURE[pack.id];
  const { Landscape } = pack.theme.ornaments;
  const phase = dayPhase();

  const toggleLang = (l: Lang) => {
    setLangs((cur) => {
      const next = cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l];
      if (next.length && !next.includes(tab)) setTab(next[0]);
      if (!cur.length) setTab(l);
      return next;
    });
  };
  const setLangDraft = (l: Lang, patch: Partial<Draft[Lang]>) => setDraft((d) => ({ ...d, [l]: { ...d[l], ...patch } }));

  const finish = async (skip = false) => {
    const chosen: Lang[] = langs.length ? langs : ["zh"];
    const nextLangs = { ...settings.langs };
    for (const l of LANGS) {
      const on = chosen.includes(l);
      nextLangs[l] = { ...nextLangs[l], active: on, ...(on && !skip ? draft[l] : {}) };
    }
    const zh = nextLangs.zh;
    const zhLevel = (["zero", "beginner", "hsk1", "hsk2"].includes(zh.level) ? zh.level : "beginner") as Settings["level"];
    await update({
      name: name || "Hugo",
      activeLangs: chosen,
      lastLang: chosen[0],
      langs: nextLangs,
      // campos heredados del chino, en sintonía con langs.zh
      level: zhLevel,
      examDate: zh.examDate,
      hskList,
      dailyGoalMinutes: skip ? settings.dailyGoalMinutes : Math.max(10, chosen.reduce((n, l) => n + nextLangs[l].dailyGoalMinutes, 0)),
      anki: { ...settings.anki, enabled: ankiEnabled },
      onboardingDone: true,
    });
    router.replace(`/${chosen[0]}`);
  };

  const choice = (active: boolean) =>
    cn(
      "rounded-[10px] border p-3 text-left text-sm transition-[border-color,background-color] duration-[var(--dur-ui)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised",
      active ? "border-ink bg-paper-sunk/70" : "border-line hover:border-ink/40 hover:bg-paper-sunk/40",
    );

  const canNext = step !== 0 || langs.length > 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-10 md:flex-row md:items-stretch md:gap-8">
      {/* Ilustración que se destapa paso a paso */}
      <aside className="relative mb-5 overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper-raised md:mb-0 md:w-5/12 md:shrink-0" aria-hidden="true">
        <div className="relative h-52 md:h-full md:min-h-[560px]">
          <div className="absolute inset-x-0 bottom-0 h-[115%] w-full">
            <Landscape phase="day" seed={23} layers={4} height={9999} className="!h-full" />
          </div>
          <div
            className="absolute inset-x-0 top-0 h-full bg-paper-raised transition-transform duration-700 ease-[var(--ease-ink)] after:absolute after:inset-x-0 after:top-full after:h-28 after:bg-gradient-to-b after:from-paper-raised after:to-transparent after:content-[''] motion-reduce:transition-none"
            style={{ transform: `translateY(-${(step + 1) * 25}%)` }}
          />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 md:p-6">
            <div className="flex items-center gap-2">
              {LANGS.map((l) => (
                <Seal key={l} text={LANG_META[l].emblem} size={34} tone={langs.includes(l) ? "cinnabar" : "ink"} className={cn("transition-opacity", langs.includes(l) ? "opacity-100" : "opacity-30")} title={LANG_META[l].names.es} />
              ))}
            </div>
            <span className="rounded-full bg-paper/70 px-2 py-0.5 text-[11px] text-ink-faint tabular">
              {step + 1} / {STEPS.length}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 md:p-6">
            <div className="hidden md:block">
              <AnimatePresence mode="wait">
                <motion.div key={`q${step}${first}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  {last ? (
                    <>
                      <p lang={LANG_META[first].bcp47} className={cn(LANG_META[first].cssClass, "zh-serif text-3xl leading-none text-ink")}>
                        {CULTURE[first].onboarding.welcome}
                      </p>
                      <p className="mt-2 text-xs text-ink-soft">{CULTURE[first].onboarding.welcomeReading}</p>
                    </>
                  ) : (
                    <p lang={pack.bcp47} className="zh-kai max-w-[14rem] text-lg text-ink-soft">
                      {culture.onboarding.proverbs[step % culture.onboarding.proverbs.length]}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex items-end gap-3">
              {last ? <Seal key="seal" text={sealText} size={64} stamped rotate={-6} title={`Sello personal ${sealText}`} /> : null}
              <XiaoMo mood={MOODS[step]} size={64} />
            </div>
          </div>
        </div>
      </aside>

      {/* Formulario */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h1 className="font-serif-es text-2xl text-ink sm:text-3xl">¿Qué quieres aprender?</h1>
        <p className="mt-1 text-sm text-ink-faint">Chino, japonés y coreano con el mismo método. Cada idioma guarda su propio progreso, repasos y mazos de Anki.</p>

        <ol className="mt-5 flex items-center gap-2" aria-label="Pasos">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium transition-colors", i < step ? "border-ink bg-ink text-paper" : i === step ? "border-cinnabar bg-cinnabar text-paper-raised" : "border-line text-ink-faint")}
                aria-current={i === step ? "step" : undefined}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("hidden text-xs sm:block", i === step ? "text-ink" : "text-ink-faint")}>{s}</span>
              {i < STEPS.length - 1 ? <span className={cn("h-px flex-1", i < step ? "bg-ink/50" : "bg-line")} /> : null}
            </li>
          ))}
        </ol>

        <div className="card-paper mt-4 min-h-72 p-5 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
              {step === 0 ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ob-name">¿Cómo te llamas?</Label>
                    <Input id="ob-name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Hugo" />
                  </div>
                  <div>
                    <Label>Elige uno o varios idiomas</Label>
                    <div className="mt-2 grid gap-2">
                      {LANGS.map((l) => {
                        const m = LANG_META[l];
                        const on = langs.includes(l);
                        const order = on ? (langs.indexOf(l) === 0 ? "principal" : `${langs.indexOf(l) + 1}.º`) : "";
                        return (
                          <button
                            key={l}
                            type="button"
                            onClick={() => toggleLang(l)}
                            aria-pressed={on}
                            className={cn("relative block w-full rounded-[16px] text-left outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised", on ? "ring-2 ring-ink/70" : "hover:ring-1 hover:ring-ink/30")}
                          >
                            <LangPortalCompact lang={l} phase={phase} state={on ? "active" : "inactive"} selected={on} />
                            {on ? <span className="absolute bottom-1.5 right-14 rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-paper">{order}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-ink-faint">El primero que marques será el principal (el que se abre al entrar). Puedes añadir o quitar idiomas cuando quieras desde el selector de la cabecera.</p>
                  </div>
                </div>
              ) : step === 1 ? (
                <div className="space-y-4">
                  {langs.length > 1 ? (
                    <div className="flex gap-1" role="tablist" aria-label="Idioma">
                      {langs.map((l) => (
                        <button key={l} type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)} className={cn("rounded-full border px-3 py-1 text-sm", tab === l ? "border-ink bg-ink text-paper" : "border-line text-ink-soft")}>
                          <span lang={LANG_META[l].bcp47}>{LANG_META[l].names.native}</span> · {LANG_META[l].names.es}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {(() => {
                    const l = langs.includes(tab) ? tab : first;
                    const d = draft[l];
                    return (
                      <div className="space-y-4" key={l}>
                        <div>
                          <Label>Tu nivel de {LANG_META[l].names.adjective}</Label>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {LEVELS[l].map(([v, t, desc]) => (
                              <button key={v} type="button" onClick={() => setLangDraft(l, { level: v })} className={choice(d.level === v)} aria-pressed={d.level === v}>
                                <span className="block font-medium text-ink">{t}</span>
                                <span className="block text-xs text-ink-faint">{desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`ob-goal-${l}`}>Tu objetivo (opcional)</Label>
                          <Input id={`ob-goal-${l}`} className="mt-1" value={d.goal} onChange={(e) => setLangDraft(l, { goal: e.target.value })} placeholder={`p. ej. ${GOAL_HINT[l]}`} />
                        </div>
                        <div>
                          <Label htmlFor={`ob-exam-${l}`}>{EXAM_INFO[l].label}</Label>
                          <Input id={`ob-exam-${l}`} type="date" className="mt-1" value={d.examDate} onChange={(e) => setLangDraft(l, { examDate: e.target.value })} />
                          <p className="mt-1 text-xs text-ink-faint">{EXAM_INFO[l].note}</p>
                        </div>
                        {l === "zh" ? (
                          <div>
                            <Label>Lista HSK</Label>
                            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                              {(
                                [
                                  ["both", "Ambas", "Recomendado"],
                                  ["3.0", "HSK 3.0", "300 palabras"],
                                  ["2.0", "HSK 2.0", "150 palabras"],
                                ] as [Settings["hskList"], string, string][]
                              ).map(([v, t, desc]) => (
                                <button key={v} type="button" onClick={() => setHskList(v)} className={choice(hskList === v)} aria-pressed={hskList === v}>
                                  <span className="block font-medium text-ink">{t}</span>
                                  <span className="block text-xs text-ink-faint">{desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              ) : step === 2 ? (
                <div className="space-y-5">
                  {langs.map((l) => (
                    <div key={l}>
                      <Label>
                        <span lang={LANG_META[l].bcp47}>{LANG_META[l].names.native}</span> · {LANG_META[l].names.es}: <span className="font-serif-es text-lg text-ink tabular">{draft[l].dailyGoalMinutes}</span> min al día
                      </Label>
                      <Slider className="mt-3" min={5} max={120} step={5} value={[draft[l].dailyGoalMinutes]} onValueChange={([v]) => setLangDraft(l, { dailyGoalMinutes: v })} aria-label={`Minutos diarios de ${LANG_META[l].names.adjective}`} />
                    </div>
                  ))}
                  <p className="text-sm text-ink">
                    Total: <span className="font-serif-es text-lg tabular">{total}</span> minutos al día
                  </p>
                  <p className="text-xs text-ink-faint">
                    30 minutos diarios bien repartidos (repaso + lección + input) rinden más que 3 horas el domingo. Si empiezas varios idiomas a la vez, da prioridad a uno y mantén los demás con el repaso diario. Puedes cambiarlo en Ajustes.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-ink">
                    Si usas <strong>Anki</strong> en este PC, la web puede crear y actualizar tus notas automáticamente. Cada idioma tiene su mazo y su tipo de nota:
                  </p>
                  <ul className="space-y-1 text-sm text-ink-soft">
                    {langs.map((l) => (
                      <li key={l}>
                        <span lang={LANG_META[l].bcp47}>{settings.langs[l].anki.deckPrefix}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        void anki.check(settings.anki.url).then((ok) => {
                          setChecked(true);
                          if (ok) toast.success("Anki conectado", `AnkiConnect v${useAnkiStatus.getState().version}`);
                          else toast.error("Anki no responde", useAnkiStatus.getState().error);
                        })
                      }
                      disabled={anki.checking}
                    >
                      {anki.checking ? <Spinner className="size-4" /> : <PlugZap />} {anki.checking ? "Comprobando…" : "Probar conexión"}
                    </Button>
                    {anki.connected ? (
                      <span className="flex items-center gap-1 text-sm text-celadon-ink">
                        <Check className="size-4" /> Conectado (AnkiConnect v{anki.version})
                      </span>
                    ) : null}
                  </div>
                  {checked && !anki.connected ? (
                    <div className="rounded-[10px] border border-danger/40 bg-danger/5 p-3 text-sm">
                      <p className="font-medium text-danger">No se puede conectar con Anki.</p>
                      {anki.error ? <p className="mt-0.5 text-xs text-ink-faint">{anki.error}</p> : null}
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-soft">
                        <li>Abre Anki en este PC (debe quedarse abierto mientras usas la web).</li>
                        <li>
                          Instala AnkiConnect: Herramientas → Complementos → Obtener complementos → código <code className="rounded bg-paper-sunk px-1">2055492159</code> → reinicia Anki.
                        </li>
                        <li>
                          Herramientas → Complementos → AnkiConnect → Configuración: en <code className="rounded bg-paper-sunk px-1">webCorsOriginList</code> añade{" "}
                          <code className="rounded bg-paper-sunk px-1">{typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}</code> y guarda.
                        </li>
                        <li>Vuelve a pulsar «Probar conexión». Puedes seguir sin Anki y configurarlo luego en Ajustes.</li>
                      </ol>
                    </div>
                  ) : null}
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" checked={ankiEnabled} onChange={(e) => setAnkiEnabled(e.target.checked)} className="size-4 accent-[rgb(var(--cinnabar))]" />
                    Activar integración con Anki (puedes elegir qué idiomas sincronizar en Ajustes)
                  </label>
                  <p className="text-xs text-ink-faint">Sin Anki también funciona todo: la web tiene su propio repaso espaciado (FSRS) y puede exportar .apkg.</p>
                  <InkDivider className="my-3" />
                  <p className="text-sm text-ink-soft md:hidden">
                    <span lang={LANG_META[first].bcp47} className={cn(LANG_META[first].cssClass, "zh-serif text-xl text-ink")}>
                      {CULTURE[first].onboarding.welcome}
                    </span>
                    <span className="block text-xs text-ink-faint">{CULTURE[first].onboarding.welcomeReading}</span>
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft /> Atrás
          </Button>
          {!last ? (
            <Button variant="ink" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Siguiente <ArrowRight />
            </Button>
          ) : (
            <Button onClick={() => void finish()}>
              <Check /> Empezar
            </Button>
          )}
        </div>
        {step === 0 && !langs.length ? <p className="mt-2 text-center text-xs text-ink-faint">Marca al menos un idioma para continuar.</p> : null}
        <button type="button" onClick={() => void finish(true)} className="mt-3 self-center rounded px-2 py-1 text-xs text-ink-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
          Saltar y usar valores por defecto
        </button>
      </div>
    </div>
  );
}
