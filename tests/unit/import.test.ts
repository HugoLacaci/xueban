import { describe, expect, it } from "vitest";
import { parseImport } from "@/lib/import";

describe("importación masiva", () => {
  it("acepta una palabra por línea", () => {
    const rows = parseImport("咖啡\n茶\n\n# comentario\n啤酒");
    expect(rows.map((r) => r.hanzi)).toEqual(["咖啡", "茶", "啤酒"]);
    expect(rows.every((r) => !r.error)).toBe(true);
  });

  it("acepta CSV con cabecera y comillas", () => {
    const rows = parseImport('hanzi,pinyin,significado,categoria\n咖啡,ka1fei1,"café, cafetería",Comida y bebida');
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({ hanzi: "咖啡", pinyin: "kāfēi", meaning: "café, cafetería", category: "Comida y bebida" });
  });

  it("acepta separadores | y tabulador y hanzi + pinyin + significado con espacios", () => {
    expect(parseImport("咖啡 | kāfēi | café")[0]).toMatchObject({ hanzi: "咖啡", pinyin: "kāfēi", meaning: "café" });
    expect(parseImport("咖啡\tkāfēi\tcafé")[0]).toMatchObject({ hanzi: "咖啡", pinyin: "kāfēi", meaning: "café" });
    expect(parseImport("咖啡 kāfēi café con leche")[0]).toMatchObject({ hanzi: "咖啡", pinyin: "kāfēi", meaning: "café con leche" });
    expect(parseImport("咖啡 café")[0]).toMatchObject({ hanzi: "咖啡", meaning: "café" });
  });

  it("marca errores y duplicados", () => {
    const rows = parseImport("hola\n咖啡\n咖啡");
    expect(rows[0].error).toMatch(/sin caracteres/);
    expect(rows[2].error).toMatch(/duplicado/);
  });
});
