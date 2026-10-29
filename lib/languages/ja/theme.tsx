"use client";
/** Tema «和紙と藍» (washi e índigo). Tokens en styles/themes.css (data-lang="ja"). */
import type { LanguageTheme } from "@/lib/languages/types";
import { Enso } from "@/components/ornament/ink-divider";
import { SakuraBranch, UkiyoeLandscape, WagaraPattern } from "@/components/ornament/ja";
import { JA_FONT_VARS } from "./fonts";

export const jaTheme: LanguageTheme = {
  id: "washi",
  name: "和紙と藍",
  nameEs: "Washi e índigo",
  description: "Papel washi 生成り con fibras, tinta 墨, índigo 藍 como acento y bermellón 朱 solo en el hanko y el torii; patrones 和柄 muy tenues; ensō de pincel; cerezo que florece.",
  fontVars: JA_FONT_VARS,
  fontClasses: { sans: "", serif: "zh-serif", display: "zh-kai" },
  fontOptions: [
    { id: "sans", label: "Noto Sans JP (ゴシック)", cls: "" },
    { id: "serif", label: "Noto Serif JP (明朝)", cls: "zh-serif" },
    { id: "kai", label: "Klee One (libro de texto)", cls: "zh-kai" },
  ],
  themeColor: { light: "#F4EFE4", dark: "#141C26" },
  seal: { shape: "round", brandText: "学伴" },
  ornaments: {
    Landscape: ({ className, seed, phase, height }) => <UkiyoeLandscape className={className} seed={seed} phase={phase} height={height} />,
    Branch: ({ progress, className, label }) => <SakuraBranch progress={progress} className={className} label={label} />,
    Lattice: ({ className, opacity, size, variant }) => <WagaraPattern className={className} opacity={opacity} size={size} variant={variant === "ice" ? "asanoha" : variant === "square" ? "ichimatsu" : (variant ?? "seigaiha")} />,
    DailyShape: ({ progress, size, className, label }) => <Enso progress={progress} size={size} className={className} label={label} />,
    Pattern: ({ className, opacity, variant }) => <WagaraPattern className={className} opacity={opacity} variant={variant} />,
  },
  motifs: ["和紙", "藍", "朱の判子", "青海波", "麻の葉", "七宝", "市松", "亀甲", "円相", "桜", "鳥居"],
  prohibited: ["旭日旗 (bandera del sol naciente con rayos)", "geishas y samuráis de souvenir", "tipografías latinas «estilo japonés»", "motivos chinos o coreanos"],
};
