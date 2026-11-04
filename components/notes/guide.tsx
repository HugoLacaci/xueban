"use client";
/**
 * «Cómo tomar apuntes de chino»: guía corta y visual (principios + métodos integrados) y tour interactivo
 * que recorre la app la primera vez (bandeja → plantillas → Cornell → errores → repaso).
 */
import { useState } from "react";
import { ArrowRight, BookOpenCheck, Check, Inbox, Layers, Link2, ListChecks, MessageSquareQuote, Pencil, RefreshCw, AlertTriangle, Sparkles, X } from "lucide-react";
import Link from "@/lib/languages/link";
import { useSettings } from "@/lib/settings";
import { usePack } from "@/lib/languages/provider";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Progress } from "@/components/ui/primitives";
import { TargetText } from "@/components/target/target-text";
import { FormulaChips } from "@/components/notes/editor/formula-block";
import { openQuickCapture } from "./quick-capture";
import { openNewNote } from "./new-note-dialog";
import { cn } from "@/lib/utils";
import { Mixed } from "@/components/target/mixed";

const PRINCIPLES: { zh: string; title: string; text: string; bad?: string; good?: string }[] = [
  { zh: "一", title: "Una idea por apunte", text: "«在 + lugar» es un apunte; «la clase del martes» son cinco. Los apuntes pequeños se enlazan, se buscan y se repasan mejor.", bad: "Clase 3: 在, 有, números, 吗…", good: "在 + lugar + verbo" },
  { zh: "例", title: "Siempre frases de ejemplo, nunca palabras sueltas", text: "Tu cerebro recuerda situaciones, no listas. Escribe la frase que dirías tú, con tu nombre, tu ciudad, tu comida.", bad: "喝 = beber", good: "我想喝咖啡。 Quiero beber café." },
  { zh: "式", title: "Estructuras como fórmulas", text: "Con huecos de colores: S + 在 + lugar + V + O. La fórmula se rellena con tu vocabulario y se convierte en ejercicio." },
  { zh: "比", title: "Anotar los contrastes (A vs B)", text: "不/没, 二/两, 会/能/可以… El chino se entiende por contraste. Una tabla y una regla de una línea para decidir en un segundo." },
  { zh: "我", title: "En mis propias palabras", text: "Copiar del libro no es aprender. Explícalo como se lo contarías a un compañero: si no sabes explicarlo, aún no lo sabes." },
  { zh: "问", title: "Convertir cada apunte en preguntas", text: "Columna de preguntas clave (método Cornell): «¿Cómo se niega 有?». Al repasar tapas la respuesta e intentas recordar." },
  { zh: "连", title: "Enlazar apuntes entre sí", text: "[[不 vs 没]] desde el apunte de 了; la palabra 在 desde la fórmula. Cada enlace es un camino más para recuperar el recuerdo." },
  { zh: "复", title: "Repasar con espaciado", text: "Las preguntas, frases y errores entran en el repaso (FSRS): hoy, en 3 días, en una semana… justo antes de olvidarlas." },
];

const FLOW = [
  { zh: "课中", title: "Durante la clase", icon: <Inbox className="size-5" />, text: "Captura rápida en la bandeja: texto suelto, foto del cuaderno o la pizarra, audio del profesor (con su permiso). Sin ordenar nada. Atajo N.", action: { label: "Hacer una captura", run: () => openQuickCapture() } },
  { zh: "课后", title: "Después de clase (10 min)", icon: <Sparkles className="size-5" />, text: "«Procesar bandeja»: la app sugiere la plantilla (palabra, estructura, contraste, pregunta…) y prerrellena los campos. Tú añades ejemplos tuyos y preguntas clave.", href: "/apuntes/bandeja", label: "Abrir la bandeja" },
  { zh: "每周", title: "Cada semana", icon: <RefreshCw className="size-5" />, text: "Repaso guiado: lo que añadiste esta semana, tus errores más repetidos y lo que más olvidas. 15 minutos el domingo.", href: "/apuntes/repasar?weekly=1", label: "Repaso semanal" },
];

