import { describe, expect, it } from "vitest";
import {
  addToneMark,
  applySandhi,
  markedToNumbered,
  normalizePinyin,
  numberedToMarked,
  pinyinDiff,
  pinyinEquals,
  splitSyllables,
  stripTones,
  syllablesOf,
  toneOf,
  tonesOf,
} from "@/lib/languages/zh/pinyin/tones";
import { distributePinyin, lexicalPinyinPerChar, textToPinyin } from "@/lib/languages/zh/pinyin/convert";

describe("tonos", () => {
  it("detecta el tono de una sílaba", () => {
    expect(toneOf("nǐ")).toBe(3);
    expect(toneOf("hǎo")).toBe(3);
    expect(toneOf("mā")).toBe(1);
    expect(toneOf("má")).toBe(2);
    expect(toneOf("mà")).toBe(4);
    expect(toneOf("ma")).toBe(5);
    expect(toneOf("lǜ")).toBe(4);
    expect(toneOf("ni3")).toBe(3);
  });

  it("quita y normaliza diacríticos", () => {
    expect(stripTones("nǐ hǎo")).toBe("ni hao");
    expect(stripTones("lǜ")).toBe("lü");
    expect(normalizePinyin("Nǐ hǎo")).toBe("nihao");
    expect(normalizePinyin("lǜ sè")).toBe("lvse");
    expect(normalizePinyin("Xī'ān")).toBe("xian");
  });

  it("coloca la marca de tono en la vocal correcta", () => {
    expect(addToneMark("hao", 3)).toBe("hǎo");
    expect(addToneMark("xie", 4)).toBe("xiè");
    expect(addToneMark("gou", 3)).toBe("gǒu");
    expect(addToneMark("liu", 2)).toBe("liú");
    expect(addToneMark("lv", 4)).toBe("lǜ");
    expect(addToneMark("ri", 4)).toBe("rì");
    expect(addToneMark("zhuang", 1)).toBe("zhuāng");
    expect(addToneMark("ma", 5)).toBe("ma");
  });

  it("convierte numérico a diacríticos y viceversa", () => {
    expect(numberedToMarked("ni3 hao3")).toBe("nǐ hǎo");
    expect(numberedToMarked("ni3hao3")).toBe("nǐhǎo");
    expect(numberedToMarked("lv4 se4")).toBe("lǜ sè");
    expect(numberedToMarked("xie4xie5")).toBe("xièxie");
    expect(numberedToMarked("Wo3 shi4 Xi1ban1ya2ren2")).toBe("Wǒ shì Xībānyárén");
    expect(markedToNumbered("nǐ hǎo")).toBe("ni3 hao3");
    expect(markedToNumbered("xièxie")).toBe("xie4xie5");
  });

  it("separa sílabas", () => {
    expect(syllablesOf("nǐhǎo")).toEqual(["nǐ", "hǎo"]);
    expect(syllablesOf("Xībānyá")).toEqual(["Xī", "bān", "yá"]);
    expect(syllablesOf("zhōngguó rén")).toEqual(["zhōng", "guó", "rén"]);
    expect(syllablesOf("Wǒ ài nǐ!")).toEqual(["Wǒ", "ài", "nǐ"]);
    expect(syllablesOf("xiānsheng")).toEqual(["xiān", "sheng"]);
    expect(syllablesOf("Tiān'ānmén")).toEqual(["Tiān", "ān", "mén"]);
    expect(syllablesOf("diǎnr")).toEqual(["diǎnr"]);
    expect(splitSyllables("nǐ, hǎo").map((p) => p.isSyllable)).toEqual([true, false, true]);
    expect(tonesOf("nǐ hǎo")).toEqual([3, 3]);
  });

  it("aplica el sandhi tonal", () => {
    const r = applySandhi(["你", "好"], ["nǐ", "hǎo"]);
    expect(r[0].pinyin).toBe("ní");
    expect(r[0].sandhi).toBe("33");
    expect(r[1].pinyin).toBe("hǎo");
    const bu = applySandhi(["不", "是"], ["bù", "shì"]);
    expect(bu[0].pinyin).toBe("bú");
    const bu2 = applySandhi(["不", "好"], ["bù", "hǎo"]);
    expect(bu2[0].pinyin).toBe("bù");
    const yi = applySandhi(["一", "个"], ["yī", "gè"]);
    expect(yi[0].pinyin).toBe("yí");
    const yi2 = applySandhi(["一", "天"], ["yī", "tiān"]);
    expect(yi2[0].pinyin).toBe("yì");
    const yi3 = applySandhi(["第", "一", "天"], ["dì", "yī", "tiān"]);
    expect(yi3[1].pinyin).toBe("yī");
    const yi4 = applySandhi(["十", "一", "月"], ["shí", "yī", "yuè"]);
    expect(yi4[1].pinyin).toBe("yī");
  });

  it("compara pinyin del usuario de forma flexible", () => {
    expect(pinyinEquals("ni3 hao3", "nǐ hǎo")).toBe(true);
    expect(pinyinEquals("nihao", "nǐ hǎo")).toBe(false);
    expect(pinyinEquals("nihao", "nǐ hǎo", { requireTones: false })).toBe(true);
    expect(pinyinEquals("ni2 hao3", "nǐ hǎo")).toBe(false);
    const d = pinyinDiff("ni2 hao3", "nǐ hǎo");
    expect(d[0].ok).toBe(false);
    expect(d[0].toneOnly).toBe(true);
    expect(d[1].ok).toBe(true);
  });
});

describe("pinyin-pro", () => {
  it("devuelve pinyin por carácter con polifonía", () => {
    expect(lexicalPinyinPerChar("你好")).toEqual(["nǐ", "hǎo"]);
    expect(lexicalPinyinPerChar("你好，世界！")).toEqual(["nǐ", "hǎo", "", "shì", "jiè", ""]);
    expect(lexicalPinyinPerChar("我们")[1]).toBe("men");
    expect(lexicalPinyinPerChar("银行")[1]).toBe("háng");
  });

  it("textToPinyin aplica sandhi y respeta overrides", () => {
    const r = textToPinyin("你好");
    expect(r[0].spoken).toBe("ní");
    expect(r[0].pinyin).toBe("nǐ");
    const o = textToPinyin("谢谢", ["xiè", "xie"]);
    expect(o[1].pinyin).toBe("xie");
    expect(o[1].tone).toBe(5);
  });

  it("reparte el pinyin de palabra entre caracteres", () => {
    expect(distributePinyin("谢谢", "xièxie")).toEqual(["xiè", "xie"]);
    expect(distributePinyin("不客气", "bú kèqi")).toEqual(["bú", "kè", "qi"]);
    expect(distributePinyin("你好", "nǐ")).toBeUndefined();
  });
});
