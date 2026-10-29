"use client";
/** Tema «한지와 오방색» (papel hanji y los cinco colores). Tokens en styles/themes.css (data-lang="ko"). */
import type { LanguageTheme } from "@/lib/languages/types";
import { Bojagi, Changsal, HanokLandscape, MoonJar, MugunghwaBranch } from "@/components/ornament/ko";
import { KO_FONT_VARS } from "./fonts";

export const koTheme: LanguageTheme = {
  id: "hanji",
  name: "한지와 오방색",
  nameEs: "Hanji y los cinco colores",
  description: "Papel hanji con fibras largas, tinta 먹, verde azulado 청 como acento, rojo 적 solo en el sello 도장, ocre 황 en logros; patchwork 보자기, celosías 창살, filetes 단청 y la vasija lunar 달항아리.",
  fontVars: KO_FONT_VARS,
  fontClasses: { sans: "", serif: "zh-serif", display: "zh-kai" },
  fontOptions: [
    { id: "sans", label: "Noto Sans KR (고딕)", cls: "" },
    { id: "serif", label: "Noto Serif KR / Gowun Batang (명조)", cls: "zh-serif" },
    { id: "kai", label: "Gowun Dodum (manuscrita)", cls: "zh-kai" },
  ],
  themeColor: { light: "#F6F1E7", dark: "#161718" },
  seal: { shape: "square", brandText: "학반" },
  ornaments: {
    Landscape: ({ className, seed, phase, height }) => <HanokLandscape className={className} seed={seed} phase={phase} height={height} />,
    Branch: ({ progress, className, label }) => <MugunghwaBranch progress={progress} className={className} label={label} />,
    Lattice: ({ className, opacity, size, variant }) => <Changsal className={className} opacity={opacity} size={size} variant={variant === "ice" ? "grid" : "wan"} />,
    DailyShape: ({ progress, size, className, label }) => <MoonJar progress={progress} size={size} className={className} label={label} />,
    Pattern: ({ className, opacity }) => <Bojagi className={className} opacity={opacity} />,
  },
  motifs: ["한지", "먹", "오방색", "보자기", "창살", "단청", "달항아리", "도장", "무궁화", "한옥"],
  prohibited: ["estética K-pop genérica", "la bandera como decoración", "motivos japoneses o chinos"],
};
