# Cómo analizar una clase (paso B) — guía para Claude Code y sus subagentes

Entrada: `C:\CHINA\IDIOMA\clases\transcripciones\<ID>.json` (Whisper; segmentos con `start` en segundos, `lang` es/zh, `text`).
Salida: `C:\CHINA\IDIOMA\clases\paquetes\<ID>.json`, validado con `lib/classes/package-schema.ts` (zod).

**Ejemplo de referencia (ya revisado, cópiale el estilo y el nivel de detalle):** `C:\CHINA\IDIOMA\clases\paquetes\2026-10-03_1031.json`.

## Pasos
1. `npx tsx scripts/clases/texto.ts <ID>` → genera `transcripciones\<ID>.txt` ("mmm:ss [zh] texto"). **Léelo ENTERO** (con Read por tramos de ~700 líneas).
2. Escribe el paquete con el tool Write (no con heredocs de bash: se comen las barras invertidas).
3. Valida y genera los recortes: `npx tsx scripts/clases/finalizar.ts --solo <ID> --simular`. Si sale ✖, corrige y repite.

## Contexto
- **Lee también el contexto privado** `C:\CHINA\IDIOMA\clases\CONTEXTO.md` (nivel, profesor, horario del grupo de Hugo). No lo copies a ningún archivo del repositorio.
- La transcripción es ruidosa: las sílabas chinas sueltas salen como «español» («Duy», «cao», «Liang Qian Ling Ba»). Reconstruye el chino por contexto y anótalo en `asrFixes`. Si no está claro, a `uncertain`.
- Todo en español de España; chino en caracteres simplificados; pinyin con marcas de tono.

## Grupo y temario
- El horario del grupo de Hugo está en `clases\CONTEXTO.md`. Grabaciones de otro día u hora = otro grupo del mismo profesor (mismo libro): pon `"group": "otro"`; las de Hugo, `"group": "mio"`. En las de otro grupo los alumnos NO son Hugo.
- Apunta en `bookPages` todas las páginas del libro que se mencionen o trabajen (p. ej. «página 11» → 11). Es clave para alinear los grupos con el temario. En `topics`, usa nombres de tema comparables entre clases.

## Reglas (obligatorias)
- **Nada inventado.** Todo sale de la transcripción. `teacherAnswer` = solo lo que dijo el profesor. Si reconstruyes algo que no se oye bien: `confidence: "baja"` + entrada en `uncertain` con un `t` a menos de 30 s del ejercicio. Una propuesta tuya va en `claudeProposal`, nunca en `teacherAnswer`.
- **Sin nombres de compañeros** (aparecen al pasar lista y en el juego): usa «compañero/a». El nombre del profesor sí se puede poner en `teacher`.
- `myAnswer` solo si es seguro que habla Hugo (casi nunca se puede saber → omítelo).
- `t` = segundos desde el inicio (mm:ss del .txt → mm*60+ss).
- **Ejercicios**: momentos en que el profesor pregunta «¿cómo se dice…?» / corrige («no, se dice…», «muy bien») / lee un enunciado del libro y se responde. Un ítem = frase/cantidad en español → solución(es) del profesor en chino.
- **Vocabulario**: solo palabras que se trabajan en clase. `category` = una de: Saludos y expresiones · Pronombres · Números y cantidades · Preguntas · Clasificadores · Tiempo y fechas · Adjetivos · Familia y personas · Escuela y trabajo · Comida y bebida · Casa y objetos · Lugares · Transporte · Posición y dirección · Partículas y gramática · Verbos básicos · Adverbios · Ocio · Animales · Tiempo atmosférico · Salud · Países, nacionalidades e idiomas · Rutina diaria · Ropa, colores y objetos · Amigos y relaciones · Dinero y compras · Expresiones útiles · Emociones y carácter · Aficiones y deportes · La ciudad · Naturaleza y estaciones · Fiestas y cultura · Trabajo.
- **grammarId** (solo estos ids reales, o ninguno): ma, de, numbers, measure-words, dates-time, hen-adj, shi-de, qing, price-age, y el resto de `content/zh/grammar.json` (consúltalo: 30 puntos).
- **livingNoteAdds**: `noteId` y `sectionId` reales de `content/zh/living/*.json` (`id` del archivo y `sections[].id`). Lista: adjetivos, adverbios, aspecto, clasificadores, comparacion, complementos, conectores, de, escritura (hanzi-y-pinyin, trazos-basicos, orden-de-trazos, radicales, liushu), esqueleto, esquema-tonos, fechas-horas (dias-semana, meses-fechas, anos-fiestas, la-hora, partes-del-dia…), fonetica, negacion, numeros (del-0-al-99, cuantos, edad, er-liang, telefono, clasificador, centenas, mil-y-diez-mil, precios…), orden-trazos, particulas, preguntas (ma, ne, shenme-shei, na-guo-ren, ji-duoshao, you-mei-you…), pronombres (personales, plural-men, posesivos…), reglas-pinyin, tabla-pinyin, tonos (cuatro-tonos, tono-neutro, tercer-tono-y-sandhi, yi-y-bu…), verbos-auxiliares. Comprueba los ids en el JSON antes de usarlos.
- **Recortes (`clips`)**: 3–15 s de voz del profesor; nombres `ex-N.opus`, `vocab-xxx.opus`, `gram-xxx.opus`, `tip-xxx.opus` (solo `[\w.-]`). Uno por ejercicio con confianza alta/media y unos pocos para palabras/estructuras/trucos clave (10–25 por clase). El campo `clip` del elemento debe coincidir con `file`.
- Sin deberes claros → omite `homework`.
- `source`: `{ "file": "<ID>.opus", "transcript": "<ID>.json", "durationSec": <meta.durationSec redondeado>, "method": "manual" }`.
