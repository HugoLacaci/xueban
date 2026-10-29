/**
 * Tipo de nota «한국어 · Vocabulario (Hugo)»: misma lógica que el chino (WebID, reconocimiento,
 * producción y escucha) con los campos Romanizacion, Pronunciacion (pronunciación real) y Hanja.
 */
import type { AnkiModelSpec } from "@/lib/languages/types";
import type { Word } from "@/lib/db/schema";
import { uuid } from "@/lib/db/ids";
import { pronounce, romanizeRR } from "./phonology";

export const KO_MODEL_NAME = "한국어 · Vocabulario (Hugo)";
export const KO_MODEL_ID = 1782026401;
export const KO_DECK_ROOT = "한국어 Coreano";
export const KO_FIELDS = ["Palabra", "Romanizacion", "Pronunciacion", "Significado", "Categoria", "Hanja", "Irregular", "Ejemplo", "EjemploRomanizacion", "EjemploTraduccion", "Audio", "Imagen", "Notas", "TOPIK", "WebID", "CrearProduccion"] as const;

export const KO_CSS = `.card{font-family:"Segoe UI",system-ui,sans-serif;background:#F6F1E7;color:#1D1B19;text-align:center;padding:18px 12px;font-size:18px;line-height:1.5}
.nightMode.card,.night_mode .card{background:#161718;color:#ece7de}
[lang=ko-KR],.word,.ex-ko{font-family:"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif}
.word.big{font-size:64px;line-height:1.2;margin:8px 0 4px}
.roman{font-size:22px;color:#2F6F73}.nightMode .roman{color:#8fc9cb}
.pron{font-size:18px;color:#B5402E}.nightMode .pron{color:#e8907e}
.hanja{font-family:"Noto Serif KR","Batang",serif;font-size:22px;color:#6b6156}
.label{color:#8a7f72;font-size:14px;text-transform:uppercase;letter-spacing:.08em}
.label.small{font-size:13px;text-transform:none;letter-spacing:0;margin-top:14px}
.meaning{font-size:22px;margin:8px 0 10px}.big-es{font-size:32px;margin:22px 0}
.example{margin:18px auto 8px;max-width:560px;text-align:left;border-left:4px solid #2F6F73;background:rgba(47,111,115,.07);padding:10px 14px;border-radius:6px}
.ex-ko{font-size:24px}.ex-rm{color:#6b6156;font-size:15px}.ex-es{font-size:16px;font-style:italic}
.chip{display:inline-block;border:1px solid #d8cfc2;border-radius:999px;padding:1px 10px;margin:2px;font-size:13px;color:#6b6156}
.links{margin-top:12px;font-size:13px}.links a{color:#2F6F73;text-decoration:none}
.notes{margin-top:12px;font-size:15px;color:#6b6156}
.toolbar{margin-top:14px}.toolbar button{font-size:13px;border:1px solid #d8cfc2;background:transparent;color:inherit;border-radius:6px;padding:3px 10px;cursor:pointer}
.roman-off .roman,.roman-off .ex-rm{visibility:hidden}`;

const JS = `(function(){var K='ko_roman_off';function a(){var o=false;try{o=localStorage.getItem(K)==='1';}catch(e){}document.body.classList.toggle('roman-off',o);}
window.koToggleRoman=function(){try{localStorage.setItem(K,localStorage.getItem(K)==='1'?'0':'1');}catch(e){document.body.classList.toggle('roman-off');return;}a();};a();})();`;

const TTS = "{{tts ko_KR voices=Microsoft_SunHi,Microsoft_Heami,Microsoft_InJoon,Apple_Yuna:Palabra}}";
const TTS_EX = "{{tts ko_KR voices=Microsoft_SunHi,Microsoft_Heami,Microsoft_InJoon,Apple_Yuna:Ejemplo}}";

function back(): string {
  return `
<div class="word big" lang="ko-KR">{{Palabra}}</div>
<div class="roman">{{Romanizacion}}</div>
{{#Pronunciacion}}<div class="pron">[{{Pronunciacion}}]</div>{{/Pronunciacion}}
{{#Hanja}}<div class="hanja">{{Hanja}}</div>{{/Hanja}}
<div class="meaning">{{Significado}}</div>
<div class="audio">{{Audio}} ${TTS}</div>
{{#Ejemplo}}
<div class="example">
  <div class="ex-ko" lang="ko-KR">{{Ejemplo}}</div>
  <div class="ex-rm">{{EjemploRomanizacion}}</div>
  <div class="ex-es">{{EjemploTraduccion}}</div>
  <div class="audio small">${TTS_EX}</div>
</div>
{{/Ejemplo}}
<div class="meta"><span class="chip">{{Categoria}}</span>{{#Irregular}}<span class="chip">irregular {{Irregular}}</span>{{/Irregular}}{{#TOPIK}}<span class="chip">{{TOPIK}}</span>{{/TOPIK}}</div>
<div class="links">
  <a href="https://krdict.korean.go.kr/spa/dicSearch/search?nation=spa&nationCode=4&mainSearchWord={{text:Palabra}}">KRDict (español)</a> ·
  <a href="https://en.wiktionary.org/wiki/{{text:Palabra}}#Korean">Wiktionary</a>
</div>
{{#Notas}}<div class="notes">{{Notas}}</div>{{/Notas}}
<div class="toolbar"><button onclick="koToggleRoman()">로마자 on/off</button></div>
<script>${JS}</script>`;
}

