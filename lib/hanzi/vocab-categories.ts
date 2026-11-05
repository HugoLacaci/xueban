/**
 * Categorías del vocabulario del temario v2 (chino): las 21 de la semilla HSK 1 se conservan en su orden (los
 * submazos de Anki «NN Categoría» no cambian) y estas 20 se añaden detrás. Cada unidad alimenta una categoría.
 */
/** Unidad del temario → categoría de sus palabras nuevas (las de la semilla conservan la suya). */
export const UNIT_CATEGORY: Record<string, string> = {
  e0: "Saludos y expresiones",
  "a1-u01": "Países, nacionalidades e idiomas",
  "a1-u02": "Números y cantidades",
  "a1-u03": "Familia y personas",
  "a1-u04": "Números y cantidades",
  "a1-u05": "Tiempo y fechas",
  "a1-u06": "Tiempo y fechas",
  "a1-u07": "Rutina diaria",
  "a1-u08": "Adjetivos",
  "a1-u09": "Comida y bebida",
  "a1-u10": "Ropa, colores y objetos",
  "a1-u11": "Amigos y relaciones",
  "a1-u12": "Ocio",
  "a1-u13": "Preguntas",
  "a1-u14": "Lugares",
  "a1-u15": "Transporte",
  "a1-u16": "Dinero y compras",
  "a1-u17": "Escuela y trabajo",
  "a1-u18": "Tiempo atmosférico",
  "a1-u19": "Salud",
  "a1-u20": "Vida digital en China",
  "a1-u21": "Expresiones útiles",
  "a2-u01": "Viajes",
  "a2-u02": "Universidad",
  "a2-u03": "Casa y residencia",
  "a2-u04": "Comida y bebida",
  "a2-u05": "Salud",
  "a2-u06": "Emociones y carácter",
  "a2-u07": "Aficiones y deportes",
  "a2-u08": "La ciudad",
  "a2-u09": "Naturaleza y estaciones",
  "a2-u10": "Fiestas y cultura",
  "a2-u11": "Trabajo",
  "a2-u12": "Planes y opiniones",
  "b1-u01": "Casa y residencia",
  "b1-u02": "Sucesos y trámites",
  "b1-u03": "Universidad",
  "b1-u04": "La ciudad",
  "b1-u05": "Hábitos y medios",
  "b1-u06": "Aficiones y deportes",
  "b1-u07": "Sociedad y cambios",
  "b1-u08": "Planes y opiniones",
  "b1-u09": "Adjetivos",
  "b1-u10": "Trabajo",
};

/** Categorías nuevas, en el orden en que se añaden a los submazos (22, 23…), con color e icono. */
export const NEW_CATEGORIES: { name: string; color: string; icon: string }[] = [
  {
    name: "Países, nacionalidades e idiomas",
    color: "#5b6abf",
    icon: "Globe",
  },
  {
    name: "Rutina diaria",
    color: "#8d6e63",
    icon: "Sunrise",
  },
  {
    name: "Ropa, colores y objetos",
    color: "#ad1457",
    icon: "Shirt",
  },
  {
    name: "Amigos y relaciones",
    color: "#d81b60",
    icon: "HeartHandshake",
  },
  {
    name: "Dinero y compras",
    color: "#2e7d32",
    icon: "Wallet",
  },
  {
    name: "Vida digital en China",
    color: "#00897b",
    icon: "Smartphone",
  },
  {
    name: "Expresiones útiles",
    color: "#6d4c41",
    icon: "MessageCircle",
  },
  {
    name: "Viajes",
    color: "#1565c0",
    icon: "Plane",
  },
  {
    name: "Universidad",
    color: "#3949ab",
    icon: "GraduationCap",
  },
  {
    name: "Casa y residencia",
    color: "#795548",
    icon: "BedDouble",
  },
  {
    name: "Emociones y carácter",
    color: "#c2185b",
    icon: "Smile",
  },
  {
    name: "Aficiones y deportes",
    color: "#ef6c00",
    icon: "Dumbbell",
  },
  {
    name: "La ciudad",
    color: "#455a64",
    icon: "Building2",
  },
  {
    name: "Naturaleza y estaciones",
    color: "#43a047",
    icon: "Leaf",
  },
  {
    name: "Fiestas y cultura",
    color: "#c62828",
    icon: "PartyPopper",
  },
  {
    name: "Trabajo",
    color: "#37474f",
    icon: "Briefcase",
  },
  {
    name: "Planes y opiniones",
    color: "#5e35b1",
    icon: "Compass",
  },
  {
    name: "Sucesos y trámites",
    color: "#78909c",
    icon: "FileText",
  },
  {
    name: "Hábitos y medios",
    color: "#00838f",
    icon: "Tv",
  },
  {
    name: "Sociedad y cambios",
    color: "#6a1b9a",
    icon: "TrendingUp",
  },
];
