"use client";
import { cn } from "@/lib/utils";
import { getActiveLang } from "@/lib/languages/registry";
import { quoteOfDayFor } from "@/lib/languages/culture";

/**
 * 小墨 Xiǎo Mò — una gotita de tinta con pincel. Mascota original, discreta: solo para estados vacíos,
 * ánimos y onboarding. Expresiones: feliz, pensativa, celebrando.
 */
export function XiaoMo({ size = 96, mood = "happy", className }: { size?: number; mood?: "happy" | "think" | "cheer" | "sleep"; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn("select-none", className)} role="img" aria-label="小墨, la mascota de Xuébàn">
      {/* pincel */}
      <g transform={mood === "cheer" ? "rotate(-25 70 60)" : "rotate(10 70 60)"}>
        <rect x="68" y="18" width="5" height="46" rx="2.5" fill="rgb(var(--ink))" opacity="0.85" />
        <path d="M66 62 L75 62 L72 78 Q70.5 82 69 78 Z" fill="rgb(var(--cinnabar))" />
      </g>
      {/* gota de tinta */}
      <path d="M50 14 C 58 30, 74 42, 74 60 A 24 24 0 0 1 26 60 C 26 42, 42 30, 50 14 Z" fill="rgb(var(--ink))" />
      <path d="M38 58 a 5 7 0 1 0 0.1 0" fill="rgb(var(--paper-raised))" opacity="0.18" />
      {/* ojos */}
      {mood === "sleep" ? (
        <g stroke="rgb(var(--paper))" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M40 58 q4 3 8 0" />
          <path d="M53 58 q4 3 8 0" />
        </g>
      ) : (
        <g fill="rgb(var(--paper))">
          <circle cx="43" cy="57" r={mood === "think" ? 2.4 : 3.2} />
          <circle cx="57" cy="57" r={mood === "think" ? 2.4 : 3.2} />
          <circle cx="44" cy="56" r="1" fill="rgb(var(--ink))" />
          <circle cx="58" cy="56" r="1" fill="rgb(var(--ink))" />
        </g>
      )}
      {/* boca / mejillas */}
      {mood === "cheer" ? <path d="M43 66 q7 7 14 0" fill="none" stroke="rgb(var(--paper))" strokeWidth="2.2" strokeLinecap="round" /> : mood === "think" ? <path d="M45 68 h9" stroke="rgb(var(--paper))" strokeWidth="2" strokeLinecap="round" /> : <path d="M45 66 q5 4 10 0" fill="none" stroke="rgb(var(--paper))" strokeWidth="2" strokeLinecap="round" />}
      <circle cx="36" cy="64" r="2.4" fill="rgb(var(--cinnabar))" opacity="0.7" />
      <circle cx="64" cy="64" r="2.4" fill="rgb(var(--cinnabar))" opacity="0.7" />
      {mood === "cheer" ? (
        <g fill="rgb(var(--cinnabar))" opacity="0.8">
          <circle cx="20" cy="30" r="2" />
          <circle cx="84" cy="26" r="1.6" />
          <circle cx="14" cy="48" r="1.4" />
        </g>
      ) : null}
    </svg>
  );
}

const QUOTES: { zh: string; py: string; es: string }[] = [
  { zh: "千里之行，始于足下。", py: "Qiānlǐ zhī xíng, shǐ yú zú xià.", es: "Un viaje de mil li empieza con un paso." },
  { zh: "学而时习之，不亦说乎？", py: "Xué ér shí xí zhī, bú yì yuè hū?", es: "Aprender y repasar a su tiempo, ¿no es una alegría?" },
  { zh: "温故而知新。", py: "Wēn gù ér zhī xīn.", es: "Repasar lo viejo para conocer lo nuevo." },
  { zh: "不积跬步，无以至千里。", py: "Bù jī kuǐbù, wú yǐ zhì qiānlǐ.", es: "Sin acumular pasos cortos no se llega a mil li." },
  { zh: "读书百遍，其义自见。", py: "Dú shū bǎi biàn, qí yì zì xiàn.", es: "Lee cien veces y el sentido aparece solo." },
  { zh: "熟能生巧。", py: "Shú néng shēng qiǎo.", es: "La práctica hace al maestro." },
  { zh: "加油！", py: "Jiāyóu!", es: "¡Ánimo!" },
  { zh: "有志者事竟成。", py: "Yǒu zhì zhě shì jìng chéng.", es: "Quien tiene voluntad, al final lo logra." },
];

/** Cita del día en la lengua activa (refranes de cada cultura, ver lib/languages/culture.ts). */
export function quoteOfDay(d = new Date()): (typeof QUOTES)[number] {
  const lang = getActiveLang();
  if (lang === "zh") {
    const day = Math.floor(d.getTime() / 86400000);
    return QUOTES[day % QUOTES.length];
  }
  const q = quoteOfDayFor(lang, d);
  return { zh: q.text, py: q.reading, es: q.es };
}

export { QUOTES };
