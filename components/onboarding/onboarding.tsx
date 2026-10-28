"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check, PlugZap } from "lucide-react";
import { useSettings, type Settings } from "@/lib/settings";
import { useAnkiStatus } from "@/lib/anki/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Slider, Spinner } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { ChineseText, Hanzi } from "@/components/zh/chinese-text";
import { Seal, ShanShui, Lattice, XiaoMo, InkDivider } from "@/components/ornament";
import { cn } from "@/lib/utils";

const STEPS = [
  { es: "Nivel", zh: "水平" },
  { es: "Objetivo", zh: "目标" },
  { es: "Examen", zh: "考试" },
  { es: "Anki", zh: "同步" },
] as const;

const MOODS = ["happy", "think", "happy", "cheer"] as const;

export function Onboarding() {
  const { settings, update } = useSettings();
  const router = useRouter();
  const anki = useAnkiStatus();
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);
  const [draft, setDraft] = useState({
    name: settings.name,
    level: settings.level,
    dailyGoalMinutes: settings.dailyGoalMinutes,
    examDate: settings.examDate,
    hskList: settings.hskList,
    ankiEnabled: settings.anki.enabled,
  });
  const last = step === STEPS.length - 1;
  const sealText = !draft.name.trim() || /^hugo$/i.test(draft.name.trim()) ? "雨果" : "学友";

  const finish = async () => {
    await update({
      name: draft.name || "Hugo",
      level: draft.level,
      dailyGoalMinutes: draft.dailyGoalMinutes,
      examDate: draft.examDate,
      hskList: draft.hskList,
      anki: { ...settings.anki, enabled: draft.ankiEnabled },
      onboardingDone: true,
    });
    router.replace("/");
  };

  const choice = (active: boolean) =>
    cn(
      "rounded-[10px] border p-3 text-left text-sm transition-[border-color,background-color] duration-[var(--dur-ui)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised",
      active ? "border-ink bg-paper-sunk/70" : "border-line hover:border-ink/40 hover:bg-paper-sunk/40",
    );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-10 md:flex-row md:items-stretch md:gap-8">
      {/* Ilustración que se pinta sola */}
      <aside className="relative mb-5 overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper-raised md:mb-0 md:w-5/12 md:shrink-0" aria-hidden="true">
        <div className="relative h-52 md:h-full md:min-h-[560px]">
          {/* el paisaje completo, destapado por un «papel» que sube un cuarto por paso (solo transform) */}
          <div className="absolute inset-x-0 bottom-0 h-[115%] w-full">
            <ShanShui phase="day" seed={23} layers={4} height={9999} className="!h-full" />
          </div>
          <div
            className="absolute inset-x-0 top-0 h-full bg-paper-raised transition-transform duration-700 ease-[var(--ease-ink)] after:absolute after:inset-x-0 after:top-full after:h-28 after:bg-gradient-to-b after:from-paper-raised after:to-transparent after:content-[''] motion-reduce:transition-none"
            style={{ transform: `translateY(-${(step + 1) * 25}%)` }}
          />
          <Lattice className="text-ink" opacity={0.05} variant="ice" size={40} />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 md:p-6">
            <div className="flex items-center gap-3">
              <Seal text="学伴" size={44} title="Xuébàn" />
              <div className="leading-tight">
                <p className="font-serif-es text-lg text-ink">Xuébàn</p>
                <p className="hidden text-[11px] text-ink-faint md:block">tu compañero de chino</p>
              </div>
            </div>
            <span className="rounded-full bg-paper/70 px-2 py-0.5 text-[11px] text-ink-faint tabular">
              {step + 1} / {STEPS.length}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 md:p-6">
            <div className="hidden md:block">
              <AnimatePresence mode="wait">
                {last ? (
                  <motion.div key="welcome" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
                    <p className="text-3xl leading-none">
                      <Hanzi text="欢迎来到学伴" size="xl" font="serif" className="font-normal" />
                    </p>
                    <p className="mt-2 text-xs text-ink-soft">Huānyíng lái dào Xuébàn · Bienvenido a Xuébàn</p>
                  </motion.div>
                ) : (
                  <motion.p key={`q${step}`} lang="zh-CN" className="zh-kai max-w-[14rem] text-lg text-ink-soft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    {["千里之行，始于足下。", "不积跬步，无以至千里。", "有志者事竟成。"][step]}
                  </motion.p>
                )}
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
        <h1 className="font-serif-es text-2xl text-ink sm:text-3xl">Bienvenido a Xuébàn</h1>
        <ChineseText text="学伴：你的中文学习伙伴" size="sm" interactive={false} markUnknown={false} className="mt-1 text-ink-faint" />

        <ol className="mt-5 flex items-center gap-2" aria-label="Pasos">
          {STEPS.map((s, i) => (
            <li key={s.es} className="flex flex-1 items-center gap-2">
              <span
                className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium transition-colors", i < step ? "border-ink bg-ink text-paper" : i === step ? "border-cinnabar bg-cinnabar text-paper-raised" : "border-line text-ink-faint")}
                aria-current={i === step ? "step" : undefined}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("hidden text-xs sm:block", i === step ? "text-ink" : "text-ink-faint")}>
                {s.es} <span lang="zh-CN" className="zh ml-0.5 opacity-70">{s.zh}</span>
              </span>
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
                    <Input id="ob-name" className="mt-1" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Hugo" />
                  </div>
                  <div>
                    <Label>Tu nivel actual</Label>
                    <div className="mt-2 grid gap-2">
                      {(
                        [
                          ["zero", "Empiezo de cero", "Todavía no sé pinyin ni tonos."],
                          ["beginner", "Principiante", "Sé saludar y algunas palabras; preparo el HSK 1."],
                          ["hsk1", "Ya tengo HSK 1", "Quiero ir a por el HSK 2."],
                          ["hsk2", "HSK 2 o más", "Quiero consolidar y llegar al HSK 3."],
                        ] as [Settings["level"], string, string][]
                      ).map(([v, t, d]) => (
                        <button key={v} type="button" onClick={() => setDraft({ ...draft, level: v })} className={choice(draft.level === v)} aria-pressed={draft.level === v}>
                          <span className="block font-medium text-ink">{t}</span>
                          <span className="block text-xs text-ink-faint">{d}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : step === 1 ? (
                <div className="space-y-5">
                  <div>
                    <Label>
                      Objetivo diario: <span className="font-serif-es text-lg text-ink tabular">{draft.dailyGoalMinutes}</span> minutos
                    </Label>
                    <Slider className="mt-3" min={10} max={120} step={5} value={[draft.dailyGoalMinutes]} onValueChange={([v]) => setDraft({ ...draft, dailyGoalMinutes: v })} aria-label="Objetivo diario en minutos" />
                    <p className="mt-2 text-xs text-ink-faint">30 minutos diarios bien repartidos (repaso + lección + input) rinden más que 3 horas el domingo. Puedes cambiarlo en Ajustes.</p>
                  </div>
                  <div>
                    <Label>Lista HSK</Label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {(
                        [
                          ["both", "Ambas", "Recomendado"],
                          ["3.0", "HSK 3.0", "300 palabras"],
                          ["2.0", "HSK 2.0", "150 palabras"],
                        ] as [Settings["hskList"], string, string][]
                      ).map(([v, t, d]) => (
                        <button key={v} type="button" onClick={() => setDraft({ ...draft, hskList: v })} className={choice(draft.hskList === v)} aria-pressed={draft.hskList === v}>
                          <span className="block font-medium text-ink">{t}</span>
                          <span className="block text-xs text-ink-faint">{d}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : step === 2 ? (
                <div className="space-y-3">
                  <Label htmlFor="ob-exam">Fecha del examen HSK 1 (opcional)</Label>
                  <Input id="ob-exam" type="date" value={draft.examDate} onChange={(e) => setDraft({ ...draft, examDate: e.target.value })} />
                  <p className="text-xs text-ink-faint">
                    En 2026 la última convocatoria del HSK 2.0 es el 7 de noviembre y la primera oficial del HSK 3.0 está anunciada para el 13 de diciembre. Comprueba las fechas de tu centro en chinesetest.cn.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-ink">
                    Si usas <strong>Anki</strong> en este PC, Xuébàn puede crear y actualizar tus notas automáticamente (mazo <span lang="zh-CN">中文 Chino</span>, tipo de nota <span lang="zh-CN">中文 · Vocabulario (Hugo)</span>).
                  </p>
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
                    <input type="checkbox" checked={draft.ankiEnabled} onChange={(e) => setDraft({ ...draft, ankiEnabled: e.target.checked })} className="size-4 accent-[rgb(var(--cinnabar))]" />
                    Activar integración con Anki (puedes cambiarlo en Ajustes)
                  </label>
                  <p className="text-xs text-ink-faint">Sin Anki también funciona todo: la web tiene su propio repaso espaciado (FSRS) y puede exportar .apkg.</p>
                  <InkDivider className="my-3" />
                  <p className="text-sm text-ink-soft md:hidden">
                    <span lang="zh-CN" className="zh-serif text-xl text-ink">
                      欢迎来到学伴
                    </span>
                    <span className="block text-xs text-ink-faint">Huānyíng lái dào Xuébàn · Bienvenido a Xuébàn</span>
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
            <Button variant="ink" onClick={() => setStep((s) => s + 1)}>
              Siguiente <ArrowRight />
            </Button>
          ) : (
            <Button onClick={() => void finish()}>
              <Check /> Empezar
            </Button>
          )}
        </div>
        <button type="button" onClick={() => void finish()} className="mt-3 self-center rounded px-2 py-1 text-xs text-ink-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
          Saltar y usar valores por defecto
        </button>
      </div>
    </div>
  );
}
