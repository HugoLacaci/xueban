"use client";
/** Tema «宣纸与墨» (papel y tinta): tokens en styles/tokens.css; aquí fuentes y ornamentos propios. */
import type { LanguageTheme } from "@/lib/languages/types";
import { ShanShui } from "@/components/ornament/shan-shui";
import { PlumBranch } from "@/components/ornament/plum-branch";
import { Lattice } from "@/components/ornament/lattice";
import { Enso } from "@/components/ornament/ink-divider";

export const zhTheme: LanguageTheme = {
  id: "xuanzhi",
  name: "宣纸与墨",
  nameEs: "Papel y tinta",
  description: "Estudio de caligrafía contemporáneo: papel 宣纸 con grano sutil, tinta 墨, sello 印章 bermellón, celosías 窗棂 y paisajes 山水 que cambian con la hora.",
  fontClasses: { sans: "", serif: "zh-serif", display: "zh-kai" },
  fontOptions: [
    { id: "sans", label: "Noto Sans (黑体)", cls: "" },
    { id: "serif", label: "Noto Serif (宋体)", cls: "zh-serif" },
    { id: "kai", label: "LXGW WenKai (楷体)", cls: "zh-kai" },
  ],
  themeColor: { light: "#F5EFE3", dark: "#181715" },
  seal: { shape: "square", brandText: "学伴" },
  ornaments: {
    Landscape: ({ className, seed, phase, height, layers }) => <ShanShui className={className} seed={seed} phase={phase as never} height={height} layers={layers} />,
    Branch: ({ progress, className, label }) => <PlumBranch count={Math.round(progress * 400)} perFlower={10} maxFlowers={40} className={className} label={label} />,
    Lattice: ({ className, opacity, size, variant }) => <Lattice className={className} opacity={opacity} size={size} variant={variant as never} />,
    DailyShape: ({ progress, size, className, label }) => <Enso progress={progress} size={size} className={className} label={label} />,
  },
  motifs: ["宣纸", "墨", "印章", "窗棂", "山水", "梅"],
  prohibited: ["dragones de restaurante", "rojo y dorado estridentes", "tipografías latinas «chinas»"],
};
