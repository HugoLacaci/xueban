"use client";
import { create } from "zustand";

export interface PopupAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PopupState {
  word: string | null;
  anchor: PopupAnchor | null;
  context?: string; // frase donde aparece (para minar)
  sourceRef?: string;
  open: (word: string, anchor: PopupAnchor, context?: string, sourceRef?: string) => void;
  close: () => void;
}

export const usePopup = create<PopupState>((set) => ({
  word: null,
  anchor: null,
  open: (word, anchor, context, sourceRef) => set({ word, anchor, context, sourceRef }),
  close: () => set({ word: null, anchor: null, context: undefined, sourceRef: undefined }),
}));

export function openWordPopup(word: string, el: Element, context?: string, sourceRef?: string) {
  const r = el.getBoundingClientRect();
  usePopup.getState().open(word, { x: r.left, y: r.top, width: r.width, height: r.height }, context, sourceRef);
}
