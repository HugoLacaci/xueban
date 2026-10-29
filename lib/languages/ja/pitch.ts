/**
 * Acento tonal (pitch accent) del japonés de Tokio. El número de Kanjium indica la mora tras la que
 * baja el tono: 0 = 平板 heiban (sin bajada), 1 = 頭高 atamadaka, n = 中高 nakadaka (1 < n < moras),
 * n = moras = 尾高 odaka (baja en la partícula siguiente).
 */
import { moras } from "./kana";

export type PitchPattern = "heiban" | "atamadaka" | "nakadaka" | "odaka";

export const PATTERN_INFO: Record<PitchPattern, { name: string; native: string; description: string }> = {
  heiban: { name: "Heiban (plano)", native: "平板", description: "Empieza bajo, sube en la 2.ª mora y se queda alto, también en la partícula." },
  atamadaka: { name: "Atamadaka (cabeza alta)", native: "頭高", description: "Solo la 1.ª mora es alta; baja después y se queda bajo." },
  nakadaka: { name: "Nakadaka (medio alto)", native: "中高", description: "Sube en la 2.ª mora y baja antes del final de la palabra." },
  odaka: { name: "Odaka (cola alta)", native: "尾高", description: "Sube y se mantiene alto hasta el final de la palabra; baja en la partícula." },
};

export function patternOf(accent: number, moraCount: number): PitchPattern {
  if (accent === 0) return "heiban";
  if (accent === 1) return "atamadaka";
  if (accent >= moraCount) return "odaka";
  return "nakadaka";
}

/** Alto (H) / bajo (L) de cada mora de la palabra + la partícula siguiente. */
export function pitchLevels(kana: string, accent: number): { moras: string[]; levels: ("H" | "L")[]; particle: "H" | "L" } {
  const m = moras(kana);
  const n = m.length;
  const levels: ("H" | "L")[] = m.map((_, i) => {
    if (accent === 1) return i === 0 ? "H" : "L";
    if (i === 0) return "L";
    if (accent === 0) return "H";
    return i < accent ? "H" : "L";
  });
  const particle: "H" | "L" = accent === 0 ? "H" : accent >= n && n > 0 ? "L" : "L";
  return { moras: m, levels, particle };
}

export function describePitch(kana: string, accent: number | null | undefined): string {
  if (accent === null || accent === undefined) return "";
  const n = moras(kana).length;
  const p = patternOf(accent, n);
  return `${PATTERN_INFO[p].native} ${PATTERN_INFO[p].name.split(" ")[0].toLowerCase()} [${accent}]`;
}

/** Curva ideal (para comparar con la grabación): un valor por mora, alto = 1, bajo = -1. */
export function idealPitchCurve(kana: string, accent: number): number[] {
  const { levels } = pitchLevels(kana, accent);
  const out: number[] = [];
  for (const l of levels) for (let k = 0; k < 6; k++) out.push(l === "H" ? 4 : -4);
  return out;
}

/** Pares mínimos de acento tonal frecuentes. */
export const PITCH_PAIRS: { a: { text: string; reading: string; accent: number; es: string }; b: { text: string; reading: string; accent: number; es: string } }[] = [
  { a: { text: "箸", reading: "はし", accent: 1, es: "palillos" }, b: { text: "橋", reading: "はし", accent: 2, es: "puente" } },
  { a: { text: "雨", reading: "あめ", accent: 1, es: "lluvia" }, b: { text: "飴", reading: "あめ", accent: 0, es: "caramelo" } },
  { a: { text: "柿", reading: "かき", accent: 0, es: "caqui" }, b: { text: "牡蠣", reading: "かき", accent: 1, es: "ostra" } },
  { a: { text: "神", reading: "かみ", accent: 1, es: "dios" }, b: { text: "紙", reading: "かみ", accent: 2, es: "papel" } },
  { a: { text: "今", reading: "いま", accent: 1, es: "ahora" }, b: { text: "居間", reading: "いま", accent: 2, es: "sala de estar" } },
  { a: { text: "朝", reading: "あさ", accent: 1, es: "mañana" }, b: { text: "麻", reading: "あさ", accent: 2, es: "cáñamo" } },
];
