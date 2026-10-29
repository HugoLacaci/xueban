# Plan multiidioma: 中文 · 日本語 · 한국어

Documento de trabajo del paso de Xuébàn (solo chino) a una plataforma de lenguas de Asia oriental con **paridad total** entre chino, japonés y coreano. Se mantiene vivo durante las fases; la tabla de paridad se regenera en `docs/PARITY.md` con `npm run parity`.

## 0. Inventario de lo específico del chino (estado inicial, 29-oct-2026)

| Zona | Qué había | Decisión |
|---|---|---|
| Modelo de datos (`lib/db/schema.ts`) | `Word.hanzi`, `Word.pinyin`, `Word.hsk`, `Word.traditional`; claves primarias `characters.hanzi`, `dailyStats.date`, `dictFavorites.hanzi` | Se conservan los nombres de campo (`hanzi` = forma escrita en la lengua meta, `pinyin` = lectura) para no romper Anki ni las copias de seguridad; se añade `lang` a todas las tablas y se migran las tres tablas cuya clave colisionaba a tablas nuevas con id `${lang}:${clave}` (v3) |
| Rutas (`app/*`) | Planas: `/aprender`, `/flashcards`, … | Pasan a `app/[lang]/…`; la raíz `/` redirige al último idioma o muestra el selector |
| Texto meta (`components/zh/*`) | `<ChineseText>`, `<Pinyin>`, `<Hanzi>`, `<StrokeOrder>`, `<WordPopup>` con segmentación, pinyin-pro y sandhi dentro | Componentes genéricos en `components/target/*` (`<TargetText>`, `<ReadingRuby>`, `<CharacterGlyph>`, `<StrokeOrder>`, `<WordPopup>`) que piden al paquete activo el análisis del texto |
| Pinyin (`lib/pinyin/*`) | Tonos, sandhi, numérico⇄diacrítico, comparación | Se mueve a `lib/languages/zh/pinyin/*`; el núcleo solo ve `pack.normalizeInput`, `pack.readingEquals`, `pack.readingDiff` |
| Diccionario (`lib/dictionary/service.ts`) | CC-CEDICT + HSK + Make Me a Hanzi + radicales, índices por pinyin | Implementación → `lib/languages/zh/dictionary.ts`; `lib/dictionary/service.ts` queda como fachada que despacha al proveedor del idioma activo |
| Curso (`lib/course`, `content/course`, `content/grammar.json`) | 16 unidades y 30 puntos de gramática HSK 1 | Contenido → `content/zh/…`; el índice lo expone `pack.curriculum` / `pack.grammar` |
| Ejercicios (`lib/exercises/*`) | 20 tipos; `tone-choice`, `tone-pair`, `pinyin-input`, `similar-characters`, `component`, `build-character`, `classifier`, `writing` dependen del chino | Los tipos se mantienen; los 8 dependientes del idioma se generan vía `pack.exerciseAdapters`; se añaden `conjugation` y `particle` (ja, ko) |
| Examen (`lib/exam/hsk1.ts`) | Simulacro HSK 1 | → `lib/languages/zh/exam.ts`; `pack.exam` describe niveles, secciones, tiempos y genera el simulacro |
| TTS/ASR (`lib/tts`) | `zh-CN` fijo | `speak(text, { lang })` usa `pack.tts` / `pack.asr` |
| Anki (`lib/anki/*`) | Un tipo de nota «中文 · Vocabulario (Hugo)» | `sync.ts`/`apkg.ts` parametrizados por `AnkiModelSpec`; el spec chino se construye desde `model.ts` sin cambiar un byte |
| Datos (`scripts/build-data.ts`, `public/data`) | CEDICT, HSK, MMAH, trazos, Tatoeba | `scripts/data/{zh,ja,ko}.ts`, salida `public/data/{zh,ja,ko}/`; `npm run data:build -- --lang=ja` |
| Vídeos (`public/videos`) | 16 vídeos zh | `public/videos/{zh,ja,ko}/` con `index.json` por idioma |
| Tema (`styles/tokens.css`) | Un solo tema «宣纸与墨» | `data-lang` en `<html>`; `styles/themes/{ja,ko}.css` redefinen los tokens; ornamentos por idioma en `components/ornament/{ja,ko}` |
| Ajustes (`lib/settings`) | `examDate`, `level`, `hskList`, `pinyinMode`, `showTraditional`, `anki.deckPrefix` | Ajustes globales + `settings.langs[lang]` (examen, nivel, objetivo, ayuda de lectura, escritura alternativa, Anki); `pinyinMode` pasa a ser el modo genérico de ayuda de lectura (atajo P) |

## 1. Arquitectura: núcleo + paquetes de idioma

