"use client";
import type { LanguageUI } from "@/lib/languages/types";
import { HangulInput, KoPronunciationView } from "./common";
import { KO_MODULES } from "./modules";
import { KoCharactersPage, KoCharacterDetail, KoDictionaryExtras, WordOfDay } from "./characters";
import { KoConjugationPage, KoCountersPage, KoPolitenessPage } from "./extra";

export const koUI: LanguageUI = {
  CharactersPage: KoCharactersPage,
  CharacterDetail: KoCharacterDetail,
  DictionaryExtras: KoDictionaryExtras,
  modules: KO_MODULES,
  ReadingInput: HangulInput,
  PronunciationView: KoPronunciationView,
  ItemOfDay: WordOfDay,
  extraPages: [
    { href: "conjugacion", title: "Conjugación", native: "활용", description: "-아요/어요, 습니다, pasado, futuro e irregulares.", icon: "Shuffle", Component: KoConjugationPage },
    { href: "contadores", title: "Números y clasificadores", native: "단위 명사", description: "Nativos frente a sino-coreanos; 개, 명, 마리, 권, 잔…", icon: "Boxes", Component: KoCountersPage },
    { href: "cortesia", title: "Niveles de habla", native: "존댓말", description: "합니다체, 해요체, 반말 y el honorífico -(으)시-.", icon: "HandHeart", Component: KoPolitenessPage },
  ],
};
