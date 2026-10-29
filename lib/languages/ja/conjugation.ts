/**
 * Conjugación japonesa (N5–N4): verbos godan / ichidan / irregulares (する, くる) y adjetivos い / な,
 * con las excepciones 行く (いって), ある (ない), いい (よくない), 問う… Más un «deinflector» que
 * propone la forma de diccionario de una forma conjugada (食べました → 食べる) para el diccionario.
 */
export type WordClass = "godan" | "ichidan" | "suru" | "kuru" | "i-adj" | "na-adj";

export interface FormDef {
  id: string;
  name: string; // español
  native: string;
  level: "N5" | "N4";
  description: string;
  appliesTo: ("verb" | "adj")[];
}

export const FORMS: FormDef[] = [
  { id: "masu", name: "Presente cortés", native: "ます形", level: "N5", description: "Forma educada de presente/futuro: 食べます «como / comeré».", appliesTo: ["verb"] },
  { id: "masen", name: "Negativo cortés", native: "ません", level: "N5", description: "食べません «no como».", appliesTo: ["verb"] },
  { id: "mashita", name: "Pasado cortés", native: "ました", level: "N5", description: "食べました «comí».", appliesTo: ["verb"] },
  { id: "masendeshita", name: "Pasado negativo cortés", native: "ませんでした", level: "N5", description: "食べませんでした «no comí».", appliesTo: ["verb"] },
  { id: "mashou", name: "Invitación cortés", native: "ましょう", level: "N5", description: "食べましょう «comamos».", appliesTo: ["verb"] },
  { id: "tai", name: "Deseo", native: "たい", level: "N5", description: "食べたい «quiero comer» (se conjuga como adjetivo い).", appliesTo: ["verb"] },
  { id: "dict", name: "Forma de diccionario", native: "辞書形", level: "N5", description: "Presente llano: 食べる.", appliesTo: ["verb"] },
  { id: "nai", name: "Negativo llano", native: "ない形", level: "N5", description: "食べない «no como».", appliesTo: ["verb", "adj"] },
  { id: "ta", name: "Pasado llano", native: "た形", level: "N5", description: "食べた «comí».", appliesTo: ["verb", "adj"] },
  { id: "nakatta", name: "Pasado negativo llano", native: "なかった", level: "N5", description: "食べなかった «no comí».", appliesTo: ["verb", "adj"] },
  { id: "te", name: "Forma て", native: "て形", level: "N5", description: "Enlace, peticiones (〜てください) y progresivo (〜ている).", appliesTo: ["verb", "adj"] },
  { id: "potential", name: "Potencial", native: "可能形", level: "N4", description: "食べられる «poder comer».", appliesTo: ["verb"] },
  { id: "volitional", name: "Volitiva", native: "意向形", level: "N4", description: "食べよう «comamos / voy a comer».", appliesTo: ["verb"] },
  { id: "desu", name: "Presente cortés (adjetivo)", native: "です", level: "N5", description: "高いです / 静かです.", appliesTo: ["adj"] },
  { id: "adj-neg-polite", name: "Negativo cortés (adjetivo)", native: "くないです / じゃありません", level: "N5", description: "高くないです / 静かじゃありません.", appliesTo: ["adj"] },
  { id: "adj-past-polite", name: "Pasado cortés (adjetivo)", native: "かったです / でした", level: "N5", description: "高かったです / 静かでした.", appliesTo: ["adj"] },
];

// columnas del godan por terminación: a i u e o
const GODAN: Record<string, [string, string, string, string, string]> = {
  う: ["わ", "い", "う", "え", "お"],
  く: ["か", "き", "く", "け", "こ"],
  ぐ: ["が", "ぎ", "ぐ", "げ", "ご"],
  す: ["さ", "し", "す", "せ", "そ"],
  つ: ["た", "ち", "つ", "て", "と"],
  ぬ: ["な", "に", "ぬ", "ね", "の"],
  ぶ: ["ば", "び", "ぶ", "べ", "ぼ"],
  む: ["ま", "み", "む", "め", "も"],
  る: ["ら", "り", "る", "れ", "ろ"],
};

const TE_GODAN: Record<string, string> = { う: "って", つ: "って", る: "って", む: "んで", ぶ: "んで", ぬ: "んで", く: "いて", ぐ: "いで", す: "して" };

function godanStem(word: string, col: 0 | 1 | 3 | 4): string {
  const last = word.slice(-1);
  const row = GODAN[last];
  if (!row) return word;
  return word.slice(0, -1) + row[col];
}

