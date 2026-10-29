# Esquema de contenido por idioma (japonés y coreano)

Todo el contenido está en **español de España** para un hispanohablante principiante (Hugo, 23 años, estudiante; quiere estudiar un máster en Asia). Todo lo que generes lleva `"reviewed": false`. No inventes datos de exámenes ni enlaces. Usa JSON válido (UTF-8, sin comentarios, comillas dobles).

**Convención de campos heredada del chino** (no la cambies):

| Campo | Chino | Japonés | Coreano |
|---|---|---|---|
| `hanzi` / `zh` (texto meta) | hanzi | escritura normal (kanji + kana, como se escribe de verdad: 食べる, 学校, ありがとう) | hangul (먹다, 학교) |
| `pinyin` / `py` (lectura) | pinyin | **hiragana** (katakana se deja en katakana: コーヒー); en frases, la lectura en kana con espacios entre palabras: `わたし は がくせい です。` | **romanización revisada** (meokda, hakgyo); en frases, romanización con espacios: `jeoneun haksaengieyo.` |

Personajes de los diálogos: Hugo (ja: ウーゴ / ko: 우고), su profesora (ja: 田中先生 / ko: 김 선생님), compañeros (ja: さくら, けん / ko: 지민, 민수), dependientes, camareros… Contextos: Hugo estudia el idioma en una academia en España y prepara un viaje/estancia (ja: Tokio, Kioto; ko: Seúl, Busan; universidad KAIST en Daejeon, metro, cafetería, konbini / 편의점).

## 1. Vocabulario semilla

Fichero: `content/{ja,ko}/seed/parts/<n>.json` = array de objetos (yo los fusiono). **Categoría**: exactamente una de estas 21 (las mismas que en chino):

`Saludos y expresiones`, `Pronombres`, `Números y cantidades`, `Preguntas`, `Clasificadores`, `Tiempo y fechas`, `Adjetivos`, `Familia y personas`, `Escuela y trabajo`, `Comida y bebida`, `Casa y objetos`, `Lugares`, `Transporte`, `Posición y dirección`, `Partículas y gramática`, `Verbos básicos`, `Adverbios`, `Ocio`, `Animales`, `Tiempo atmosférico`, `Salud`.

Japonés (`content/ja/seed/parts/*.json`):
```json
{ "word": "食べる", "reading": "たべる", "meaning": "comer", "category": "Verbos básicos",
  "word_type": "ichidan", "example": "毎朝パンを食べます。", "example_reading": "まいあさ パン を たべます。",
  "example_translation": "Todas las mañanas como pan." }
```
`word_type` ∈ `godan`, `ichidan`, `suru` (verbo する y nombres+する), `kuru`, `i-adj`, `na-adj`, `noun`, `pronoun`, `adverb`, `counter`, `number`, `expression`, `particle`, `conjunction`, `prefix-suffix`, `interjection`. Los verbos irregulares 行く (godan con te-forma いって) y ある/いる: tipo normal (`godan`/`ichidan`). Verbos godan que parecen ichidan (帰る, 入る, 知る, 走る, 切る, 要る): `godan`. El ejemplo es una frase natural y corta de nivel N5, en estilo です/ます salvo que la palabra lo impida. `meaning`: español, varias acepciones separadas por «; », la más frecuente primero.

Coreano (`content/ko/seed/parts/*.json`):
```json
{ "word": "먹다", "meaning": "comer", "category": "Verbos básicos", "word_type": "verb",
  "irregular": null, "hanja": "", "example": "아침에 빵을 먹어요.",
  "example_translation": "Por la mañana como pan." }
```
`word_type` ∈ `noun`, `verb`, `adjective`, `adverb`, `pronoun`, `number`, `counter`, `expression`, `interjection`, `determiner`, `particle`. `irregular` ∈ `null`, `ㅂ`, `ㄷ`, `ㅅ`, `르`, `ㅎ`, `으` (으 tipo 쓰다→써요), `ㄹ` (ㄹ 탈락: 살다→사세요). `hanja`: los caracteres de las palabras sino-coreanas (학교 → 學校) o `""` si es nativa o préstamo; respeta el campo hanja de la lista base cuando exista. Ejemplos en 해요체 (-아요/어요) salvo que la palabra exija otra cosa. **No escribas romanización ni pronunciación**: las calculo yo con es-hangul.

