# Reestructura de la arquitectura de información (nov-2026)

Objetivo: que los **apuntes** pasen de ser una pestaña escondida en Study Hall a una sección principal, que todos los ejercicios vivan bajo **Practicar**, que exista una sección **Tutor** y que Lectura y Vídeos se unan en **Escuchar y leer**. El alcance de contenido es solo chino (`zh`); el núcleo (rutas, modelo de datos, editor) es genérico y sigue compilando y funcionando para `ja` y `ko`.

## 1. Qué se mueve y por qué

| Antes | Después | Por qué |
|---|---|---|
| Study Hall → pestaña «Notas» (`components/study-hall/notes.tsx`, Markdown plano) | **Apuntes 笔记** `/apuntes` (sección principal, editor de bloques, plantillas, bandeja, búsqueda, repaso) | Es el corazón del estudio con escuela: necesita entrada rápida, estructura y conexión con la práctica. Una pestaña escondida no invita a usarla. |
| Study Hall → «Cuaderno de clase» (`/study-hall/cuaderno`) | `/apuntes/clases` (apunte de tipo **Clase 课堂**, con bandeja de la clase) | El cuaderno de clase es un tipo de apunte, no una herramienta aparte. |
| Lectura `/lectura` y Vídeos `/videos` (dos secciones) | **Escuchar y leer 听读** `/escuchar-leer?tab=lectura\|videos` | Ambas son *input*; juntas liberan sitio en la navegación para Apuntes y Tutor. Las fichas (`/lectura/[id]`, `/videos/[id]`) no cambian de URL. |
| Practicar (aleatorio, errores, tema, gramática, destreza) | Practicar + **por unidad**, **por tipo**, **listening**, **speaking**, **cuaderno de ejercicios**, **sesiones adaptativas** y simulacro | Todo lo que es ejercicio se encuentra en un solo sitio. |
| Caracteres (radicales, lista HSK, práctica) | Caracteres + pestañas **Origen y evolución** y **Memorizar** (solo zh) | El origen de los hanzi es la ayuda de memoria más potente y merece estar junto a los caracteres. |
| Study Hall (artículos, recursos, pomodoro, notas) | Study Hall (artículos **+ serie «De dónde vienen los caracteres»**, recursos, pomodoro) | Se queda como biblioteca y temporizador. |
| — | **Tutor 老师** `/tutor` (IA opcional + role-plays escritos a mano + corrector por reglas) | Práctica conversacional y dudas. Sin IA configurada nunca queda vacío. |
| Hoy | Hoy + tareas «repasar apuntes», «ejercicios del cuaderno» y «conversación del día» | El plan del día enlaza con las secciones nuevas. |

### Navegación resultante

- Escritorio (barra lateral): **Hoy 今 · Aprender 学 · Practicar 练 · Apuntes 笔 · Tutor 师** · Tarjetas 卡 · Diccionario 典 · Caracteres 字 · Escuchar y leer 听 · Study Hall 斋 · Progreso 进 · Ajustes 设.
- Móvil (barra inferior): **Hoy · Aprender · Practicar · Apuntes · Más**. El Tutor está en «Más» y en un botón flotante (solo zh).
- Captura rápida global: atajo **N** y botón «+ apunte» en la barra superior; también en el popup del diccionario, en los ejercicios, en los vídeos y en las lecturas (lleva el contexto de origen).
- El Tutor solo aparece en la navegación del chino; en `/ja/tutor` y `/ko/tutor` la página explica que aún no está disponible para ese idioma.

## 2. Redirecciones (en cliente, compatibles con la exportación estática)

La exportación estática de GitHub Pages no admite `redirects()` de Next, así que las rutas antiguas se mantienen como páginas mínimas que redirigen en el cliente con `router.replace` (`components/layout/redirect.tsx`):

| Ruta antigua | Destino |
|---|---|
| `/study-hall?tab=notas` | `/apuntes` |
| `/study-hall/cuaderno` | `/apuntes/clases` |
| `/lectura` | `/escuchar-leer?tab=lectura` |
| `/videos` | `/escuchar-leer?tab=videos` |
| `/lectura/[id]`, `/videos/[id]` | sin cambios (fichas) |

Las pestañas restantes de Study Hall (`?tab=articulos|recursos|pomodoro`) siguen funcionando.

## 3. Migración de datos (`db.notes`, Dexie v4 → v5)

- Antes de abrir la versión 5 se vuelca toda la base a `xueban-backups` (`lib/db/backup.ts`, `TARGET_VERSION = 5`), como ya se hacía en la migración v3.
- `Note` conserva `id`, `lang`, `title`, `markdown`, `wordIds`, `kind`, `classDate`, `homework`, `grammar`, `createdAt`, `updatedAt` (ninguna copia de seguridad antigua deja de importarse) y añade: `type` (plantilla), `status` (`inbox | active | archived`), `doc` (bloques TipTap en JSON), `fields` (campos de la plantilla), `cues` (preguntas Cornell), `summary`, `tags`, `links`, `grammarIds`, `unitId`, `level`, `pinned`, `builtin`, `reviewed`, `source`.
- Reglas: `kind: "note"` → `type: "free"`, con `doc` generado a partir del Markdown (párrafos, listas, títulos y tablas sencillas). `kind: "class"` → `type: "class"`, con `fields = { date, vocabText, grammar, homework }` (el texto de vocabulario se conserva tal cual: sigue pasando a flashcards).
- Tablas nuevas: `noteCards` (SRS de preguntas Cornell, frases y errores), `exerciseSets` y `exerciseItems` (cuaderno de ejercicios 练习本), `itemAttempts` (historial de intentos), `chats` (conversaciones del tutor) y `assets` (fotos y audios de los apuntes, como Blob).
- Test: `tests/unit/notes-migration.test.ts` abre una base v4 con notas de ambos tipos, migra a v5 y comprueba que no se pierde nada y que la copia previa existe.

## 4. Lo que no cambia

- Rutas con idioma `/zh/...`, `/ja/...`, `/ko/...`; el idioma activo se conserva al cambiar de sección.
- Flashcards, diccionario, progreso y ajustes.
- Los tests de paridad (`tests/unit/parity.test.ts`) marcan las capacidades nuevas como «pendiente» para `ja` y `ko` sin fallar.
