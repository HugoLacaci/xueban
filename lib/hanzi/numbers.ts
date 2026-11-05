/**
 * Números chinos: número → hanzi → pinyin (0 … 99 999 999 y hasta 亿), con las reglas que se enseñan en el temario:
 *  - se agrupa de 4 en 4 (万 = 10⁴, 亿 = 10⁸), no de 3 en 3 como en español;
 *  - un solo 零 por cada hueco de ceros entre cifras (一百零五, 一千零一, 十万零五, 两万零一百);
 *  - 十 sin 一 al principio (十五, 十万), pero 一十 dentro del número (一百一十, 一千零一十);
 *  - 两 delante de 千, 万 y 亿, y delante de 百 cuando abre el número (两百, 两千二百, 两万); 二 en el resto (二十二);
 *  - pinyin con el cambio de tono de 一 delante de las unidades (yìbǎi, yìqiān, yíwàn, yíyì).
 * También: años y teléfonos cifra a cifra (二〇二六, 幺三八…) y la conversión inversa para validar.
 */
const DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const DIGIT_PY = ["líng", "yī", "èr", "sān", "sì", "wǔ", "liù", "qī", "bā", "jiǔ"];
const SMALL_UNITS = ["", "十", "百", "千"]; // dentro de un grupo de 4
const BIG_UNITS = ["", "万", "亿"];
const UNIT_PY: Record<string, string> = {
  十: "shí",
  百: "bǎi",
  千: "qiān",
  万: "wàn",
  亿: "yì",
  两: "liǎng",
  零: "líng",
};

export interface NumberParts {
  hanzi: string;
  pinyin: string;
}

/** Grupo de 4 cifras (1…9999) → trozos [cifra, unidad]. `leading` = es el primer grupo del número. */
function groupTokens(n: number, leading: boolean, firstOfNumber: boolean): string[] {
  const ds = String(n).padStart(4, "0").split("").map(Number); // [千, 百, 十, uno]
  const out: string[] = [];
  let zero = false;
  let started = false;
  for (let i = 0; i < 4; i++) {
    const d = ds[i];
    const unit = SMALL_UNITS[3 - i];
    if (d === 0) {
      if (started) zero = true;
      continue;
    }
    if (zero || (!started && !leading && i > 0)) out.push("零"); // hueco interno o ceros a la izquierda de un grupo no inicial
    zero = false;
    const isFirstDigit = !started && firstOfNumber;
    if (unit === "十" && d === 1 && isFirstDigit) out.push("十");
    else {
      const digit =
        d === 2 && (unit === "千" || (unit === "百" && isFirstDigit)) ? "两" : DIGITS[d];
      out.push(digit + unit);
    }
    started = true;
  }
  return out;
}

/** Entero 0 … 999 999 999 999 → hanzi. */
export function numberToHanzi(n: number): string {
  return numberTokens(n).join("");
}

function numberTokens(n: number): string[] {
  if (!Number.isInteger(n) || n < 0 || n >= 1e12)
    throw new RangeError(`número fuera de rango: ${n}`);
  if (n === 0) return ["零"];
  const groups: number[] = [];
  let x = n;
  while (x > 0) {
    groups.unshift(x % 10000);
    x = Math.floor(x / 10000);
  }
  const out: string[] = [];
  let pendingZero = false;
  groups.forEach((g, i) => {
    const big = BIG_UNITS[groups.length - 1 - i];
    if (g === 0) {
      if (out.length) pendingZero = true;
      return;
    }
    const first = out.length === 0;
    const toks = groupTokens(g, first, first);
    // un grupo que empieza por menos de 1000 tras otro grupo ya lleva su 零; si venimos de un grupo vacío, también
    if (pendingZero && toks[0] !== "零") out.push("零");
    pendingZero = false;
    // 两 delante de 万 / 亿 cuando el grupo es exactamente 2 (两万, 两亿)
    if (g === 2 && big) toks[toks.length - 1] = "两";
    if (big) toks[toks.length - 1] += big;
    out.push(...toks);
  });
  return out;
}

/**
 * Pinyin de un número según la ortografía oficial (GB/T 16159): de 11 a 99 junto (shíwǔ, èrshí'èr), 百/千/万/亿
 * separados (yìbǎi líng wǔ), apóstrofo ante sílaba que empieza por a/o/e, y cambio de tono de 一 ante las unidades.
 */
export function numberToPinyin(n: number): string {
  // une «X十» con la cifra suelta que le sigue (二十 + 二 → 二十二), conservando la unidad grande final (十 + 二万 → 十二万)
  const toks: string[] = [];
  for (const t of numberTokens(n)) {
    const prev = toks[toks.length - 1];
    if (prev && prev.endsWith("十") && /^[一二三四五六七八九两](万|亿)?$/.test(t))
      toks[toks.length - 1] = prev + t;
    else toks.push(t);
  }
  return toks
    .map((tok) => {
      const chars = Array.from(tok);
      return chars
        .map((c, i) => {
          if (c === "一") {
            const next = chars[i + 1];
            if (next === "百" || next === "千") return "yì";
            if (next === "万" || next === "亿") return "yí";
            return "yī";
          }
          const d = DIGITS.indexOf(c);
          if (d > 0) return DIGIT_PY[d];
          return UNIT_PY[c] ?? c;
        })
        .map((syl, i) => (i > 0 && /^[aeoāáǎàēéěèōóǒò]/.test(syl) ? "'" + syl : syl))
        .join("");
    })
    .join(" ");
}

export function numberParts(n: number): NumberParts {
  return { hanzi: numberToHanzi(n), pinyin: numberToPinyin(n) };
}

/** Cifra a cifra: años (〇) y teléfonos (幺 para el 1). */
export function digitsToHanzi(digits: string, mode: "year" | "phone" = "year"): NumberParts {
  const ds = digits.replace(/\D/g, "").split("").map(Number);
  const hz = ds.map((d) =>
    d === 0 ? (mode === "year" ? "〇" : "零") : d === 1 && mode === "phone" ? "幺" : DIGITS[d],
  );
  const py = ds.map((d) => (d === 1 && mode === "phone" ? "yāo" : DIGIT_PY[d]));
  return { hanzi: hz.join(""), pinyin: py.join(" ") };
}

/** Hanzi → número (acepta 两/二, 〇/零, 幺). Devuelve NaN si no es un número bien formado. */
export function hanziToNumber(s: string): number {
  const val: Record<string, number> = {
    零: 0,
    〇: 0,
    一: 1,
    幺: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  const small: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };
  const big: Record<string, number> = { 万: 1e4, 亿: 1e8 };
  let total = 0;
  let section = 0;
  let digit = -1;
  for (const c of Array.from(s)) {
    if (c in val) {
      digit = val[c];
    } else if (c in small) {
      section += (digit < 0 ? 1 : digit) * small[c];
      digit = -1;
    } else if (c in big) {
      section += digit < 0 ? 0 : digit;
      total += section * big[c];
      section = 0;
      digit = -1;
    } else return Number.NaN;
  }
  return total + section + (digit < 0 ? 0 : digit);
}
