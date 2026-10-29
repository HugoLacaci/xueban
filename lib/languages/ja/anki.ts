/**
 * Tipo de nota «日本語 · Vocabulario (Hugo)»: misma lógica que el chino (WebID como clave, tarjetas de
 * reconocimiento, producción y escucha) + tarjeta «Lectura» (kanji → kana) y campos Furigana
 * (formato 漢字[かんじ], compatible con Japanese Support), Acento y TipoPalabra.
 */
import type { AnkiModelSpec } from "@/lib/languages/types";
import type { Word } from "@/lib/db/schema";
import { uuid } from "@/lib/db/ids";
import { alignFurigana } from "./furigana";
import * as wanakana from "wanakana";

export const JA_MODEL_NAME = "日本語 · Vocabulario (Hugo)";
export const JA_MODEL_ID = 1782026301;
export const JA_DECK_ROOT = "日本語 Japonés";

export const JA_FIELDS = ["Palabra", "Lectura", "Furigana", "Romaji", "Significado", "Categoria", "Acento", "TipoPalabra", "Ejemplo", "EjemploLectura", "EjemploTraduccion", "Kanji", "Audio", "Imagen", "Notas", "JLPT", "WebID", "CrearProduccion"] as const;

/** 食べる + たべる → 食[た]べる (formato del complemento Japanese Support). */
export function toAnkiFurigana(word: string, reading: string): string {
  return alignFurigana(word, reading)
    .map((s, i) => (s.reading ? `${i > 0 ? " " : ""}${s.text}[${s.reading}]` : s.text))
    .join("");
}

export const JA_CSS = `.card{font-family:"Segoe UI",system-ui,sans-serif;background:#F4EFE4;color:#1E1C1A;text-align:center;padding:18px 12px;font-size:18px;line-height:1.5}
.nightMode.card,.night_mode .card{background:#141c26;color:#ece6dc}
[lang=ja-JP],.word,.ex-ja{font-family:"Noto Sans JP","Yu Gothic","Meiryo","Hiragino Sans",sans-serif}
.word.big{font-size:64px;line-height:1.3;margin:8px 0 4px}
.word ruby rt{font-size:.38em;color:#264E70}.nightMode .word ruby rt{color:#9cc0e0}
.reading{font-size:24px;color:#264E70}.nightMode .reading{color:#9cc0e0}
.romaji{font-size:14px;color:#7a7064}
.label{color:#8a7f72;font-size:14px;text-transform:uppercase;letter-spacing:.08em}
.label.small{font-size:13px;text-transform:none;letter-spacing:0;margin-top:14px}
.meaning{font-size:22px;margin:8px 0 10px}.big-es{font-size:32px;margin:22px 0}
.example{margin:18px auto 8px;max-width:560px;text-align:left;border-left:4px solid #264E70;background:rgba(38,78,112,.07);padding:10px 14px;border-radius:6px}
.ex-ja{font-size:24px}.ex-rd{color:#6b6156;font-size:15px}.ex-es{font-size:16px;font-style:italic}
.chip{display:inline-block;border:1px solid #d8cfc2;border-radius:999px;padding:1px 10px;margin:2px;font-size:13px;color:#6b6156}
.pitch{display:inline-flex;gap:0;margin:6px auto;font-size:20px}.pitch span{padding:2px 2px 0;border-top:2px solid transparent}
.pitch .H{border-top-color:#C8462F}.pitch .drop{border-right:2px solid #C8462F}
.strokes{display:flex;justify-content:center;gap:6px;margin-top:12px}.strokes svg{width:96px;height:96px;background:#fff;border:1px solid #e5ddd1;border-radius:6px;cursor:pointer}
.strokes path{fill:none;stroke:#1E1C1A;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
.nightMode .strokes svg{background:#1d2633}.nightMode .strokes path{stroke:#ece6dc}
.links{margin-top:12px;font-size:13px}.links a{color:#264E70;text-decoration:none}
.notes{margin-top:12px;font-size:15px;color:#6b6156}
.toolbar{margin-top:14px}.toolbar button{font-size:13px;border:1px solid #d8cfc2;background:transparent;color:inherit;border-radius:6px;padding:3px 10px;cursor:pointer}
.furi-off .word ruby rt{visibility:hidden}`;

