"use client";
import Link from "@/lib/languages/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { seedWords } from "@/lib/db/repo";
import { loadCharInfo } from "../dictionary";
import type { CharInfo } from "@/lib/dictionary/types";
import { Hanzi } from "@/components/target/target-text";
import { Pinyin } from "@/components/target/reading";
import { AudioButton } from "@/components/target/audio-button";
import { WritingGrid } from "@/components/ornament/writing-grid";
import { SealTag } from "@/components/ornament/seal";
import { Mixed } from "@/components/target/mixed";

const CJK = /[一-鿿]/;

/** Elige de forma determinista (por índice de día) una palabra de la semilla y su primer carácter. */
export function charOfDay(dayIndex: number) {
  const words = seedWords().filter((w) => CJK.test(Array.from(w.hanzi)[0] ?? ""));
  const w = words[dayIndex % words.length];
  return { word: w, char: Array.from(w.hanzi)[0] };
}

const ETYMOLOGY: Record<string, string> = { ideographic: "ideograma", pictographic: "pictograma", "pictophonetic": "fonosemántico" };

/** 每日一字 — el carácter del día en 田字格, con su pinyin, significado y etimología. */
export function CharOfDay({ dayIndex }: { dayIndex: number }) {
  const { word, char } = charOfDay(dayIndex);
  const [info, setInfo] = useState<CharInfo | null>(null);
  useEffect(() => {
    let alive = true;
    void loadCharInfo()
      .then((m) => {
        if (alive) setInfo(m.get(char) ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [char]);
  const pinyin = info?.pinyin?.[0] ?? word.pinyin.split(/\s+/)[0];
  const ety = info?.etymology;
  return (
    <div className="flex h-full flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex shrink-0 flex-col items-center gap-2 self-center sm:self-start">
        <WritingGrid size={132}>
          <span className="text-[84px] leading-none">
            <Hanzi text={char} size="3xl" font="serif" className="font-normal" />
          </span>
        </WritingGrid>
        <div className="flex items-center gap-1.5">
          <Pinyin text={pinyin} className="text-lg" />
          <AudioButton text={char} size="sm" />
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {word.hsk.some((x) => /1/.test(x)) ? <SealTag>HSK 1</SealTag> : <SealTag tone="ink">{word.category}</SealTag>}
          {info?.radical ? (
            <span className="text-xs text-ink-faint">
              radical <span lang="zh-CN" className="zh text-ink-soft">{info.radical}</span>
            </span>
          ) : null}
          {info?.strokes ? <span className="text-xs text-ink-faint tabular">{info.strokes} trazos</span> : null}
        </div>
        <p className="text-ink">
          Aparece en{" "}
          <span lang="zh-CN" className="zh-serif text-base font-medium">
            {word.hanzi}
          </span>{" "}
          <span className="text-ink-faint">({word.pinyin})</span> · <span className="font-serif-es"><Mixed>{word.meaning}</Mixed></span>
        </p>
        {info?.definition ? (
          <p className="text-ink-soft">
            <span className="text-[11px] uppercase tracking-wide text-ink-faint">def. (en)</span> {info.definition}
          </p>
        ) : null}
        {ety?.hint ? (
          <p className="text-ink-soft">
            <span className="text-[11px] uppercase tracking-wide text-ink-faint">etimología (en){ety.type && ETYMOLOGY[ety.type] ? ` · ${ETYMOLOGY[ety.type]}` : ""}</span> <Mixed>{ety.hint}</Mixed>
          </p>
        ) : ety?.type === "pictophonetic" && (ety.semantic || ety.phonetic) ? (
          <p className="text-ink-soft">
            <span className="text-[11px] uppercase tracking-wide text-ink-faint">etimología</span> fonosemántico:{" "}
            {ety.semantic ? (
              <>
                <span lang="zh-CN" className="zh">{ety.semantic}</span> aporta el sentido
              </>
            ) : null}
            {ety.semantic && ety.phonetic ? ", " : ""}
            {ety.phonetic ? (
              <>
                <span lang="zh-CN" className="zh">{ety.phonetic}</span> el sonido
              </>
            ) : null}
            .
          </p>
        ) : null}
        <Link href={`/diccionario?q=${encodeURIComponent(char)}`} className="inline-flex items-center gap-1 text-indigo underline-offset-4 hover:underline">
          Ver ficha en el diccionario <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
