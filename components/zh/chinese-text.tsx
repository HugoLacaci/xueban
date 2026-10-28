"use client";
import { memo, useMemo } from "react";
import { segment } from "@/lib/segment";
import { getLexicon, lookupFirst, useDictionary } from "@/lib/dictionary/service";
import { distributePinyin, isHanzi, lexicalPinyinPerChar } from "@/lib/pinyin/convert";
import { applySandhi, toneOf } from "@/lib/pinyin/tones";
import { useSettings, type PinyinMode } from "@/lib/settings";
import { useKnowledge } from "@/lib/knowledge";
import { openWordPopup } from "@/lib/popup-store";
import { cn } from "@/lib/utils";
import { Pinyin } from "./pinyin";

export interface ChineseTextProps {
  text: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  /** Línea de pinyin de toda la frase (si se da, se muestra debajo en lugar de ruby) */
  pinyinLine?: string;
  translation?: string;
  mode?: PinyinMode; // fuerza modo de pinyin
  interactive?: boolean; // popup al pulsar
  markUnknown?: boolean;
  highlight?: string[]; // palabras a resaltar
  wordPinyin?: Record<string, string>; // pinyin por palabra impuesto
  context?: string; // texto de contexto para minar (por defecto el propio texto)
  sourceRef?: string;
  as?: "span" | "p" | "div";
  ruby?: boolean; // false → sin ruby (solo colores)
  lang?: string;
}

interface WordRender {
  text: string;
  isWord: boolean;
  chars: { hanzi: string; pinyin: string; tone: number; sandhi: string | null }[];
  known: boolean;
  inDeck: boolean;
}

const SIZE: Record<NonNullable<ChineseTextProps["size"]>, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-3xl",
  "2xl": "text-4xl sm:text-5xl",
  "3xl": "text-5xl sm:text-6xl",
};

/** Resuelve el pinyin por carácter de un texto usando diccionario/usuario + pinyin-pro. */
export function analyzeText(text: string, wordPinyin?: Record<string, string>) {
  const tokens = segment(text, getLexicon());
  const auto = lexicalPinyinPerChar(text);
  const perChar: string[] = [];
  const words: { token: (typeof tokens)[number]; py: string[] }[] = [];
  for (const t of tokens) {
    const chars = Array.from(t.text);
    let py: string[] = chars.map((c, i) => (isHanzi(c) ? auto[t.start + i] ?? "" : ""));
    if (t.isWord) {
      const override = wordPinyin?.[t.text] ?? lookupFirst(t.text)?.p;
      if (override) {
        const d = distributePinyin(t.text, override);
        if (d) py = d;
      }
    }
    perChar.push(...py);
    words.push({ token: t, py });
  }
  const sandhied = applySandhi(Array.from(text), perChar);
  return { tokens, words, sandhied };
}

