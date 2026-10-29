import { describe, expect, it } from "vitest";
import { choseong, josa, pronounce, romanizeRR } from "@/lib/languages/ko/phonology";

/** Casos verificados con la norma de pronunciación estándar (표준 발음법) y ejemplos del NIKL. */
const PRON: [string, string][] = [
  ["한국어", "한구거"],
  ["음악", "으막"],
  ["좋아요", "조아요"],
  ["좋다", "조타"],
  ["축하해요", "추카해요"],
  ["입학", "이팍"],
  ["같이", "가치"],
  ["굳이", "구지"],
  ["합니다", "함니다"],
  ["한국말", "한궁말"],
  ["감사합니다", "감사함니다"],
  ["신라", "실라"],
  ["설날", "설랄"],
  ["학교", "학꾜"],
  ["식당", "식땅"],
  ["먹다", "먹따"],
  ["꽃", "꼳"],
  ["부엌", "부억"],
  ["값이", "갑씨"],
  ["읽어요", "일거요"],
  ["앉아요", "안자요"],
  ["많이", "마니"],
  ["싫어요", "시러요"],
  ["국물", "궁물"],
  ["심리", "심니"],
  ["종로", "종노"],
  ["독립", "동닙"],
  ["옷이", "오시"],
  ["있어요", "이써요"],
];

const RR: [string, string][] = [
  ["한국어", "hangugeo"],
  ["서울", "seoul"],
  ["신라", "silla"],
  ["종로", "jongno"],
  ["학교", "hakgyo"],
  ["좋다", "jota"],
  ["같이", "gachi"],
  ["감사합니다", "gamsahamnida"],
  ["부산", "busan"],
  ["대전", "daejeon"],
  ["김치", "gimchi"],
  ["한글", "hangeul"],
];

describe("pronunciación real (reglas fonológicas)", () => {
  for (const [w, p] of PRON) it(`${w} → [${p}]`, () => expect(pronounce(w).pron).toBe(p));
  it("informa de las reglas aplicadas", () => {
    expect(pronounce("한국어").rules).toContain("yeoneum");
    expect(pronounce("합니다").rules).toContain("bieum");
    expect(pronounce("학교").rules).toContain("gyeongeum");
    expect(pronounce("좋다").rules).toContain("gyeogeum");
    expect(pronounce("신라").rules).toContain("yuseum");
  });
});

describe("romanización revisada", () => {
  for (const [w, r] of RR) it(`${w} → ${r}`, () => expect(romanizeRR(w)).toBe(r));
});

describe("jamo y partículas", () => {
  it("consonantes iniciales (초성)", () => expect(choseong("한국")).toBe("ㅎㄱ"));
  it("partículas según batchim", () => {
    expect(josa("책", "이/가")).toBe("책이");
    expect(josa("사과", "이/가")).toBe("사과가");
    expect(josa("학생", "은/는")).toBe("학생은");
    expect(josa("지하철", "으로/로")).toBe("지하철로");
    expect(josa("버스", "으로/로")).toBe("버스로");
    expect(josa("집", "으로/로")).toBe("집으로");
    expect(josa("학생", "이에요/예요")).toBe("학생이에요");
    expect(josa("의사", "이에요/예요")).toBe("의사예요");
  });
});
