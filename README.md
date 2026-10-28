# 学伴 Xuébàn — tu compañero para aprender chino

Aplicación web **local-first, gratuita y de código abierto** para aprender chino mandarín (simplificado) desde cero hasta el HSK 1 (y más adelante HSK 2–3), pensada para hispanohablantes que estudian en una escuela de idiomas y preparan el examen HSK. Combina curso estructurado, motor de ejercicios con corrección explicada, flashcards con FSRS sincronizadas con Anki, diccionario nivel Pleco, caracteres por componentes, lecturas graduadas, vídeos con subtítulos interactivos y un Study Hall.

Todo funciona en tu navegador (los datos viven en IndexedDB) y se puede instalar como PWA. No hay cuentas ni APIs de pago.

---

## 1. Instalación en Windows (paso a paso)

Requisitos: **Node.js LTS** (20 o superior; probado con 24). Python no es necesario.

1. Instala Node.js desde <https://nodejs.org> (versión LTS). Comprueba en PowerShell:
   ```powershell
   node --version
   npm --version
   ```
2. Abre PowerShell en la carpeta del proyecto:
   ```powershell
   cd C:\CHINA\IDIOMA\xueban
   ```
3. Instala las dependencias:
   ```powershell
   npm install
   ```
4. Descarga y procesa los datos abiertos (diccionario, HSK, caracteres, trazos, Tatoeba). Tarda unos minutos y necesita internet solo la primera vez (se cachea en `.cache/data/`):
   ```powershell
   npm run data:build
   ```
5. Arranca la app:
   ```powershell
   npm run dev
   ```
   Abre <http://localhost:3000>. La primera vez verás un onboarding de 4 pasos (nivel, objetivo, fecha de examen, Anki).

Para usarla como aplicación instalada (PWA): en Chrome/Edge, menú → «Instalar Xuébàn». Funciona offline una vez cargada (diccionario, trazos y audios se guardan en caché).

### Opcional: audio pregenerado de calidad (recomendado)

Por defecto la app usa la voz del navegador (Web Speech, zh-CN). Para una voz neuronal mucho mejor, pregenera MP3 con la voz gratuita de Microsoft Edge (sin clave, sin Python):

```powershell
npm run audio:build            # todo: vocabulario, curso, gramática, lecturas (≈3 000 frases, unos minutos)
npm run audio:build -- --words # solo el vocabulario semilla
```

Los archivos van a `public/audio/<hash>.mp3`; se usan automáticamente si existen. Cambia la voz con `$env:XUEBAN_VOICE="zh-CN-YunxiNeural"` (masculina) antes de ejecutar.

Si no instalas voces: en Windows, **Configuración → Hora e idioma → Voz → Agregar voces → Chino (simplificado, China)** mejora la voz del navegador en Edge.

### Opcional: vídeos de YouTube (transcripciones)

La app incluye 16 vídeos curados con transcripción. Para añadir cualquier otro vídeo por URL se usa **yt-dlp** (gratuito). El binario ya está en `.cache/bin/yt-dlp.exe` (se descargó al preparar el proyecto); si falta, instálalo con `winget install yt-dlp.yt-dlp` o descárgalo de <https://github.com/yt-dlp/yt-dlp/releases> y ponlo en `.cache/bin/` (o define `$env:XUEBAN_YTDLP` con su ruta). Solo funcionan vídeos con subtítulos en chino (manuales o automáticos si el vídeo es en chino); los tradicionales se convierten a simplificado.

Transcripción local con faster-whisper para vídeos sin subtítulos: requiere Python y no está integrada (ver «Limitaciones»).

---

## 2. Conectar con Anki (en este PC)

Tu mazo **中文 Chino** (importado de `Chino_HSK1_Hugo.apkg`) y el tipo de nota **中文 · Vocabulario (Hugo)** se sincronizan en ambos sentidos usando el campo `WebID` como clave.

1. Abre Anki → **Herramientas → Complementos → Obtener complementos** → código `2055492159` (AnkiConnect) → reinicia Anki.
2. **Herramientas → Complementos → AnkiConnect → Configuración** y añade los orígenes de la web:
   ```json
   "webCorsOriginList": ["http://localhost", "http://localhost:3000", "http://127.0.0.1:3000"]
   ```
   (Si publicas la web, añade también su URL pública.)