const METHODS = [
  { zh: "康", title: "Cornell adaptado", icon: <ListChecks className="size-5" />, text: "Cada apunte tiene una columna de preguntas clave y un resumen de una línea. Al repasar, la app muestra la pregunta y tapa la respuesta." },
  { zh: "错", title: "错题本 · cuaderno de errores", icon: <AlertTriangle className="size-5" />, text: "El método de los estudiantes chinos. Cada error de un ejercicio o corrección va ahí solo: lo que escribí, lo correcto, el porqué, la regla y mi reflexión. Se repasa con SRS.", href: "/apuntes/errores" },
  { zh: "句", title: "Sentence mining · frases enteras", icon: <MessageSquareQuote className="size-5" />, text: "Botón «minar» en cualquier ejemplo, vídeo o lectura: la frase entera (chunk) pasa a tarjeta y ejercicio. Las frases se recuperan de golpe al hablar." },
  { zh: "稿", title: "Mi guion personal", icon: <Pencil className="size-5" />, text: "Presentarme, mis estudios, el máster en China, mi familia, mis gustos. Lo mejoras al subir de nivel y guardas versiones.", href: "/apuntes/profesor?q=guion" },
  { zh: "图", title: "Mapas mentales por tema", icon: <Link2 className="size-5" />, text: "«En el restaurante»: vocabulario, frases y estructuras del tema organizadas en ramas, como las vas a necesitar al hablar." },
];

const TOUR = [
  { title: "Captura rápida (N)", text: "Pulsa N en cualquier pantalla o el botón «+ apunte» de la barra superior. Lo que captures va a la bandeja con el contexto de dónde estabas.", zh: "快" },
  { title: "Plantillas", text: "«Nuevo apunte» te pide elegir una plantilla. Cada una te obliga a lo importante: ejemplos, fórmula, contrastes, cómo se responde…", zh: "模" },
  { title: "Editor de bloques", text: "Escribe / para insertar: texto chino con pinyin, ejemplo, fórmula, tabla, aviso, ejercicio, dibujo, foto, audio. [[ para enlazar y # para etiquetar. Escribe ni3hao3 y pulsa Tab para los hanzi.", zh: "块" },
  { title: "Preguntas Cornell", text: "A la derecha de cada apunte, añade preguntas clave con su respuesta. La app te sugiere algunas. Se repasan tapando la respuesta.", zh: "问" },
  { title: "De apunte a práctica", text: "«Crear tarjetas y ejercicios» convierte palabras, frases, huecos y preguntas en tarjetas FSRS (y a Anki si quieres), y «Practicar este apunte» genera ejercicios de transformación.", zh: "练" },
  { title: "Errores y repaso", text: "Los fallos del cuaderno de ejercicios entran solos en el 错题本. En «Repasar» tienes el modo Cornell y el repaso semanal.", zh: "复" },
];

