/**
 * Tonos con números en cualquier campo de texto de la web (solo chino): al teclear el número detrás de una sílaba
 * de pinyin («ni3», «hao3», «lv4», «de5») se convierte en su tilde, igual que en los campos de respuesta.
 *
 * Es más prudente que `liveTonesText` porque aquí también se escribe español:
 *  - solo mira la sílaba que queda justo antes del cursor (no toca el resto del campo);
 *  - las letras tienen que ser pinyin válido («clase3», «covid1» o «mp3» se quedan como están);
 *  - no toca siglas en mayúsculas («A1», «U3», «HSK1») ni el 0;
 *  - no actúa en contraseñas, URLs, números, fechas… ni dentro de `data-live-tones="off"`.
 */
import { numberedToMarked } from "@/lib/languages/zh/pinyin/tones";

const INITIAL = "(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?";
const FINAL =
  "(?:iang|iong|uang|ueng|iao|ian|ing|uai|uan|ang|eng|ong|üan|ai|ei|ao|ou|an|en|er|ia|ie|iu|in|ua|uo|ui|un|üe|ue|ün|a|o|e|i|u|ü)";
const PINYIN_RUN = new RegExp(`^(?:${INITIAL}${FINAL}r?)+$`);
const BEFORE_CARET = /([a-zA-ZüÜ:]+)([1-5])$/;

/** ¿Estas letras son una o varias sílabas de pinyin sin tono? («nihao», «lv», «nu:») */
export function isPinyinRun(letters: string): boolean {
  if (!letters || letters === letters.toUpperCase()) return false; // siglas: A1, U3, HSK
  const s = letters.toLowerCase().replace(/u:/g, "ü").replace(/v/g, "ü");
  if (s.includes(":")) return false;
  return PINYIN_RUN.test(s);
}

/** Convierte la sílaba numerada que termina justo en el cursor. `null` si no hay nada que convertir. */
export function liveToneAtCaret(value: string, caret: number): { value: string; caret: number } | null {
  const before = value.slice(0, caret);
  const m = BEFORE_CARET.exec(before);
  if (!m || !isPinyinRun(m[1])) return null;
  const syl = m[1].replace(/v/g, "ü").replace(/V/g, "Ü");
  const marked = m[2] === "5" ? syl.replace(/u:/g, "ü").replace(/U:/g, "Ü") : numberedToMarked(syl + m[2]);
  const head = before.slice(0, m.index) + marked;
  return { value: head + value.slice(caret), caret: head.length };
}

const TEXT_TYPES = new Set(["", "text", "search"]);
const NO_INPUT_MODE = new Set(["url", "email", "numeric", "decimal", "tel"]);

function eligible(t: EventTarget | null): t is HTMLInputElement | HTMLTextAreaElement {
  if (t instanceof HTMLInputElement) {
    if (!TEXT_TYPES.has((t.getAttribute("type") ?? "").toLowerCase())) return false;
    if (NO_INPUT_MODE.has((t.getAttribute("inputmode") ?? "").toLowerCase())) return false;
  } else if (!(t instanceof HTMLTextAreaElement)) return false;
  if (t.readOnly || t.disabled) return false;
  return !t.closest('[data-live-tones="off"]');
}

/** ¿La página actual es del chino? (/zh/… con o sin ruta base) */
function inChinese(): boolean {
  return /(^|\/)zh(\/|$)/.test(window.location.pathname);
}

/**
 * Activa los tonos con números en todos los campos de texto del documento. Devuelve la función que lo desactiva.
 * Escucha en fase de captura: el valor ya está convertido cuando React lanza el `onChange` del campo.
 */
export function installGlobalLiveTones(doc: Document = document): () => void {
  let busy = false;
  const apply = (el: HTMLInputElement | HTMLTextAreaElement, notify: boolean) => {
    const caret = el.selectionStart;
    if (caret === null || caret !== el.selectionEnd) return;
    const r = liveToneAtCaret(el.value, caret);
    if (!r) return;
    // el «setter» nativo: así React detecta el cambio en los campos controlados
    const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, r.value);
    el.setSelectionRange(r.caret, r.caret);
    requestAnimationFrame(() => {
      if (doc.activeElement === el && el.value === r.value) el.setSelectionRange(r.caret, r.caret);
    });
    if (notify) {
      busy = true;
      try {
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } finally {
        busy = false;
      }
    }
  };
  const onInput = (e: Event) => {
    if (busy || !inChinese() || !eligible(e.target)) return;
    const ie = e as InputEvent;
    if (ie.isComposing) return; // teclado en composición (IME, predictivo): se mira al terminar
    if (typeof ie.inputType === "string" && !ie.inputType.startsWith("insert")) return; // borrar no reconvierte
    apply(e.target, false);
  };
  const onCompositionEnd = (e: Event) => {
    if (busy || !inChinese() || !eligible(e.target)) return;
    const el = e.target;
    // algunos teclados lanzan el último `input` después de `compositionend`
    setTimeout(() => apply(el, true), 0);
  };
  doc.addEventListener("input", onInput, true);
  doc.addEventListener("compositionend", onCompositionEnd, true);
  return () => {
    doc.removeEventListener("input", onInput, true);
    doc.removeEventListener("compositionend", onCompositionEnd, true);
  };
}
