"use client";
import Link from "@/lib/languages/link";
import { ArrowRight, Brain, Ear, Layers, Mic, PenLine, Puzzle, RefreshCw, Shuffle, Sparkles, Target, Timer, School } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { InkDivider } from "@/components/ornament";
import { usePack } from "@/lib/languages/provider";
import { CULTURE, quoteOfDayFor } from "@/lib/languages/culture";
import { Lattice } from "@/components/ornament";
import type { Lang } from "@/lib/languages/types";
import { Mixed } from "@/components/target/mixed";


const BASE = [
  { icon: <RefreshCw />, zh: "习", title: "Repaso espaciado (FSRS)", text: "Todo lo que aprendes entra en un sistema de repaso que calcula cuándo estás a punto de olvidarlo. Repasa cada día lo que te toca: 10 minutos diarios valen más que 2 horas el domingo.", link: "/flashcards/repasar", linkLabel: "Repasar ahora" },
  { icon: <Brain />, zh: "忆", title: "Recordar antes de releer", text: "Siempre intenta producir o elegir la respuesta antes de verla. El esfuerzo de recuperar es lo que fija la memoria; releer solo da sensación de saber.", link: "/practicar", linkLabel: "Practicar" },
  { icon: <Ear />, zh: "听", title: "Mucho input comprensible", text: "Lee y escucha cosas donde entiendas el 95 %. La app te dice qué % de cada texto o vídeo conoces: elige los verdes, aprende las pocas palabras nuevas y sigue.", link: "/lectura", linkLabel: "Leer" },
  { icon: <Sparkles />, zh: "调", title: "Tonos desde el día 1", text: "El pinyin va coloreado por tono en toda la app. Escucha, imita exagerando, grábate y compara la curva. Un tono mal dicho es otra palabra.", link: "/aprender/leccion/u0p-l1", linkLabel: "Los tonos" },
  { icon: <Puzzle />, zh: "字", title: "Caracteres por componentes", text: "Cada carácter se descompone en radical + componentes con etimología. Aprende los 50 radicales más útiles y los caracteres dejan de ser dibujos aleatorios.", link: "/caracteres", linkLabel: "Caracteres" },
  { icon: <Layers />, zh: "句", title: "Palabras en contexto", text: "Cada palabra lleva una frase de ejemplo. Mina frases de vídeos y lecturas: una tarjeta de frase vale más que diez listas.", link: "/videos", linkLabel: "Vídeos" },
  { icon: <Shuffle />, zh: "混", title: "Intercalado", text: "Las sesiones mezclan tipos de ejercicio y temas. Es más incómodo que practicar lo mismo 20 veces, y precisamente por eso funciona.", link: "/practicar?mode=random", linkLabel: "Práctica intercalada" },
  { icon: <Mic />, zh: "说", title: "Habla desde el principio", text: "Shadowing (escuchar y repetir pegado al audio) y reconocimiento de voz. No esperes a «estar listo»: nadie lo está.", link: "/practicar?mode=skill&skill=speaking", linkLabel: "Hablar" },
  { icon: <PenLine />, zh: "写", title: "Escribe a mano (un poco)", text: "Trazar el carácter con el orden correcto refuerza la memoria y te enseña a leer letra manuscrita. No hace falta escribirlo todo: los 100 más frecuentes bastan al principio.", link: "/caracteres", linkLabel: "Practicar escritura" },
  { icon: <Timer />, zh: "短", title: "Sesiones cortas, un objetivo", text: "Cada lección dura 10–15 minutos y tiene un único objetivo. Feedback inmediato y explicado: no solo ✔/✘, sino por qué.", link: "/aprender", linkLabel: "Curso" },
  { icon: <Target />, zh: "恒", title: "Motivación sana", text: "Racha y objetivo diario, sin castigos ni trucos. Mira las métricas que importan: palabras conocidas, minutos de input, % de comprensión, predicción HSK.", link: "/progreso", linkLabel: "Progreso" },
  { icon: <School />, zh: "校", title: "Complementa la escuela", text: "Tras cada clase, 2 minutos en el cuaderno: vocabulario → flashcards y Anki con un clic. Lo que ve tu profesor aparece en tus ejercicios al día siguiente.", link: "/study-hall/cuaderno", linkLabel: "Cuaderno de clase" },
];

