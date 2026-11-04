/**
 * Tonos en vivo: al escribir el número detrás de una sílaba (ni3, xi3hua4n, lv4, nu:3) se convierte en su tilde,
 * como al poner un acento: «xi3hua4n» → «xǐhuàn». Conserva la posición del cursor. El 5 (o 0) es tono neutro.
 */
import { numberedToMarked } from "@/lib/languages/zh/pinyin/tones";

const RUN = /([a-zA-ZüÜ:]*[vV]?[a-zA-ZüÜ:]*)([0-5])/g;

export function liveTonesText(s: string): string {
  if (!/[a-zA-Zü:][0-5]/.test(s)) return s;
  return s.replace(RUN, (m, letters: string, n: string) => {
    if (!letters || !/[aeiouüvAEIOUÜV]/.test(letters)) return m; // «3个», «100»: números de verdad
    const syl = letters.replace(/v/g, "ü").replace(/V/g, "Ü");
    return n === "0" || n === "5" ? syl.replace(/u:/g, "ü") : numberedToMarked(syl + n);
  });
}

export function liveTones(value: string, caret: number | null): { value: string; caret: number } {
  const next = liveTonesText(value);
  if (next === value) return { value, caret: caret ?? value.length };
  const c = caret ?? value.length;
  return { value: next, caret: liveTonesText(value.slice(0, c)).length };
}

/** Para un onChange de <input>/<textarea>: aplica los tonos y deja el cursor donde estaba. */
export function onChangeWithTones(e: { target: HTMLInputElement | HTMLTextAreaElement }, set: (v: string) => void): void {
  const el = e.target;
  const r = liveTones(el.value, el.selectionStart);
  set(r.value);
  if (r.value !== el.value) requestAnimationFrame(() => el.setSelectionRange(r.caret, r.caret));
}
