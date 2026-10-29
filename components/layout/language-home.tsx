"use client";
/**
 * Raíz «/»: redirige al último idioma usado; con ?elegir=1 (o desde el selector) muestra la portada
 * «Tres puertas»: un panel-puerta por idioma con su cultura, progreso y acceso en un clic.
 * Ver design/DIRECTION.md § Portada.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NextLink from "next/link";
import { ArrowRight, Settings as SettingsIcon } from "lucide-react";
import { useSettings, type LangSettings } from "@/lib/settings";
import { LANG_META, LANGS } from "@/lib/languages/registry";
import type { Lang } from "@/lib/languages/types";
import { greetingFor } from "@/lib/languages/culture";
import { globalSummary, type GlobalSummary } from "@/lib/stats";
import { playPortalPluck } from "@/lib/sounds";
import { dayPhase, type DayPhase } from "@/components/ornament/shan-shui";
import { Seal } from "@/components/ornament/seal";
import { Enso } from "@/components/ornament/ink-divider";
import { Lantern } from "@/components/ornament/tianzige";
import { PortalArt } from "@/components/ornament/portal-art";
import { Dialog, DialogContent, Input, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { LEVELS, EXAM_INFO, GOAL_HINT } from "@/lib/onboarding-data";
import { LangPortalCompact, LangPortalHero, PORTAL, type PortalStats } from "./lang-portal";
import { cn } from "@/lib/utils";

function esGreeting(h: number) {
  return h >= 5 && h < 13 ? "Buenos días" : h >= 13 && h < 19 ? "Buenas tardes" : "Buenas noches";
}

/** Idioma sugerido hoy: el que más repasos vencidos tiene; a igualdad, el menos practicado esta semana. */
export function recommendLang(active: Lang[], sum: GlobalSummary | null): Lang | undefined {
  if (!active.length) return undefined;
  if (!sum) return active[0];
  return active.slice().sort((a, b) => (sum.perLang[b]?.due ?? 0) - (sum.perLang[a]?.due ?? 0) || (sum.perLang[a]?.minutesWeek ?? 0) - (sum.perLang[b]?.minutesWeek ?? 0))[0];
}

export function LanguageHome() {
  const settings = useSettings((s) => s.settings);
  const loaded = useSettings((s) => s.loaded);
  const router = useRouter();
  const sp = useSearchParams();
  const choose = sp.get("elegir") === "1";
  const [sum, setSum] = useState<GlobalSummary | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (!settings.onboardingDone) {
      router.replace("/bienvenida");
      return;
    }
    if (!choose) router.replace(`/${settings.lastLang}`);
  }, [loaded, settings.onboardingDone, settings.lastLang, choose, router]);

  useEffect(() => {
    if (loaded && choose) void globalSummary(LANGS).then(setSum);
  }, [loaded, choose, settings.activeLangs]);

  if (!loaded || !choose) return null;
  return <Portada sum={sum} />;
}

