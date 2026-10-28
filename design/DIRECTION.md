# Dirección de arte — 学伴 Xuébàn

> Un estudio de caligrafía moderno convertido en app. Papel 宣纸, tinta 墨, sellos 印章, celosías 窗棂 y paisajes 山水. Calma, 留白 y el carácter chino siempre como protagonista.

## Moodboard (en texto)

- **Superficie**: papel de arroz cálido (`宣纸 #F5EFE3`) con grano casi imperceptible (ruido SVG al 4 %). Las tarjetas son papel un punto más claro (`月白`), los campos de entrada papel hundido (`缃色`). En oscuro, «tinta de noche» (`#181715`), nunca negro puro.
- **Tinta**: todo el texto y las líneas son tinta en tres diluciones (`墨`, `淡墨`, `枯墨`). Los divisores son pinceladas finas, no líneas de CSS.
- **Sello**: el único rojo es el bermellón `朱砂` y aparece como sello: logo, CTA principal, unidad completada, logros, punto activo de la navegación. Proporción 80 % papel y tinta · 15 % neutros y celadón · 5 % bermellón.
- **Celadón `青瓷`** para el éxito y los acentos secundarios; **índigo `黛蓝`** para enlaces e información; **oro `赭金`** solo en logros y rachas.
- **Motivos**: ensō de progreso, rama de ciruelo que florece con las palabras dominadas, celosía al 5 % en cabeceras y estados vacíos, 回纹 en bordes de momentos importantes, 田字格 bajo cada carácter de práctica, montañas 山水 procedurales en la cabecera de Hoy y en el mapa del curso.
- **Tipografía**: el chino protagonista en `Noto Serif SC` (宋体), el chino de interfaz en `Noto Sans SC`, el chino «a mano» en `LXGW WenKai` (楷书) para caligrafía, frases célebres y la opción «fuente de estudio». Latín de interfaz `Inter`; latín editorial `Fraunces` en títulos y Study Hall. Pinyin siempre en la sans latina con diacríticos verificados.
- **Movimiento**: 150–250 ms en interfaz (`cubic-bezier(.2,.8,.2,1)`), 400–900 ms en celebraciones. Entre páginas, fundido de tinta (opacidad + desenfoque que se aclara). Acierto: onda jade + ✓ a pincel. Fallo: sacudida de 2 px, nunca agresiva. Fin de lección: tinta que se extiende, sello estampado, pétalos de ciruelo ≤ 1,5 s. `prefers-reduced-motion` lo reduce todo a fundidos.
- **Sonido** (opcional, apagado por defecto en móvil): pulsación de guqin para el acierto, 木鱼 para el error, campanilla para el logro. Sintetizados con Web Audio.

## Tres decisiones y su porqué

1. **El rojo es un sello, no un color de interfaz.** Se reserva al 5 % de la superficie (CTA principal, marca, completado, logros). Así cada vez que aparece significa algo y la app no cae en el «chino de restaurante».
2. **Dos registros de pantalla.** Las pantallas de estudio intenso (ejercicios, repaso, lectura, vídeo) son papel liso, sin ornamento, con el contenido centrado y los controles en zona de pulgar. Los ornamentos (山水, celosía, sellos, pétalos) viven solo en transiciones: Hoy, mapa, fin de lección, logros, estados vacíos y onboarding. La estética sirve al aprendizaje y nunca ralentiza un ejercicio.
3. **El carácter manda en la jerarquía.** Un único carácter grande en 宋体 (96–160 px en escritorio, 72–112 px en móvil) sobre 田字格 tenue, con el pinyin en ruby al 45–50 % y espacio reservado para que mostrar u ocultar el pinyin no mueva nada. Todo lo demás (español, chips, botones) baja un nivel.

## Reglas rápidas

- Esquinas 12 px en tarjetas, 8 px en botones; bordes de 1 px en `素`.
- Sombras cálidas: `0 1px 2px rgb(60 40 20 / .06), 0 8px 24px -8px rgb(60 40 20 / .12)`.
- Foco visible: anillo de tinta de 2 px con 2 px de separación.
- Nada de fotos ni ilustraciones de terceros; solo SVG propio en estilo tinta monocroma con un toque bermellón.
- Error ≠ acento: `绛` apagado, siempre con icono y texto.
- Máximo 2 familias latinas (Inter, Fraunces) y 3 chinas (Noto Sans SC y Noto Serif SC como fuentes variables, WenKai para caligrafía, sellos y marca). Se descartó Ma Shan Zheng: sumaba 89 KB de CSS bloqueante para un uso solo decorativo.
