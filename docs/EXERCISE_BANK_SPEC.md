# Especificación de los bancos de ejercicios del chino (`content/zh/exercises/`)

Un archivo por unidad (`u01.json` … `u14.json`, más `u0.json` para la Unidad 0) y uno por punto gramatical
(`g-<grammarId>.json`, ids de `content/zh/grammar.json`). Cada archivo es un objeto:

```json
{ "id": "u03", "unitId": "u03", "title": "Familia", "items": [ … ] }
```

(para gramática: `{ "id": "g-bu-mei", "grammarId": "bu-mei", "title": "不 vs 没", "items": [ … ] }`)

## Mínimos (los comprueba `npm run content:check` y falla si no se cumplen)

| Qué | Mínimo |
|---|---|
| Ítems por unidad | ≥ 150 en ≥ 15 tipos distintos |
| Listening por unidad (`listen-*`, `dictation-*`) | ≥ 40 |
| Speaking por unidad (`speak-*`, `roleplay` líneas) | ≥ 25 |
| Ítems por punto gramatical | ≥ 25 |

## Forma de cada ítem

Campos comunes: `id` (único en el archivo, p. ej. `u03-012`), `type`, `skill` (`listening`, `reading`, `writing`, `speaking`, `tones`, `vocabulary`, `grammar`, `characters`), `level` (1–3), `grammarIds` (opcional), `explain` (español, breve, siempre), `tags` (opcional).

Texto chino simplificado; `py` siempre con tildes y espacios entre sílabas; `es` traducción natural.

| type | campos propios | qué hace la app |
|---|---|---|
| `choose-meaning` | `zh`, `py`, `options` (4 strings es), `answer` (índice) | elegir significado |
| `choose-character` | `es`, `options` (4 zh), `answer` | elegir el hanzi |
| `listen-choose` | `zh` (lo que se oye), `py`, `options` (4 zh), `answer`, `voice`? | escucha y elige la palabra/frase |
| `listen-answer` | `question` (zh), `questionPy`, `questionEs`, `options` (3–4 zh respuestas), `answer`, `answerEs` | oyes una pregunta y eliges la respuesta adecuada |
| `dictation-pinyin` | `zh`, `py`, `es` | escucha y escribe en pinyin |
| `dictation-hanzi` | `zh`, `py`, `es` | escucha y escribe en hanzi |
| `listen-tf` | `zh` (frase/diálogo oído, líneas con `\n`), `py`, `statements` (`[{ "s": es, "truth": bool, "why": es }]`) | verdadero/falso al oír |
| `dialogue-complete` | `lines` (`[{ "speaker": "A", "zh": "…", "py": "…", "es": "…" }]`), `missing` (índice de la línea que falta), `options` (3 zh), `answer` | completar la línea que falta |
| `dialogue-order` | `lines` (en orden correcto, 3–5) | ordenar las líneas |
| `dialogue-who` | `lines` (con `speaker` 雨果/服务员…), `ask` (índice), `options` (nombres), `answer` | «¿quién dice qué?» |
| `situation` | `situation` (es: «Quieres pedir la cuenta»), `options` (3–4 zh), `answer`, `py` (de la correcta) | «¿Qué dices cuando…?» |
| `find-error` | `zh` (frase con error), `wrongIndex` (índice de la palabra incorrecta en `tokens`), `tokens` (segmentación), `correct` (frase correcta), `es` | marcar la palabra incorrecta y corregirla |
| `transform` | `zh`, `py`, `es`, `target` (`negative-bu`, `negative-mei`, `question-ma`, `question-a-not-a`, `question-word`, `past-le`), `answer` (zh), `alternatives`? (zh) | transformar (afirm → neg / pregunta / 了) |
| `build-question` | `answer` (la respuesta dada, zh), `answerEs`, `question` (la pregunta esperada), `questionPy`, `alternatives`? | construir la pregunta para una respuesta |
| `translate-bank` | `es`, `zh`, `py`, `tiles` (fichas correctas + 2–3 distractores), `alternatives`? | traducir con banco de palabras |
| `translate-free` | `es`, `answers` (1–3 zh), `py`, `hint`?, `grammarIds` | traducir libre (motor de corrección) |
| `cloze` | `text` (zh con `＿＿` por hueco, varios huecos), `blanks` (`[{ "answer": "在", "options": ["在","是","有"] }]`), `es` | texto con huecos |
| `reading` | `text` (zh, 2–5 frases), `es`, `questions` (`[{ "q", "options", "answer", "explain" }]`) | lectura con preguntas |
| `fill-blank` | `zh` (con ＿), `answer`, `options` (4), `es`, `py` | rellenar hueco |
| `order-words` | `zh`, `py`, `es`, `alternatives`? | ordenar fichas |
| `build-character` | `hanzi`, `py`, `meaning`, `components` (lista), `distractors` (3) | montar el carácter |
| `radical-meaning` | `radical`, `options` (4 es), `answer`, `examples` (zh) | adivinar el significado del radical |
| `speed-pinyin-hanzi` | `pairs` (`[{ "py": "nǐ hǎo", "zh": "你好" }]`, 6–10) | pinyin → hanzi contrarreloj |
| `speed-match` | `pairs` (`[{ "zh", "es" }]`, 6–8) | emparejar contrarreloj |
| `tone-pair` | `zh`, `py`, `pattern` ("33", "41"…), `options` (4 patrones) | pares de tonos |
| `tone-sandhi` | `zh`, `lexical` (pinyin lexical), `spoken` (pinyin hablado), `rule` (`33`, `bu`, `yi`) | sandhi 3+3, 一, 不 |
| `speak-repeat` | `zh`, `py`, `es` | repite conmigo (shadowing con curva de tono) |
| `speak-read` | `text` (2–4 frases), `py`, `es` | leer en voz alta |
| `speak-answer` | `question` (zh), `questionPy`, `questionEs`, `sample` (zh respuesta modelo), `samplePy`, `sampleEs`, `keywords` (zh esperadas) | responder oralmente |
| `pinyin-input` | `zh`, `py`, `meaning` | escribir el pinyin |
| `matching` | `pairs` (`[{ "zh", "py", "es" }]`, 4–6) | emparejar |

