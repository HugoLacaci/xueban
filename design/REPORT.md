# Rediseño visual «宣纸与墨» — informe final

Fecha: 28 de octubre de 2026. Alcance: solo capa visual y UX; ninguna función se ha eliminado. La galería antes/después está en `design/screenshots/index.html` (ábrela en el navegador); las capturas sueltas, en `design/screenshots/before/` (84) y `design/screenshots/after/` (205).

## 1. Qué se ha hecho

**Sistema de diseño (base de todo)**
- `design/DIRECTION.md`: dirección de arte (estudio de caligrafía contemporáneo), moodboard en texto, tres decisiones justificadas: el rojo es un sello y no un color de interfaz; dos registros de pantalla (estudio silencioso / celebración); el carácter manda en la jerarquía.
- `styles/tokens.css`: tokens RGB con nombres chinos para claro y 夜墨 oscuro, esquemas de tono (学伴, Pleco, sin colores, personalizado), sombras cálidas, radios y curvas de movimiento.
- `app/globals.css`: fuentes, ruby de pinyin sin salto de maquetación, 田字格/米字格, superficies de papel, anillo de foco de tinta, movimiento reducido, textura de papel con `feTurbulence` (4,5 % claro / 2,5 % oscuro).
- `components/ornament/`: Seal, SealTag, InkDivider, Enso, BrushCheck, Lattice, MoonGate, FretBorder, CloudBorder, ScreenFrame, ShanShui (procedural, cambia con la hora), PlumBranch, PetalRain, InkRipple, TianZiGe, Lantern y la mascota 小墨.
- Primitivas y botones reescritos sobre los tokens; `HanziCard` con giro 3D; popup de palabra como tarjeta flotante con flecha y sello HSK; avisos como papelitos con sello (animación CSS, sin librería).
- `/design`: guía de estilo viva (colores, tonos, escala tipográfica, familias chinas, botones, formularios, estados, fichas de ejercicio, tarjetas, ornamentos, vacíos). Enlazada al pie de la barra lateral.
- Iconos PWA regenerados: sello 学伴 sobre papel en 192/512, variante maskable, icono Apple y favicon SVG.

**Pantallas (en el orden pedido)**
- **Hoy**: cabecera 山水 por hora del día con saludo en 宋体, ensō del objetivo diario, 今日任务 con sello 完 en lo hecho, racha como faroles, cuenta atrás HSK, ciruelo que florece con las palabras dominadas, carácter del día en 田字格 con etimología, mapa de calor como cuadrícula de sellos.
- **Ejercicio**: la pantalla más silenciosa. Barra de pincel, carácter protagonista en 宋体 sobre 田字格 tenue, fichas de papel ≥ 56 px con atajo visible, «Comprobar» fijo en la zona del pulgar, panel de corrección que sube (jade con ✓ a pincel y ondas de tinta; ocre-绛 para el error, nunca bermellón, siempre con explicación), fichas de 竹简 arrastrables con @dnd-kit (teclado incluido), contornos de tono como glifos, micrófono de tinta con anillo. 94 capturas por tipo y estado.
- **Flashcards**: pila de papeles con ligera rotación, carácter 104–152 px, deslizar en móvil (izquierda = otra vez, derecha = bien), cuatro botones FSRS con intervalo y color propio, mazo con ensō y sellos de estado, ficha de palabra como lámina.
- **Diccionario / ficha**: buscador protagonista con pestañas, lámina enciclopédica con 米字格 y trazos, radical en bermellón, árbol de componentes con líneas de tinta, etimología como nota al margen.
- **Aprender**: sendero sinuoso sobre rollo de montañas (parallax en escritorio), unidades como sellos (gris → tinta → bermellón), lecciones como tiras de papel, checkpoints como 牌坊; reproductor con barra de pincel y pantalla final con tinta que se extiende, sello 完成 estampado con sonido y lluvia de pétalos.
- **Vídeos**: reproductor en 屏风, línea activa con aguada de tinta, modo cine local. **Lectura**: libro de 42 rem, numerales de párrafo como sellos, modo noche local. **Study Hall**: ventana de luna con bambú, Pomodoro como varilla de incienso que se consume. **Progreso**: álbum de sellos, informe elegante en tinta. **Ajustes**: secciones con divisores de tinta, selector de esquema de tono y marca de tono adicional. **Onboarding**: paisaje que se pinta paso a paso y termina con el sello personal 雨果 y 欢迎来到学伴.

## 2. Autocrítica por pantalla (última ronda, 1–10)

Criterios: jerarquía · ritmo · coherencia · belleza · legibilidad del chino · accesibilidad. Se corrigió todo lo que bajaba de 9 salvo lo anotado.