function Portada({ sum }: { sum: GlobalSummary | null }) {
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const router = useRouter();
  const [now] = useState(() => new Date());
  const phase: DayPhase = dayPhase(now);
  const active = settings.activeLangs.filter((l) => LANGS.includes(l));
  const inactive = LANGS.filter((l) => !active.includes(l));
  const order = [...active, ...inactive];
  const rec = recommendLang(active, sum);
  const [hovered, setHovered] = useState<Lang | null>(null);
  const [setup, setSetup] = useState<Lang | null>(null);
  const [zoom, setZoom] = useState<{ lang: Lang; rect: DOMRect; full: boolean } | null>(null);
  const openLang = hovered ?? rec ?? order[0];
  const totalDue = sum ? active.reduce((n, l) => n + (sum.perLang[l]?.due ?? 0), 0) : 0;
  const goal = settings.dailyGoalMinutes;
  const name = settings.name?.trim() || "Hugo";
  const hour = now.getHours();

  const grow = (l: Lang) => {
    const isActive = active.includes(l);
    const base = isActive ? (active.length === 1 ? 2.3 : 1) : active.length >= 2 ? 0.62 : 0.78;
    return openLang === l ? base * (isActive ? 1.6 : 1.45) : base;
  };

  const stateOf = (l: Lang) => (!active.includes(l) ? "inactive" : l === rec && active.length > 1 ? "recommended" : "active");

  const enter = (e: React.MouseEvent<HTMLElement>, l: Lang) => {
    if (!active.includes(l)) {
      setSetup(l);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void update({ lastLang: l });
    if (reduced) return; // el enlace navega normalmente
    e.preventDefault();
    setZoom({ lang: l, rect: e.currentTarget.getBoundingClientRect(), full: false });
    requestAnimationFrame(() => requestAnimationFrame(() => setZoom((z) => (z ? { ...z, full: true } : z))));
    window.setTimeout(() => router.push(`/${l}`), 430);
  };

  const glowX = ((order.indexOf(openLang) + 0.5) / order.length) * 100;

  return (
    <div className="relative min-h-dvh overflow-x-clip" style={{ backgroundImage: `radial-gradient(70% 60% at ${glowX}% 70%, rgb(${PORTAL[openLang].accent} / 0.07), transparent 70%)`, transition: "background-image 400ms" }}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-8 lg:px-12">
        {/* cabecera mínima */}
        <header className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <Seal text="学伴" size={40} rotate={-3} variant="square" />
            <span className="font-serif-es text-lg font-semibold tracking-tight text-ink">Xuébàn</span>
          </span>
          <span className="flex items-center gap-1 text-sm text-ink-soft">
            <span className="flex min-h-11 items-center gap-1.5 rounded-full px-3" title="Racha global">
              <Lantern lit={(sum?.streak ?? 0) > 0} size={22} />
              <span className="tabular">{sum ? sum.streak : "–"}</span>
              <span className="sr-only">días de racha global</span>
            </span>
            <NextLink href={`/${settings.lastLang}/ajustes`} className="flex size-11 items-center justify-center rounded-full hover:bg-paper-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink" aria-label="Ajustes">
              <SettingsIcon className="size-5" />
            </NextLink>
          </span>
        </header>

        {/* saludo y resumen global */}
        <section className="mt-6 sm:mt-8" aria-labelledby="portada-titulo">
          <p className="portal-enter text-[15px] text-ink-soft" style={{ animationDelay: "40ms" }}>
            {esGreeting(hour)}, {name}
            {active.map((l) => (
              <span key={l}>
                {" · "}
                <span lang={LANG_META[l].bcp47}>{greetingFor(l, hour).text}</span>
              </span>
            ))}
          </p>
          <h1 id="portada-titulo" className="portal-enter mt-1 font-serif-es text-[clamp(34px,4.4vw,64px)] font-semibold leading-[1.05] tracking-tight text-ink" style={{ animationDelay: "80ms" }}>
            ¿Qué quieres estudiar hoy?
          </h1>
          <div className="portal-enter mt-4 flex min-h-12 flex-wrap items-center gap-2" style={{ animationDelay: "120ms" }}>
            {sum ? (
              <>
                <Chip>
                  <Enso size={30} progress={Math.min(1, sum.minutesToday / Math.max(1, goal))} label={`${sum.minutesToday} de ${goal} minutos hoy`} />
                  <span>
                    <span>
                    <b className="tabular font-semibold text-ink">{sum.minutesToday}</b> de {goal} min<span className="max-sm:hidden"> hoy</span>
                  </span>
                  </span>
                </Chip>
                <Chip>
                  <span>
                    <span className="font-serif-es text-lg font-semibold text-ink tabular">{totalDue}</span> repasos<span className="max-sm:hidden"> pendientes</span>
                  </span>
                </Chip>
                {rec && active.length > 1 ? (
                  <NextLink
                    href={`/${rec}`}
                    onPointerEnter={() => setHovered(rec)}
                    onPointerLeave={() => setHovered(null)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/25 bg-paper-raised px-4 text-[15px] text-ink-soft shadow-sm transition-colors hover:border-ink/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  >
                    <span className="max-sm:hidden">Te recomiendo empezar por</span>
                    <span className="sm:hidden">Empieza por</span>{" "}
                    <span lang={LANG_META[rec].bcp47} className="font-semibold text-ink">
                      {LANG_META[rec].names.native}
                    </span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </NextLink>
                ) : null}
              </>
            ) : (
              <>
                <span className="ink-skeleton h-11 w-44" />
                <span className="ink-skeleton h-11 w-40" />
                <span className="ink-skeleton h-11 w-64" />
              </>
            )}
          </div>
        </section>

        {/* las tres puertas */}
        <section aria-label="Idiomas" className="mt-6 flex flex-1 flex-col gap-4 md:grid md:grid-cols-2 lg:flex lg:max-h-[760px] lg:min-h-[520px] lg:flex-row lg:gap-5" style={{ height: undefined }}>
          {order.map((l, i) => {
            const st = stateOf(l);
            const isRec = l === rec;
            return (
              <LangPortalHero
                key={l}
                lang={l}
                index={i}
                state={st}
                stats={sum?.perLang[l] as PortalStats | undefined}
                phase={phase}
                open={openLang === l}
                href={`/${l}`}
                onOpenChange={(o) => {
                  setHovered(o ? l : null);
                  if (o) router.prefetch(`/${l}`);
                }}
                onHoverSound={() => playPortalPluck(l, settings.sounds)}
                onActivate={enter}
                className={cn(
                  "w-full",
                  st === "inactive" ? "h-[290px]" : isRec ? "h-[390px]" : "h-[340px]",
                  isRec && "max-lg:order-first md:col-span-2",
                  "md:h-[440px] lg:h-[clamp(520px,68vh,760px)] lg:min-w-0 lg:basis-0",
                )}
                style={{ flexGrow: grow(l) }}
              />
            );
          })}
        </section>

        <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[15px] text-ink-soft">
          <NextLink href="/me" className="inline-flex min-h-11 items-center gap-1.5 underline-offset-4 hover:text-ink hover:underline">
            Ver todos mis idiomas <ArrowRight className="size-4" aria-hidden="true" />
          </NextLink>
        </footer>
      </div>

      {/* transición: la puerta se abre a pantalla completa y continúa en el panel «Hoy» */}
      {zoom ? (
        <div
          data-skin={zoom.lang}
          className="portal-zoom"
          style={zoom.full ? { top: 0, left: 0, width: "100vw", height: "100dvh", borderRadius: 0 } : { top: zoom.rect.top, left: zoom.rect.left, width: zoom.rect.width, height: zoom.rect.height }}
          aria-hidden="true"
        >
          {(["far", "mid", "near"] as const).map((layer) => (
            <PortalArt key={layer} lang={zoom.lang} phase={phase} layer={layer} className="absolute inset-0 h-full w-full" />
          ))}
        </div>
      ) : null}

      <SetupDialog lang={setup} onClose={() => setSetup(null)} phase={phase} />
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-paper-raised/80 px-3.5 text-[15px] text-ink-soft shadow-sm sm:px-4">{children}</span>;
}

/** Mini-onboarding de un idioma nuevo: nivel, objetivo y fecha de examen; después entra. */
function SetupDialog({ lang, onClose, phase }: { lang: Lang | null; onClose: () => void; phase: DayPhase }) {
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const updateLang = useSettings((s) => s.updateLang);
  const router = useRouter();
  const [draft, setDraft] = useState<Partial<LangSettings>>({});
  // conserva el último idioma mientras el diálogo se cierra (sin parpadeo del contenido)
  const [shown, setShown] = useState<Lang>("ja");
  if (lang && lang !== shown) setShown(lang);
  const l = lang ?? shown;
  const cur = useMemo(() => ({ ...settings.langs[l], ...draft }), [settings.langs, l, draft]);
  const m = LANG_META[l];

  const start = async () => {
    await updateLang(l, { ...draft, active: true });
    await update({ activeLangs: settings.activeLangs.includes(l) ? settings.activeLangs : [...settings.activeLangs, l], lastLang: l });
    setDraft({});
    onClose();
    router.push(`/${l}`);
  };

  return (
    <Dialog open={lang !== null} onOpenChange={(o) => !o && (setDraft({}), onClose())}>
      <DialogContent title={`Empezar ${m.names.adjective}`} description={PORTAL[l].benefit}>
        <div className="space-y-4">
          <LangPortalCompact lang={l} phase={phase} state="active" selected />
          <div>
            <Label>Tu nivel</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {LEVELS[l].map(([v, t, d]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDraft((x) => ({ ...x, level: v }))}
                  aria-pressed={cur.level === v}
                  className={cn("min-h-12 rounded-[10px] border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink", cur.level === v ? "border-ink bg-paper-sunk/70" : "border-line hover:border-ink/40")}
                >
                  <span className="block font-medium text-ink">{t}</span>
                  <span className="block text-xs text-ink-soft">{d}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="setup-goal">Objetivo (opcional)</Label>
              <Input id="setup-goal" className="mt-1" value={cur.goal ?? ""} onChange={(e) => setDraft((x) => ({ ...x, goal: e.target.value }))} placeholder={`p. ej. ${GOAL_HINT[l]}`} />
            </div>
            <div>
              <Label htmlFor="setup-exam">{EXAM_INFO[l].label}</Label>
              <Input id="setup-exam" type="date" className="mt-1" value={cur.examDate ?? ""} onChange={(e) => setDraft((x) => ({ ...x, examDate: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => (setDraft({}), onClose())}>
              Más adelante
            </Button>
            <Button onClick={() => void start()}>
              Empezar <span lang={m.bcp47}>{m.names.native}</span> <ArrowRight />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated usa <LangPortalCompact>; se mantiene para compatibilidad. */
export function LangCard({ lang, stats, primary }: { lang: Lang; stats?: PortalStats; primary?: boolean; compact?: boolean }) {
  return (
    <NextLink href={`/${lang}`} className="block rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
      <LangPortalCompact lang={lang} stats={stats} phase={dayPhase()} state={primary ? "active" : "inactive"} />
    </NextLink>
  );
}