Listening con velocidad y voz: cualquier ítem `listen-*`/`dictation-*` admite `voice` (`"f"`, `"m"`, `"child"`) y la app ofrece 0,75× / 1× / 1,25×.

## Convenciones aclaradas tras el banco piloto (u01)

- **Pinyin**: agrupado por palabra, con espacios entre palabras (xièxie, lǎoshī, Zhōngguórén), como en el curso; la app compara sílaba a sílaba, así que da igual.
- **tone-pair**: el tono neutro se codifica como `0` en `pattern` (p. ej. 学生 → "20").
- **tone-sandhi**: `lexical` y `spoken` pueden coincidir (p. ej. 不好: 不 no cambia ante 3.º tono) para enseñar que la regla no aplica.
- **tiles** (translate-bank): sin signos de puntuación; solo palabras y distractores.
- Reparto orientativo de los 150+ ítems de una unidad: listening 40–45 (listen-choose 12, listen-answer 10, dictation-pinyin 8, dictation-hanzi 7, listen-tf 6), speaking 25–28 (speak-repeat 12, speak-read 6, speak-answer 9), y el resto repartido entre los demás tipos (al menos 3 de cada uno de: dialogue-complete, dialogue-order, dialogue-who, situation, find-error, transform, build-question, translate-bank, translate-free, cloze, reading, fill-blank, order-words, build-character, radical-meaning, speed-pinyin-hanzi, speed-match, tone-pair, tone-sandhi, pinyin-input, matching, choose-meaning, choose-character).
- Referencia de calidad: `content/zh/exercises/u01.json`.

## Reglas de contenido

- Vocabulario **de la unidad y de las anteriores** (ver `content/zh/course/uNN.json`); si usas una palabra nueva, añade `"new": ["palabra"]` al ítem.
- Cada `explain` en español, de una o dos frases, que explique el porqué (no solo «la respuesta es…»).
- Variedad: personajes 雨果, 安娜, 王明, 李老师; situaciones de la unidad; nada repetido literalmente de las lecciones.
- Nada de `answer` fuera de rango; en `fill-blank`/`listen-choose`/… la respuesta correcta debe estar entre las opciones.
- Los `find-error` deben reflejar errores típicos de hispanohablantes (orden tiempo/lugar, 很, 二/两, clasificador, 不/没, 了 con 不…).
- Los `translate-free` deben llevar ≥ 2 `answers` cuando haya variantes válidas (orden de tiempo, 一点儿/一点…).
