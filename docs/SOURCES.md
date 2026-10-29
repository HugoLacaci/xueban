# Fuentes de datos verificadas (29-oct-2026)

Todo verificado en vivo (descarga o lectura de la página). Las que no se pudieron verificar se indican.

## Japonés

| Fuente | URL verificada | Licencia | Notas |
|---|---|---|---|
| JMdict (EDRDG) | `http://ftp.edrdg.org/pub/Nihongo/JMdict.gz` (22 MB) | CC BY-SA 4.0 (EDRDG licence) | 68 452 glosas `xml:lang="spa"`. La licencia dice que las traducciones a otros idiomas tienen copyright de sus compiladores. Mostrar atribución en cada pantalla con entradas. |
| jmdict-simplified (scriptin) | `https://github.com/scriptin/jmdict-simplified/releases` (3.6.2+20261026) | CC BY-SA 4.0 | JSON listo: `jmdict-spa-*.json.zip` (1,5 MB), `jmdict-eng-common-*.json.zip` (1,45 MB), `kanjidic2-all-*.json.zip` (1,55 MB), `kradfile-*.json.zip`, `radkfile-*.json.zip`. **Se usa esta.** |
| KANJIDIC2 | `http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz` | CC BY-SA 4.0 | 8 658 significados `m_lang="es"`. |
| KRADFILE / RADKFILE | `http://ftp.edrdg.org/pub/Nihongo/kradzip.zip` | CC BY-SA 4.0 | Vía jmdict-simplified en JSON. |
| KanjiVG | `https://github.com/KanjiVG/kanjivg/releases/download/r20260714/kanjivg-20260714-all.zip` (22,7 MB) | CC BY-SA 3.0 | Incluye hiragana y katakana (03042.svg = あ). Atribuir y enlazar http://kanjivg.tagaini.net. |
| Kanjium (acento tonal) | `https://raw.githubusercontent.com/mifunetoshiro/kanjium/master/data/source_files/raw/accents.txt` (3,2 MB) | CC BY-SA 4.0 | TSV `palabra\tlectura\tacentos` (0 = heiban; varios separados por coma). También `wikipedia_freq.txt`. |
| Listas JLPT | `https://github.com/elzup/jlpt-word-list` (MIT, CSV por nivel) · `https://github.com/stephenmk/yomitan-jlpt-vocab` (CC BY-SA 4.0) | ver | Derivadas de Jonathan Waller (tanos.co.uk, CC BY; **el dominio ya no existe**). El JLPT no publica listas oficiales desde 2010 (FAQ jlpt.jp). |
| Frecuencia | `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/ja/ja_50k.txt` | CC BY-SA 4.0 | Tokenización tosca; Kanjium `wikipedia_freq.txt` como alternativa. |
| kuromoji | npm `@sglkc/kuromoji` 1.1.0 (Apache 2.0, fflate) · `kuromoji` 0.1.2 | Apache 2.0 / IPADIC | 17,8 MB de diccionario gz en `dict/`. |
| wanakana | npm 5.3.1 | MIT | |
| Tatoeba | `https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences.tsv.bz2`, `jpn-spa_links.tsv.bz2`, `jpn_transcriptions.tsv.bz2` | CC BY 2.0 FR | |

## Coreano

| Fuente | URL verificada | Licencia | Notas |
|---|---|---|---|
| KRDict (NIKL) | API `https://krdict.korean.go.kr/eng/openApi/openApiInfo` (clave tras registro, 50 000 llamadas/día, `trans_lang=4` = español) · descarga completa `https://krdict.korean.go.kr/download/downloadPopup` (XML/JSON) | CC BY-SA 2.0 KR (política de copyright del sitio) | Clave en `.env.local` (`KRDICT_API_KEY`). |
| Wiktionary (kaikki) | `https://kaikki.org/dictionary/Korean/kaikki.org-dictionary-Korean.jsonl` (198 MB; marcado como deprecated) | CC BY-SA / GFDL | `forms` con `romanization` y `hanja`, `etymology_text`. Respaldo si no hay clave KRDict. |
| Lista NIKL (5 965 palabras, 2003) | `https://www.korean.go.kr/front_eng/down/down_02V.do?etc_seq=70` | KOGL tipo 1 | Niveles A/B/C (982 / 2 111 / 2 872). |
| es-hangul | npm 2.4.0 | MIT | `romanize`, `standardizePronunciation`, `getChoseong`, `disassemble`, `assemble`, `josa`, `hasBatchim`, `convertQwertyToHangul`. |
| kiwi-nlp | npm 0.24.1 (Apache 2.0); modelo `kiwi_model_v0.24.1_base.tgz` (88 MB, ~110 MB descomprimido) | Apache 2.0 | **Opcional** por tamaño: la app usa un analizador propio para el nivel inicial. |
| Frecuencia | `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ko/ko_50k.txt` | CC BY-SA 4.0 | Eojeol (formas flexionadas). |
| Unihan | `https://www.unicode.org/Public/UNIDATA/Unihan.zip` (Unicode 18) | Unicode License v3 | `kHangul` en `Unihan_Readings.txt` (8 526 líneas). |
| Tatoeba | `.../per_language/kor/kor_sentences.tsv.bz2`, `kor-spa_links.tsv.bz2` (corpus pequeño) | CC BY 2.0 FR | |
| Trazos de hangul | No existe un dataset tipo KanjiVG. `MagisterAdamus/hangeul-stroke-order` (CC BY-SA 4.0) son diagramas estáticos. | — | Los trazos de los jamo son propios (`lib/languages/ko/strokes.ts`). |

## Exámenes

**JLPT N5** (jlpt.jp, vigente): 言語知識（文字・語彙） 20 min · 言語知識（文法）・読解 40 min · 聴解 30 min. Puntuación 0–180; aprobado con 80 en total **y** mínimos por sección: 言語知識・読解 38/120, 聴解 19/60. Sin cambios de estructura en 2025–2026 (solo se añade el nivel MCER orientativo desde dic-2025). Convocatorias 2026: 5 de julio y 6 de diciembre.

**TOPIK I** (topik.go.kr, vigente): 듣기 30 preguntas (100 puntos) + 읽기 40 preguntas (100 puntos), 100 min en papel (IBT: 30 + 40 = 70 min). Niveles: 1급 80–139, 2급 140–200. **TOPIK II**: 듣기 50 + 쓰기 4 (110 min) · 읽기 50 (70 min), 300 puntos; 3급 120–149, 4급 150–189, 5급 190–229, 6급 230–300. IBT en funcionamiento en 2026 (6 convocatorias, en Corea y en 13+ países). Prueba oral 말하기 (30 min, 6 tareas) en funcionamiento en 2026, solo en Corea.

## Canales de YouTube verificados

Japonés: Natural Japanese (antes Comprehensible Japanese) `@nijapanese` · Teppei `@nihongoconteppei` · JapanesePod101 `@JapanesePod101` · Miku Real Japanese `@mikurealjapanese` · Japanese Ammo with Misa `@JapaneseAmmowithMisa` · Dogen `@Dogen`.
Coreano: Talk To Me In Korean `@talktomeinkorean` · GO! Billy Korean `@GoBillyKorean` · Korean Unnie `@KoreanUnnie` · KoreanClass101 `@KoreanClass101` · Korean with Miss Vicky `@KoreanwithMissVicky`.
