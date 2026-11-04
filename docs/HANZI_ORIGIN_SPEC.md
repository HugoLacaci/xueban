# Especificación del contenido «Origen de los hanzi y memorización»

## 1. Serie de artículos «De dónde vienen los caracteres» (`content/zh/articles-origin.json`)

Array de artículos con la forma de `lib/study-hall/types.ts` (`Article`): `id`, `title`, `zh`, `category` (siempre `"origen de los caracteres"`), `minutes`, `summary`, `markdown`, `sources` (lista `{ title, url }`), `reviewed: false`. Los `id` fijos:

1. `origen-seis-categorias` — Las 6 categorías 六书: 象形 pictogramas, 指事 indicativos, 会意 compuestos de significado, 形声 compuestos fono-semánticos (la gran mayoría), 转注 y 假借 (explica que son categorías de uso/préstamo, con ejemplos 来, 北). Con ≥ 3 ejemplos por categoría explicados (女+子=好, 氵+每=海, 人 日 月 山 木, 上 下 本 末 刃…).
2. `origen-evolucion-escritura` — Evolución: 甲骨文 → 金文 → 篆书 → 隶书 → 楷书 → 行书/草书 → simplificación (1956 y 1964; menciona la lista de 1986), con fechas aproximadas y qué cambió en cada etapa; una tabla cronológica.
3. `origen-radicales-pistas` — Radicales como pistas de significado: 氵 agua, 扌 mano, 口 boca, 女 mujer, 木 árbol, 亻 persona, 讠 palabra, 心/忄 corazón, 辶 camino, 艹 planta, 钅 metal, 疒 enfermedad, 宀 techo, 火/灬 fuego, 日 sol, 月 luna/carne, 目 ojo, 足 pie, 饣 comida, 衤 ropa, 土 tierra: tabla con ≥ 20 radicales, forma aislada/comprimida, significado, 4 ejemplos HSK 1–2 cada uno.
4. `origen-componentes-foneticos` — Componentes fonéticos: cómo dan pistas de la pronunciación y hasta qué punto son fiables (马 → 妈 吗 骂 码; 青 → 请 清 情 晴; 工 → 红 江 空; 方 → 房 放 访; 包 → 抱 跑 饱), con una tabla de familias y una estimación honesta de la fiabilidad (misma sílaba exacta ≈ 1/3–1/4 de los casos; misma sílaba sin tono bastante más; a veces solo la rima).
5. `origen-simplificacion` — Cómo se simplificaron los caracteres y por qué conviene conocer algo de los tradicionales: métodos (cursiva estandarizada 书→書, sustitución de componentes 汉→漢, eliminación 广→廣, fusión 后/後…), dónde se usan los tradicionales (Taiwán, Hong Kong, Macao, caligrafía, carteles antiguos, menús) y una tabla de 20 pares frecuentes.
6. `origen-como-usar-origen-para-memorizar` — Cómo usar el origen para memorizar: palabra clave por componente, historias propias, cuándo la etimología real ayuda y cuándo conviene una mnemotecnia inventada (y decir cuál es cuál), el método del «palacio de la memoria» para pinyin y tono explicado de forma genérica (actor por inicial, escenario por final, habitación por tono), sin copiar listas comerciales.

Estilo: español de España, 6–10 minutos de lectura cada uno, tablas GFM, ejemplos con hanzi y pinyin, tono de divulgación rigurosa. Fuentes a citar (solo estas o fuentes académicas abiertas): Wiktionary (CC BY-SA 4.0), Make Me a Hanzi (skishore, datos de Arphic PL/LGPL), Qiu Xigui *Chinese Writing* (como referencia bibliográfica), Wikipedia (CC BY-SA). **No copies texto** de Outlier, YellowBridge, chineseetymology.org, Pleco ni otras fuentes con restricciones; explica con tus palabras.

## 2. Palabras clave de componentes (`content/zh/components-keywords.json`)

Lista PROPIA (no la de Heisig ni la de ningún libro) de ≈ 250 componentes frecuentes:
```json
[{ "c": "亻", "keyword": "persona", "pinyin": "rén", "es": "forma comprimida de 人 (persona) a la izquierda", "kind": "radical", "examples": ["你", "他", "们", "住"] }, …]
```
`kind` ∈ `radical` (semántico), `phonetic` (fonético), `both`, `shape` (solo forma). Incluye los 214 radicales Kangxi más útiles para el HSK 1–3 y los componentes fonéticos frecuentes (马 青 工 方 包 其 巴 寸 央 占 主 乍 者 奇 门 分 半 反 生 成 可 令 丁 兆 云 元 京 良 票…). La `keyword` debe ser una palabra española corta y concreta (una o dos palabras), memorable, que no sea un sinónimo del significado literal cuando el literal sea abstracto (p. ej. 又 «mano derecha/otra vez» → keyword «garra»; indica en `es` el significado real).

## 3. Pictogramas animados (`content/zh/pictograms.json`)

≈ 100 pictogramas básicos (人 口 日 月 山 水 火 木 女 子 门 雨 马 鱼 目 手 心 田 大 小 上 下 中 一 二 三 十 牛 羊 鸟 车 舟 刀 弓 矢 米 竹 禾 丝 衣 贝 玉 石 土 井 又 力 工 王 耳 足 身 自 首 页 面 言 齿 牙 毛 羽 虫 犬 豕 鹿 龙 龟 鼠 象 兔 鸡 犭 木 林 森 从 众 休 明 好 安 家 采 看 炎 尖 本 末 旦 回 囗 气 云 电 飞 立 走 止 出 入 门 户 瓜 果 叶 花 草 高 京 舟 文 父 母 老 多 分 半 占 主 主 ...; quita duplicados y añade los que falten hasta ~100), cada uno con:
```json
{ "c": "日", "pinyin": "rì", "es": "sol", "type": "pictograma", "story": "Un círculo con un punto en el centro: el sol. Al escribirse con pincel el círculo se hizo cuadrado.",
  "drawing": "M 50 20 a 30 30 0 1 0 0.1 0 M 50 50 m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0",
  "oracle": "M 30 30 ...", "components": ["日"] }
```
- `drawing`: dibujo ORIGINAL y sencillo del objeto (sol, montaña, persona de perfil, pez, puerta de dos hojas…) como ruta SVG (`path d`) en un lienzo de 100×100, solo trazos (sin relleno), 1–6 subtrazos. Debe parecerse al objeto, no al carácter.
- `oracle`: aproximación de la forma de hueso oracular/bronce como ruta SVG en el mismo lienzo (trazos simples) — dibujada por ti, no copiada.
- `story`: 1–2 frases en español sobre cómo pasó del dibujo al carácter.
- Para compuestos (好 安 休 明 森…) `type` es `会意` y `components` lista los componentes; `drawing` puede combinar los dibujos de sus partes.
