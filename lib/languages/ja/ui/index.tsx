"use client";
import type { LanguageUI } from "@/lib/languages/types";
import { KanaInput, JaPronunciationView } from "./common";
import { JA_MODULES } from "./modules";
import { JaCharactersPage, JaCharacterDetail, JaDictionaryExtras, KanjiOfDay } from "./characters";
import { ConjugationPage, CountersPage, PolitenessPage } from "./extra";

export const jaUI: LanguageUI = {
  CharactersPage: JaCharactersPage,
  CharacterDetail: JaCharacterDetail,
  DictionaryExtras: JaDictionaryExtras,
  modules: JA_MODULES,
  ReadingInput: KanaInput,
  PronunciationView: JaPronunciationView,
  ItemOfDay: KanjiOfDay,
  extraPages: [
    { href: "conjugacion", title: "Conjugación", native: "活用", description: "Tablas de verbos y adjetivos y generador de ejercicios.", icon: "Shuffle", Component: ConjugationPage },
    { href: "contadores", title: "Contadores", native: "助数詞", description: "本, 枚, 匹, 人, つ… con los cambios de sonido.", icon: "Boxes", Component: CountersPage },
    { href: "cortesia", title: "Cortesía", native: "敬語", description: "Llano, です・ます, respetuoso y humilde.", icon: "HandHeart", Component: PolitenessPage },
  ],
};
