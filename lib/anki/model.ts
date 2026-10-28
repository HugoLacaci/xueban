/**
 * Definición del tipo de nota "中文 · Vocabulario (Hugo)" — idéntica a la del mazo
 * Chino_HSK1_Hugo.apkg, para poder crearla con createModel si no existe y para exportar .apkg.
 */
export const MODEL_NAME = "中文 · Vocabulario (Hugo)";
export const MODEL_ID = 1782026101;
export const DECK_ROOT = "中文 Chino";
export const DECK_MINE = `${DECK_ROOT}::Mis palabras (clase)`;
export const DECK_HSK1 = `${DECK_ROOT}::HSK 1`;

export const FIELDS = [
  "Hanzi",
  "Pinyin",
  "Significado",
  "Categoria",
  "Ejemplo",
  "EjemploPinyin",
  "EjemploTraduccion",
  "Tradicional",
  "Radical",
  "Audio",
  "Imagen",
  "Notas",
  "HSK",
  "WebID",
  "CrearProduccion",
] as const;

export type FieldName = (typeof FIELDS)[number];
export type NoteFields = Record<FieldName, string>;

export const CSS = `.card{font-family:"Segoe UI",system-ui,-apple-system,sans-serif;background:#faf7f2;color:#1f1b16;text-align:center;padding:18px 12px;font-size:18px;line-height:1.5}
.nightMode.card,.night_mode .card{background:#1b1a18;color:#ece6dc}
[lang=zh-CN],.hanzi,.ex-zh{font-family:"Noto Sans SC","Microsoft YaHei","PingFang SC","Source Han Sans SC",sans-serif}
.hanzi.big{font-size:72px;line-height:1.15;margin:8px 0 4px;letter-spacing:.04em}
.pinyin{font-size:26px;margin:4px 0}
.label{color:#8a7f72;font-size:14px;text-transform:uppercase;letter-spacing:.08em}
.label.small{font-size:13px;text-transform:none;letter-spacing:0;margin-top:14px}
.meaning{font-size:22px;margin:8px 0 10px}
.big-es{font-size:32px;margin:22px 0}
.example{margin:18px auto 8px;max-width:560px;text-align:left;border-left:4px solid #c0392b;background:rgba(192,57,43,.06);padding:10px 14px;border-radius:6px}
.ex-zh{font-size:26px}.ex-py{color:#6b6156;font-size:16px}.ex-es{font-size:16px;font-style:italic}
.nightMode .ex-py{color:#b3a999}
.meta{margin-top:12px}.chip{display:inline-block;border:1px solid #d8cfc2;border-radius:999px;padding:1px 10px;margin:2px;font-size:13px;color:#6b6156}
.links{margin-top:12px;font-size:13px}.links a{color:#c0392b;text-decoration:none}
.notes{margin-top:12px;font-size:15px;color:#6b6156}
.strokes{display:flex;justify-content:center;gap:6px;margin-top:12px}
.strokes svg{background:#fff;border:1px solid #e5ddd1;border-radius:6px;cursor:pointer}
.nightMode .strokes svg{background:#2a2825;border-color:#444}
.toolbar{margin-top:14px}.toolbar button{font-size:13px;border:1px solid #d8cfc2;background:transparent;color:inherit;border-radius:6px;padding:3px 10px;cursor:pointer}
.listen .replay-button svg{width:64px;height:64px}
.t1{color:#e53935}.t2{color:#43a047}.t3{color:#1e88e5}.t4{color:#8e24aa}.t5{color:#757575}
.nightMode .t1{color:#ff6f60}.nightMode .t2{color:#76d275}.nightMode .t3{color:#6ab7ff}.nightMode .t4{color:#d05ce3}.nightMode .t5{color:#aaa}
.pinyin-off .pinyin,.pinyin-off .pyline{visibility:hidden}`;

