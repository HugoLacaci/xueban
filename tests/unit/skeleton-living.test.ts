import { describe, expect, it } from "vitest";
import {
  checkBuild,
  checkSentence,
  columnsFor,
  curriculumRank,
  joinPy,
  joinZh,
  moves,
  visibleSlots,
  type SkeletonSentence,
} from "@/lib/course/skeleton";
import {
  checkLivingNotes,
  growthForLesson,
  growthTimeline,
  isUnlocked,
  mergeAdditions,
  noteStatus,
  recentGrowth,
  unlockLabel,
  type LivingNote,
} from "@/lib/notes/living-model";

const full: SkeletonSentence = {
  slots: {
    time0: { zh: "明天上午", py: "míngtiān shàngwǔ" },
    subject: { zh: "我", py: "wǒ" },
    with: { zh: "跟朋友一起", py: "gēn péngyou yìqǐ" },
    verb1: { zh: "坐地铁去学校", py: "zuò dìtiě qù xuéxiào" },
    verb2: { zh: "上", py: "shàng" },
    object: { zh: "汉语课", py: "Hànyǔ kè" },
  },
  end: "。",
  es: "Mañana por la mañana voy a clase de chino en metro con un amigo.",
  esOrder: [
    { text: "Mañana por la mañana", slot: "time0" },
    { text: "voy a", slot: "verb1" },
    { text: "clase de chino", slot: "object" },
    { text: "con un amigo", slot: "with" },
  ],
};

describe("esqueleto de la frase", () => {
  it("rango del temario", () => {
    expect(curriculumRank("e0")).toBe(0);
    expect(curriculumRank("e0-05")).toBe(5);
    expect(curriculumRank("a1-u07-l3")).toBe(1007);
    expect(curriculumRank("a2-u01")).toBe(2001);
    expect(curriculumRank("u05")).toBe(Number.POSITIVE_INFINITY);
  });
  it("el esqueleto crece: en la U1 solo hay sujeto, adverbio, verbo, objeto y partícula", () => {
    expect(visibleSlots("a1-u01-l1")).toEqual(["subject", "adverb", "verb1", "object", "particle"]);
    expect(visibleSlots("a1-u14-l1")).toContain("place");
    expect(visibleSlots("a1-u13-l1")).not.toContain("place");
    expect(visibleSlots("b1-u01")).toHaveLength(12);
  });
  it("une la frase en orden canónico", () => {
    expect(joinZh(full)).toBe("明天上午我跟朋友一起坐地铁去学校上汉语课。");
    expect(joinPy(full)).toBe(
      "Míngtiān shàngwǔ wǒ gēn péngyou yìqǐ zuò dìtiě qù xuéxiào shàng Hànyǔ kè.",
    );
  });
  it("columnas: huecos visibles en ese punto + los usados", () => {
    expect(columnsFor([full], "a1-u21")).toEqual([
      "time0",
      "subject",
      "time",
      "adverb",
      "aux",
      "with",
      "place",
      "verb1",
      "verb2",
      "object",
      "complement",
      "particle",
    ]);
    expect(
      columnsFor(
        [
          {
            slots: { subject: { zh: "我" }, verb1: { zh: "是" }, object: { zh: "学生" } },
            es: "Soy estudiante.",
          },
        ],
        "a1-u01",
      ),
    ).toEqual(["subject", "adverb", "verb1", "object", "particle"]);
  });
  it("detecta huecos usados antes de enseñarse y textos que no coinciden", () => {
    expect(
      checkSentence(full, { at: "a1-u21", expectZh: "明天上午我跟朋友一起坐地铁去学校上汉语课" }),
    ).toEqual([]);
    expect(checkSentence(full, { at: "a1-u03" }).join(" ")).toMatch(/Con quién/);
    expect(checkSentence(full, { expectZh: "我去学校" })[0]).toMatch(/no coincide/);
  });
  it("movimientos respecto al español", () => {
    const m = moves(full);
    expect(m.find((x) => x.slot === "with")?.moved).toBe(true);
    expect(m.find((x) => x.slot === "time0")?.moved).toBe(false);
  });
  it("comprueba «Construye la frase»", () => {
    expect(
      checkBuild(full, ["明天上午", "我", "跟朋友一起", "坐地铁去学校", "上", "汉语课"]).ok,
    ).toBe(true);
    const bad = checkBuild(full, ["我", "明天上午", "跟朋友一起", "坐地铁去学校", "上", "汉语课"]);
    expect(bad.ok).toBe(false);
    expect(bad.misplaced).toEqual(["time0", "subject"]);
  });
});

const note: LivingNote = {
  id: "adjetivos",
  title: "Adjetivos",
  order: 5,
  summary: "",
  reviewed: false,
  sections: [
    { id: "grados", title: "Grados", unlockedBy: "a1-u08-l3", markdown: "很, 非常…" },
    { id: "hen", title: "很 + adj", unlockedBy: "a1-u08-l1", markdown: "我很忙。" },
    { id: "bi", title: "比", unlockedBy: "a2-u06-l1", markdown: "我比他高。" },
    { id: "yidianr", title: "一点儿 / 有点儿", unlockedBy: "a1-u16-l3", markdown: "有点儿贵。" },
  ],
};

describe("apuntes vivos", () => {
  const progress = new Map([
    ["a1-u08-l1", { status: "completed", completedAt: Date.UTC(2026, 10, 3) }],
    ["a1-u08-l3", { status: "started" }],
  ]);
  it("desbloqueo al completar la lección", () => {
    expect(isUnlocked(note.sections[1], progress)).toBe(true);
    expect(isUnlocked(note.sections[0], progress)).toBe(false);
    const st = noteStatus(note, progress);
    expect(st).toMatchObject({ unlocked: 1, total: 4 });
    expect(st.next?.id).toBe("grados");
  });
  it("línea de evolución ordenada por temario", () => {
    expect(growthTimeline(note)).toEqual(["U8", "U16", "A2·U6"]);
    expect(unlockLabel("e0-05")).toBe("0.5");
  });
  it("qué crece al terminar una lección y novedades recientes", () => {
    expect(growthForLesson([note], "a1-u08-l1")[0].sections.map((s) => s.id)).toEqual(["hen"]);
    expect(growthForLesson([note], "a1-u01-l1")).toEqual([]);
    expect(recentGrowth([note], progress, Date.UTC(2026, 10, 4)).map((x) => x.section.id)).toEqual([
      "hen",
    ]);
    expect(recentGrowth([note], progress, Date.UTC(2026, 10, 30))).toEqual([]);
  });
  it("las aportaciones del usuario se intercalan sin tocar la base", () => {
    const merged = mergeAdditions(note.sections, [
      {
        id: "m1",
        noteId: "adjetivos",
        afterSectionId: "hen",
        kind: "teacher",
        markdown: "El profe dice…",
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: "m2",
        noteId: "adjetivos",
        kind: "example",
        markdown: "我很累。",
        createdAt: 2,
        updatedAt: 2,
      },
    ]);
    expect(merged.map((x) => (x.type === "base" ? x.section.id : x.add.id))).toEqual([
      "grados",
      "hen",
      "m1",
      "bi",
      "yidianr",
      "m2",
    ]);
    expect(note.sections).toHaveLength(4);
  });
  it("validación de contenido", () => {
    expect(
      checkLivingNotes([note], new Set(["a1-u08-l1", "a1-u08-l3", "a1-u16-l3", "a2-u06-l1"])),
    ).toEqual([]);
    expect(checkLivingNotes([note], new Set(["a1-u08-l1"]))).toHaveLength(3);
  });
});
