"use client";
/** Página «Hangul y hanja», ficha de carácter, extras del diccionario y palabra del día (coreano). */
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import Link from "@/lib/languages/link";
import { Badge, Card, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { StrokeOrder } from "@/components/target/stroke-order";
import { AudioButton } from "@/components/target/audio-button";
import { SealTag } from "@/components/ornament/seal";
import { cn } from "@/lib/utils";
import { decompose, isHangulJamo, isHangulSyllable, romanizeRR } from "../phonology";
import { BASIC_CONSONANTS, BASIC_VOWELS, COMPOUND_VOWELS, TENSE_CONSONANTS } from "../strokes";
import { hanjaInfo, jamoInfo, koCharacters, loadHanja } from "../characters";
import { koDictionary } from "../dictionary";
import { SEED } from "../content";
import { Dubeolsik, PronunciationCompare, SyllableBlock } from "./common";
import { HangulConsonants, HangulVowels } from "./modules";
import { Mixed } from "@/components/target/mixed";

function useHanja() {
  const [ok, setOk] = useState(koCharacters.loaded());
  useEffect(() => {
    void loadHanja().then(() => setOk(true));
  }, []);
  return ok;
}

export function KoCharactersPage() {
  const ok = useHanja();
  const sinoWords = useMemo(() => SEED.words.filter((w) => String(w.extra?.hanja ?? "")), []);
  const hanjaList = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const w of sinoWords) {
      const h = Array.from(String(w.extra?.hanja));
      const s = Array.from(w.hanzi);
      if (h.length !== s.length) continue;
      h.forEach((c) => m.set(c, [...(m.get(c) ?? []), w.hanzi]));
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [sinoWords]);
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <PageHeader title="Hangul y hanja" zh="한글" subtitle="Los 40 jamo con su sonido, posición y trazos; los bloques silábicos; y, como módulo avanzado, los hanja de las raíces sino-coreanas (학 學, 생 生…) con su 훈음." />
      <Tabs defaultValue="consonantes">
        <TabsList className="w-full">
          <TabsTrigger value="consonantes" className="flex-1">
            자음
          </TabsTrigger>
          <TabsTrigger value="vocales" className="flex-1">
            모음
          </TabsTrigger>
          <TabsTrigger value="bloques" className="flex-1">
            Bloques
          </TabsTrigger>
          <TabsTrigger value="hanja" className="flex-1">
            한자
          </TabsTrigger>
        </TabsList>
        <TabsContent value="consonantes">
          <HangulConsonants params={{ set: "basic" }} />
          <h3 className="mt-4 font-serif-es text-lg">Tensas</h3>
          <HangulConsonants params={{ set: "tense" }} />
        </TabsContent>
        <TabsContent value="vocales">
          <HangulVowels params={{ set: "basic" }} />
          <h3 className="mt-4 font-serif-es text-lg">Compuestas</h3>
          <HangulVowels params={{ set: "compound" }} />
        </TabsContent>
        <TabsContent value="bloques">
          <BlockBuilder />
        </TabsContent>
        <TabsContent value="hanja">
          <p className="mb-2 text-sm text-ink-soft">El 60 % del vocabulario coreano es sino-coreano. No hace falta escribir hanja, pero reconocer las raíces ayuda a deducir palabras: 학 (學, estudiar) en 학교, 학생, 대학교; 생 (生, vida) en 학생, 생일, 선생님.</p>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
            {hanjaList.slice(0, 120).map(([h, ws]) => (
              <button key={h} onClick={() => setSel(h)} lang="ko-KR" className={cn("ko-hanja aspect-square rounded-[8px] border text-2xl", sel === h ? "border-cinnabar" : "border-line")} title={ws.join(", ")}>
                {h}
              </button>
            ))}
          </div>
          {sel && ok ? (
            <div className="mt-3">
              <KoCharacterDetail char={sel} />
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BlockBuilder() {
  const [cho, setCho] = useState("ㅎ");
  const [jung, setJung] = useState("ㅏ");
  const [jong, setJong] = useState("ㄴ");
  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
  const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  const syl = String.fromCharCode(0xac00 + CHO.indexOf(cho) * 588 + JUNG.indexOf(jung) * 28 + JONG.indexOf(jong));
  const pick = (list: string[], v: string, set: (x: string) => void) => (
    <div className="flex flex-wrap gap-1">
      {list.map((j) => (
        <button key={j || "∅"} onClick={() => set(j)} lang="ko-KR" className={cn("size-8 rounded border text-base", v === j ? "border-ink bg-ink text-paper" : "border-line")}>
          {j || "∅"}
        </button>
      ))}
    </div>
  );
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto]">
      <div className="space-y-2">
        <p className="text-xs text-ink-faint">Inicial</p>
        {pick(Array.from(CHO), cho, setCho)}
        <p className="text-xs text-ink-faint">Vocal</p>
        {pick(Array.from(JUNG), jung, setJung)}
        <p className="text-xs text-ink-faint">Final (받침)</p>
        {pick(JONG.slice(0, 22), jong, setJong)}
      </div>
      <Card className="flex flex-col items-center gap-3">
        <SyllableBlock syllable={syl} />
        <div className="flex items-center gap-2">
          <span lang="ko-KR" className="ko text-4xl">
            {syl}
          </span>
          <AudioButton text={syl} />
        </div>
        <p className="text-sm text-ink-soft">{romanizeRR(syl)}</p>
      </Card>
    </div>
  );
}

export function KoCharacterDetail({ char, onNavigate }: { char: string; onNavigate?(q: string): void }) {
  const ok = useHanja();
  const [, setTick] = useState(0);
  useEffect(() => {
    void koDictionary.load().then(() => setTick((t) => t + 1));
  }, []);
  const st = useLiveQuery(() => db.charStates.get(`ko:${char}`), [char]);
  const save = async (patch: { known?: boolean; canWrite?: boolean }) => {
    const cur = await db.charStates.get(`ko:${char}`);
    await db.charStates.put({ id: `ko:${char}`, lang: "ko", hanzi: char, known: cur?.known ?? false, canWrite: cur?.canWrite ?? false, writingAttempts: cur?.writingAttempts ?? 0, writingMistakes: cur?.writingMistakes ?? 0, mnemonic: cur?.mnemonic, ...patch, updatedAt: Date.now() });
  };
  const isHanja = /[一-鿿]/.test(char);
  const h = ok && isHanja ? hanjaInfo(char) : undefined;
  const words = isHanja ? koDictionary.wordsContaining?.(char, 12) ?? [] : [];
  const j = isHangulJamo(char) ? jamoInfo(char) : undefined;
  const s = isHangulSyllable(char) ? decompose(char) : null;
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start gap-5">
        {s ? <SyllableBlock syllable={char} size={120} /> : null}
        <StrokeOrder char={char} size={168} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span lang="ko-KR" className="ko text-5xl">
              {char}
            </span>
            {!isHanja ? <AudioButton text={j ? (BASIC_VOWELS.includes(char) || COMPOUND_VOWELS.includes(char) ? `ㅇ${char}` : char) : char} /> : null}
            {isHanja ? <SealTag>hanja</SealTag> : j ? <SealTag>{j.kind}</SealTag> : null}
          </div>
          {h ? (
            <p className="text-lg">
              <span lang="ko-KR">{h[0]}</span> <span className="text-ink-faint">(훈, significado)</span> · <strong lang="ko-KR">{h[1]}</strong> <span className="text-ink-faint">(음, lectura)</span>
            </p>
          ) : null}
          {j ? (
            <div className="text-sm text-ink-soft">
              <p>
                <span lang="ko-KR"><Mixed>{j.name}</Mixed></span> · inicial «{j.romanInitial || "muda"}»{j.romanFinal ? ` · final «${j.romanFinal}»` : ""} {j.type ? <Badge variant="outline">{j.type}</Badge> : null}
              </p>
              <p>{j.sound}</p>
              <p className="text-ink-faint">{j.mnemonic}</p>
            </div>
          ) : null}
          {s ? <PronunciationCompare text={char} /> : null}
          <div className="flex gap-2">
            <Button size="sm" variant={st?.known ? "jade" : "outline"} onClick={() => void save({ known: !st?.known })}>
              {st?.known ? "Lo reconozco ✓" : "Marcar como reconocido"}
            </Button>
          </div>
        </div>
      </div>
      {words.length ? (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-faint">Palabras con {char}</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {words.map((w) => (
              <button key={w.s} onClick={() => onNavigate?.(w.s)} className="flex items-center gap-2 rounded-[8px] border border-line px-2 py-1 text-left hover:bg-paper-sunk">
                <span lang="ko-KR" className="ko text-lg">
                  {w.s}
                </span>
                <span className="text-xs text-ink-faint">{w.t}</span>
                <span className="truncate text-xs text-ink-soft">{w.es ?? w.en[0]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

/** Extras del diccionario: búsqueda por consonantes iniciales (초성) con teclado y por hanja. */
export function KoDictionaryExtras({ onPick }: { onPick(q: string): void }) {
  const [q, setQ] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        Búsqueda por <strong>consonantes iniciales</strong> (초성 검색): teclea solo las iniciales, p. ej. <span lang="ko-KR">ㅎㄱ</span> → 한국, 학교… También puedes pegar un hanja (學) para ver las palabras que lo contienen.
      </p>
      <div className="flex items-center gap-2">
        <span lang="ko-KR" className="ko min-h-10 flex-1 rounded-[8px] border border-line bg-paper-raised px-3 py-1.5 text-2xl">
          {q || <span className="text-base text-ink-faint">ㅎㄱ</span>}
        </span>
        <Button onClick={() => q && onPick(q)} disabled={!q}>
          Buscar
        </Button>
      </div>
      <Dubeolsik onJamo={(j) => setQ((x) => x + j)} onBackspace={() => setQ((x) => x.slice(0, -1))} />
      <div className="flex flex-wrap gap-1">
        {["學", "生", "大", "人", "國", "語", "日", "時", "電", "話"].map((h) => (
          <button key={h} onClick={() => onPick(h)} className="size-10 rounded-[8px] border border-line text-xl hover:bg-paper-sunk" lang="ko-KR">
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 오늘의 단어 — palabra del día con su pronunciación real y su hanja. */
export function WordOfDay({ dayIndex }: { dayIndex: number }) {
  const w = SEED.words[dayIndex % Math.max(1, SEED.words.length)];
  if (!w) return null;
  const hanja = String(w.extra?.hanja ?? "");
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span lang="ko-KR" className="ko text-5xl">
          {w.hanzi}
        </span>
        <AudioButton text={w.hanzi} />
        {hanja ? (
          <span lang="ko-KR" className="ko-hanja text-2xl text-ink-faint">
            {hanja}
          </span>
        ) : null}
      </div>
      <p className="font-serif-es text-lg text-ink"><Mixed>{w.meaning}</Mixed></p>
      <p className="text-sm text-ink-soft">
        {romanizeRR(w.hanzi)} {String(w.extra?.pronunciation ?? w.hanzi) !== w.hanzi ? <span lang="ko-KR">· [{String(w.extra?.pronunciation)}]</span> : null}
      </p>
      <Link href={`/diccionario?q=${encodeURIComponent(w.hanzi)}`} className="text-sm text-indigo underline-offset-2 hover:underline">
        Ver ficha →
      </Link>
    </div>
  );
}

export { BASIC_CONSONANTS, TENSE_CONSONANTS };