export function NotesGuide() {
  const pack = usePack();
  const update = useSettings((s) => s.update);
  const tourDone = useSettings((s) => s.settings.notesTourDone);
  const [step, setStep] = useState<number | null>(null);

  const finish = () => {
    setStep(null);
    void update({ notesTourDone: true });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cómo tomar apuntes de chino"
        zh="笔记方法"
        subtitle="No hace falta saber tomar apuntes: la app te guía. Ocho principios, un flujo en tres tiempos y cuatro métodos que la app aplica por ti."
        action={
          <Button variant={tourDone ? "outline" : "default"} onClick={() => setStep(0)}>
            <BookOpenCheck /> {tourDone ? "Repetir el tour" : "Tour de 2 minutos"}
          </Button>
        }
      />

      <section>
        <h2 className="mb-3 font-serif-es text-xl font-semibold text-ink">Los 8 principios</h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {PRINCIPLES.map((p, i) => (
            <li key={p.zh} className="card-paper flex gap-3 p-4">
              <span lang="zh-CN" className="zh-kai flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-paper-sunk text-2xl leading-none text-cinnabar" aria-hidden="true">
                {p.zh}
              </span>
              <div className="min-w-0">
                <h3 className="font-medium text-ink">
                  <span className="tabular mr-1 text-ink-faint">{i + 1}.</span> <Mixed>{p.title}</Mixed>
                </h3>
                <p className="mt-0.5 text-sm text-ink-soft"><Mixed>{p.text}</Mixed></p>
                {p.bad && p.good ? (
                  <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                    <p className="rounded-[6px] bg-danger/8 px-2 py-1 text-danger">
                      ❌ <Mixed>{p.bad}</Mixed>
                    </p>
                    <p className="rounded-[6px] bg-celadon/12 px-2 py-1 text-celadon-ink">
                      ✅ {pack.hasTargetText(p.good) ? <TargetText text={p.good} size="sm" ruby={false} /> : <Mixed>{p.good}</Mixed>}
                    </p>
                  </div>
                ) : null}
                {p.zh === "式" ? (
                  <div className="mt-2">
                    <FormulaChips size="sm" parts={[{ text: "Sujeto", role: "subject" }, { text: "在", role: "other" }, { text: "lugar", role: "place" }, { text: "V", role: "verb" }, { text: "O", role: "object" }]} />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 font-serif-es text-xl font-semibold text-ink">El flujo en 3 tiempos</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {FLOW.map((f, i) => (
            <Card key={f.zh} className="relative flex flex-col">
              <span className="absolute right-4 top-3 font-serif-es text-3xl text-ink/10 tabular" aria-hidden="true">
                {i + 1}
              </span>
              <div className="mb-2 flex items-center gap-2 text-cinnabar">
                {f.icon}
                <span lang="zh-CN" className="zh-kai text-lg">
                  {f.zh}
                </span>
              </div>
              <h3 className="font-medium text-ink"><Mixed>{f.title}</Mixed></h3>
              <p className="mt-1 flex-1 text-sm text-ink-soft"><Mixed>{f.text}</Mixed></p>
              <div className="mt-3">
                {"href" in f && f.href ? (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={f.href}>{f.label}</Link>
                  </Button>
                ) : "action" in f && f.action ? (
                  <Button size="sm" variant="secondary" onClick={f.action.run}>
                    {f.action.label}
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif-es text-xl font-semibold text-ink">Métodos que la app aplica por ti</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {METHODS.map((m) => (
            <li key={m.zh} className="card-paper flex gap-3 p-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-paper-sunk text-ink-soft">{m.icon}</span>
              <div className="min-w-0">
                <h3 className="font-medium text-ink">
                  <span lang="zh-CN" className="zh-kai mr-1.5 text-cinnabar">
                    {m.zh}
                  </span>
                  <Mixed>{m.title}</Mixed>
                </h3>
                <p className="mt-0.5 text-sm text-ink-soft"><Mixed>{m.text}</Mixed></p>
                {m.href ? (
                  <Link href={m.href} className="mt-1 inline-flex items-center gap-1 text-xs text-indigo underline-offset-2 hover:underline">
                    abrir <ArrowRight className="size-3" />
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card-paper flex flex-wrap items-center gap-3 p-4">
        <Layers className="size-5 text-celadon-ink" />
        <p className="min-w-0 flex-1 text-sm text-ink">
          Los <strong>apuntes del profesor</strong> (gramática del HSK 1, todas las preguntas, partículas, contrastes…) están escritos con estas plantillas: úsalos como modelo, duplícalos y anótalos.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/apuntes/profesor">Ver apuntes del profesor</Link>
        </Button>
        <Button size="sm" onClick={() => openNewNote()}>
          Crear mi primer apunte
        </Button>
      </section>

      {step !== null ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-label="Tour de los apuntes">
          <div className="card-paper w-full max-w-md p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-ink-faint tabular">
                Paso {step + 1} de {TOUR.length}
              </span>
              <button type="button" onClick={finish} className="rounded p-1 text-ink-faint hover:text-ink" aria-label="Cerrar tour">
                <X className="size-4" />
              </button>
            </div>
            <Progress value={((step + 1) / TOUR.length) * 100} className="mb-4 h-1" />
            <div className="flex gap-3">
              <span lang="zh-CN" className="zh-kai flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-paper-sunk text-3xl text-cinnabar" aria-hidden="true">
                {TOUR[step].zh}
              </span>
              <div>
                <h3 className="font-serif-es text-lg font-semibold text-ink"><Mixed>{TOUR[step].title}</Mixed></h3>
                <p className="mt-1 text-sm text-ink-soft"><Mixed>{TOUR[step].text}</Mixed></p>
              </div>
            </div>
            <div className="mt-4 flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, (s ?? 1) - 1))} disabled={step === 0}>
                Anterior
              </Button>
              {step < TOUR.length - 1 ? (
                <Button size="sm" variant="ink" onClick={() => setStep((s) => (s ?? 0) + 1)}>
                  Siguiente <ArrowRight />
                </Button>
              ) : (
                <Button size="sm" variant="jade" onClick={finish}>
                  <Check /> ¡Entendido!
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <p className={cn("text-xs text-ink-faint")}>Consejo: imprime tus apuntes (PDF con <span lang="zh-CN">田字格</span>) para llevarlos a clase y escribir encima.</p>
    </div>
  );
}