3. Con Anki abierto, en la app verás **«Anki»** en verde en la barra superior. En **Ajustes → Anki** puedes:
   - **Sincronizar palabras…**: analiza diferencias (nuevas en Anki, nuevas en la web, conflictos → último modificado gana) y las aplica.
   - **Web → Anki (todo)**: crea/actualiza todas las notas (crea el tipo de nota y los mazos si no existen).
   - **Leer estado de Anki**: importa intervalos/estado de las tarjetas para marcar palabras como conocidas.
   - **Fuente de verdad del SRS**: «Anki» (la web no repasa las tarjetas que gestiona Anki) o «web» (FSRS propio).
   - **Sincronizar con AnkiWeb**.
4. Al guardar una palabra nueva en la web (diccionario, vídeo, lectura, cuaderno de clase) se crea en Anki automáticamente en `中文 Chino::Mis palabras (clase)` (o en su categoría HSK 1).

Sin Anki también funciona todo: la web tiene su propio repaso espaciado (FSRS-6 con `ts-fsrs`) y exporta `.apkg` (mismo modelo) y CSV desde Ajustes o Flashcards.

> AnkiConnect solo funciona en el ordenador donde corre Anki. En el móvil usa el SRS de la web o AnkiDroid/AnkiWeb sincronizados desde el PC.

---

## 3. Mapa de la aplicación

| Sección | Qué hay |
|---|---|
| **Hoy** | Plan del día (repasos → lección → práctica → input), racha, minutos, palabras y caracteres conocidos, mapa de calor, cuenta atrás al HSK, acceso rápido «Vocabulario de clase». |
| **Aprender** | Unidad 0 (pronunciación: tonos, tabla de pinyin con audio, pares de tonos, sandhi, errores de hispanohablantes; caracteres: trazos, reglas, ~50 radicales) + 14 unidades HSK 1 por temas (71 lecciones de 10–12 min: vocabulario → diálogo → gramática → ejercicios → repaso; lectura y checkpoint por unidad). 30 puntos de gramática en español con fórmula, ejemplos, errores comunes y ejercicios. |
| **Practicar** | Motor de 20 tipos de ejercicio con corrección explicada: aleatorio intercalado, mis errores, por tema, por punto gramatical, por destreza; **simulacro HSK 1** con el formato oficial del nuevo HSK (40 preguntas, 40 min) e informe por parte. |
| **Flashcards** | Mazo con las 302 palabras HSK 1, categorías con color e icono, filtros, añadir en < 10 s (autocompleta pinyin, significado y ejemplo), importación masiva, 5 tipos de tarjeta (reconocimiento, producción, escucha, frase cloze, escritura), FSRS con 4 botones y atajos, ficha por palabra con historial. |
| **Diccionario** | CC-CEDICT + HSK + tus palabras. Búsqueda por hanzi, pinyin (con/sin tonos, números), español/inglés, **radical + trazos** y **escritura a mano** (reconocedor offline de caracteres HSK 1–4). Ficha de palabra y de carácter (trazos animados, descomposición, componente semántico/fonético, etimología, mnemotecnia editable, palabras y caracteres relacionados). |
| **Caracteres** | 214 radicales (por frecuencia/trazos), caracteres HSK por nivel con progreso, práctica de escritura con 田字格 y hoja de caligrafía imprimible (PDF desde el navegador). |
| **Lectura** | 33 textos graduados (diálogos, WeChat, menús, carteles, horarios, relatos de Hugo en Shanghái) con audio, pinyin conmutable, % de palabras conocidas, glosario y preguntas. Importa cualquier texto propio. |
| **Vídeos** | 16 vídeos curados + cualquier URL de YouTube: subtítulos interactivos (ruby de pinyin, traducción), repetir línea, bucle, auto-pausa, shadowing, velocidad, bucle A-B, vocabulario nuevo detectado, puntos de gramática detectados, minar frases a flashcards. |
| **Study Hall** | 14 artículos (tonos, pinyin, radicales, clasificadores, 了/过/着, cómo preparar el HSK, estudiar con la escuela, cultura: saludos, comida, números, WeChat Pay/Alipay, vida universitaria), 37 recursos verificados, Pomodoro con ruido ambiente, notas Markdown vinculadas a palabras, **cuaderno de clase** (vocabulario → flashcards y Anki con un clic). |
| **Progreso** | Conocido por nivel HSK (palabras y caracteres), precisión por destreza y tipo, puntos débiles (palabras y tonos), tiempo por actividad, previsión de repasos a 30 días, logros. |
| **Ajustes** | Lista HSK (2.0/3.0/ambas), fecha de examen, objetivo diario, retención FSRS, pinyin por defecto, tipografía (Noto Sans/Serif, Kai), tamaño, tema, colores de tono, voz TTS, Anki, proveedor LLM opcional (traducción de subtítulos), copia de seguridad JSON, reiniciar. |

