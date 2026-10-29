import { describe, expect, it } from "vitest";
import { conjugateKo, guessIrregular, lemmaCandidatesKo } from "@/lib/languages/ko/conjugation";

/** Formas verificadas con gramáticas estándar (Talk To Me In Korean, KGIU, Sogang). */
const CASES: [string, Record<string, string>][] = [
  ["먹다", { ayo: "먹어요", seumnida: "먹습니다", past: "먹었어요", future: "먹을 거예요", neg: "안 먹어요", want: "먹고 싶어요", please: "먹으세요", so: "먹어서", if: "먹으면", can: "먹을 수 있어요", shall: "먹을까요?", banmal: "먹어" }],
  ["가다", { ayo: "가요", seumnida: "갑니다", past: "갔어요", future: "갈 거예요", please: "가세요", if: "가면", can: "갈 수 있어요" }],
  ["오다", { ayo: "와요", past: "왔어요", so: "와서" }],
  ["보다", { ayo: "봐요", past: "봤어요" }],
  ["마시다", { ayo: "마셔요", past: "마셨어요", seumnida: "마십니다" }],
  ["주다", { ayo: "줘요", past: "줬어요" }],
  ["되다", { ayo: "돼요", past: "됐어요" }],
  ["배우다", { ayo: "배워요", past: "배웠어요" }],
  ["공부하다", { ayo: "공부해요", past: "공부했어요", neg: "공부 안 해요", seumnida: "공부합니다" }],
  ["하다", { ayo: "해요", past: "했어요", seumnida: "합니다" }],
  ["좋다", { ayo: "좋아요", past: "좋았어요", if: "좋으면" }],
  ["읽다", { ayo: "읽어요", seumnida: "읽습니다", please: "읽으세요" }],
  ["춥다", { ayo: "추워요", past: "추웠어요", if: "추우면", future: "추울 거예요" }],
  ["돕다", { ayo: "도와요", please: "도우세요" }],
  ["입다", { ayo: "입어요", please: "입으세요" }],
  ["듣다", { ayo: "들어요", past: "들었어요", please: "들으세요", seumnida: "듣습니다" }],
  ["받다", { ayo: "받아요" }],
  ["낫다", { ayo: "나아요", if: "나으면" }],
  ["모르다", { ayo: "몰라요", past: "몰랐어요" }],
  ["부르다", { ayo: "불러요" }],
  ["빠르다", { ayo: "빨라요" }],
  ["그렇다", { ayo: "그래요", if: "그러면" }],
  ["빨갛다", { ayo: "빨개요" }],
  ["쓰다", { ayo: "써요", past: "썼어요" }],
  ["바쁘다", { ayo: "바빠요" }],
  ["크다", { ayo: "커요" }],
  ["살다", { ayo: "살아요", seumnida: "삽니다", please: "사세요", if: "살면", future: "살 거예요", because: "사니까" }],
  ["만들다", { ayo: "만들어요", please: "만드세요", seumnida: "만듭니다" }],
];

describe("conjugación coreana", () => {
  for (const [v, forms] of CASES) {
    it(v, () => {
      for (const [f, want] of Object.entries(forms)) expect(conjugateKo(v, f), `${v} ${f}`).toBe(want);
    });
  }
  it("detecta irregulares", () => {
    expect(guessIrregular("춥다")).toBe("ㅂ");
    expect(guessIrregular("입다")).toBe(null);
    expect(guessIrregular("듣다")).toBe("ㄷ");
    expect(guessIrregular("받다")).toBe(null);
    expect(guessIrregular("모르다")).toBe("르");
    expect(guessIrregular("좋다")).toBe(null);
    expect(guessIrregular("쓰다")).toBe("으");
    expect(guessIrregular("살다")).toBe("ㄹ");
  });
  it("propone el lema", () => {
    expect(lemmaCandidatesKo("먹었어요")).toContain("먹다");
    expect(lemmaCandidatesKo("가요")).toContain("가다");
    expect(lemmaCandidatesKo("마셔요")).toContain("마시다");
    expect(lemmaCandidatesKo("공부해요")).toContain("공부하다");
  });
});
