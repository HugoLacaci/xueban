"use client";
/** Páginas propias del coreano en «Aprender»: conjugación, números y clasificadores, niveles de habla. */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { AudioButton } from "@/components/target/audio-button";
import { Markdown } from "@/components/learn/markdown";
import { ExerciseRunner } from "@/components/exercises/runner";
import { cn, seededRandom } from "@/lib/utils";
import type { Exercise } from "@/lib/exercises/types";
import { conjugateKo, guessIrregular, KO_FORMS, KO_IRREGULAR_INFO, HONORIFIC_SPECIAL } from "../conjugation";
import { KO_COUNTERS, koCounters, NATIVE_ATTR, NATIVE_NUMBERS, SINO_NUMBERS } from "../characters";
import { genConjugation } from "../exercises";
import { SEED } from "../content";
import { HangulInput } from "./common";
import { Mixed } from "@/components/target/mixed";

const SAMPLES = ["먹다", "가다", "마시다", "공부하다", "듣다", "춥다", "모르다", "쓰다", "살다", "좋다", "그렇다"];

export function KoConjugationPage() {
  const [verb, setVerb] = useState(SAMPLES[0]);
  const [mine, setMine] = useState("");
  const [drill, setDrill] = useState<Exercise[] | null>(null);
  const start = () => {
    const rng = seededRandom(Date.now() % 100000);
    const words = SEED.words.filter((w) => w.hanzi.endsWith("다")).map((w) => ({ id: w.id, hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning }));
    const out: Exercise[] = [];
    for (let i = 0; i < 40 && out.length < 12; i++) {
      const e = genConjugation({ words, allWords: words, sentences: [] }, rng);
      if (e) out.push(e);
    }
    setDrill(out);
  };
  if (drill) return <ExerciseRunner exercises={drill} context="practice" title="Conjugación" onFinish={() => setDrill(null)} />;
  const irr = guessIrregular(verb);
  const v = mine.trim().endsWith("다") ? mine.trim() : verb;
  return (
    <div className="space-y-5">
      <PageHeader title="Conjugación" zh="활용" subtitle="Todas las formas del TOPIK I con los irregulares ㅂ, ㄷ, ㅅ, 르, ㅎ, 으 y ㄹ; escribe cualquier verbo o adjetivo en infinitivo (-다)." action={<Button onClick={start}>Practicar (12)</Button>} />
      <div className="flex flex-wrap gap-1.5">
        {SAMPLES.map((s) => (
          <button key={s} onClick={() => setVerb(s)} lang="ko-KR" className={cn("rounded-[8px] border px-2.5 py-1", verb === s ? "border-ink bg-ink text-paper" : "border-line")}>
            {s}
          </button>
        ))}
      </div>
      <HangulInput value={mine} onChange={setMine} mode="text" placeholder="Escribe un verbo: 배우다, 만들다…" />
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <span lang="ko-KR" className="ko text-3xl">
            {v}
          </span>
          <AudioButton text={v} />
          <Badge variant="outline">{guessIrregular(v) ? `irregular ${guessIrregular(v)}` : "regular"}</Badge>
          {HONORIFIC_SPECIAL[v] ? <Badge variant="muted">honorífico: {HONORIFIC_SPECIAL[v]}</Badge> : null}
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {KO_FORMS.map((f) => {
            const c = conjugateKo(v, f.id, v === verb ? irr : undefined);
            return c ? (
              <div key={f.id} className="flex items-center justify-between gap-2 rounded-[8px] border border-line px-3 py-1.5">
                <span className="text-sm text-ink-soft">
                  <Mixed>{f.name}</Mixed> <span lang="ko-KR" className="text-xs text-ink-faint">{f.native}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span lang="ko-KR" className="ko text-lg">
                    {c}
                  </span>
                  <AudioButton text={c} size="sm" />
                </span>
              </div>
            ) : null;
          })}
        </div>
      </Card>
      <div className="grid gap-2 sm:grid-cols-2">
        {KO_IRREGULAR_INFO.map((i) => (
          <Card key={i.id} className="p-3">
            <p className="font-medium text-ink" lang="ko-KR">
              <Mixed>{i.name}</Mixed>
            </p>
            <p className="text-sm text-ink-soft"><Mixed>{i.description}</Mixed></p>
            <p className="mt-1 text-xs text-ink-faint" lang="ko-KR">
              {i.examples.map((e) => `${e} → ${conjugateKo(e, "ayo")}`).join(" · ")}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function KoCountersPage() {
  const [n, setN] = useState(3);
  return (
    <div className="space-y-4">
      <PageHeader title="Números y clasificadores" zh="수와 단위 명사" subtitle="Dos sistemas de números y los clasificadores (단위 명사) del nivel." />
      <Card>
        <Markdown>{koCounters.markdown ?? ""}</Markdown>
      </Card>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((k) => (
          <button key={k} onClick={() => setN(k)} className={cn("size-9 rounded-full border text-sm tabular", n === k ? "border-ink bg-ink text-paper" : "border-line")}>
            {k}
          </button>
        ))}
      </div>
      <Card className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-ink-faint">nativo</p>
          <p lang="ko-KR" className="ko text-2xl">
            {NATIVE_NUMBERS[n - 1]}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">nativo + clasificador</p>
          <p lang="ko-KR" className="ko text-2xl">
            {NATIVE_ATTR[n - 1]} 개
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">sino-coreano</p>
          <p lang="ko-KR" className="ko text-2xl">
            {SINO_NUMBERS[n - 1]}
          </p>
        </div>
      </Card>
      <div className="grid gap-2 sm:grid-cols-2">
        {KO_COUNTERS.map((c) => {
          const num = c.system === "nativo" ? NATIVE_ATTR[n - 1] : SINO_NUMBERS[n - 1];
          const ex = `${c.nouns[0]} ${num} ${c.counter}`;
          return (
            <Card key={c.counter + c.system} className="flex items-center justify-between gap-2 p-3">
              <div>
                <p>
                  <span lang="ko-KR" className="ko text-xl">
                    {c.counter}
                  </span>{" "}
                  <span className="text-sm text-ink-faint"><Mixed>{c.es}</Mixed></span> <Badge variant="outline">{c.system}</Badge>
                </p>
                {c.note ? <p className="text-xs text-ink-soft"><Mixed>{c.note}</Mixed></p> : null}
              </div>
              <span className="flex items-center gap-1">
                <span lang="ko-KR" className="text-sm">
                  {ex}
                </span>
                <AudioButton text={ex} size="sm" />
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const LEVELS = [
  { name: "합니다체 (formal)", desc: "Noticias, anuncios, presentaciones, el primer saludo con un desconocido de más edad.", ex: [["저는 학생입니다.", "Soy estudiante."], ["감사합니다.", "Gracias."]] },
  { name: "해요체 (cortés)", desc: "El estándar del día a día con quien no tienes confianza: tiendas, profesores, compañeros nuevos.", ex: [["저는 학생이에요.", "Soy estudiante."], ["어디 가요?", "¿Adónde vas?"]] },
  { name: "반말 (informal)", desc: "Solo con amigos íntimos de tu edad, hermanos menores o niños, y cuando el otro te lo propone (말 놓을까요?).", ex: [["나는 학생이야.", "Soy estudiante."], ["어디 가?", "¿Adónde vas?"]] },
  { name: "-(으)시- (honorífico)", desc: "Eleva al sujeto de la frase (profesores, mayores, clientes). Nunca se usa para uno mismo.", ex: [["선생님이 오세요.", "Viene la profesora."], ["할머니께서 주무세요.", "La abuela está durmiendo."]] },
];

export function KoPolitenessPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Niveles de habla" zh="존댓말과 반말" subtitle="En coreano el final del verbo indica la relación con tu interlocutor. Empieza siempre en 해요체 y deja que el otro proponga pasar a 반말." />
      {LEVELS.map((l) => (
        <Card key={l.name}>
          <p className="font-serif-es text-lg text-ink" lang="ko-KR">
            <Mixed>{l.name}</Mixed>
          </p>
          <p className="text-sm text-ink-soft"><Mixed>{l.desc}</Mixed></p>
          <ul className="mt-2 space-y-1">
            {l.ex.map(([k, es]) => (
              <li key={k} className="flex items-center gap-2 text-sm">
                <AudioButton text={k} size="sm" />
                <span lang="ko-KR" className="ko">
                  {k}
                </span>
                <span className="text-ink-faint">{es}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