Atajos globales: **P** pinyin (ver / solo desconocidas / ocultar) · **T** traducción · **Ctrl+K** búsqueda · en ejercicios **1–4** opciones, **Enter** comprobar/continuar, **Espacio** audio.

### Diseño «宣纸与墨» (papel y tinta)

La interfaz sigue una dirección de arte propia (estudio de caligrafía contemporáneo, nada de «chino de restaurante»): papel 宣纸 con grano sutil, tinta 墨, sellos 印章 bermellón solo para acciones principales y logros, celosías 窗棂 y paisajes 山水 procedurales que cambian con la hora del día.

- `design/DIRECTION.md`: paleta, tipografía, motivos, movimiento y las tres decisiones de diseño.
- `/design` (enlace al pie de la barra lateral): guía de estilo viva con colores, escala tipográfica, todos los componentes y ornamentos en claro y oscuro.
- `styles/tokens.css`: tokens de color como tripletas RGB (claro y 夜墨 oscuro), esquemas de color de tono (学伴, Pleco clásico, sin colores, personalizado, en Ajustes) y sombras cálidas.
- `components/ornament/`: Seal, InkDivider, Enso, Lattice, MoonGate, CloudBorder, FretBorder, ShanShui, PlumBranch, TianZiGe, PetalRain, 小墨.
- `design/screenshots/before|after/`: capturas de cada pantalla (escritorio y móvil, claro y oscuro) antes y después del rediseño; `design/REPORT.md` resume el proceso.

Fuentes (todas OFL, servidas en local): Inter y Fraunces para el latín; Noto Sans SC y Noto Serif SC (variables) y LXGW WenKai Lite (caligrafía, sellos y fuente de estudio) para el chino. `prefers-reduced-motion` desactiva partículas, parallax y animaciones de celebración.

---

## 4. Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en <http://localhost:3000> |
| `npm run build` / `npm start` | Compilación de producción y servidor |
| `npm run data:build` | Descarga y procesa CC-CEDICT, HSK, Make Me a Hanzi, trazos, Tatoeba → `public/data/` |
| `npm run audio:build` | Pregenera MP3 (voz Edge) en `public/audio/` |
| `npm run videos:fetch -- <url\|id>` | Transcribe un vídeo a `public/videos/` (también `--search "consulta"`, `--check <id>`) |
| `npm run content:check` | Valida el contenido del curso (JSON, ids de gramática, vocabulario controlado, pinyin) |
| `npm test` | Tests unitarios (Vitest): pinyin y sandhi, segmentación, FSRS, motor de ejercicios, importación, diccionario, escritura a mano, sincronización Anki simulada |
| `npm run test:e2e` | Tests Playwright: completar lección, añadir palabra, repasar, vídeo con subtítulos, diccionario, popup |
| `npm run lint` / `npm run typecheck` | ESLint y TypeScript estricto |

Para actualizar los datos (nueva versión de CC-CEDICT, etc.) borra `.cache/data/` y vuelve a ejecutar `npm run data:build`.

---

## 5. Publicar gratis (para usarla desde el móvil fuera de casa)