export const JA_JS = `(function(){
  var KEY='ja_furi_off';
  function apply(){var off=false;try{off=localStorage.getItem(KEY)==='1';}catch(e){} document.body.classList.toggle('furi-off',off);}
  window.jaToggleFuri=function(){try{localStorage.setItem(KEY,localStorage.getItem(KEY)==='1'?'0':'1');}catch(e){document.body.classList.toggle('furi-off');return;}apply();};
  apply();
  // acento tonal: línea alta/baja por mora (H/L) a partir del número de Kanjium
  var p=document.getElementById('pitch');
  if(p&&!p.dataset.done){p.dataset.done=1;var acc=parseInt(p.dataset.acc,10),k=p.dataset.kana||'';
    if(!isNaN(acc)&&k){var m=[];for(var i=0;i<k.length;i++){var c=k[i];if('ゃゅょャュョぁぃぅぇぉ'.indexOf(c)>=0&&m.length)m[m.length-1]+=c;else m.push(c);}
      p.innerHTML=m.map(function(x,i){var h=acc===1?i===0:(i===0?false:(acc===0||i<acc));var drop=(acc>0&&i===acc-1);return '<span class="'+(h?'H':'L')+(drop?' drop':'')+'">'+x+'</span>';}).join('');}}
  // orden de trazos (KanjiVG, CC BY-SA 3.0) animado con stroke-dashoffset
  var box=document.getElementById('strokes'); if(!box||box.dataset.done)return; box.dataset.done=1;
  var chars=(box.dataset.word||'').split('').filter(function(c){return /[\\u4e00-\\u9fff]/.test(c);}).slice(0,4);
  chars.forEach(function(c){var hex=c.codePointAt(0).toString(16);while(hex.length<5)hex='0'+hex;
    fetch('https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@r20260714/kanji/'+hex+'.svg').then(function(r){return r.text();}).then(function(t){
      var ds=[];t.replace(/<path[^>]*\\sd="([^"]+)"/g,function(_,d){ds.push(d);});
      var ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 109 109');
      var paths=ds.map(function(d){var e=document.createElementNS(ns,'path');e.setAttribute('d',d);svg.appendChild(e);return e;});
      function play(){paths.forEach(function(e,i){var L=e.getTotalLength();e.style.transition='none';e.style.strokeDasharray=L;e.style.strokeDashoffset=L;
        setTimeout(function(){e.style.transition='stroke-dashoffset .45s ease';e.style.strokeDashoffset=0;},60+i*520);});}
      svg.onclick=play;box.appendChild(svg);play();}).catch(function(){});});
})();`;

const TTS = "{{tts ja_JP voices=Microsoft_Haruka,Microsoft_Ayumi,Microsoft_Nanami,Apple_Kyoko:Palabra}}";
const TTS_EX = "{{tts ja_JP voices=Microsoft_Haruka,Microsoft_Ayumi,Microsoft_Nanami,Apple_Kyoko:Ejemplo}}";

