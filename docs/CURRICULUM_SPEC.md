# Especificación del contenido del temario v2 (chino)

Documento de trabajo para escribir lecciones del temario nuevo (`docs/TEMARIO.md`). Lo siguen igual quien escribe a mano y los agentes.

## 1. Archivos

| Qué | Dónde |
|---|---|
| Cabeceras de unidad (no tocar salvo encargo) | `content/zh/curriculum/units.json` |
| **Una lección por archivo** | `content/zh/curriculum/lessons/<id>.json` |
| Índice (generado) | `content/zh/curriculum/index.ts` ← `npm run curriculum:index` |
| Plan de vocabulario por unidad | `content/zh/curriculum/vocab-plan.json` |
| Apuntes vivos | `content/zh/living/<tema>.json` |
| **Lección modelo (léela entera antes de empezar)** | `content/zh/curriculum/lessons/a1-u01-l1.json` |

Ids: Etapa 0 → `e0-01` … `e0-12`, `e0-cp`; resto → `a1-u05-l3`, `a2-u02-l1`, `b1-u10-l4` (unidad con dos cifras, lección sin ceros).
Los ids que aparecen en `lib/course/migration.ts` (`LESSON_MAP`) **tienen que existir** con ese id exacto (la migración del progreso depende de ellos).

## 2. Forma de una lección

Tipos en `lib/course/types.ts` (`Lesson`, `LessonStep`) y `lib/course/skeleton.ts` (`SkeletonSentence`, `SlotId`).

```jsonc
{
  "id": "a1-u03-l2", "title": "…", "zh": "…", "goal": "una línea", "minutes": 12, "reviewed": false,
  "vocab": [{ "hanzi": "…", "pinyin": "…", "es": "…", "note": "opcional" }],   // 8–14 (Etapa 0: 5–8)
  "extraVocab": ["外卖"],                                                       // palabras fuera del HSK (opcional)
  "steps": [ … ]
}
```

### 2.1 Plantilla (orden obligatorio; se pueden intercalar pasos `explain`, `grammar` o módulos)

**Etapas A1, A2, B1**: `objective` → `vocab` → `phonetics-drill` → `char-of-day` → `skeleton` (1 o 2) → `dialogue` → `exercises` → `sentence-builder` → `listen-speak` → `reading` → `notes-growth`.

**Etapa 0**: `objective` → `vocab` → `phonetics-drill` → `char-of-day` → (`explain` y módulos de la lección) → `exercises` → `listen-speak` → `notes-growth`. La `e0-cp` (checkpoint) es libre.

| Paso | Contenido mínimo |
|---|---|
| `objective` | `canSay`: 2–4 frases que sabrás decir al acabar (con `py` y `es`). |
| `vocab` | `words`: las `hanzi` de `lesson.vocab`, todas. |
| `phonetics-drill` | `title`, `markdown` (explicación breve y concreta para hispanohablantes) e `items` ≥ 3: se oye `audio` (texto en chino) y se elige entre `options` (`answer` = índice). Pronunciación **siempre**, también en A2/B1: sonido, par de tonos, sandhi, entonación, erhua… |
| `char-of-day` | `chars`: 1–2 caracteres de la lección; `mnemonics`: una frase por carácter (componentes → significado). |
| `skeleton` | `title`, `markdown` (explicación), `focus` (huecos nuevos), `sentences` ≥ 4, `negative` ≥ 1, `question` ≥ 1, `mistakes` ≥ 2 (errores típicos de hispanohablantes). Total ≥ 6 ejemplos. `compare: true` y `esOrder` en al menos una frase cuando el orden cambia respecto al español. |
| `dialogue` | `title`, `lines` 6–10 con `speaker`, `zh`, `py`, `es`; `notes` opcional (cultura, uso). |
| `exercises` | `count` 12–20 (Etapa 0: 8–12) y `bank`: ids de bancos existentes en `content/zh/exercises/` (`g-shi`, `g-ma`, `u0`…) relacionados con la lección. |
| `sentence-builder` | ≥ 3 `items` (`sentence` + `distractors` opcionales) que combinen lo de hoy con lo anterior; la última frase, la más larga posible con lo visto. Al final de cada unidad, la última lección hace «Construye la frase completa» con ≥ 5 frases largas. |
| `listen-speak` | `shadowing` 3–5 frases y `respond` 2–3 preguntas con respuesta modelo. |
| `reading` | `title`, `text` (40–120 caracteres en A1, más en A2/B1), `es`, `questions` ≥ 3. |
| `notes-growth` | `{ "type": "notes-growth" }` (sin datos: se calcula de los apuntes vivos). |

