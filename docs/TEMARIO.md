# Temario de chino de Xuébàn (de cero a HSK 3)

> Estado: **propuesta v1 (4-nov-2026)**, todo el contenido nuevo con `reviewed: false` hasta validarlo con el profesor.
> Alcance: solo chino (`zh`). Japonés y coreano no cambian.

## 0. Fuentes y lo que no se ha podido verificar

| Fuente | Uso | Verificación |
|---|---|---|
| 国际中文教育中文水平等级标准 (GF 0025—2021) | Vocabulario por nivel (lista `std` de `public/data/zh/hsk.json`, generada desde [drkameleon/complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary)): **506 / 750 / 953** entradas en los niveles 1 / 2 / 3. | Verificado con los datos del proyecto. |
| Mismo estándar, apéndice de gramática (语法等级大纲) | Lista de puntos por nivel en `content/zh/curriculum/grammar-standard.json`: **70 / 78 / 96 filas** (una por subapartado 细目; el apéndice oficial los agrupa en 48 / 81 / 81 puntos). | **Parcialmente verificado**: tomado del CSV de [ofou/hsk](https://github.com/ofou/hsk/blob/main/%E8%AF%AD%E6%B3%95.csv), que declara copiar chinesetest.cn; leído entero pero **no cotejado con el PDF oficial** (`verified: false`). |
| Chinese Grammar Wiki (AllSet Learning), niveles A1 / A2 / B1 | Orden de presentación y puntos «de uso real» que el estándar no separa (p. ej. 好 + adj «muy», 一下). | Referencia de orden; no se copia ningún texto. |
| HSK标准教程, Integrated Chinese, New Practical Chinese Reader, currículos del Instituto Confucio, HelloChinese, Duolingo | Comparar qué se enseña antes y qué temas se agrupan. | Consulta de estructura, de memoria; no se copia contenido. |

Todo el texto, los diálogos, los ejemplos y los ejercicios son originales.

## 1. Principios (resumen operativo)

1. **Espiral**: cada punto aparece cuando hace falta para comunicar, con el mínimo necesario, y vuelve después ampliado. El apunte vivo de ese tema registra cada vuelta.
2. **Vocabulario desde la lección 0.1**: cada lección de fonética trae 5–8 palabras de supervivencia hechas con sus sonidos.
3. **Fonética antes que tonos**: sonidos → reglas de escritura → tabla → tonos → sandhi. Después, un mini-ejercicio de pronunciación en **todas** las lecciones.
4. **Esqueleto visible**: cada punto gramatical se presenta con `<SentenceSkeleton>` y resalta su hueco. El esqueleto crece con el temario (en la U1 solo hay Sujeto · Verbo · Objeto).
5. **Una lección = un objetivo = 10–15 min**, con la plantilla de la sección 6.
6. **Necesidad comunicativa primero**: presentarse, comer, comprar, moverse y contar el día (Hugo estudiará en China).
7. **Cobertura comprobable**: `npm run curriculum:coverage` genera `docs/COBERTURA.md`.

## 2. Cambios respecto a la propuesta de partida (y por qué)

| # | Cambio | Justificación |
|---|---|---|
| 1 | **Adjetivos I pasa de U11 a U8**, antes de la comida (que pasa a U9). | 好吃, 很贵, 太辣了 y 我很忙 necesitan saber ya que el adjetivo es el predicado y que 很 es casi obligatorio. Enseñarlo en U11 obligaría a dar tres unidades de «fórmulas» sin explicar. U1 solo usa 你好 / 我很好 como bloques. |
| 2 | **也 entra en U1 y 都 en U3**; la U10 (con quién) los consolida con 跟/和…一起 y 也都. | «我也是西班牙人» es imprescindible al presentarse; «我们都是学生» aparece al hablar de la familia. Ya estaba así en el temario antiguo y funciona. |
| 3 | **Los interrogativos se introducen cuando se necesitan** (什么/谁/哪国 en U1, 几/多少 en U2, 哪儿 en U14…) y **U13 es la unidad de consolidación** de todos, con la regla de oro del hueco. | Nadie puede presentarse sin 什么 ni preguntar la edad sin 几. Consolidar en U13 mantiene el objetivo de la propuesta (todos juntos con el diagrama). |
| 4 | **Números II (U4) se queda, pero los precios grandes se repiten en U16** (Compras). | La lectura de cifras de 4 en 4 y el 零 encajan con el teléfono y la edad; los precios sin contexto de compra se olvidan. |
| 5 | **应该 sale de U12 y pasa a A2** (unidad de salud). | 应该 es nivel 2 en el estándar; U12 ya trae 会 / 能 / 可以 / 想 / 要 y sus negaciones, que es mucho. |
| 6 | **想 / 要 de deseo se adelantan a U9 (comida)**, y U12 añade 会 / 能 / 可以 y el contraste entre los cinco. | Para pedir en un restaurante hace falta 我要 / 我想要 desde el primer día en China. |
| 7 | **El 了 se reparte en tres vueltas**: U17 (acción completada, solo afirmativa), U18 (cambio de estado), U19 (negación con 没, sin 了). A2 vuelve con 了 + duración y 了…了. | Es el punto que más confunde a los hispanohablantes; la espiral evita darlo de golpe. |
| 8 | **Etapa 0 con 13 piezas**: las 12 lecciones + un checkpoint de etapa (0.13). | El checkpoint es una lección con su propio progreso y desbloqueo. |
| 9 | **U21 incluye un simulacro HSK 1** con el formato vigente (听力 20 + 阅读 20; ya existe en la app). | Reutiliza el simulacro actual. |
| 10 | **Cada unidad A1 = 4–6 lecciones + checkpoint + role-play + ficha imprimible**. | Igual que la propuesta; los role-plays existentes (u01–u14) se reubican según la tabla de la sección 7. |

## 3. Etapa 0 · Sonidos, escritura y supervivencia (id `e0`)

| Lección | Objetivo | Contenido | Vocabulario (5–8) | Carácter del día |
|---|---|---|---|---|
| e0-01 ¿Cómo funciona el chino? | Saber qué es una sílaba china y saludar. | Sílaba = inicial + final + tono; hanzi, pinyin y tonos (vista general); por qué el pinyin no se lee como el español. | 你好, 谢谢, 再见, 老师, 你, 好 | 人 |
| e0-02 Finales simples | Pronunciar a o e i u ü. | Posición de la boca y comparación con el español; la «e» china; la ü. | 一, 五, 八, 爸爸, 妈妈, 鱼 | 一 |
| e0-03 Iniciales 1 | Distinguir aspiradas y no aspiradas. | b p m f · d t n l; la prueba del papel explicada. | 不, 他, 你, 了, 大, 怕 | 大 |
| e0-04 Iniciales 2 | Pronunciar g k h y j q x. | Por qué j/q/x solo van con i/ü. | 哥哥, 喝, 去, 七, 谢谢, 家 | 七 |
| e0-05 Iniciales 3 | Separar z c s de zh ch sh r. | La «-i» vacía de zi/ci/si/zhi/chi/shi/ri. | 是, 十, 吃, 四, 日, 字, 热 | 日 |
| e0-06 Finales compuestas | Pronunciar las finales compuestas y nasales. | ai ei ao ou; an en ang eng ong; ia ie iao iou; ua uo uai uei; üe; ian in iang ing iong; uan un uang ueng; üan ün. Contraste -n / -ng. | 爱, 好, 看, 朋友, 中国, 北京, 忙 | 中 |
| e0-07 Reglas de escritura del pinyin | Escribir pinyin correctamente. | y/w; ü sin puntos tras j q x y; iou→iu, uei→ui, uen→un; dónde va la tilde; apóstrofo (Xī'ān); mayúsculas; palabras juntas. | 六, 对, 水, 女儿, 西安, 有 | 水 |
| e0-08 Reglas de pronunciación | Leer bien lo que el pinyin «esconde». | La e de -ie/-üe, la -i vacía, uo, ian [iɛn], r inicial, x/sh/s; errores típicos de hispanohablantes. | 谁, 人, 热, 学生, 月, 天 | 月 |
| e0-09 Tabla completa del pinyin | Encontrar y oír cualquier sílaba. | Tabla interactiva iniciales × finales, audio en 4 tonos, imposibles atenuadas, filtros por sonido. | Repaso (las 40 palabras anteriores) | 口 |
| e0-10 Los tonos | Producir y reconocer los 4 tonos + neutro. | Diagrama de Chao (55, 35, 214 → 21, 51), tono neutro, gesto con la mano, color por tono, tildes y números. | 妈, 麻, 马, 骂, 吗, 买, 卖 | 马 |
| e0-11 Pares de tonos y sandhi | Encadenar tonos en palabras. | Los 20 pares; 3+3; 一 (yī/yí/yì); 不 (bù/bú); medio tercer tono; neutro en dobladas; erhua básico. | 你好, 一个, 不是, 不客气, 一起, 哪儿 | 好 |
| e0-12 Escribir caracteres | Escribir con el orden de trazos correcto. | 横 竖 撇 捺 点 提 折 钩; reglas de orden; 30 radicales útiles; 六书 (enlace a Origen). | 人, 口, 大, 中, 日, 月 | 口 |
| e0-cp Checkpoint de la etapa | Comprobar la base. | Dictado de pinyin, discriminación de sonidos y tonos, lectura en voz alta evaluada, escritura de 10 caracteres. | — | — |

## 4. Etapa 1 · A1 / HSK 1 (id `a1`)

Cada unidad: 4–6 lecciones de 10–15 min + checkpoint + role-play + ficha resumen.
«Hueco» = hueco del esqueleto que se estrena (sección 6.2).

| U | Tema | Gramática, en orden | Hueco nuevo | Apuntes vivos que crecen |
|---|---|---|---|---|
| 1 | Saludos y presentaciones (nombres, 姓/叫, países, nacionalidades, idiomas) | Pronombres (我 你 您 他 她 它 + 们); S + 是 + N; 不是; 吗; respuestas cortas; 呢; 也 (adelanto); 什么 / 谁 / 哪国人 en bloque | Sujeto · Verbo · Objeto · Partícula final · Adverbio (也/不) | Pronombres, Esqueleto, Preguntas, Negación, Partículas |
| 2 | Números I (0–99), edad, teléfono (幺) | Formación de números; 几 vs 多少; 岁; 二 vs 两 | Objeto numérico | Números, Preguntas |
| 3 | La familia (extensa, por línea paterna y materna) | 有 / 没有; 的 posesivo con diagrama y omisión (我妈妈); 几口人; 个 / 口; 都 | Modificador del objeto (… 的) | El 的, Clasificadores, Negación, Adverbios |
| 4 | Números II (hasta 10 000 000) | 百 千 万 (十万 百万 千万); 零 intermedio; agrupar de 4 en 4; 两百/两千/两万; 第; 几十, 一百多 | — | Números |
| 5 | El calendario | Años dígito a dígito; 月 / 号 (日); 星期; orden grande → pequeño; 几月几号, 星期几, 哪年 | Tiempo (antes del verbo) | Fechas y horas, Esqueleto |
| 6 | La hora y los momentos del día | 点 分 半 刻 差; 现在几点; S + T + V / T + S + V; 什么时候 | Tiempo (las dos posiciones) | Fechas y horas, Esqueleto, Preguntas |
| 7 | Mi día (rutina) | S + T + V + O; verbos en serie (去 + lugar + V, 坐车去…); 先…然后…; 每天 | Verbo 1 (+ lugar) · Verbo 2 | Esqueleto, Adverbios |
| 8 | Describir: adjetivos I | Adjetivo predicado sin 是; 很; 不 + adj; adj + 吗 y A不A; grados (非常 真 太…了 特别 比较 最 有点儿); 好 + adj «muy»; 的 entre adj y N | Adverbio de grado | Adjetivos, Negación, Preguntas |
| 9 | ¿Qué comemos? ¿Qué bebemos? | 想 / 要; 好 + V (好吃 好喝 好看 好听 好玩); 还是; pedir en el restaurante; 杯 碗 瓶 盘 | Auxiliar (想/要) | Verbos auxiliares, Clasificadores, Preguntas |
| 10 | ¿Qué tenemos? Objetos y colores | 有 ampliado; 本 件 张 支 台 双 条; 这/那/哪 + CL + N; 这些; 这儿/这里; 的 nominalizador | Demostrativo + clasificador | Clasificadores, El 的, Pronombres |
| 11 | ¿Con quién estamos? | 跟/和 + persona + 一起 + V; 和 solo une nombres; 也 y 都 (posición, 也都) | 跟/和 + persona + 一起 | Esqueleto, Adverbios, Conectores |
| 12 | Ocio: escuchar, ver, jugar | 喜欢 + V; 会 / 能 / 可以 / 想 / 要 y sus negaciones (不用); 一下 y reduplicación | Auxiliar (todos) | Verbos auxiliares, Negación |
| 13 | Todas las preguntas | 什么 谁 哪/哪个/哪些 哪儿 什么时候 怎么 怎么样 为什么 几/多少 多 + adj; la respuesta va en el hueco de la pregunta; no combinar 吗 con interrogativo | (todos: diagrama de respuesta) | Preguntas |
| 14 | Lugares y direcciones | 在 + lugar (verbo) y 在 + lugar + V; localizadores; 有 / 在 / 是 de existencia; 离 + lugar + 远/近; 从…到… | 在 + lugar | Esqueleto, Adverbios (posición) |
| 15 | Transporte | 坐 / 骑 / 开 + medio; 怎么去; verbos en serie ampliados; duración (introducción) | Complemento de duración (adelanto) | Esqueleto, Complementos |
| 16 | Compras y dinero | 块 毛 分 (元 角); 多少钱; 贵/便宜; 一点儿 vs 有点儿; 太…了; regatear; 可以…吗; precios grandes | — | Adjetivos, Números |
| 17 | Estudios, trabajo y profesiones | 在 + lugar + 工作/学习; 做什么工作; 想当…; 了 (acción completada, intro) | Partícula 了 tras el verbo | Aspecto |
| 18 | El tiempo y las estaciones | 了 de cambio de estado; 要…了 / 快…了; 怎么样 | 了 final | Aspecto, Partículas |
| 19 | El cuerpo y la salud | 疼 / 不舒服; 了 ampliado; 没 + V; 不 / 没 / 别 | — | Negación, Aspecto |
| 20 | Teléfono, WeChat y vida digital | 给 + persona + 打电话/发微信; 喂; números de teléfono; 在 / 正在…呢 | Adverbio (正在) | Aspecto, Partículas |
| 21 | Repaso integral A1 | Frase completa con todos los huecos; transformaciones; checkpoint grande; simulacro HSK 1 | — | Mis frases modelo |

### 4.1 Ajustes por la lista del estándar (4-nov-2026)

Puntos del nivel 1 que el temario no tenía y que se añaden: verbos separables (离合词) en U7; imperativo con 请 en U9 y con 吧 en U12; 有的 / 有些 en U10; 还 «además» y 对 + persona + 说 en U11; doble objeto (给我一本书) y 再 «otra vez» en U16; V没V en U19. En A2: causativas 请 / 叫 / 让 en A2-11 (adelanto en A2-5), reduplicación de adjetivos y 什么的 en A2-7, 自己 en A2-3. La asignación completa (y los 70 puntos con unidad propuesta) está en grammar-standard.json y en docs/COBERTURA.md.

## 5. Etapa 2 · A2 / HSK 2 (id `a2`) y Etapa 3 · B1 / HSK 3 (id `b1`)

### Etapa 2 (12 unidades)

| U | Tema | Gramática principal |
|---|---|---|
| A2-1 | Llegar a China: viajes | 是…的 (cuándo, dónde, cómo); 过 (experiencia); 第一次 |
| A2-2 | La universidad en China | Duración: V + 了 + duración + O, V + O + V + 了 + duración; punto en el tiempo vs duración (diagrama); 多长时间 |
| A2-3 | La vida en la residencia (宿舍) | Adverbios de frecuencia (常常/经常, 有时候, 总是, 一般, 很少, 偶尔, 从来不/没); 每天/每次 |
| A2-4 | Comida y cocina | 先…再…; complemento de resultado (完 好 到 懂 见 错 对); 别 / 不要 |
| A2-5 | Salud | 应该; 可能; 一定; 了…了 (sigue en curso); duración negativa (三天没…了) |
| A2-6 | Amistad | Comparación: 比, 比 + adj + 一点儿/多了/得多, 没有…那么/这么, 跟…一样/不一样, 最 |
| A2-7 | Aficiones | Complemento de grado con 得 (说得很好); 一边…一边; 又…又; 的 / 地 / 得 (intro) |
| A2-8 | La ciudad | Preposiciones 往 向 对 给 为; direccional simple (来/去, 上来/下去…); 着 (estado, básico) |
| A2-9 | El clima y las estaciones | 越来越; 已经; 马上; 刚 / 刚才; 还 / 还没 |
| A2-10 | Las fiestas | 因为…所以; 虽然…但是; …的时候; 以前 / 以后 |
| A2-11 | El trabajo | 如果…就; 才 vs 就; 再 vs 又; 还是 vs 或者; 除了…以外 |
| A2-12 | Planes de futuro y repaso | 要 / 想 / 打算; 一…就 (intro); 不但…而且 (intro); simulacro HSK 2 |

### Etapa 3 (10 unidades)

| U | Tema | Gramática principal |
|---|---|---|
| B1-1 | Mudarse de piso | 把 (disposición) |
| B1-2 | Contratiempos | 被 (pasiva) |
| B1-3 | En clase | Complementos potenciales (听得懂 / 听不懂) |
| B1-4 | Moverse por la ciudad | Direccionales compuestos (走进来, 拿出去…) |
| B1-5 | Hábitos y condiciones | 一…就; 只要…就; 只有…才; 除非 |
| B1-6 | Sorpresas | 连…也/都; pronombres interrogativos indefinidos (谁都, 什么都, 哪儿都) |
| B1-7 | Cambios | 越…越; 了 doble; 着 ampliado |
| B1-8 | Opiniones | 不但…而且; 既然; 是不是 |
| B1-9 | Describir con precisión | 的 / 地 / 得 completo; comparaciones avanzadas |
| B1-10 | Repaso integral B1 | Simulacro HSK 3 |

## 6. Plantilla de lección

Orden fijo de pasos (`LessonStep`):

1. `objective` — objetivo y «¿qué sabré decir al acabar?».
2. `vocab` — 8–14 palabras (5–8 en la Etapa 0) con audio, tarjeta y tono coloreado.
3. `phonetics-drill` — pronunciación del día (sonido, par de tonos o regla) con ejercicio corto.
4. `char-of-day` — 1–2 caracteres: origen (visor de evolución), componentes, mnemotecnia y trazos.
5. `grammar` + `skeleton` — con `<SentenceSkeleton>`, ≥ 6 ejemplos, negativa, pregunta y errores típicos.
6. `dialogue` — voces distintas por personaje.
7. `exercises` — 12–20 ejercicios mezclados del banco.
8. `sentence-builder` — «Construye la frase» con lo de hoy y lo anterior.
9. `listen-speak` — shadowing y responder.
10. `reading` — lectura corta.
11. `notes-growth` — «Tus apuntes han crecido» + repaso.

### 6.2 Huecos del esqueleto (orden canónico)

`tiempo-inicial · sujeto · tiempo · adverbio · auxiliar · compania · lugar · verbo1 · verbo2 · objeto · complemento · particula`

Cada hueco tiene la unidad en la que se estrena; antes de esa unidad no se dibuja.

## 7. Equivalencias: unidades antiguas → nuevas

| Antigua | Lecciones antiguas | Nueva(s) |
|---|---|---|
| u0-pron | u0p-l1 Tonos · l2 Tabla · l3 Pares y sandhi · l4 Sonidos difíciles | e0-10 · e0-09 · e0-11 · e0-08 |
| u0-chars | u0c-l1 Trazos · l2–l4 Radicales | e0-12 (los radicales pasan al apunte vivo «Escritura» y a la pestaña Radicales) |
| u01 Saludos | l1–l5 | a1-u01 |
| u02 Números | l1–l5 | a1-u02 (+ a1-u04 para cifras grandes) |
| u03 Familia | l1–l5 | a1-u03 |
| u04 Hora y fechas | l1, l4 → calendario · l2, l3 → hora · l5 → repaso | a1-u05 · a1-u06 |
| u05 Comida | l1–l5 | a1-u09 |
| u06 Compras | l1–l4 | a1-u16 |
| u07 Lugares | l1–l4 | a1-u14 |
| u08 Transporte | l1–l4 | a1-u15 (l3 是…的 → a2-u01) |
| u09 Escuela y trabajo | l1–l4 | a1-u17 (l2 complementos → a2-u04) |
| u10 Tiempo atmosférico | l1–l4 | a1-u18 |
| u11 Salud | l1–l4 | a1-u19 |
| u12 Ocio | l1–l5 | a1-u12 |
| u13 Rutina | l1–l4 | a1-u07 |
| u14 Teléfono | l1–l5 | a1-u20 (l4 是…的 → a2-u01) |

La tabla lección a lección vive en código (`lib/course/migration.ts`) y tiene su test.

## 8. Plan de migración (datos del usuario)

Los datos del usuario están en IndexedDB (Dexie): `lessonProgress` (clave `lessonId`), `notes.unitId`, `exerciseSets.unitId`, `exerciseItems.unitId` y las referencias de los role-plays.

1. **Nada se borra.** Los registros antiguos se quedan tal cual: el historial y las copias de seguridad siguen siendo válidos.
2. **Progreso**: al arrancar, una migración idempotente (marca `migration:curriculum-v2` en `settings`) crea el progreso de las lecciones nuevas a partir de las antiguas:
   - una lección nueva queda «completada» si **todas** sus lecciones antiguas de origen lo estaban;
   - si solo lo estaban algunas, queda «en curso»;
   - la mejor puntuación se conserva (máximo de las de origen).
3. **Notas y ejercicios del usuario**: se añade el `unitId` nuevo, y el antiguo se guarda en `legacyUnitId`. Las notas propias nunca se reescriben de contenido.
4. **Apuntes vivos**: el contenido base va en JSON versionado; las aportaciones del usuario van en una tabla aparte (`livingNoteAdds`) con clave propia, así que una actualización del contenido nunca las pisa.
5. **Test**: `tests/unit/curriculum-migration.test.ts` comprueba el mapeo completo (todas las lecciones antiguas tienen destino y todas las de destino existen), la idempotencia y que no se pierde ningún registro.

## 9. Apuntes vivos (19 temas)

Pronombres · El esqueleto de la frase · Preguntas · Negación · Adjetivos · El 的 · Números · Fechas y horas · Verbos auxiliares · Adverbios · Clasificadores · Partículas · Aspecto (了/过/着/在) · Comparación · Complementos · Conectores · Fonética · Tonos · Escritura. Además: Tabla de pinyin, Esquema de tonos, Reglas del pinyin, Orden de trazos y Mis frases modelo.

Cada sección del apunte lleva `unlockedBy` (id de lección). El contenido actual de `content/zh/notes/*.json` (144 apuntes) se reparte en estas secciones sin perder nada; los que no encajan en un tema (frases de clase, guion personal) siguen en sus colecciones actuales.

## 10. Estado (5-nov-2026)

| Fase | Entregable | Estado |
|---|---|---|
| 1 | Visor de «Origen y evolución» estable (+ glifos normalizados, test de estabilidad) | hecho |
| 2 | Este documento | hecho |
| 3 | Pasos nuevos, `<SentenceSkeleton>`, apuntes vivos (base + «mías»), migración con test | hecho |
| 4 | Etapa 0: 12 lecciones + checkpoint, tabla de pinyin, esquema de Chao, reglas del pinyin | hecho |
| 5 | Etapa 1: 21 unidades A1 (92 lecciones) con role-plays | hecho |
| 6 | Vocabulario por niveles (`npm run vocab:levels`) y submazos de Anki por nivel y categoría | hecho |
| 7 | Etapa 2: 12 unidades A2 (62 lecciones) | hecho |
| 8 | Etapa 3: 10 unidades B1 (65 lecciones) | hecho |
| 9 | Cobertura (`npm run curriculum:coverage` → docs/COBERTURA.md), validación, capturas | hecho (ver informe final) |

Total: 44 unidades, 232 lecciones, 23 apuntes vivos, 43 archivos de role-play (uno por unidad A1, A2 y B1). Todo el contenido nuevo lleva `reviewed: false`.