## 2. Curso

Un fichero por unidad: `content/{lang}/course/<id>.json` con la forma de `lib/course/types.ts` (`Unit` → `Lesson[]` → `LessonStep[]`). Mira `content/zh/course/u01-saludos.json` como modelo de calidad y extensión.

```json
{ "id": "ja-u01", "order": 2, "title": "Saludos y presentaciones", "zh": "あいさつと自己紹介", "description": "…",
  "icon": "Hand", "level": 1, "lang": "ja", "category": "Saludos y expresiones", "checkpoint": { "exercises": 15 },
  "lessons": [ { "id": "ja-u01-l1", "title": "…", "zh": "こんにちは！", "goal": "…", "minutes": 10,
    "vocab": [ { "hanzi": "こんにちは", "pinyin": "こんにちは", "es": "hola; buenas tardes" } ],
    "steps": [
      { "type": "vocab", "title": "…" },
      { "type": "dialogue", "title": "…", "lines": [ { "speaker": "ウーゴ", "zh": "…", "py": "…", "es": "…" } ], "notes": "…" },
      { "type": "grammar", "id": "desu" },
      { "type": "explain", "title": "…", "markdown": "…" },
      { "type": "reading", "title": "…", "text": "…", "es": "…", "questions": [ { "q": "…", "options": ["…"], "answer": 0, "explain": "…" } ] },
      { "type": "exercises", "count": 10, "types": ["choose-meaning", "listen-choose", "pinyin-input", "order-words", "matching", "speaking"] },
      { "type": "review" } ],
    "reviewed": false } ] }
```
- Ids: `ja-u0-hiragana`, `ja-u0-katakana`, `ja-u01`…`ja-u14`; lecciones `ja-u01-l1`…; coreano igual con `ko-`.
- Las 14 unidades temáticas (orden 2–15), mismos temas que en chino: 01 saludos y presentaciones, 02 números y edad, 03 familia, 04 hora y fechas, 05 comida y restaurante, 06 compras y dinero, 07 lugares y direcciones, 08 transporte, 09 escuela y trabajo, 10 tiempo atmosférico, 11 salud, 12 ocio, 13 rutina, 14 teléfono. Cada unidad: 4–5 lecciones de 10–15 min; cada lección: vocab (6–10 palabras) → diálogo con audio (4–8 líneas) → 1–2 puntos de gramática (`{"type":"grammar","id":…}` con ids de la lista de la sección 3) → ejercicios → (mini-lectura en la última lección de cada unidad) → repaso.
- **Vocabulario controlado**: los diálogos usan sobre todo palabras ya enseñadas; si usas alguna de adelanto, explícala en `notes`.
- Pasos especiales (Unidad 0) — `{ "type": "module", "id": "<id>", "title": "…", "params": {…} }`:
  - Japonés: `kana-grid` (params `{ "script": "hiragana" | "katakana", "rows": ["a","ka",…] }`: cuadrícula con audio de las filas indicadas), `kana-mnemonics` (`{ "script", "rows" }`), `kana-writing` (`{ "chars": ["あ","い",…] }`: trazar), `kana-reading` (`{ "words": [ {"kana":"いえ","es":"casa"} ] }`: leer palabras), `dakuten`, `yoon`, `sokuon-long` (っ y vocales largas, pares mínimos おばさん/おばあさん), `pitch-accent`, `kanji-intro`, `spanish-errors`.
  - Coreano: `hangul-consonants` (`{ "set": "basic" | "aspirated" | "tense" }`), `hangul-vowels` (`{ "set": "basic" | "compound" }`), `syllable-blocks`, `batchim`, `consonant-triplets` (ㄱ/ㅋ/ㄲ…, 달/탈/딸), `phonology-rules` (연음, 경음화, 비음화, 격음화, ㅎ débil), `hangul-reading` (`{ "words": [ {"hangul":"나무","es":"árbol"} ] }`), `spanish-errors`.
  - Unidad 0 japonesa: hiragana en ~1 semana (≈6–7 lecciones: vocales+K, S+T, N+H, M+Y+R+W+ん, dakuten, yōon, っ y vocales largas) y katakana en otra (≈5 lecciones + préstamos + introducción a los kanji y al acento tonal). Coreana: ≈8 lecciones (vocales básicas, consonantes básicas, bloques, aspiradas, tensas, vocales compuestas, batchim, reglas fonológicas, errores de hispanohablantes).