export const JS = `(function(){
  var T={'ā':1,'ē':1,'ī':1,'ō':1,'ū':1,'ǖ':1,'á':2,'é':2,'í':2,'ó':2,'ú':2,'ǘ':2,'ǎ':3,'ě':3,'ǐ':3,'ǒ':3,'ǔ':3,'ǚ':3,'à':4,'è':4,'ì':4,'ò':4,'ù':4,'ǜ':4};
  function tone(s){for(var i=0;i<s.length;i++){if(T[s[i]])return T[s[i]];}return 5;}
  var SYL=/([bpmfdtnlgkhjqxrzcsyw]?h?)([aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+)(ng|n(?![aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])|r(?![aeiouü]))?/gi;
  function colorize(el){
    if(el.dataset.done)return; el.dataset.done=1;
    var txt=el.textContent;
    el.innerHTML=txt.replace(SYL,function(m){return '<span class="t'+tone(m)+'">'+m+'</span>';});
  }
  document.querySelectorAll('.tones,.pyline').forEach(colorize);
  var KEY='zh_pinyin_off';
  function apply(){var off=false;try{off=localStorage.getItem(KEY)==='1';}catch(e){}
    document.body.classList.toggle('pinyin-off',off);}
  window.zhTogglePinyin=function(){try{localStorage.setItem(KEY,localStorage.getItem(KEY)==='1'?'0':'1');}catch(e){document.body.classList.toggle('pinyin-off');return;}apply();};
  apply();
  var box=document.getElementById('strokes'); if(!box||box.dataset.done)return; box.dataset.done=1;
  var chars=(box.dataset.hanzi||'').replace(/[^一-鿿]/g,'').split('');
  function draw(){chars.forEach(function(c){var d=document.createElement('div');box.appendChild(d);
    try{var w=HanziWriter.create(d,c,{width:90,height:90,padding:6,showOutline:true,strokeAnimationSpeed:1.2,delayBetweenStrokes:180,strokeColor:'#c0392b'});
      d.onclick=function(){w.animateCharacter();};}catch(e){}});}
  if(window.HanziWriter){draw();return;}
  var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.2/dist/hanzi-writer.min.js';s.onload=draw;document.head.appendChild(s);
})();`;

const TTS = "{{tts zh_CN voices=Microsoft_Huihui,Microsoft_Xiaoxiao,Apple_Tingting:Hanzi}}";
const TTS_EX = "{{tts zh_CN voices=Microsoft_Huihui,Microsoft_Xiaoxiao,Apple_Tingting:Ejemplo}}";

export function commonBack(): string {
  return `
<div class="hanzi big" lang="zh-CN">{{Hanzi}}</div>
<div class="pinyin tones" data-pinyin="{{Pinyin}}">{{Pinyin}}</div>
<div class="meaning">{{Significado}}</div>
<div class="audio">{{Audio}} ${TTS}</div>
{{#Ejemplo}}
<div class="example">
  <div class="ex-zh" lang="zh-CN">{{Ejemplo}}</div>
  <div class="ex-py pyline">{{EjemploPinyin}}</div>
  <div class="ex-es">{{EjemploTraduccion}}</div>
  <div class="audio small">${TTS_EX}</div>
</div>
{{/Ejemplo}}
{{#Imagen}}<div class="img">{{Imagen}}</div>{{/Imagen}}
<div class="meta">
  {{#Radical}}<span class="chip">部首 {{Radical}}</span>{{/Radical}}
  {{#Tradicional}}<span class="chip">繁 {{Tradicional}}</span>{{/Tradicional}}
  <span class="chip">{{Categoria}}</span>
  {{#HSK}}<span class="chip">{{HSK}}</span>{{/HSK}}
</div>
<div id="strokes" class="strokes" data-hanzi="{{text:Hanzi}}"></div>
<div class="links">
  <a href="https://www.mdbg.net/chinese/dictionary?wdqb={{text:Hanzi}}">MDBG</a> ·
  <a href="https://www.youdao.com/result?word={{text:Hanzi}}&lang=en">Youdao</a> ·
  <a href="https://www.archchinese.com/chinese_english_dictionary.html?find={{text:Hanzi}}">ArchChinese</a> ·
  <a href="plecoapi://x-callback-url/s?q={{text:Hanzi}}">Pleco</a>
</div>
{{#Notas}}<div class="notes">{{Notas}}</div>{{/Notas}}
<div class="toolbar"><button onclick="zhTogglePinyin()">拼音 on/off</button></div>
<script>${JS}</script>`;
}

export const TEMPLATES = [
  {
    Name: "1 · Reconocimiento (汉字 → significado)",
    Front: `<div class="label">¿Qué significa?</div>
<div class="hanzi big" lang="zh-CN">{{Hanzi}}</div>
<div class="pinyin tones hint" data-pinyin="{{Pinyin}}">{{Pinyin}}</div>
<div class="toolbar"><button onclick="zhTogglePinyin()">拼音 on/off</button></div>
<script>${JS}</script>`,
    Back: commonBack(),
  },
  {
    Name: "2 · Producción (español → 汉字)",
    Front: `{{#CrearProduccion}}<div class="label">¿Cómo se dice en chino?</div>
<div class="meaning big-es">{{Significado}}</div>
<div class="meta"><span class="chip">{{Categoria}}</span></div>
<div class="label small">Di la palabra en voz alta y escríbela (en papel o con el dedo).</div>{{/CrearProduccion}}`,
    Back: commonBack(),
  },
  {
    Name: "3 · Escucha (audio → significado)",
    Front: `{{#Hanzi}}<div class="label">Escucha: ¿qué palabra es?</div>
<div class="audio listen">{{Audio}} ${TTS}</div>
<div class="label small">Si no oyes nada, instala la voz china de Windows (ver GUIA_ANKI).</div>{{/Hanzi}}`,
    Back: commonBack(),
  },
];