export function HowToLearn() {
  const pack = usePack();
  const lang = pack.id;
  const PRINCIPLES = principlesFor(lang, pack.exam.name);
  const q = quoteOfDayFor(lang);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Cómo aprender" zh={CULTURE_HOWTO[lang]} subtitle={`Doce principios basados en la investigación en adquisición de segundas lenguas y en lo que funciona específicamente para el ${pack.meta.names.adjective}. Cada decisión de diseño de la app sale de aquí.`} />

      <figure className="card-paper relative mb-6 overflow-hidden px-6 py-7 text-center sm:px-10">
        <div className="text-ink">
          <Lattice variant="ice" opacity={0.05} size={44} />
        </div>
        <blockquote className="relative">
          <p lang={pack.bcp47} className="zh-kai text-2xl leading-relaxed text-ink sm:text-3xl">
            <Mixed>{q.text}</Mixed>
          </p>
          <p className="mt-1 text-sm text-ink-faint"><Mixed>{q.reading}</Mixed></p>
        </blockquote>
        <figcaption className="relative mt-2 font-serif-es text-base text-ink-soft"><Mixed>{q.es}</Mixed></figcaption>
      </figure>

      <InkDivider label={CULTURE_TWELVE[lang]} />

      <ol className="grid gap-3 sm:grid-cols-2">
        {PRINCIPLES.map((p, i) => (
          <li key={p.title} className="card-paper relative flex gap-4 p-5">
            <span className="flex shrink-0 flex-col items-center gap-1">
              <span lang={pack.bcp47} className="zh-serif flex size-10 items-center justify-center rounded-[8px] bg-paper-sunk text-xl leading-none text-cinnabar" aria-hidden="true">
                <Mixed>{p.zh}</Mixed>
              </span>
              <span className="tabular font-serif-es text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
            </span>
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 font-serif-es text-lg font-semibold leading-snug tracking-tight text-ink">
                <Mixed>{p.title}</Mixed>
                <span className="text-ink-faint [&_svg]:size-4" aria-hidden="true">
                  {p.icon}
                </span>
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft"><Mixed>{p.text}</Mixed></p>
              <Link href={p.link} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo underline-offset-4 hover:underline">
                <Mixed>{p.linkLabel}</Mixed> <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </li>
        ))}
      </ol>

      <InkDivider label={CULTURE[lang].stats.week} className="mt-6" />

      <div className="card-paper p-5 text-sm sm:p-6">
        <h2 className="font-serif-es text-xl font-semibold tracking-tight text-ink">Tu rutina de 30 minutos</h2>
        <ol className="mt-3 space-y-2 text-ink-soft">
          {[
            ["Repasos", "5–10 min", "flashcards pendientes (o Anki si es tu fuente de verdad)."],
            ["Lección nueva", "10–12 min", "vocabulario → diálogo → gramática → ejercicios."],
            ["Práctica intercalada", "5 min", `mezcla de ${MIX[lang]} y frases; «mis errores» una vez por semana.`],
            ["Input", "5–10 min", "una lectura graduada o un vídeo con ≥ 90 % de comprensión; mina 2–3 frases."],
          ].map(([t, min, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="tabular mt-0.5 w-5 shrink-0 font-serif-es text-base font-semibold text-cinnabar">{i + 1}</span>
              <span>
                <strong className="text-ink">{t}</strong> <span className="tabular text-ink-faint">({min})</span>: <Mixed>{d}</Mixed>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-ink-faint">El panel «Hoy» te genera este plan cada día según lo que tengas pendiente.</p>
      </div>
    </div>
  );
}

const CULTURE_HOWTO: Record<Lang, string> = { zh: "学习方法", ja: "学び方", ko: "공부법" };
const CULTURE_TWELVE: Record<Lang, string> = { zh: "十二", ja: "十二", ko: "열둘" };
const MIX: Record<Lang, string> = { zh: "tonos, caracteres", ja: "kana, kanji, partículas", ko: "pronunciación, partículas" };
const GLYPHS: Record<Lang, string[]> = {
  zh: ["习", "忆", "听", "调", "字", "句", "混", "说", "写", "短", "恒", "校"],
  ja: ["習", "憶", "聴", "音", "字", "文", "混", "話", "書", "短", "恒", "校"],
  ko: ["복", "기", "듣", "발", "글", "문", "섞", "말", "쓰", "짧", "꾸", "학"],
};
const SPECIFIC: Record<Lang, Record<number, { title: string; text: string; link: string; linkLabel: string }>> = {
  zh: {},
  ja: {
    3: { title: "Acento tonal y sonidos largos", text: "El japonés no tiene tonos como el chino, pero sí acento tonal (alto/bajo) y la duración importa: おばさん (tía) no es おばあさん (abuela), きて no es きって. Actívalo en Ajustes y escucha antes de leer.", link: "/aprender", linkLabel: "Curso" },
    4: { title: "Kana primero, kanji por componentes", text: "Hiragana en una semana y katakana en otra, con mnemotecnias. Después, cada kanji se descompone en componentes: aprende los más frecuentes y los kanji dejan de ser dibujos aleatorios.", link: "/caracteres", linkLabel: "Kana y kanji" },
    8: { title: "Escribe a mano (un poco)", text: "Traza el kana y los kanji más frecuentes con el orden correcto en la cuadrícula 練習帳: refuerza la memoria y te enseña a leer letra manuscrita.", link: "/caracteres", linkLabel: "Practicar escritura" },
  },
  ko: {
    3: { title: "Pronunciación real desde el día 1", text: "El hangul se escribe de una forma y se pronuncia con reglas de enlace: 한국어 suena [한구거]. Distingue consonantes lisas, aspiradas y tensas (달/탈/딸) y activa «pronunciación real» cuando dudes.", link: "/aprender", linkLabel: "Curso" },
    4: { title: "Hangul en un día, bloques por jamo", text: "El alfabeto coreano se aprende en uno o dos días: cada sílaba es un bloque de jamo. Quita la romanización en cuanto puedas; los hanja son un extra opcional para el vocabulario sino-coreano.", link: "/caracteres", linkLabel: "Hangul" },
    8: { title: "Escribe a mano (un poco)", text: "Traza los jamo con el orden correcto y compón bloques: escribir refuerza la lectura y te ayuda con la ortografía de las palabras con 받침.", link: "/caracteres", linkLabel: "Practicar escritura" },
  },
};

function principlesFor(lang: Lang, exam: string) {
  return BASE.map((p, i) => {
    const sp = SPECIFIC[lang][i];
    const base = { ...p, zh: GLYPHS[lang][i], text: p.text.replace("predicción HSK", `predicción ${exam}`) };
    return sp ? { ...base, ...sp } : base;
  });
}