- `exercises.types` válidos: `choose-meaning`, `choose-character`, `similar-characters`, `pinyin-input` (= escribir la lectura: kana / romanización), `tone-choice` (= discriminación prosódica), `tone-pair`, `order-words`, `fill-blank`, `build-sentence`, `translate-to-es`, `dictation`, `listen-choose`, `matching`, `writing`, `speaking`, `component`, `build-character`, `classifier` (contadores), `conjugation`, `particle`.

## 3. Gramática

`content/{lang}/grammar.json` = array de `GrammarPoint` (ver `lib/course/types.ts` y `content/zh/grammar.json` como modelo de calidad): `id`, `title` (español), `zh` (nombre nativo: 〜は〜です / 은/는), `pattern` (fórmula), `level: 1`, `summary`, `explanation` (markdown en español, con comparaciones con el español y tablas cuando ayuden), `examples` (≥ 5, con `py`), `mistakes` (≥ 3 errores típicos de hispanohablantes `{wrong,right,why}`), `practice: { order: [frases], fill: [{ zh con ＿ como hueco, answer, options (4, incluye la respuesta), es }], translate: [frases] }`, `related`, `reviewed: false`.

Ids japoneses (N5, usa exactamente estos):
`desu`, `wa-topic`, `wa-ga`, `wo`, `ni-time-place`, `de-place-means`, `he-ni-direction`, `to-and-with`, `mo`, `no`, `ka-question`, `question-words`, `kosoado`, `masu`, `masu-negative-past`, `dictionary-form`, `nai-form`, `ta-form`, `te-form`, `te-kudasai`, `te-iru`, `te-mo-ii`, `te-wa-ikenai`, `i-adjectives`, `na-adjectives`, `adjective-past-negative`, `tai`, `mashou-masenka`, `aru-iru`, `ni-aru-existence`, `counters`, `numbers-time`, `kara-made`, `ga-but`, `kara-because`, `yori-comparison`, `mae-ni-ato-de`, `deshou`, `hoshii`, `ya-nado`.

Ids coreanos (TOPIK I, usa exactamente estos):
`ieyo-yeyo`, `anieyo`, `eun-neun`, `i-ga`, `eun-neun-vs-i-ga`, `eul-reul`, `e-place-time`, `eseo`, `e-gada-oda`, `ui`, `do`, `wa-gwa-hago`, `ayo-eoyo`, `seumnida`, `past-ass-eoss`, `future-eul-geoyeyo`, `an-negation`, `mot-negation`, `ji-anta`, `go-sipda`, `go-connector`, `jiman`, `euseyo`, `a-juseyo`, `eul-su-itda`, `go-itda`, `a-seo`, `euni-kka`, `eul-kkayo`, `eu-ro`, `buteo-kkaji`, `numbers-native`, `numbers-sino`, `counters`, `demonstratives`, `question-words`, `honorific-si`, `speech-levels`, `irregulars`, `myeon`.

## 4. Lecturas graduadas

`content/{lang}/readings/readings.json` = ≥ 30 objetos `GradedReading` (ver `lib/readings/types.ts` y `content/zh/readings/readings.json`): `id` (`ja-r01`…), `title` (es), `zh` (título nativo), `kind` (`dialogue`, `message` (LINE / 카카오톡), `menu`, `sign`, `schedule`, `story`, `email`, `list`, `wechat` no), `level: 1`, `minutes`, `text` (nativo; `\n` entre líneas), `es`, `gloss` (palabras fuera del nivel), `questions` (3), `tags`, `reviewed: false`. Vocabulario del primer nivel (N5 / TOPIK 1). En japonés usa kanji N5 y escribe en kana lo que normalmente iría en kana a ese nivel.

## 5. Study Hall