```
lib/languages/
  types.ts        LanguagePack y sub-interfaces (estricto)
  registry.ts     LANGS, metadatos (nombres, emblema, bcp47), loadPack(lang) con import() diferido
  provider.tsx    <LanguageProvider lang>, useLang(), usePack(); fija data-lang y lang en <html>
  link.tsx        <LangLink> (prefija /zh|/ja|/ko), useLangRouter(), useLangPathname()
  core/           utilidades compartidas: índice de diccionario genérico, modelo de ruby, parity-spec
  zh/ ja/ ko/     un paquete por idioma: index.ts (implementa LanguagePack) + módulos + ui/ (componentes propios)
content/{zh,ja,ko}/   semilla, curso, gramática, lecturas, artículos, recursos
public/data/{zh,ja,ko}/  datos generados (gitignored)
public/videos/{zh,ja,ko}/ transcripciones curadas
styles/themes/{ja,ko}.css
```

Reglas:

- Ningún fichero fuera de `lib/languages/<id>/` (y del registro) importa `lib/languages/<id>/…`. Lo comprueba `tests/unit/boundaries.test.ts`.
- Los paquetes se cargan con `import()` desde el registro: el bundle de japonés no incluye el diccionario ni el curso chino.
- kuromoji (ja) y el analizador coreano corren en un Web Worker (`lib/languages/ja/worker.ts`, `lib/languages/ko/worker.ts`).
- Los componentes de UI piden el paquete con `usePack()`; el código no React usa `getActivePack()`.

### LanguagePack (resumen; la fuente de verdad es `lib/languages/types.ts`)

Texto: `analyze(text)` → tokens con segmentos `{text, reading, cls}` (ruby), `romanize`, `normalizeInput`, `readingEquals/readingDiff`, `altScript` (繁 / solo kana / hanja), `readingAid` (modos y opciones del interruptor P).
Prosodia: `prosody.items` (tonos / acento tonal / reglas fonológicas), `prosody.classFor`, colores de prosodia del tema.
Escritura: `characters` (info de carácter, componentes, similares), `strokeData` (proveedor de trazos: hanzi-writer | KanjiVG | jamo).
Datos: `dictionary` (proveedor con `load/lookup/search/lexicon`), `examples` (Tatoeba), `frequency`.
Currículo: `exam` (niveles, secciones, tiempos, puntuación, `buildMock()`), `curriculum` (unidades), `grammar`, `readings`, `articles`, `resources`, `videos`, `morphology?`, `politeness?`, `counters`.
Ejercicios: `exerciseAdapters` (los 8 tipos dependientes + `conjugation`/`particle`), `exerciseLabels`.
Audio: `tts.voicePrefs`, `tts.edgeVoices`, `asr.locale`. Anki: `anki` (AnkiModelSpec). Tema: `theme` (tokens, fuentes, ornamentos, sello, emblema).
UI propia: `ui.CharactersPage`, `ui.CharacterDetail`, `ui.DictionaryExtras`, `ui.modules[id]` (pasos especiales de la Unidad 0), `ui.ExamIntro`, `ui.ReadingInput` (entrada de texto: pinyin / kana IME / teclado 두벌식).

## 2. Datos del usuario (Dexie)

- v3: `lang` en `words, cards, reviewLogs, categories, lessonProgress, exerciseAttempts, videos, readings, notes, studySessions, dictHistory`, con índices compuestos `[lang+…]`. Tablas nuevas `charStates` (id `${lang}:${char}`), `daily` (id `${lang}:${date}`), `favorites` (id `${lang}:${text}`), rellenadas desde `characters`, `dailyStats`, `dictFavorites` con `lang='zh'`. v4 borra las tres tablas antiguas.
- Antes de abrir la BD con la versión nueva, `lib/db/backup.ts` vuelca la BD existente (esquema v2) a la BD `xueban-backups` (clave = fecha). Ajustes → «Copias automáticas» permite descargarlas.
- Ids: palabras zh siguen como `hsk1-…` / `mine-…` (Anki); ja `ja-n5-…` / `mine-ja-…`; ko `ko-t1-…` / `mine-ko-…`.
- Exportar/importar: todo o un idioma (filtra por `lang`).

## 3. Tabla de paridad

Estado a 29-oct-2026: ✅ hecho · 🟡 hecho con limitación (ver nota). La comprobación automática está en `tests/unit/parity.test.ts`, que genera `docs/PARITY.md` (31 capacidades × 3 idiomas, todas ✅).