function back(): string {
  return `
<div class="word big" lang="ja-JP">{{furigana:Furigana}}</div>
<div class="reading">{{Lectura}}</div>
<div id="pitch" class="pitch" data-acc="{{Acento}}" data-kana="{{text:Lectura}}"></div>
<div class="romaji">{{Romaji}}</div>
<div class="meaning">{{Significado}}</div>
<div class="audio">{{Audio}} ${TTS}</div>
{{#Ejemplo}}
<div class="example">
  <div class="ex-ja" lang="ja-JP">{{Ejemplo}}</div>
  <div class="ex-rd">{{EjemploLectura}}</div>
  <div class="ex-es">{{EjemploTraduccion}}</div>
  <div class="audio small">${TTS_EX}</div>
</div>
{{/Ejemplo}}
<div class="meta">
  <span class="chip">{{Categoria}}</span>
  {{#TipoPalabra}}<span class="chip">{{TipoPalabra}}</span>{{/TipoPalabra}}
  {{#JLPT}}<span class="chip">{{JLPT}}</span>{{/JLPT}}
  {{#Kanji}}<div class="label small">{{Kanji}}</div>{{/Kanji}}
</div>
<div id="strokes" class="strokes" data-word="{{text:Palabra}}"></div>
<div class="links">
  <a href="https://jisho.org/search/{{text:Palabra}}">Jisho</a> ·
  <a href="https://www.gavo.t.u-tokyo.ac.jp/ojad/search/index/word:{{text:Palabra}}">OJAD</a>
</div>
{{#Notas}}<div class="notes">{{Notas}}</div>{{/Notas}}
<div class="toolbar"><button onclick="jaToggleFuri()">ふりがな on/off</button></div>
<script>${JA_JS}</script>`;
}

export const JA_TEMPLATES = [
  { Name: "1 · Reconocimiento (日本語 → significado)", Front: `<div class="label">¿Qué significa?</div>\n<div class="word big" lang="ja-JP">{{furigana:Furigana}}</div>\n<div class="toolbar"><button onclick="jaToggleFuri()">ふりがな on/off</button></div>\n<script>${JA_JS}</script>`, Back: back() },
  { Name: "2 · Producción (español → 日本語)", Front: `{{#CrearProduccion}}<div class="label">¿Cómo se dice en japonés?</div>\n<div class="meaning big-es">{{Significado}}</div>\n<div class="meta"><span class="chip">{{Categoria}}</span></div>\n<div class="label small">Dilo en voz alta y escríbelo en kana.</div>{{/CrearProduccion}}`, Back: back() },
  { Name: "3 · Escucha (audio → significado)", Front: `{{#Palabra}}<div class="label">Escucha: ¿qué palabra es?</div>\n<div class="audio listen">{{Audio}} ${TTS}</div>\n<div class="label small">Si no oyes nada, instala la voz japonesa de Windows (ver GUIA_ANKI).</div>{{/Palabra}}`, Back: back() },
  { Name: "4 · Lectura (漢字 → かな)", Front: `{{#Kanji}}<div class="label">¿Cómo se lee?</div>\n<div class="word big" lang="ja-JP">{{Palabra}}</div>\n<div class="label small">Di la lectura en voz alta antes de girar.</div>{{/Kanji}}`, Back: back() },
];

export function jaToFields(w: Word): Record<string, string> {
  const kanji = (w.extra?.kanji_breakdown as { kanji: string; meaning: string }[] | undefined) ?? [];
  return {
    Palabra: w.hanzi,
    Lectura: w.pinyin,
    Furigana: toAnkiFurigana(w.hanzi, w.pinyin),
    Romaji: w.romanization ?? wanakana.toRomaji(w.pinyin),
    Significado: w.meaning,
    Categoria: w.category,
    Acento: w.extra?.pitch_accent != null ? String(w.extra.pitch_accent) : "",
    TipoPalabra: String(w.extra?.word_type ?? ""),
    Ejemplo: w.example ?? "",
    EjemploLectura: w.examplePinyin ?? "",
    EjemploTraduccion: w.exampleTranslation ?? "",
    Kanji: kanji.length ? kanji.map((k) => `${k.kanji} ${k.meaning}`).join(" · ") : /[一-鿿]/.test(w.hanzi) ? Array.from(w.hanzi).filter((c) => /[一-鿿]/.test(c)).join(" ") : "",
    Audio: w.audio ? `[sound:${w.audio.split("/").pop()}]` : "",
    Imagen: w.image ?? "",
    Notas: w.notes ?? "",
    JLPT: w.hsk.filter((h) => /^N\d$/.test(h)).join(" "),
    WebID: w.id,
    CrearProduccion: w.createProduction ? "y" : "",
  };
}