### 2.2 Esqueleto de la frase

Huecos en orden: `time0` (tiempo antes del sujeto) · `subject` · `time` · `adverb` (也/都/不/没/很/常常…) · `aux` (会/能/想/要…) · `with` (跟/和 + persona + 一起) · `place` (在 + lugar) · `verb1` (verbo 1 + su lugar u objeto corto: 去学校, 坐地铁) · `verb2` · `object` · `complement` (duración, grado, resultado) · `particle` (吗/呢/吧/了 final).

Cada hueco se estrena en una unidad (`since` en `lib/course/skeleton.ts`); **no se puede usar antes** (el validador da error):

| Hueco | Desde |
|---|---|
| subject, verb1, object | Etapa 0 |
| adverb, particle | a1-u01 |
| time | a1-u05 |
| time0 | a1-u06 |
| verb2 | a1-u07 |
| aux | a1-u09 |
| with | a1-u11 |
| place | a1-u14 |
| complement | a1-u15 |

Convenciones: un adjetivo predicado (很忙) va en `adverb` (很) + `verb1` (忙); 是 / 有 / 在 (verbo) van en `verb1`; los clasificadores con su número van dentro de `object` (一杯茶). El 了 tras el verbo se pone en `verb1` (吃了); el 了 final, en `particle`. `py` en cada hueco cuando sea posible; `end` = `。`, `？` o `！`.

## 3. Lengua y calidad

- **Todo original**, en **español de España** (vosotros, «ordenador», «móvil», «coger el metro»), natural; si ayuda, traducción literal entre paréntesis: «老师好 (lit. «profesor, bien»)».
- `reviewed: false` en todo.
- **Pinyin**: tonos de cita salvo los cambios de 一 y 不 (bú shì, yí ge, yìqǐ); tono neutro sin marca (xuésheng, péngyou, xièxie, māma); palabras juntas (xuésheng, Zhōngguó), frases con mayúscula inicial y puntuación latina (`?`, `.`, `,`); nombres propios con mayúscula (Xībānyá). Apóstrofo ante a/o/e (Xī'ān, shí'èr).
- **Chino**: puntuación china (`，。？！：“”`), caracteres simplificados.
- **Vocabulario controlado**: las frases de una lección solo usan caracteres ya vistos en lecciones anteriores (orden del temario) + el vocabulario de la lección + nombres propios habituales (雨果, 王老师, 安娜, 小李, 大卫, 北京, 上海, 中国, 西班牙…). El validador avisa de cada carácter no visto: corrígelo o añade la palabra al vocabulario.
- Personajes recurrentes: **雨果** (Hugo, estudiante español en Shanghái), **王老师** (su profesora), **安娜** (compañera española), **小李** (compañero chino de residencia), **大卫** (compañero estadounidense).
- Contexto: Hugo estudia un máster en China. Prioridad a lo que necesita: presentarse, comer, comprar, moverse, la universidad, el móvil (微信, 支付宝, 外卖, 滴滴).

## 4. Validar antes de terminar

```bash
npm run curriculum:index
npm run content:check -- --lang=zh --verbose 2>&1 | grep "zh/curriculum/<tu-prefijo>"
```

Cero **errores** en tus archivos. Revisa los **avisos**: los de pinyin pueden ser falsos positivos de pinyin-pro (tono neutro), pero los de «caracteres aún no vistos» hay que resolverlos salvo nombres propios. Si tocas `units.json` o archivos ajenos a tu encargo, explícalo.
