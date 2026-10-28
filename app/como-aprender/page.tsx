import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Brain, Ear, Layers, Mic, PenLine, Puzzle, RefreshCw, Shuffle, Sparkles, Target, Timer, School } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { InkDivider } from "@/components/ornament";
import { DailyQuote } from "./quote";

export const metadata: Metadata = { title: "Cómo aprender con Xuébàn" };

const PRINCIPLES = [
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

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Cómo aprender con Xuébàn" zh="学习方法" subtitle="Doce principios basados en la investigación en adquisición de segundas lenguas y en lo que funciona específicamente para el chino. Cada decisión de diseño de la app sale de aquí." />

      <DailyQuote />

      <InkDivider label="十二" />

      <ol className="grid gap-3 sm:grid-cols-2">
        {PRINCIPLES.map((p, i) => (
          <li key={p.title} className="card-paper relative flex gap-4 p-5">
            <span className="flex shrink-0 flex-col items-center gap-1">
              <span lang="zh-CN" className="zh-serif flex size-10 items-center justify-center rounded-[8px] bg-paper-sunk text-xl leading-none text-cinnabar" aria-hidden="true">
                {p.zh}
              </span>
              <span className="tabular font-serif-es text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
            </span>
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 font-serif-es text-lg font-semibold leading-snug tracking-tight text-ink">
                {p.title}
                <span className="text-ink-faint [&_svg]:size-4" aria-hidden="true">
                  {p.icon}
                </span>
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.text}</p>
              <Link href={p.link} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo underline-offset-4 hover:underline">
                {p.linkLabel} <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </li>
        ))}
      </ol>

      <InkDivider label="每日" className="mt-6" />

      <div className="card-paper p-5 text-sm sm:p-6">
        <h2 className="font-serif-es text-xl font-semibold tracking-tight text-ink">Tu rutina de 30 minutos</h2>
        <ol className="mt-3 space-y-2 text-ink-soft">
          {[
            ["Repasos", "5–10 min", "flashcards pendientes (o Anki si es tu fuente de verdad)."],
            ["Lección nueva", "10–12 min", "vocabulario → diálogo → gramática → ejercicios."],
            ["Práctica intercalada", "5 min", "mezcla de tonos, caracteres y frases; «mis errores» una vez por semana."],
            ["Input", "5–10 min", "una lectura graduada o un vídeo con ≥ 90 % de comprensión; mina 2–3 frases."],
          ].map(([t, min, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="tabular mt-0.5 w-5 shrink-0 font-serif-es text-base font-semibold text-cinnabar">{i + 1}</span>
              <span>
                <strong className="text-ink">{t}</strong> <span className="tabular text-ink-faint">({min})</span>: {d}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-ink-faint">El panel «Hoy» te genera este plan cada día según lo que tengas pendiente.</p>
      </div>
    </div>
  );
}