function ChineseTextImpl({
  text,
  className,
  size = "md",
  pinyinLine,
  translation,
  mode,
  interactive = true,
  markUnknown = true,
  highlight,
  wordPinyin,
  context,
  sourceRef,
  as: Comp = "span",
  ruby = true,
  lang = "zh-CN",
}: ChineseTextProps) {
  const settings = useSettings((s) => s.settings);
  const dictStatus = useDictionary((s) => s.status);
  const known = useKnowledge((s) => s.known);
  const knownChars = useKnowledge((s) => s.knownChars);
  const deck = useKnowledge((s) => s.deck);
  const pinyinMode = mode ?? settings.pinyinMode;
  const showTranslation = settings.showTranslation;

  const words = useMemo<WordRender[]>(() => {
    const { words: ws, sandhied } = analyzeText(text, wordPinyin);
    return ws.map(({ token, py }) => {
      const chars = Array.from(token.text).map((hanzi, i) => {
        const s = sandhied[token.start + i];
        return { hanzi, pinyin: s?.pinyin || py[i] || "", tone: py[i] ? toneOf(py[i]) : 5, sandhi: s?.sandhi ?? null };
      });
      const isKnown = known.has(token.text) || (token.text.length > 1 && chars.every((c) => known.has(c.hanzi) || knownChars.has(c.hanzi)));
      return { text: token.text, isWord: token.isWord, chars, known: isKnown, inDeck: deck.has(token.text) };
    });
    // dictStatus fuerza recomputar cuando el diccionario termina de cargar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, wordPinyin, known, knownChars, deck, dictStatus]);

  const modeClass = pinyinMode === "hide" ? "pinyin-hidden" : pinyinMode === "unknown" ? "pinyin-unknown" : "";
  const fontClass = settings.zhFont === "serif" ? "zh-serif" : settings.zhFont === "kai" ? "zh-kai" : "";
  const hasRuby = ruby && !pinyinLine;

  const onOpen = (word: string, el: HTMLElement) => {
    if (!interactive) return;
    openWordPopup(word, el, context ?? text, sourceRef);
  };

  const body = (
    <span
      className={cn("zh leading-[1.9]", SIZE[size], fontClass, hasRuby && "[&_ruby]:leading-[2.1]", modeClass)}
      lang={lang}
    >
      {words.map((w, wi) => {
        if (!w.isWord) {
          return (
            <span key={wi} className="text-ink-2">
              {w.text}
            </span>
          );
        }
        const unknown = markUnknown && !w.known;
        const hl = highlight?.includes(w.text);
        return (
          <span
            key={wi}
            className={cn(
              "zh-word",
              unknown && "zh-unknown",
              hl && "rounded bg-gold/20",
              interactive && "focus-visible:ring-2 focus-visible:ring-lacquer/40",
            )}
            data-word={w.text}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={(e) => onOpen(w.text, e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(w.text, e.currentTarget);
              }
            }}
          >
            {w.chars.map((c, ci) =>
              hasRuby && isHanzi(c.hanzi) ? (
                <ruby key={ci} className={cn("zh-ruby", unknown && "zh-unknown")}>
                  <span className={settings.toneColorsEnabled ? `tone-${toneOf(c.pinyin) || c.tone}` : undefined}>{c.hanzi}</span>
                  <rt className={cn(settings.toneColorsEnabled && `tone-${toneOf(c.pinyin) || c.tone}`)} title={c.sandhi ? "sandhi tonal" : undefined}>
                    {c.pinyin}
                  </rt>
                </ruby>
              ) : (
                <span key={ci} className={settings.toneColorsEnabled && c.pinyin ? `tone-${toneOf(c.pinyin) || c.tone}` : undefined}>
                  {c.hanzi}
                </span>
              ),
            )}
          </span>
        );
      })}
    </span>
  );

  if (!pinyinLine && !translation) return <Comp className={className}>{body}</Comp>;
  return (
    <Comp className={cn("block", className)}>
      {body}
      {pinyinLine ? (
        <Pinyin text={pinyinLine} as="span" className={cn("zh-pinyin-line mt-0.5 block text-sm text-muted", modeClass)} />
      ) : null}
      {translation && showTranslation ? <span className="mt-0.5 block text-sm text-ink-2">{translation}</span> : null}
    </Comp>
  );
}

export const ChineseText = memo(ChineseTextImpl);

/** Carácter chino grande, protagonista (p. ej. en fichas). */
export function Hanzi({ text, className, size = "2xl", font }: { text: string; className?: string; size?: ChineseTextProps["size"]; font?: "sans" | "serif" | "kai" }) {
  const settings = useSettings((s) => s.settings);
  const f = font ?? settings.zhFont;
  return (
    <span lang="zh-CN" className={cn("zh font-medium leading-tight tracking-wide", SIZE[size], f === "serif" && "zh-serif", f === "kai" && "zh-kai", className)}>
      {text}
    </span>
  );
}