**Vercel** (recomendado; la ruta API de vídeos necesita servidor):
1. Sube el proyecto a GitHub (ya tiene `.gitignore`; `public/data/` y `public/audio/` están ignorados por tamaño → ejecuta `npm run data:build` en el build o súbelos con Git LFS; los vídeos curados en `public/videos/` sí se suben).
2. En <https://vercel.com> importa el repo. Build command: `npm run data:build && npm run build`.
3. En Anki, añade la URL pública a `webCorsOriginList`.

**GitHub Pages / estático**: la app funciona casi entera sin servidor, excepto «Añadir vídeo por URL» (necesita yt-dlp en el servidor). Los vídeos curados sí funcionan.

Recuerda: **AnkiConnect solo responde en el PC donde Anki está abierto**. En el móvil, usa el SRS propio de la web; tus datos locales se pueden llevar con **Ajustes → Exportar/Importar copia de seguridad**.

---

## 6. Estructura del proyecto

```
app/            rutas (App Router) y rutas API (api/youtube/transcript)
components/     ui/ (primitivas), zh/ (ChineseText, Pinyin, StrokeOrder, popup, audio, escritura a mano),
                exercises/, learn/, flashcards/, dictionary/, characters/, reading/, videos/, study-hall/, progress/
lib/            pinyin/ (tonos, sandhi), segment/, dictionary/, fsrs/, exercises/ (tipos, generadores, corrección),
                anki/ (AnkiConnect, modelo, sync, .apkg), course/, readings/, videos/, exam/, db/ (Dexie + repositorio)
content/        seed/hsk1_vocab.json, course/*.json (16 unidades), grammar.json, readings/, articles.json, resources.json, radicals.json
scripts/        build-data.ts, build-audio.ts, fetch-video.ts, check-content.ts
public/data     datos generados (diccionario, hanzi, trazos, HSK, Tatoeba, medianas)
public/videos   transcripciones de vídeos curados
tests/          unit/ (Vitest) y e2e/ (Playwright)
```

Modelo de datos (Dexie): `words, cards, reviewLogs, categories, characters, lessonProgress, exerciseAttempts, videos, readings, notes, studySessions, settings, syncState, dictHistory, dictFavorites, dailyStats`. La capa `lib/db/repo.ts` abstrae el acceso para una futura sincronización.

---

## 7. Qué revisar con tu profesor

Todo el contenido generado está marcado con `reviewed: false` en los JSON:

- `content/course/*.json`: 71 lecciones (diálogos, vocabulario, lecturas). Avisos de `npm run content:check`: algunas lecciones usan 1–3 palabras «de adelanto» (p. ej. 了, 吧, 度, 但是) antes de enseñarlas; están anotadas en `notes`.
- `content/grammar.json`: 30 puntos (explicaciones, ejemplos, errores comunes).
- `content/readings/readings.json`: 33 lecturas.
- `public/videos/*.json`: transcripciones tomadas de los subtítulos de YouTube (pueden tener erratas).
- Pinyin: la semilla usa sandhi escrito (bú kèqi, yí ge); la app marca el sandhi automáticamente en el resto.

Datos a confirmar externamente: formato y fechas del HSK 1 (2.0 → 3.0) en <https://www.chinesetest.cn>.

---

## 8. Limitaciones y alternativas gratuitas

- **Imágenes**: las partes del HSK con dibujos se adaptan a texto en el simulacro.
- **Vídeos sin subtítulos**: no se transcriben. Alternativa gratuita: instalar Python + `faster-whisper` y generar un `.vtt` manualmente; la app puede leer subtítulos si los subes como vídeo propio (pendiente de integrar en la interfaz).
- **Traducción automática de subtítulos**: opcional con tu propia clave (OpenAI/Anthropic) u Ollama local; por defecto se usan los subtítulos en español del vídeo (si existen), Tatoeba y el diccionario.
- **Reconocimiento de voz**: Web Speech API (Chrome/Edge). En Firefox se puede grabar, comparar la curva de tono y autoevaluar.
- **Etimologías** (Make Me a Hanzi) y definiciones CC-CEDICT están en inglés cuando no hay español.

Licencias de datos y librerías: página **Créditos y licencias** dentro de la app (`/creditos`).
