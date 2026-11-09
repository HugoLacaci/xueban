/** Lectura de transcripciones de Teams (.vtt / .docx) con ejemplos inventados. */
import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { parseDocx, parseVtt, parsePlainTranscript } from "@/lib/classes/teams-transcript";

const VTT = `WEBVTT

0a1b2c3d-1111-2222-3333-444455556666/12-0
00:00:01.000 --> 00:00:09.500
<v Profe Inventada>Hoy vamos a ver los números. 一，二，三。</v>

0a1b2c3d-1111-2222-3333-444455556666/13-0
00:00:10.000 --> 00:00:12.000
<v Ana Ejemplo>我是二十岁。</v>

00:00:12.500 --> 00:00:20.000
<v Profe Inventada>No, sin 是: 我二十岁。Muy bien.</v>

00:00:21.000 --> 00:00:23.000
<v Hugo Prueba>你多大？</v>
`;

describe("transcripción .vtt de Teams", () => {
  it("lee tiempos y texto y anonimiza a los hablantes", () => {
    const segs = parseVtt(VTT, { myName: "Hugo" });
    expect(segs).toHaveLength(4);
    expect(segs[0]).toMatchObject({ start: 1, end: 9.5, speaker: "profesor/a" });
    expect(segs[1]).toMatchObject({ speaker: "compañero/a", text: "我是二十岁。" });
    expect(segs[3].speaker).toBe("yo");
    expect(JSON.stringify(segs)).not.toMatch(/Ana|Inventada|Prueba/);
  });
});

function docx(paragraphs: string[]): Uint8Array {
  const body = paragraphs.map((p) => `<w:p><w:r><w:t xml:space="preserve">${p}</w:t></w:r></w:p>`).join("");
  return zipSync({
    "[Content_Types].xml": strToU8("<Types/>"),
    "word/document.xml": strToU8(`<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${body}</w:body></w:document>`),
  });
}

describe("transcripción .docx de Teams", () => {
  it("formato actual: «Nombre   0:03:12» + texto", () => {
    const segs = parseDocx(
      docx(["Transcripción", "Profe Inventada   0:00:05", "Vamos a corregir el ejercicio 3. 你今年多大？", "Ana Ejemplo   0:00:15", "我今年二十。", "Profe Inventada   0:00:20", "Falta 岁: 我今年二十岁。"]),
    );
    expect(segs.map((s) => s.start)).toEqual([5, 15, 20]);
    expect(segs[0].speaker).toBe("profesor/a");
    expect(segs[0].end).toBe(15);
    expect(segs[1].speaker).toBe("compañero/a");
    expect(segs[2].text).toContain("我今年二十岁");
    expect(JSON.stringify(segs)).not.toMatch(/Ana|Inventada/);
  });

  it("formato antiguo: rango de tiempo, nombre y texto", () => {
    const segs = parsePlainTranscript(["0:0:1.0 --> 0:0:4.5", "Profe Inventada", "Buenos días, 早上好", "0:0:5.0 --> 0:0:6.0", "Profe Inventada", "Repetid conmigo"]);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ start: 1, end: 4.5, speaker: "profesor/a", text: "Buenos días, 早上好" });
  });
});
