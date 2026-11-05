import { describe, expect, it } from "vitest";
import {
  buildStages,
  formationType,
  playableIndices,
  VIEW_STAGES,
} from "@/lib/hanzi/origin-stages";
import { buildNormalized, cleanSvg, recolor } from "../../scripts/normalize-glyphs";

describe("visor de origen: modelo de etapas", () => {
  it("siempre devuelve 6 etapas en el mismo orden, aunque no haya datos", () => {
    const s = buildStages(undefined, undefined);
    expect(s.map((x) => x.key)).toEqual(VIEW_STAGES);
    expect(s.filter((x) => x.kind === "missing")).toHaveLength(5);
    expect(s[5].kind).toBe("font");
    expect(playableIndices(s)).toEqual([5]);
  });

  it("distingue formas reales de ilustrativas y usa el sello grande si falta el pequeño", () => {
    const entry = {
      stages: ["oracle", "bigseal"],
      normalized: ["oracle"],
      credits: [
        { file: "File:马-oracle.svg", url: "u", license: "Public domain", stage: "oracle" },
      ],
    };
    const s = buildStages(entry, { c: "马", drawing: "M0 0L10 10", oracle: "M1 1" });
    expect(s[0]).toMatchObject({ key: "drawing", kind: "illustrative" });
    expect(s[1]).toMatchObject({
      key: "oracle",
      kind: "real",
      file: { stage: "oracle", normalized: true },
    });
    expect(s[1].source).toContain("Public domain");
    expect(s[2].kind).toBe("missing");
    expect(s[3]).toMatchObject({
      key: "seal",
      kind: "real",
      file: { stage: "bigseal", normalized: false },
    });
    expect(s[3].variant).toContain("大篆");
    expect(playableIndices(s)).toEqual([0, 1, 3, 5]);
  });

  it("sin oráculo real, la aproximación propia se etiqueta como ilustrativa", () => {
    const s = buildStages(
      { stages: [], credits: [] },
      { c: "日", drawing: "M0 0", oracle: "M1 1" },
    );
    expect(s[1].kind).toBe("illustrative");
    expect(s[1].source).toMatch(/ilustrativa/);
  });

  it("tipo de formación (六书)", () => {
    expect(formationType("pictograma")?.zh).toBe("象形");
    expect(formationType(undefined, "pictophonetic")?.zh).toBe("形声");
    expect(formationType("指事")?.zh).toBe("指事");
    expect(formationType()).toBeNull();
  });
});

describe("normalizador de glifos", () => {
  const raw = `<?xml version="1.0"?><!-- x --><svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><metadata>m</metadata><path d="M10 10h50v50z" style="fill:#000000"/></svg>`;
  it("limpia el SVG y deduce el viewBox de width/height", () => {
    const { svg, vb } = cleanSvg(raw);
    expect(vb).toEqual([0, 0, 300, 200]);
    expect(svg).not.toMatch(/metadata|<\?xml|<!--/);
    expect(svg).toContain('viewBox="0 0 300 200"');
  });
  it("encaja el bbox en 0 0 100 100 con margen del 10 % y usa currentColor", () => {
    const { svg } = cleanSvg(raw);
    const out = buildNormalized(svg, { x: 10, y: 10, w: 50, h: 50 });
    expect(out).toContain('viewBox="0 0 100 100"');
    // lado = 50 / 0,8 = 62,5 → escala 1,6; centro (35,35) → 50 − 35·1,6 = −6
    expect(out).toContain("translate(-6 -6) scale(1.6)");
    expect(out).toContain("fill:currentColor");
    expect(recolor('<path fill="white"/>')).toContain('fill="white"');
  });
});