| Función | 中文 | 日本語 | 한국어 |
|---|---|---|---|
| Examen y niveles | ✅ HSK 2.0/3.0 | ✅ JLPT N5 (estructura N5→N1) | ✅ TOPIK I (estructura TOPIK II preparada) |
| Unidad 0 (escritura y sonido) | ✅ pinyin, trazos, radicales | ✅ hiragana (7 lecciones) + katakana (6) | ✅ hangul (5) + pronunciación (4) |
| Ayuda de lectura (P) | ✅ pinyin 3 modos | ✅ furigana 3 modos + rōmaji + acento | ✅ romanización 3 modos + pronunciación real |
| Prosodia | ✅ tonos, sandhi | ✅ acento tonal (平板/頭高/中高/尾高), mora | ✅ reglas fonológicas (연음, 경음화, 비음화…) |
| Discriminación auditiva | ✅ pares de tonos | ✅ acento H/L, vocales largas, っ | ✅ lisas/aspiradas/tensas, ㅓ/ㅗ, ㅐ/ㅔ |
| Caracteres | ✅ hanzi | ✅ kana + 3 125 kanji | ✅ jamo + 2 569 hanja |
| Trazos y escritura | ✅ Hanzi Writer | ✅ KanjiVG (animación + quiz propios) | 🟡 trazos de jamo propios compuestos en bloques |
| Caracteres parecidos | ✅ | ✅ | ✅ |
| Clasificadores | ✅ 量词 | ✅ 助数詞 con cambios de sonido | ✅ 단위 명사 (nativo / sino) |
| Partículas | ✅ | ✅ ejercicio propio | ✅ ejercicio propio + 받침 (은/는…) |
| Morfología | ✅ (mínima) | ✅ conjugación + deinflexión | ✅ conjugación + irregulares |
| Cortesía | ✅ 您 | ✅ keigo básico | ✅ niveles de habla + -(으)시- |
| Entrada de texto | ✅ pinyin numérico | ✅ rōmaji→kana en vivo + IME | ✅ teclado 두벌식 en pantalla + composición en vivo |
| Diccionario | ✅ CC-CEDICT | ✅ JMdict (glosas ES) + KANJIDIC2 | 🟡 Wiktionary (EN); KRDict con clave gratuita opcional |
| Búsqueda | ✅ | ✅ kanji, kana, rōmaji, español, radicales | ✅ hangul, romanización, español, 초성 |
| Segmentación | ✅ máx. coincidencia | ✅ kuromoji en Web Worker | 🟡 analizador propio de eojeol/partículas (Kiwi no) |
| Ejemplos | ✅ Tatoeba cmn–spa | ✅ Tatoeba jpn–spa (39 557) | 🟡 Tatoeba kor–spa (1 098) |
| TTS / ASR | ✅ zh-CN | ✅ ja-JP | ✅ ko-KR |
| Visualización de pronunciación | ✅ curva de tono | ✅ curva de acento | ✅ comparación de pronunciación real |
| Vídeos y breakdown | ✅ 16 | 🟡 12 (4 sin español) | 🟡 12 (2 sin español) |
| Lectura graduada | ✅ 33 | ✅ 32 | ✅ 32 |
| Simulacro | ✅ HSK 1 | ✅ JLPT N5 (tiempos y puntuación oficiales) | ✅ TOPIK I (tiempos y niveles oficiales) |
| Anki | ✅ (sin cambios) | ✅ nota + Japones_N5_Hugo.apkg (710) | ✅ nota + Coreano_TOPIK1_Hugo.apkg (861) |
| Tema visual | ✅ 宣纸与墨 | ✅ 和紙と藍 | ✅ 한지와 오방색 |
| Study Hall | ✅ 14 artículos | ✅ 14 artículos | ✅ 14 artículos |
| Estadísticas y panel /me | ✅ | ✅ | ✅ |

Notas de las 🟡: los vídeos sin español se rellenan con `npm run videos:fetch -- --lang=ja --force <id>` cuando YouTube deje de devolver 429; el diccionario coreano tiene español en la semilla y en KRDict (requiere clave en `.env.local`); Tatoeba tiene pocas frases coreano–español.

## 4. Datos por idioma y licencias

Verificadas el 29-oct-2026 (detalle y enlaces en la página «Créditos y licencias»). Si algo no es gratuito o no se puede verificar, se indica.

Japonés:

