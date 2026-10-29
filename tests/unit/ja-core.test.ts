import { describe, expect, it } from "vitest";
import { conjugate, deinflect, guessClass } from "@/lib/languages/ja/conjugation";
import { alignFurigana } from "@/lib/languages/ja/furigana";
import { moras } from "@/lib/languages/ja/kana";
import { patternOf, pitchLevels } from "@/lib/languages/ja/pitch";

/** Lista verificada a mano contra gramáticas estándar (Genki I, Minna no Nihongo). */
const VERBS: [string, Parameters<typeof conjugate>[2], Record<string, string>][] = [
  ["食べる", "ichidan", { masu: "食べます", masen: "食べません", mashita: "食べました", masendeshita: "食べませんでした", nai: "食べない", ta: "食べた", nakatta: "食べなかった", te: "食べて", tai: "食べたい", mashou: "食べましょう", potential: "食べられる", volitional: "食べよう" }],
  ["書く", "godan", { masu: "書きます", nai: "書かない", te: "書いて", ta: "書いた", potential: "書ける", volitional: "書こう" }],
  ["泳ぐ", "godan", { te: "泳いで", ta: "泳いだ", nai: "泳がない" }],
  ["話す", "godan", { te: "話して", masu: "話します", nai: "話さない" }],
  ["待つ", "godan", { te: "待って", nai: "待たない", masu: "待ちます" }],
  ["死ぬ", "godan", { te: "死んで", ta: "死んだ" }],
  ["遊ぶ", "godan", { te: "遊んで", nai: "遊ばない" }],
  ["飲む", "godan", { te: "飲んで", masu: "飲みます", potential: "飲める", volitional: "飲もう" }],
  ["帰る", "godan", { te: "帰って", nai: "帰らない", masu: "帰ります" }],
  ["買う", "godan", { te: "買って", nai: "買わない", ta: "買った" }],
  ["行く", "godan", { te: "行って", ta: "行った", nai: "行かない", masu: "行きます" }],
  ["ある", "godan", { nai: "ない", nakatta: "なかった", masu: "あります" }],
  ["する", "suru", { masu: "します", nai: "しない", te: "して", potential: "できる", volitional: "しよう" }],
  ["勉強する", "suru", { masu: "勉強します", te: "勉強して", ta: "勉強した" }],
  ["来る", "kuru", { masu: "来ます", nai: "来ない", te: "来て", ta: "来た" }],
  ["くる", "kuru", { masu: "きます", nai: "こない", te: "きて" }],
];

describe("conjugación japonesa", () => {
  for (const [w, cls, forms] of VERBS) {
    it(`${w} (${cls})`, () => {
      for (const [f, want] of Object.entries(forms)) expect(conjugate(w, f, cls), `${w} ${f}`).toBe(want);
    });
  }
  it("adjetivos い y な, con いい irregular", () => {
    expect(conjugate("高い", "nai", "i-adj")).toBe("高くない");
    expect(conjugate("高い", "ta", "i-adj")).toBe("高かった");
    expect(conjugate("高い", "te", "i-adj")).toBe("高くて");
    expect(conjugate("いい", "nai", "i-adj")).toBe("よくない");
    expect(conjugate("いい", "ta", "i-adj")).toBe("よかった");
    expect(conjugate("静か", "nai", "na-adj")).toBe("静かじゃない");
    expect(conjugate("静か", "adj-past-polite", "na-adj")).toBe("静かでした");
    expect(conjugate("静か", "te", "na-adj")).toBe("静かで");
  });
  it("adivina la clase", () => {
    expect(guessClass("食べる")).toBe("ichidan");
    expect(guessClass("飲む")).toBe("godan");
    expect(guessClass("勉強する")).toBe("suru");
    expect(guessClass("帰る", "godan")).toBe("godan");
  });
  it("deinflexión: propone la forma de diccionario", () => {
    expect(deinflect("食べました")).toContain("食べる");
    expect(deinflect("飲みます")).toContain("飲む");
    expect(deinflect("行った")).toContain("行く");
    expect(deinflect("読んで")).toContain("読む");
    expect(deinflect("高かった")).toContain("高い");
    expect(deinflect("勉強します")).toContain("勉強する");
  });
});

describe("furigana y acento tonal", () => {
  it("alinea furigana solo sobre los kanji", () => {
    expect(alignFurigana("食べる", "たべる")).toEqual([{ text: "食", reading: "た" }, { text: "べる" }]);
    expect(alignFurigana("美味しい", "おいしい")).toEqual([{ text: "美味", reading: "おい" }, { text: "しい" }]);
    expect(alignFurigana("お茶", "おちゃ")).toEqual([{ text: "お" }, { text: "茶", reading: "ちゃ" }]);
    expect(alignFurigana("ありがとう", "ありがとう")).toEqual([{ text: "ありがとう" }]);
  });
  it("cuenta moras y calcula el patrón", () => {
    expect(moras("きょう")).toEqual(["きょ", "う"]);
    expect(moras("がっこう")).toHaveLength(4);
    expect(patternOf(0, 4)).toBe("heiban");
    expect(patternOf(1, 2)).toBe("atamadaka");
    expect(patternOf(2, 3)).toBe("nakadaka");
    expect(patternOf(2, 2)).toBe("odaka");
    expect(pitchLevels("はし", 1).levels).toEqual(["H", "L"]);
    expect(pitchLevels("はし", 2)).toMatchObject({ levels: ["L", "H"], particle: "L" });
    expect(pitchLevels("さくら", 0)).toMatchObject({ levels: ["L", "H", "H"], particle: "H" });
  });
});
