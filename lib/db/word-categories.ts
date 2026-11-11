/**
 * Categorías de una palabra: la principal (`category`, la que decide su submazo en Anki) más las adicionales
 * (`alsoIn`). Una palabra aparece y se cuenta en todas ellas: 几 en «Preguntas» y en «Números y cantidades».
 */
type Categorized = { category: string; alsoIn?: string[] };

/** Todas las categorías de la palabra, la principal primero y sin repetir. */
export function wordCategories(w: Categorized): string[] {
  const out = [w.category];
  for (const c of w.alsoIn ?? []) if (c && !out.includes(c)) out.push(c);
  return out;
}

export function inCategory(w: Categorized, name: string): boolean {
  return w.category === name || (w.alsoIn?.includes(name) ?? false);
}

/** Limpia las adicionales: sin vacías, sin repetidas y sin la principal. `undefined` si no queda ninguna. */
export function cleanAlsoIn(category: string, alsoIn: string[] | undefined): string[] | undefined {
  const out = wordCategories({ category, alsoIn }).slice(1);
  return out.length ? out : undefined;
}

/** Etiquetas de Anki de las categorías (`cat::Tiempo_y_fechas`): la principal y las adicionales. */
export function categoryTags(w: Categorized): string[] {
  return wordCategories(w).map((c) => `cat::${c.replace(/\s+/g, "_")}`);
}