| Fuente | Uso | Licencia |
|---|---|---|
| JMdict (EDRDG) | diccionario ja–en con glosas en español cuando existen | CC BY-SA 4.0 (EDRDG) |
| KANJIDIC2 (EDRDG) | kanji: lecturas, significados (incl. español), radical, jōyō, JLPT | CC BY-SA 4.0 |
| KRADFILE / RADKFILE (EDRDG) | componentes de kanji, búsqueda por radicales | CC BY-SA 4.0 |
| KanjiVG | trazos de kanji y kana | CC BY-SA 3.0 |
| Kanjium | acento tonal | ver créditos |
| kuromoji.js + IPADIC | segmentación y lecturas | Apache 2.0 / BSD (IPADIC) |
| wanakana | rōmaji ⇄ kana | MIT |
| Tatoeba jpn–spa | ejemplos | CC BY 2.0 FR |
| Lista de frecuencia (OpenSubtitles, hermitdave) | frecuencia | CC BY-SA 4.0 |
| Listas JLPT comunitarias (sin lista oficial desde 2010) | niveles | ver créditos |

Coreano:

| Fuente | Uso | Licencia |
|---|---|---|
| KRDict (NIKL), API con clave gratuita en `.env.local` | diccionario con traducciones al español | KOGL tipo 1 / condiciones de la API |
| Wiktionary (kaikki.org) | respaldo de diccionario | CC BY-SA 3.0 |
| es-hangul | jamo, composición, romanización revisada, pronunciación estándar, 초성 | MIT |
| kiwi-nlp (opcional, worker) | análisis morfológico | Apache 2.0 (modelo: ver créditos) |
| Tatoeba kor–spa | ejemplos | CC BY 2.0 FR |
| Lista de frecuencia (OpenSubtitles, hermitdave) | frecuencia | CC BY-SA 4.0 |
| Unihan (kHangul) | hanja | Unicode License |
| Lista de vocabulario básico (NIKL) | nivel TOPIK I | ver créditos |

## 5. Fases

Estado a 29-oct-2026: A–E completadas (ver resumen final y `docs/PARITY.md`).


- **A. Refactor sin cambios visibles** — núcleo + paquete zh; rutas `/zh/…`; migración Dexie; tests en verde; capturas zh antes/después idénticas.
- **B. Paquete de japonés** — datos, kana, kanji, kuromoji, acento, conjugación, curso N5, lecturas, vídeos, Study Hall, simulacro, Anki, tema.
- **C. Paquete de coreano** — datos, hangul, reglas fonológicas, conjugación, curso TOPIK 1, lecturas, vídeos, Study Hall, simulacro, Anki, tema.
- **D. Auditoría de paridad** — `tests/parity.test.ts`, `docs/PARITY.md`, Playwright en los tres idiomas.
- **E. Temas y pulido** — `/design?lang=…`, capturas, Lighthouse ≥ 90.

## 6. Registro de decisiones

- 29-oct-2026: se conservan los nombres de campo `hanzi`/`pinyin` en el modelo de datos y en los JSON de contenido (documentados como «forma escrita» y «lectura») para no romper la sincronización con Anki ni las copias de seguridad existentes. Los tipos nuevos usan `text`/`reading`.
- 29-oct-2026: el modo de ayuda de lectura (`pinyinMode`) y el interruptor de escritura alternativa (`showTraditional`) se mantienen como ajustes globales con semántica por idioma (furigana/romanización; solo kana/hanja), porque el atajo P y el botón son los mismos en los tres idiomas.
- 29-oct-2026: para los trazos de kanji y kana se usa KanjiVG con un animador y quiz propios (`components/target/stroke-writer.tsx`), porque Hanzi Writer necesita contornos rellenos y KanjiVG da líneas centrales.
- 29-oct-2026: KRDict bloquea las descargas automáticas («Request Blocked»); el coreano usa Wiktionary (kaikki.org) y la API de KRDict queda opcional con `KRDICT_API_KEY` en `.env.local` (nunca en el repositorio).
- 29-oct-2026: `standardizePronunciation` de es-hangul da 한국어 → [한꾸거]; se escribió un motor propio de pronunciación (표준 발음법) y romanización revisada, cubierto por tests.
- 29-oct-2026: las fuentes japonesas y coreanas se sirven con Fontsource (paquetes npm, OFL) porque next/font/google fallaba al descargar cientos de subconjuntos CJK.
- 29-oct-2026: la exportación .apkg y el generador `npm run anki:build` comparten `lib/anki/apkg-core.ts` y `lib/db/seed-word.ts` para que el WebID de la web y el del mazo coincidan siempre.
- 29-oct-2026: `app/[lang]/layout.tsx` (servidor) no puede importar `lib/languages/registry`: si lo hace, el servidor alcanza los archivos `"use client"` de los paquetes y Next precarga los tres idiomas (≈ 2,6 MB) en cada página.
- 29-oct-2026: los textos en español con palabras de la lengua meta usan `<Mixed>` (`components/target/mixed.tsx`), que pone `lang` a cada tramo; el recorrido de Playwright (`npm run screenshots`) audita que todo el texto meta lleve `lang`.
