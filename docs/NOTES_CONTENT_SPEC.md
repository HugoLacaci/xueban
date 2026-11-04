# Especificación de los «Apuntes del profesor» (compendios de referencia, chino)

Los compendios son apuntes reales escritos con las plantillas de la app (`lib/notes/templates.ts`), que sirven
también como ejemplo de cómo tomar buenos apuntes. Viven en `content/zh/notes/*.json` y se cargan en `db.notes`
con `builtin: true` y `reviewed: false` (Hugo los valida con su profesor). El usuario puede duplicarlos y anotarlos.

Idioma de la interfaz y explicaciones: **español de España**, tuteo, frases cortas. Chino **simplificado**. El pinyin lo
calcula la app (pinyin-pro) si falta, pero **escríbelo** en los ejemplos (`py`) con tildes y espacios entre sílabas
(«Wǒ zài jiā chī fàn.»), aplicando el sandhi solo cuando se indique (不 → bú ante 4.º tono; 一 → yí/yì).
No inventes datos del examen ni enlaces. Usa JSON válido (UTF-8, comillas dobles, sin comentarios).

## Forma de cada apunte

```json
{
  "id": "zh-grammar-zai-place",
  "type": "grammar",
  "title": "在 + lugar + verbo (dónde pasa algo)",
  "level": 1,
  "tags": ["gramática", "u07", "lugar"],
  "grammarIds": ["zai"],
  "unitId": "u07",
  "fields": { … según la plantilla … },
  "markdown": "## Cómo lo recuerdo\n\nTexto libre en Markdown…\n\n> 💡 **Truco**: …\n\n> ⚠️ **Ojo**: …\n\n```xb-example\n{\"zh\":\"我在家吃饭。\",\"py\":\"Wǒ zài jiā chī fàn.\",\"es\":\"Como en casa.\"}\n```",
  "cues": [{ "id": "c1", "q": "¿Dónde va 在 + lugar respecto al verbo?", "a": "Siempre antes del verbo: 我在家吃饭 (nunca 我吃饭在家)." }],
  "summary": "在 + lugar va antes del verbo; en español va después.",
  "reviewed": false
}
```

- `id`: `zh-<tipo>-<slug>` único y estable (sin espacios ni tildes).
- `type`: una de `grammar`, `question`, `particle`, `contrast`, `word`, `phrase`, `dialogue`, `topic`, `culture`, `pronunciation`, `free`.
- `level`: 1, 2 o 3 (HSK). `unitId`: `u01`…`u14` (ver `content/zh/course/*.json`) si aplica. `grammarIds`: ids de `content/zh/grammar.json` relacionados.
- `tags`: siempre en minúsculas, sin `#`. Usa `gramática`, `preguntas`, `partículas`, `clasificadores`, `contrastes`, `números`, `errores`, `clase`, `supervivencia`, `pronunciación`, y la unidad `uNN`.
- `markdown`: bloques libres (se convierte a bloques del editor). Admite títulos `##`, listas, tablas GFM, avisos como citas con emoji (`> 💡 **Truco**: …`, `> ⚠️ **Ojo**: …`, `> 👩‍🏫 **Lo dijo el profe**: …`, `> ❌ **Error típico**: …`, `> 🧠 **Mnemotecnia**: …`, `> 🏮 **¿Sabías que…?**: …`) y bloques propios como código con lenguaje `xb-example`, `xb-formula`, `xb-exercise`, `xb-cue`:
  - `xb-example`: `{"zh":"…","py":"…","es":"…","note":"…"}`
  - `xb-formula`: `{"name":"…","parts":[{"text":"Sujeto","role":"subject"},{"text":"在","role":"other"},{"text":"lugar","role":"place"},{"text":"V","role":"verb"},{"text":"O","role":"object"}]}` (roles: subject, time, place, verb, object, particle, adverb, adjective, measure, number, question, other; las fichas con texto chino son palabras fijas, las demás son huecos)
  - `xb-exercise`: `{"kind":"fill","data":{"zh":"我＿家吃饭。","answer":"在","options":"在 · 是 · 有 · 去","es":"Como en casa.","explain":"…"}}` · `{"kind":"order","data":{"zh":"我今天在家吃饭。","es":"…"}}` · `{"kind":"translate","data":{"es":"Hoy como en casa.","zh":"我今天在家吃饭。 · 今天我在家吃饭。"}}` · `{"kind":"choice","data":{"prompt":"¿Cuál es correcta?","options":"我很高兴 · 我是很高兴","answer":"0","explain":"…"}}`
  - `xb-cue`: `{"q":"…","a":"…"}`
- `cues`: 3–5 preguntas Cornell por apunte con respuesta corta. Ids `c1`, `c2`…
- `summary`: una línea.

## Campos (`fields`) por plantilla

Los ejemplos son objetos `{ "zh": "…", "py": "…", "es": "…" }`. Mínimos entre paréntesis.

| type | fields |
|---|---|
| `grammar` | `name` (string), `formula` (lista de `{text, role}`), `function` (string), `level` ("1"/"2"/"3"), `examples` (≥ 8), `negative` (≥ 2), `question` (≥ 2), `mistakes` (lista `{wrong, right, why}`, ≥ 3), `contrasts` (lista de strings, p. ej. "在 vs 是 → [[zh-contrast-zai-shi]]"), `teacher` (string) |
| `question` | `structure`, `when`, `answer` (cómo se responde, ¡clave!), `qa` (≥ 4 de `{q, qpy, qes, a, apy, aes}`), `contrasts` (lista) |
| `particle` | `particle`, `pinyin`, `functions` (lista ≥ 1), `position`, `nuance`, `examples` (≥ 5), `without` (qué pasa si la quitas), `contrasts` (lista) |
| `contrast` | `a`, `b`, `rule` (una línea), `table` (`{"columns":["", "A", "B"], "rows":[["uso","…","…"], …]}` con 3–5 filas), `ok` (≥ 3 ejemplos), `bad` (≥ 2 `{wrong, right, why}`), `minitest` (≥ 4 `{zh con ＿, answer, es}`) |
| `word` | `hanzi`, `pinyin`, `meaning`, `pos`, `classifier`, `examples` (≥ 3), `collocations` (lista zh), `related` (lista zh), `contrast`, `trick`, `teacher` |
| `phrase` | `zh`, `pinyin`, `literal`, `natural`, `situation`, `register` ("neutral"/"colloquial"/"formal"), `variants` (ejemplos) |
| `dialogue` | `topic`, `lines` (≥ 4 `{speaker, zh, py, es}` con hablantes 雨果 / 老师 / 服务员 …), `vocab` (lista zh), `grammar` (lista) |
| `topic` | `topic`, `nodes` (`[{text, kind: "group"|"word"|"phrase"|"structure", es, children:[…]}]`) |
| `culture` | `topic`, `text`, `vocab` (lista zh) |
| `pronunciation` | `sound`, `howTo`, `pairs` (ejemplos: pares mínimos) |
| `free` | sin campos: todo en `markdown` |

## Calidad

- Vocabulario de HSK 1 (HSK 3.0, 300 palabras) salvo que el apunte sea un «adelanto HSK 2» (ponlo en `level: 2` y dilo en el texto).
- Cada regla con **ejemplos completos** (nunca palabras sueltas), con su forma negativa y de pregunta cuando tenga sentido.
- Los errores típicos deben ser los de **hispanohablantes** (ser/estar vs 是/在, plural, omitir 很, orden tiempo/lugar, 二/两, clasificador que falta…).
- Contrastes con una **regla de una línea** que permita decidir en un segundo.
- Nombres de personajes: 雨果 (Hugo), 安娜, 王明, 李老师. Lugares: 上海, 北京, 马德里, 交通大学.
- Nada de contenido copiado de fuentes con derechos; explica con tus palabras. Puedes citar la Chinese Grammar Wiki (CC BY-NC-SA) como `source` en el markdown al final («Fuente consultada: …»).