export const KO_TEMPLATES = [
  { Name: "1 · Reconocimiento (한국어 → significado)", Front: `<div class="label">¿Qué significa?</div>\n<div class="word big" lang="ko-KR">{{Palabra}}</div>\n<div class="roman">{{Romanizacion}}</div>\n<div class="toolbar"><button onclick="koToggleRoman()">로마자 on/off</button></div>\n<script>${JS}</script>`, Back: back() },
  { Name: "2 · Producción (español → 한국어)", Front: `{{#CrearProduccion}}<div class="label">¿Cómo se dice en coreano?</div>\n<div class="meaning big-es">{{Significado}}</div>\n<div class="meta"><span class="chip">{{Categoria}}</span></div>\n<div class="label small">Dilo en voz alta y escríbelo en hangul.</div>{{/CrearProduccion}}`, Back: back() },
  { Name: "3 · Escucha (audio → significado)", Front: `{{#Palabra}}<div class="label">Escucha: ¿qué palabra es?</div>\n<div class="audio listen">{{Audio}} ${TTS}</div>\n<div class="label small">Si no oyes nada, instala la voz coreana de Windows (ver GUIA_ANKI).</div>{{/Palabra}}`, Back: back() },
];

export function koToFields(w: Word): Record<string, string> {
  const pron = (w.extra?.pronunciation as string | undefined) ?? pronounce(w.hanzi).pron;
  return {
    Palabra: w.hanzi,
    Romanizacion: w.romanization ?? w.pinyin ?? romanizeRR(w.hanzi),
    Pronunciacion: pron !== w.hanzi ? pron : "",
    Significado: w.meaning,
    Categoria: w.category,
    Hanja: (w.extra?.hanja as string | undefined) || w.traditional || "",
    Irregular: (w.extra?.irregular as string | undefined) ?? "",
    Ejemplo: w.example ?? "",
    EjemploRomanizacion: w.examplePinyin ?? "",
    EjemploTraduccion: w.exampleTranslation ?? "",
    Audio: w.audio ? `[sound:${w.audio.split("/").pop()}]` : "",
    Imagen: w.image ?? "",
    Notas: w.notes ?? "",
    TOPIK: w.hsk.filter((h) => /^TOPIK/.test(h)).join(" "),
    WebID: w.id,
    CrearProduccion: w.createProduction ? "y" : "",
  };
}

export function koTags(w: Word): string[] {
  const tags = new Set<string>(w.tags);
  for (const h of w.hsk) if (/^TOPIK/.test(h)) tags.add(h);
  tags.add(`cat::${w.category.replace(/\s+/g, "_")}`);
  if (w.source === "class") tags.add("clase");
  return Array.from(tags);
}

export function koFromFields(fields: Record<string, { value: string }>, tags: string[], noteId: number, mod: number | undefined, existing?: Word): Word {
  const f = (k: string) => (fields[k]?.value ?? "").replace(/<[^>]+>/g, "").trim();
  const now = Date.now();
  const lv = f("TOPIK").split(/\s+/).filter(Boolean);
  const audio = f("Audio").match(/\[sound:([^\]]+)\]/)?.[1];
  return {
    id: existing?.id ?? (f("WebID") || (f("Palabra") ? `mine-ko-${f("Palabra")}` : uuid())),
    lang: "ko",
    hanzi: f("Palabra"),
    pinyin: f("Romanizacion") || romanizeRR(f("Palabra")),
    romanization: f("Romanizacion") || undefined,
    traditional: f("Hanja") || undefined,
    meaning: f("Significado"),
    meaningEn: existing?.meaningEn,
    category: f("Categoria") || existing?.category || "Clase",
    example: f("Ejemplo") || undefined,
    examplePinyin: f("EjemploRomanizacion") || undefined,
    exampleTranslation: f("EjemploTraduccion") || undefined,
    hsk: lv.length ? lv : (existing?.hsk ?? []),
    level: existing?.level,
    tags: Array.from(new Set([...tags.filter((t) => !t.startsWith("cat::")), ...(existing?.tags ?? [])])),
    notes: f("Notas") || undefined,
    audio: audio ? `/audio/ko/${audio}` : existing?.audio,
    image: f("Imagen") || undefined,
    source: existing?.source ?? "anki",
    sourceRef: existing?.sourceRef,
    createProduction: f("CrearProduccion").toLowerCase() === "y",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ankiNoteId: noteId,
    ankiMod: mod,
    extra: { ...existing?.extra, hanja: f("Hanja"), pronunciation: f("Pronunciacion") || undefined, irregular: f("Irregular") || null },
  };
}

export const koAnki: AnkiModelSpec = {
  modelName: KO_MODEL_NAME,
  modelId: KO_MODEL_ID,
  deckRoot: KO_DECK_ROOT,
  deckMine: `${KO_DECK_ROOT}::Mis palabras (clase)`,
  deckLevel: `${KO_DECK_ROOT}::TOPIK I`,
  fields: KO_FIELDS,
  keyField: "Palabra",
  css: KO_CSS,
  templates: KO_TEMPLATES,
  req: [
    [0, "any", [0]],
    [1, "all", [15]],
    [2, "any", [0]],
  ],
  ordToType: { 0: "recognition", 1: "production", 2: "listening" },
  cardOrds: (w) => (w.createProduction ? [0, 1, 2] : [0, 2]),
  toFields: koToFields,
  fromFields: koFromFields,
  tags: koTags,
  deckFor(w, names) {
    const idx = names.indexOf(w.category);
    if (w.source === "seed" && idx >= 0) return `${KO_DECK_ROOT}::TOPIK I::${String(idx + 1).padStart(2, "0")} ${w.category}`;
    return `${KO_DECK_ROOT}::Mis palabras (clase)`;
  },
  minePrefix: "mine-ko-",
  apkgFileName: "Coreano_TOPIK1_Hugo",
};