| Pantalla | Escritorio claro/oscuro | Móvil claro/oscuro | Nota |
|---|---|---|---|
| Hoy | 9 / 9 | 8,5 / 8,5 | la línea de fecha pisa las cumbres en pantallas muy estrechas |
| Onboarding | 9 / 9 | 8,5 / 8,5 | último paso denso (sello + mascota) |
| Ejercicio (todos los tipos) | 9 / 9 | 9 / 9 | |
| Flashcards, repaso, palabra | 9 / 9 | 9 / 9 | |
| Diccionario, caracteres | 9 / 9 | 9 / 9 | |
| Aprender (mapa) | 9 / 9 | 8,5 / 8,5 | el sendero pierde parte de su encanto en una columna |
| Lección, fin, gramática, checkpoint | 9 / 9 | 9 / 9 | |
| Vídeos, lectura | 9 / 9 | 9 / 9 | |
| Study Hall, cuaderno | 9 / 9 | 9 / 9 | la celosía en oscuro resulta algo más cargada |
| Progreso, ajustes, practicar, simulacro | 9 / 9 | 9 / 9 | |
| Guía de estilo | 9 / 9 | 9 / – | |

## 3. Verificación

**Contraste AA (texto ≥ 4,5:1)**. Calculado sobre los tokens finales (`styles/tokens.css`), par texto/fondo en ambos temas:

| Par | Claro | Oscuro |
|---|---|---|
| ink / paper | 15,2 | 14,2 |
| ink-soft / paper | 8,4 | 8,8 |
| ink-faint / paper · / paper-sunk | 5,3 · 4,8 | 5,4 · 5,7 |
| cinnabar como texto / paper | 5,0 | 5,2 |
| celadon-ink / paper | 5,5 | 9,2 |
| gold-ink / paper | 5,0 | 9,6 |
| danger / paper | 6,1 | 5,5 |
| tonos 1–5 / paper | 5,1 · 5,2 · 5,5 · 6,3 · 5,4 | 6,0 · 8,2 · 7,1 · 6,9 · 7,0 |
| texto papel sobre botón bermellón / jade / tinta | 5,3 · 5,9 · 15,2 | 5,0 · 8,5 · 14,2 |

Para cumplirlo se oscurecieron respecto al brief los tonos 1 (#BA3428), 2 (#2C7048) y 5 y el gris 枯墨; el botón jade usa celadon-ink de fondo; en oscuro el bermellón se aclaró a #E26A56. Las aguadas jade/绛 solo acompañan a texto en su color oscuro más icono.

**Lighthouse** (móvil simulado, build de producción, perfil con el onboarding ya hecho, dos pasadas):

| Ruta | Performance | Accessibility | Best practices | LCP | TBT |
|---|---|---|---|---|---|
| / (Hoy) | 83–84 | 100 | 96 | 1,5–1,6 s | 660 ms |
| /aprender | 78–80 | 100 | 96 | 1,7 s | 860–970 ms |
| /flashcards/repasar | 88 | 100 | 96 | 1,3 s | 400 ms |
| /diccionario | 76–77 | 100 | 96 | 1,4 s | 1,1 s |

Accesibilidad y buenas prácticas cumplen el objetivo (≥ 90). Performance se queda entre 76 y 88: LCP y CLS son buenos; lo que resta es el tiempo de bloqueo del hilo principal con CPU ×4 (hidratación de React y evaluación de los chunks de la app). En la primera visita, con el redireccionamiento al onboarding, la nota baja a ~65. Lo ya hecho para subirla: fuentes chinas como caras variables (el CSS bloqueante pasó de 855 KB a 396 KB), Ma Shan Zheng descartada, diccionario cargado tras la primera interacción, popup y paleta de búsqueda fuera del bundle inicial, mapa de calor sin 140 tooltips, avisos sin librería de animación, enlaces de navegación sin precarga.

**Código y pruebas**: `tsc --noEmit` 0 errores; `eslint` 0 errores (6 avisos previos de hooks); 58 pruebas unitarias; 14 pruebas e2e (escritorio + móvil) tras actualizar dos textos esperados («Tareas de hoy», «1 de N lecciones completadas»). Teclado: orden de tabulación comprobado en la navegación, atajos 1–4 / Enter / Espacio en ejercicios, arrastre de fichas con Espacio y flechas. Movimiento reducido: solo fundidos, sin pétalos ni parallax (comprobado con `reducedMotion: 'reduce'`).

## 4. Qué mejoraría con más tiempo

- **Performance ≥ 90 en todas las rutas**: mover el parseo del diccionario a un Web Worker, trocear el contenido del curso por unidad (hoy va en un único módulo), y revisar los chunks compartidos con el analizador de bundle.
- **Iconos propios de navegación** dibujados a pincel en lugar de lucide + carácter.
- **Temas estacionales** por 节气 y festividades (previsto en el brief como opcional; los tokens lo permiten con un `data-season` en `<html>`).
- **Sello personal** configurable en Ajustes (texto y forma), y álbum de sellos con más logros ilustrados.
- **Pantalla Hoy en móvil**: recortar la cabecera 山水 a 150 px y bajar la fecha bajo el saludo.
- Sonidos sintetizados: afinar el timbre del guqin y añadir un volumen propio en Ajustes.
