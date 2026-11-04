# Especificación de los role-plays por turnos (sin IA) — `content/zh/roleplays/`

Diálogos ramificados escritos a mano por escenario: la app hace de interlocutor (camarero, taxista, profesor…),
Hugo habla (o escribe) en su turno y la conversación avanza según lo que dice. Un archivo por unidad
(`u01.json` … `u14.json`), con **mínimo 3 escenarios por unidad**.

```json
{
  "unitId": "u05",
  "scenarios": [
    {
      "id": "u05-restaurant-order",
      "title": "Pedir en un restaurante",
      "zh": "在饭馆点菜",
      "level": 1,
      "setting": "Hugo entra en un restaurante pequeño cerca de la universidad. Tú (la app) eres la camarera.",
      "role": "camarera",
      "roleZh": "服务员",
      "voice": "f",
      "goals": ["Pedir la carta", "Pedir dos platos y una bebida", "Preguntar el precio", "Pedir la cuenta"],
      "vocab": ["菜单", "米饭", "鸡蛋", "茶", "多少钱", "买单"],
      "start": "n1",
      "nodes": {
        "n1": {
          "npc": { "zh": "你好！欢迎！几位？", "py": "Nǐ hǎo! Huānyíng! Jǐ wèi?", "es": "¡Hola! ¡Bienvenido! ¿Cuántos sois?" },
          "user": [
            { "zh": "一位。", "py": "Yí wèi.", "es": "Uno.", "keywords": ["一位", "一个人", "一个"], "next": "n2" },
            { "zh": "两位。", "py": "Liǎng wèi.", "es": "Dos.", "keywords": ["两位", "两个"], "next": "n2b" },
            { "zh": "我想看菜单。", "py": "Wǒ xiǎng kàn càidān.", "es": "Quiero ver la carta.", "keywords": ["菜单"], "next": "n3", "goal": 0 }
          ],
          "hint": "几位 pregunta cuántas personas. Responde con un número + 位."
        },
        "n2": { "npc": { "zh": "好的，请坐。这是菜单。", "py": "…", "es": "Vale, siéntate. Aquí tienes la carta." }, "user": [ … ] },
        "n9": { "npc": { "zh": "谢谢，再见！", "py": "…", "es": "¡Gracias, adiós!" }, "end": true, "feedback": "Has pedido, preguntado el precio y pagado: misión cumplida." }
      }
    }
  ]
}
```

Reglas:
- Cada escenario: 6–10 nodos, al menos **una ramificación real** (dos respuestas del alumno que llevan a nodos distintos) y un nodo final (`end: true`) con `feedback` en español. Puede haber un nodo final «alternativo» (p. ej. si se va sin pagar) con feedback que explique qué faltó.
- `user[]`: 2–3 opciones por turno. Cada opción lleva `zh`, `py`, `es`, `keywords` (2–4 palabras clave en chino que, si aparecen en lo que dice/escribe el alumno, se considera elegida esa opción), `next` (id de nodo) y, si cumple un objetivo, `goal` (índice en `goals`, desde 0). Los `keywords` de opciones distintas del mismo nodo no deben solaparse.
- `hint`: pista en español para el turno del alumno (qué se espera que diga).
- Todos los objetivos de `goals` deben ser alcanzables en algún camino.
- Vocabulario de la unidad y anteriores (ver `content/zh/course/uNN.json`); personajes 雨果, 安娜, 王明, 李老师; lugares de Shanghái / 交通大学. Pinyin con tildes y espacios entre palabras. Nada copiado de los diálogos de las lecciones.
- `voice`: `"f"` o `"m"` para el interlocutor (la app usa audio pregenerado con esa voz).
- Escenarios obligatorios en el conjunto (repártelos en la unidad que mejor encaje): restaurante, taxi, presentarse, la universidad (secretaría/biblioteca), compras (mercado/tienda), médico, teléfono, preguntar el camino, metro, cafetería, clase (hablar con el profesor), hacer un amigo, quedar para el fin de semana, en la farmacia, el tiempo, horarios, pedir ayuda.
