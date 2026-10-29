"use client";
/**
 * <TargetText>: texto en la lengua meta con ruby de lectura (pinyin / furigana / romanización),
 * colores de prosodia, marcado de palabras desconocidas y popup de diccionario. Es genérico:
 * pide al paquete activo el análisis (pack.analyze) y respeta el modo global de ayuda de lectura.
 */
import { memo, useMemo } from "react";
import { useSettings, type PinyinMode } from "@/lib/settings";
import { useKnowledge } from "@/lib/knowledge";
import { useDictionary } from "@/lib/dictionary/service";
import { openWordPopup } from "@/lib/popup-store";
import { usePack } from "@/lib/languages/provider";
import { useAnalysisTick } from "@/lib/languages/core/analysis-tick";
import type { AnalyzedToken } from "@/lib/languages/types";
import { cn } from "@/lib/utils";
import { Reading } from "./reading";

export interface TargetTextProps {
  text: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  /** Lectura de toda la frase (si se da, se muestra debajo en lugar de ruby) */
  pinyinLine?: string;
  translation?: string;
  mode?: PinyinMode; // fuerza modo de ayuda de lectura
  interactive?: boolean; // popup al pulsar
  markUnknown?: boolean;
  highlight?: string[]; // palabras a resaltar
  wordPinyin?: Record<string, string>; // lectura por palabra impuesta
  context?: string; // texto de contexto para minar (por defecto el propio texto)
  sourceRef?: string;
  as?: "span" | "p" | "div";
  ruby?: boolean; // false → sin ruby (solo colores)
  lang?: string;
}

interface WordRender {
  token: AnalyzedToken;
  known: boolean;
  inDeck: boolean;
}

export const SIZE: Record<NonNullable<TargetTextProps["size"]>, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-3xl",
  "2xl": "text-4xl sm:text-5xl",
  "3xl": "text-5xl sm:text-6xl",
};

function TargetTextImpl({ text, className, size = "md", pinyinLine, translation, mode, interactive = true, markUnknown = true, highlight, wordPinyin, context, sourceRef, as: Comp = "span", ruby = true, lang }: TargetTextProps) {
  const pack = usePack();
  const settings = useSettings((s) => s.settings);
  const dictStatus = useDictionary((s) => s.status);
  const tick = useAnalysisTick((s) => s.tick);
  const known = useKnowledge((s) => s.known);
  const knownChars = useKnowledge((s) => s.knownChars);
  const deck = useKnowledge((s) => s.deck);
  const pinyinMode = mode ?? settings.pinyinMode;
  const showTranslation = settings.showTranslation;
  const bcp47 = lang ?? pack.bcp47;
  const altScript = settings.showTraditional;

  const words = useMemo<WordRender[]>(() => {
    const { tokens } = pack.analyze(text, { wordReadings: wordPinyin });
    return tokens.map((token) => {
      const chars = Array.from(token.text);
      const isKnown = known.has(token.text) || (token.lemma ? known.has(token.lemma) : false) || (chars.length > 1 && chars.every((c) => known.has(c) || knownChars.has(c)));
      return { token, known: isKnown, inDeck: deck.has(token.text) || (token.lemma ? deck.has(token.lemma) : false) };
    });
    // dictStatus fuerza recomputar cuando el diccionario termina de cargar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, text, wordPinyin, known, knownChars, deck, dictStatus, tick]);

  const modeClass = pinyinMode === "hide" ? "pinyin-hidden" : pinyinMode === "unknown" ? "pinyin-unknown" : "";
  const fontClass = pack.theme.fontOptions.find((f) => f.id === settings.langs[pack.id]?.font)?.cls ?? "";
  const hasRuby = ruby && !pinyinLine;
  const colors = settings.toneColorsEnabled;

  const onOpen = (word: string, el: HTMLElement) => {
    if (!interactive) return;
    openWordPopup(word, el, context ?? text, sourceRef);
  };

  const body = (
    <span className={cn(pack.meta.cssClass, "leading-[1.9]", SIZE[size], fontClass, hasRuby && "[&_ruby]:leading-[2.1]", modeClass)} lang={bcp47}>
      {words.map((w, wi) => {
        const t = w.token;
        if (!t.isWord) {
          return (
            <span key={wi} className="text-ink-2">
              {t.text}
            </span>
          );
        }
        const unknown = markUnknown && !w.known;
        const hl = highlight?.includes(t.text) || (t.lemma ? highlight?.includes(t.lemma) : false);
        const display = altScript ? pack.altScript(t.text, t.reading) : t.text;
        const segs = altScript && display !== t.text ? [{ text: display, reading: undefined, cls: undefined, title: undefined }] : t.segments;
        return (
          <span
            key={wi}
            className={cn("zh-word", unknown && "zh-unknown", hl && "rounded bg-gold/20", interactive && "focus-visible:ring-2 focus-visible:ring-lacquer/40")}
            data-word={t.lemma ?? t.text}
            data-surface={t.text}
            title={t.note}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={(e) => onOpen(t.lemma ?? t.text, e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(t.lemma ?? t.text, e.currentTarget);
              }
            }}
          >
            {segs.map((c, ci) =>
              hasRuby && c.reading ? (
                <ruby key={ci} className={cn("zh-ruby", unknown && "zh-unknown")}>
                  <span className={colors ? c.cls : undefined}>{c.text}</span>
                  <rt className={cn(colors && c.cls)} title={c.title}>
                    {c.reading}
                  </rt>
                </ruby>
              ) : (
                <span key={ci} className={colors && c.cls ? c.cls : undefined}>
                  {c.text}
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
      {pinyinLine ? <Reading text={pinyinLine} as="span" className={cn("zh-pinyin-line mt-0.5 block text-sm text-muted", modeClass)} /> : null}
      {translation && showTranslation ? <span className="mt-0.5 block text-sm text-ink-2">{translation}</span> : null}
    </Comp>
  );
}

export const TargetText = memo(TargetTextImpl);
/** @deprecated alias de transición: usa <TargetText>. */
export const ChineseText = TargetText;

/** Carácter o palabra grande, protagonista (p. ej. en fichas). */
export function CharacterGlyph({ text, className, size = "2xl", font }: { text: string; className?: string; size?: TargetTextProps["size"]; font?: string }) {
  const pack = usePack();
  const settings = useSettings((s) => s.settings);
  const f = font ?? settings.langs[pack.id]?.font ?? "sans";
  const cls = pack.theme.fontOptions.find((o) => o.id === f)?.cls ?? "";
  return (
    <span lang={pack.bcp47} className={cn(pack.meta.cssClass, "font-medium leading-tight tracking-wide", SIZE[size], cls, className)}>
      {text}
    </span>
  );
}
/** @deprecated alias de transición: usa <CharacterGlyph>. */
export const Hanzi = CharacterGlyph;
