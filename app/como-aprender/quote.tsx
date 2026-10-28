"use client";
import { Lattice, quoteOfDay } from "@/components/ornament";

/** Cita del día (chengyu / Analectas) sobre celosía 万字 al 5 %. */
export function DailyQuote() {
  const q = quoteOfDay();
  return (
    <figure className="card-paper relative mb-6 overflow-hidden px-6 py-7 text-center sm:px-10">
      <div className="text-ink">
        <Lattice variant="ice" opacity={0.05} size={44} />
      </div>
      <blockquote className="relative">
        <p lang="zh-CN" className="zh-kai text-2xl leading-relaxed text-ink sm:text-3xl">
          {q.zh}
        </p>
        <p className="mt-1 text-sm text-ink-faint">{q.py}</p>
      </blockquote>
      <figcaption className="relative mt-2 font-serif-es text-base text-ink-soft">{q.es}</figcaption>
    </figure>
  );
}