function teGodan(word: string): string {
  if (/(行く|いく|逝く)$/.test(word)) return word.slice(0, -1) + "って";
  if (/(問う|とう|請う|こう)$/.test(word)) return word.slice(0, -1) + "うて";
  const last = word.slice(-1);
  return word.slice(0, -1) + (TE_GODAN[last] ?? "て");
}

const toTa = (te: string) => te.replace(/て$/, "た").replace(/で$/, "だ");

function verbMasuStem(word: string, cls: WordClass): string {
  if (cls === "ichidan") return word.slice(0, -1);
  if (cls === "suru") return word.replace(/する$/, "し");
  if (cls === "kuru") return word.replace(/(来る|くる)$/, (m) => (m === "来る" ? "来" : "き"));
  return godanStem(word, 1);
}

function verbNaiStem(word: string, cls: WordClass): string {
  if (cls === "ichidan") return word.slice(0, -1);
  if (cls === "suru") return word.replace(/する$/, "し");
  if (cls === "kuru") return word.replace(/(来る|くる)$/, (m) => (m === "来る" ? "来" : "こ"));
  if (/(ある)$/.test(word) && word.length <= 2) return ""; // ある → ない
  return godanStem(word, 0);
}

function conjugateVerb(word: string, cls: WordClass, form: string): string | undefined {
  const masu = verbMasuStem(word, cls);
  const naiStem = verbNaiStem(word, cls);
  const nai = word === "ある" ? "ない" : `${naiStem}ない`;
  const te = cls === "ichidan" ? `${word.slice(0, -1)}て` : cls === "suru" ? word.replace(/する$/, "して") : cls === "kuru" ? word.replace(/(来る|くる)$/, (m) => (m === "来る" ? "来て" : "きて")) : teGodan(word);
  switch (form) {
    case "dict":
      return word;
    case "masu":
      return `${masu}ます`;
    case "masen":
      return `${masu}ません`;
    case "mashita":
      return `${masu}ました`;
    case "masendeshita":
      return `${masu}ませんでした`;
    case "mashou":
      return `${masu}ましょう`;
    case "tai":
      return `${masu}たい`;
    case "nai":
      return nai;
    case "nakatta":
      return nai.replace(/ない$/, "なかった");
    case "te":
      return te;
    case "ta":
      return toTa(te);
    case "potential":
      if (cls === "ichidan") return `${word.slice(0, -1)}られる`;
      if (cls === "suru") return word.replace(/する$/, "できる");
      if (cls === "kuru") return word.replace(/(来る|くる)$/, (m) => (m === "来る" ? "来られる" : "こられる"));
      return `${godanStem(word, 3)}る`;
    case "volitional":
      if (cls === "ichidan") return `${word.slice(0, -1)}よう`;
      if (cls === "suru") return word.replace(/する$/, "しよう");
      if (cls === "kuru") return word.replace(/(来る|くる)$/, (m) => (m === "来る" ? "来よう" : "こよう"));
      return `${godanStem(word, 4)}う`;
  }
  return undefined;
}

function conjugateAdj(word: string, cls: WordClass, form: string): string | undefined {
  if (cls === "i-adj") {
    const base = /^(いい|良い)$/.test(word) ? (word === "いい" ? "よ" : "良") : /(かっこいい)$/.test(word) ? word.replace(/いい$/, "よ") : word.slice(0, -1);
    switch (form) {
      case "desu":
        return `${word}です`;
      case "nai":
        return `${base}くない`;
      case "adj-neg-polite":
        return `${base}くないです`;
      case "ta":
        return `${base}かった`;
      case "adj-past-polite":
        return `${base}かったです`;
      case "nakatta":
        return `${base}くなかった`;
      case "te":
        return `${base}くて`;
    }
    return undefined;
  }
  const stem = word.replace(/だ$/, "");
  switch (form) {
    case "desu":
      return `${stem}です`;
    case "nai":
      return `${stem}じゃない`;
    case "adj-neg-polite":
      return `${stem}じゃありません`;
    case "ta":
      return `${stem}だった`;
    case "adj-past-polite":
      return `${stem}でした`;
    case "nakatta":
      return `${stem}じゃなかった`;
    case "te":
      return `${stem}で`;
  }
  return undefined;
}

export function conjugate(word: string, form: string, cls: WordClass): string | undefined {
  if (cls === "i-adj" || cls === "na-adj") return conjugateAdj(word, cls, form);
  return conjugateVerb(word, cls, form);
}

/** Alternativas aceptables (じゃ / では). */
export function alternatives(answer: string): string[] {
  const alts: string[] = [];
  if (answer.includes("じゃ")) alts.push(answer.replace("じゃ", "では"));
  if (answer.endsWith("くないです")) alts.push(answer.replace(/くないです$/, "くありません"));
  return alts;
}

