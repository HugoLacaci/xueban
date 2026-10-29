/**
 * Registro de idiomas: metadatos ligeros (siempre en el bundle) y carga diferida de los paquetes.
 * Es el único sitio, junto con cada paquete, que puede importar lib/languages/{zh,ja,ko}.
 */
import { create } from "zustand";
import type { Lang, LangMeta, LanguagePack } from "./types";

export const LANGS: Lang[] = ["zh", "ja", "ko"];

export const LANG_META: Record<Lang, LangMeta> = {
  zh: {
    id: "zh",
    bcp47: "zh-CN",
    names: { native: "中文", es: "Chino", adjective: "chino" },
    emblem: "学",
    brand: { native: "学伴", latin: "Xuébàn", tagline: "tu compañero de chino" },
    sealUser: "雨果",
    cssClass: "zh",
    scripts: [{ id: "hanzi", name: "Caracteres chinos (simplificados)", native: "汉字", description: "Cada carácter es una sílaba con significado; el pinyin indica cómo se lee." }],
  },
  ja: {
    id: "ja",
    bcp47: "ja-JP",
    names: { native: "日本語", es: "Japonés", adjective: "japonés" },
    emblem: "学",
    brand: { native: "学伴", latin: "Gakuhan", tagline: "tu compañero de japonés" },
    sealUser: "ウーゴ",
    cssClass: "ja",
    scripts: [
      { id: "hiragana", name: "Hiragana", native: "ひらがな", description: "46 signos silábicos para palabras japonesas, partículas y terminaciones." },
      { id: "katakana", name: "Katakana", native: "カタカナ", description: "Los mismos sonidos, para préstamos extranjeros, onomatopeyas y énfasis." },
      { id: "kanji", name: "Kanji", native: "漢字", description: "Caracteres de origen chino con lecturas on'yomi y kun'yomi." },
    ],
  },
  ko: {
    id: "ko",
    bcp47: "ko-KR",
    names: { native: "한국어", es: "Coreano", adjective: "coreano" },
    emblem: "학",
    brand: { native: "학반", latin: "Hakban", tagline: "tu compañero de coreano" },
    sealUser: "우고",
    cssClass: "ko",
    scripts: [
      { id: "hangul", name: "Hangul", native: "한글", description: "Alfabeto de 24 letras (jamo) que se agrupan en bloques silábicos." },
      { id: "hanja", name: "Hanja (opcional)", native: "漢字", description: "Caracteres chinos de las raíces sino-coreanas; útiles para el vocabulario avanzado." },
    ],
  },
};

export function isLang(x: unknown): x is Lang {
  return x === "zh" || x === "ja" || x === "ko";
}

const loaders: Record<Lang, () => Promise<{ default: LanguagePack }>> = {
  zh: () => import("./zh"),
  ja: () => import("./ja"),
  ko: () => import("./ko"),
};

const cache: Partial<Record<Lang, Promise<LanguagePack>>> = {};

/** Carga (una vez) el paquete de un idioma. */
export function loadPack(lang: Lang): Promise<LanguagePack> {
  if (!cache[lang]) {
    cache[lang] = loaders[lang]().then((m) => {
      usePackStore.setState((s) => ({ packs: { ...s.packs, [lang]: m.default } }));
      return m.default;
    });
  }
  return cache[lang]!;
}

interface PackStore {
  active: Lang;
  packs: Partial<Record<Lang, LanguagePack>>;
}

export const usePackStore = create<PackStore>(() => ({ active: "zh", packs: {} }));

export function setActiveLang(lang: Lang) {
  usePackStore.setState({ active: lang });
}

export function getActiveLang(): Lang {
  return usePackStore.getState().active;
}

export function getPack(lang: Lang): LanguagePack | undefined {
  return usePackStore.getState().packs[lang];
}

/** Paquete activo (lanza si aún no se ha cargado: el LanguageProvider garantiza la carga antes de pintar). */
export function getActivePack(): LanguagePack {
  const { active, packs } = usePackStore.getState();
  const p = packs[active];
  if (!p) throw new Error(`El paquete de idioma «${active}» no está cargado`);
  return p;
}

export function getActivePackOrNull(): LanguagePack | null {
  const { active, packs } = usePackStore.getState();
  return packs[active] ?? null;
}

/** Para tests y scripts: carga y activa un idioma. */
export async function activateLang(lang: Lang): Promise<LanguagePack> {
  const p = await loadPack(lang);
  setActiveLang(lang);
  return p;
}

/** Etiqueta BCP 47 del idioma activo para el atributo lang (la app remonta el árbol al cambiar de idioma). */
export function targetLang(): string {
  return LANG_META[usePackStore.getState().active].bcp47;
}