`content/{lang}/articles.json` = ≥ 12 artículos (`id`, `title`, `zh` (título nativo), `category`, `minutes`, `summary`, `markdown`, `sources?`), paralelos a los del chino: cómo funciona la lengua, sistema de escritura, pronunciación (acento tonal / reglas fonológicas), partículas, conjugación, cortesía (敬語 / 존댓말), contadores, cómo preparar el examen (JLPT N5 / TOPIK I, formato verificado abajo), estudiar con academia + app, cultura útil (saludos y reverencias, comida, transporte, pagar, vida universitaria, viajar o estudiar allí).

Formatos oficiales verificados (no los cambies):
- **JLPT N5**: 言語知識（文字・語彙） 20 min · 言語知識（文法）・読解 40 min · 聴解 30 min. 0–180 puntos; aprobado con 80 en total **y** mínimos por sección: 言語知識・読解 38/120, 聴解 19/60. El JLPT **no publica listas oficiales de vocabulario desde 2010** (las listas de la app son comunitarias, basadas en las de Jonathan Waller). Convocatorias 2026: 5 de julio y 6 de diciembre. Web: jlpt.jp.
- **TOPIK I**: 듣기 30 preguntas (100 puntos) + 읽기 40 preguntas (100 puntos), 100 min en papel. Nivel 1 = 80–139, nivel 2 = 140–200. TOPIK II: 듣기 50 + 쓰기 4 (110 min) y 읽기 50 (70 min), 300 puntos; niveles 3 (120–149), 4 (150–189), 5 (190–229), 6 (230–300). TOPIK IBT (por internet) funciona en 2026 con el mismo valor; la prueba oral (말하기, 30 min, 6 tareas) existe en 2026 solo en Corea. Web: topik.go.kr.

`content/{lang}/resources.json`: recursos con la forma de `content/zh/resources.json`. Solo canales verificados:
- ja: Natural Japanese (antes Comprehensible Japanese) `https://www.youtube.com/@nijapanese`, Teppei `https://www.youtube.com/@nihongoconteppei`, JapanesePod101 `https://www.youtube.com/@JapanesePod101`, Miku Real Japanese `https://www.youtube.com/@mikurealjapanese`, Japanese Ammo with Misa `https://www.youtube.com/@JapaneseAmmowithMisa`, Dogen `https://www.youtube.com/@Dogen`; webs: jlpt.jp, OJAD (`https://www.gavo.t.u-tokyo.ac.jp/ojad/`), jisho.org, Tatoeba.
- ko: Talk To Me In Korean `https://www.youtube.com/@talktomeinkorean`, GO! Billy Korean `https://www.youtube.com/@GoBillyKorean`, Korean Unnie `https://www.youtube.com/@KoreanUnnie`, KoreanClass101 `https://www.youtube.com/@KoreanClass101`, Korean with Miss Vicky `https://www.youtube.com/@KoreanwithMissVicky`; webs: topik.go.kr, 한국어기초사전 `https://krdict.korean.go.kr`, 국립국어원 `https://www.korean.go.kr`.
Marca `"verified": true, "verifiedBy": "head"` solo en esos; cualquier otro, `false`.

## 6. Bancos del simulacro

`content/{lang}/exam.json` con preguntas originales (no copies exámenes reales) para generar simulacros aleatorios:
- ja (N5): `vocab` (表記・読み: palabra en kanji → elige lectura; palabra en hiragana → elige kanji; 文脈規定: hueco con 4 palabras; 言い換え: frase equivalente) ≥ 40; `grammar` (hueco con partícula/forma, ordenar ★) ≥ 30; `reading` (textos cortos 80–200 caracteres + 1–2 preguntas) ≥ 10; `listening` (guion de diálogo `{ "lines": [{"s":"男","t":"…"}], "q": "…", "options": [...], "answer": n }`) ≥ 25. Todas con `es` (traducción) y `explain` en español.
- ko (TOPIK I): `listening` (diálogos cortos `lines` + pregunta + 4 opciones; tipos: elegir respuesta adecuada, lugar, tema, detalle) ≥ 30; `reading` (tema de la frase, hueco con 4 opciones, cartel/anuncio, ordenar frases, texto corto + pregunta) ≥ 40.
Formato de cada pregunta: `{ "id", "part", "prompt" (español), "text"?, "lines"?, "options": [4], "answer": n, "es"?, "explain" }`.
