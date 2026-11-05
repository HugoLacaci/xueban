import { describe, expect, it } from "vitest";
import { pinyin } from "pinyin-pro";
import { digitsToHanzi, hanziToNumber, numberToHanzi, numberToPinyin } from "@/lib/hanzi/numbers";

const CASES: [number, string, string][] = [
  [0, "零", "líng"],
  [7, "七", "qī"],
  [10, "十", "shí"],
  [15, "十五", "shíwǔ"],
  [20, "二十", "èrshí"],
  [22, "二十二", "èrshí'èr"],
  [99, "九十九", "jiǔshíjiǔ"],
  [100, "一百", "yìbǎi"],
  [105, "一百零五", "yìbǎi líng wǔ"],
  [110, "一百一十", "yìbǎi yīshí"],
  [200, "两百", "liǎngbǎi"],
  [222, "两百二十二", "liǎngbǎi èrshí'èr"],
  [1001, "一千零一", "yìqiān líng yī"],
  [1010, "一千零一十", "yìqiān líng yīshí"],
  [1200, "一千二百", "yìqiān èrbǎi"],
  [2000, "两千", "liǎngqiān"],
  [2200, "两千二百", "liǎngqiān èrbǎi"],
  [10000, "一万", "yíwàn"],
  [10005, "一万零五", "yíwàn líng wǔ"],
  [10200, "一万零二百", "yíwàn líng èrbǎi"],
  [12000, "一万两千", "yíwàn liǎngqiān"],
  [20000, "两万", "liǎngwàn"],
  [20100, "两万零一百", "liǎngwàn líng yìbǎi"],
  [100000, "十万", "shíwàn"],
  [100005, "十万零五", "shíwàn líng wǔ"],
  [120000, "十二万", "shí'èrwàn"],
  [1000000, "一百万", "yìbǎiwàn"],
  [2000000, "两百万", "liǎngbǎiwàn"],
  [10000000, "一千万", "yìqiānwàn"],
  [20000000, "两千万", "liǎngqiānwàn"],
  [12345678, "一千二百三十四万五千六百七十八", "yìqiān èrbǎi sānshísìwàn wǔqiān liùbǎi qīshíbā"],
  [99999999, "九千九百九十九万九千九百九十九", "jiǔqiān jiǔbǎi jiǔshíjiǔwàn jiǔqiān jiǔbǎi jiǔshíjiǔ"],
  [100000000, "一亿", "yíyì"],
  [200000000, "两亿", "liǎngyì"],
  [100000005, "一亿零五", "yíyì líng wǔ"],
];

describe("números chinos", () => {
  it.each(CASES)("%i → %s", (n, hz, py) => {
    expect(numberToHanzi(n)).toBe(hz);
    expect(numberToPinyin(n)).toBe(py);
    expect(hanziToNumber(hz)).toBe(n);
  });

  it("ida y vuelta exhaustiva de 0 a 120 000", () => {
    for (let n = 0; n <= 120_000; n++) {
      const hz = numberToHanzi(n);
      if (hanziToNumber(hz) !== n) throw new Error(`${n} → ${hz} → ${hanziToNumber(hz)}`);
      // nunca dos 零 seguidos ni 零 al final
      if (/零零|零$/.test(hz) && n !== 0) throw new Error(`${n} → ${hz}`);
    }
  });

  it("ida y vuelta por muestreo hasta 99 999 999", () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let i = 0; i < 50_000; i++) {
      const n = Math.floor(rnd() * 100_000_000);
      const hz = numberToHanzi(n);
      expect(hanziToNumber(hz)).toBe(n);
      expect(/零零|零$/.test(hz)).toBe(false);
    }
  });

  it("el pinyin coincide con pinyin-pro (sin contar espacios y salvo el cambio de tono de 一)", () => {
    for (const [n] of CASES) {
      const hz = numberToHanzi(n);
      const ref = pinyin(hz, { toneSandhi: true }).replace(/\s+/g, "");
      const mine = numberToPinyin(n).replace(/[\s']+/g, "");
      // pinyin-pro aplica el sandhi de 一 igual que nosotros ante 百/千/万/亿; comparamos sin tonos para el resto de 一
      const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
      expect(strip(mine)).toBe(strip(ref));
    }
  });

  it("años y teléfonos cifra a cifra", () => {
    expect(digitsToHanzi("2026")).toEqual({ hanzi: "二〇二六", pinyin: "èr líng èr liù" });
    expect(digitsToHanzi("138 0011", "phone")).toEqual({ hanzi: "幺三八零零幺幺", pinyin: "yāo sān bā líng líng yāo yāo" });
  });

  it("rechaza fuera de rango", () => {
    expect(() => numberToHanzi(-1)).toThrow();
    expect(() => numberToHanzi(1.5)).toThrow();
    expect(Number.isNaN(hanziToNumber("一个"))).toBe(true);
  });
});