export function jaTags(w: Word): string[] {
  const tags = new Set<string>(w.tags);
  for (const h of w.hsk) if (/^N\d$/.test(h)) tags.add(`JLPT_${h}`);
  tags.add(`cat::${w.category.replace(/\s+/g, "_")}`);
  if (w.source === "class") tags.add("clase");
  return Array.from(tags);
}

export function jaFromFields(fields: Record<string, { value: string }>, tags: string[], noteId: number, mod: number | undefined, existing?: Word): Word {
  const f = (k: string) => (fields[k]?.value ?? "").replace(/<[^>]+>/g, "").trim();
  const now = Date.now();
  const lv = f("JLPT").split(/\s+/).filter(Boolean);
  const audio = f("Audio").match(/\[sound:([^\]]+)\]/)?.[1];
  const acc = f("Acento");
  return {
    id: existing?.id ?? (f("WebID") || (f("Palabra") ? `mine-ja-${f("Palabra")}` : uuid())),
    lang: "ja",
    hanzi: f("Palabra"),
    pinyin: f("Lectura"),
    romanization: f("Romaji") || undefined,
    meaning: f("Significado"),
    meaningEn: existing?.meaningEn,
    category: f("Categoria") || existing?.category || "Clase",
    example: f("Ejemplo") || undefined,
    examplePinyin: f("EjemploLectura") || undefined,
    exampleTranslation: f("EjemploTraduccion") || undefined,
    hsk: lv.length ? lv : (existing?.hsk ?? []),
    level: existing?.level,
    tags: Array.from(new Set([...tags.filter((t) => !t.startsWith("cat::")), ...(existing?.tags ?? [])])),
    notes: f("Notas") || undefined,
    audio: audio ? `/audio/ja/${audio}` : existing?.audio,
    image: f("Imagen") || undefined,
    source: existing?.source ?? "anki",
    sourceRef: existing?.sourceRef,
    createProduction: f("CrearProduccion").toLowerCase() === "y",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ankiNoteId: noteId,
    ankiMod: mod,
    extra: { ...existing?.extra, pitch_accent: acc ? Number(acc) : (existing?.extra?.pitch_accent ?? null), word_type: f("TipoPalabra") || existing?.extra?.word_type },
  };
}

export const jaAnki: AnkiModelSpec = {
  modelName: JA_MODEL_NAME,
  modelId: JA_MODEL_ID,
  deckRoot: JA_DECK_ROOT,
  deckMine: `${JA_DECK_ROOT}::Mis palabras (clase)`,
  deckLevel: `${JA_DECK_ROOT}::JLPT N5`,
  fields: JA_FIELDS,
  keyField: "Palabra",
  css: JA_CSS,
  templates: JA_TEMPLATES,
  req: [
    [0, "any", [0]],
    [1, "all", [17]],
    [2, "any", [0]],
    [3, "any", [11]],
  ],
  ordToType: { 0: "recognition", 1: "production", 2: "listening", 3: "reading" },
  cardOrds: (w) => [0, ...(w.createProduction ? [1] : []), 2, ...(/[一-鿿]/.test(w.hanzi) ? [3] : [])],
  toFields: jaToFields,
  fromFields: jaFromFields,
  tags: jaTags,
  deckFor(w, names) {
    const idx = names.indexOf(w.category);
    if (w.source === "seed" && idx >= 0) return `${JA_DECK_ROOT}::JLPT N5::${String(idx + 1).padStart(2, "0")} ${w.category}`;
    return `${JA_DECK_ROOT}::Mis palabras (clase)`;
  },
  minePrefix: "mine-ja-",
  apkgFileName: "Japones_N5_Hugo",
};