/** Clase probable a partir del tipo de la semilla o de la terminación. */
export function guessClass(word: string, hint?: string): WordClass | undefined {
  if (hint === "godan" || hint === "ichidan" || hint === "suru" || hint === "kuru" || hint === "i-adj" || hint === "na-adj") return hint;
  if (/する$/.test(word)) return "suru";
  if (/^(来る|くる)$/.test(word)) return "kuru";
  if (/[いえきけしせちてにねひへみめりれぎげじぜびべぴぺ]る$/.test(word)) return "ichidan";
  if (/[うくぐすつぬぶむる]$/.test(word)) return "godan";
  if (/い$/.test(word)) return "i-adj";
  return undefined;
}

/* ------------------------------ Deinflexión ------------------------------ */

/** Reglas sufijo conjugado → sufijo de diccionario (como en los diccionarios emergentes). */
const RULES: [string, string][] = [
  ["ませんでした", "る"],
  ["ました", "る"],
  ["ません", "る"],
  ["ましょう", "る"],
  ["ます", "る"],
  ["たい", "る"],
  ["なかった", "る"],
  ["ない", "る"],
  ["られる", "る"],
  ["よう", "る"],
  ["て", "る"],
  ["た", "る"],
  ["かった", "い"],
  ["くない", "い"],
  ["くて", "い"],
  ["く", "い"],
  ["んで", "む"],
  ["んで", "ぶ"],
  ["んで", "ぬ"],
  ["んだ", "む"],
  ["んだ", "ぶ"],
  ["んだ", "ぬ"],
  ["って", "う"],
  ["って", "つ"],
  ["って", "る"],
  ["った", "う"],
  ["った", "つ"],
  ["った", "る"],
  ["いて", "く"],
  ["いた", "く"],
  ["いで", "ぐ"],
  ["いだ", "ぐ"],
  ["して", "す"],
  ["した", "す"],
  ["して", "する"],
  ["した", "する"],
  ["します", "する"],
  ["しない", "する"],
  ["きます", "くる"],
  ["きて", "くる"],
  ["きた", "くる"],
  ["来ます", "来る"],
  ["来て", "来る"],
  ["来た", "来る"],
  ["行って", "行く"],
  ["行った", "行く"],
];

// columna i/a/e del godan → u
const COL_TO_U = new Map<string, string>();
for (const [u, row] of Object.entries(GODAN)) for (const c of [row[0], row[1], row[3], row[4]]) if (!COL_TO_U.has(c)) COL_TO_U.set(c, u);

/** Candidatos de forma de diccionario (de más a menos probable). */
export function deinflect(form: string): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    if (s && s !== form && Array.from(s).length >= 1) out.add(s);
  };
  for (const [suf, rep] of RULES) {
    if (!form.endsWith(suf) || form.length < suf.length) continue;
    const stem = form.slice(0, -suf.length);
    add(stem + rep);
    // godan: 書きます → 書く, 読まない → 読む, 行こう → 行く, 書ける → 書く
    if (["ます", "ません", "ました", "ませんでした", "ましょう", "たい", "ない", "なかった", "う", "る"].includes(suf)) {
      const last = stem.slice(-1);
      const u = COL_TO_U.get(last);
      if (u) add(stem.slice(0, -1) + u);
    }
  }
  // potencial godan: 書ける → 書く; volitiva: 書こう → 書く
  const m = form.match(/^(.*)(.)(る|う)$/);
  if (m && COL_TO_U.has(m[2])) add(m[1] + COL_TO_U.get(m[2])!);
  // adjetivos な: 静かです / 静かじゃない / 静かでした
  const na = form.match(/^(.+?)(です|でした|じゃない|じゃありません|じゃなかった|だった|では|で|だ|な)$/);
  if (na) add(na[1]);
  return Array.from(out);
}

export const CLASS_INFO: { id: WordClass; name: string; description: string }[] = [
  { id: "godan", name: "Verbos godan (う)", description: "Cambian la última sílaba por las cinco vocales: 書く → 書かない / 書きます / 書け / 書こう." },
  { id: "ichidan", name: "Verbos ichidan (る)", description: "Terminan en -iru/-eru y quitan る: 食べる → 食べない / 食べます." },
  { id: "suru", name: "する (y nombre + する)", description: "Irregular: する → しない / します / して / した." },
  { id: "kuru", name: "来る", description: "Irregular: くる → こない / きます / きて / きた." },
  { id: "i-adj", name: "Adjetivos い", description: "Se conjugan solos: 高い → 高くない / 高かった. Ojo: いい → よくない." },
  { id: "na-adj", name: "Adjetivos な", description: "Se conjugan con だ/です: 静か → 静かじゃない / 静かでした." },
];
