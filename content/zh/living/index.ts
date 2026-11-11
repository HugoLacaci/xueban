/**
 * Apuntes vivos del chino (docs/TEMARIO.md §9): un JSON por tema en esta carpeta, registrado aquí.
 * Cada sección declara `unlockedBy` (lección que la enseña). Contenido propio, reviewed: false.
 */
import type { LivingNote } from "@/lib/notes/living-model";
import fonetica from "./fonetica.json";
import tonos from "./tonos.json";
import escritura from "./escritura.json";
import tablaPinyin from "./tabla-pinyin.json";
import esquemaTonos from "./esquema-tonos.json";
import reglasPinyin from "./reglas-pinyin.json";
import ordenTrazos from "./orden-trazos.json";
import verbosAuxiliares from "./verbos-auxiliares.json";
import adverbios from "./adverbios.json";
import clasificadores from "./clasificadores.json";
import particulas from "./particulas.json";
import aspecto from "./aspecto.json";
import comparacion from "./comparacion.json";
import complementos from "./complementos.json";
import conectores from "./conectores.json";
import pronombres from "./pronombres.json";
import esqueleto from "./esqueleto.json";
import preguntas from "./preguntas.json";
import tablaInterrogativas from "./tabla-interrogativas.json";
import negacion from "./negacion.json";
import adjetivos from "./adjetivos.json";
import de from "./de.json";
import numeros from "./numeros.json";
import fechasHoras from "./fechas-horas.json";

export const LIVING_NOTES: LivingNote[] = [
  fonetica as LivingNote,
  tonos as LivingNote,
  escritura as LivingNote,
  tablaPinyin as LivingNote,
  esquemaTonos as LivingNote,
  reglasPinyin as LivingNote,
  ordenTrazos as LivingNote,
  verbosAuxiliares as LivingNote,
  adverbios as LivingNote,
  clasificadores as LivingNote,
  particulas as LivingNote,
  aspecto as LivingNote,
  comparacion as LivingNote,
  complementos as LivingNote,
  conectores as LivingNote,
  pronombres as LivingNote,
  esqueleto as LivingNote,
  preguntas as LivingNote,
  tablaInterrogativas as LivingNote,
  negacion as LivingNote,
  adjetivos as LivingNote,
  de as LivingNote,
  numeros as LivingNote,
  fechasHoras as LivingNote,
];
