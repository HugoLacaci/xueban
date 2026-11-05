/**
 * Validación de los bancos de ejercicios del chino (content/zh/exercises/*.json) para `npm run content:check`:
 *  - forma y tipos conocidos; ids únicos en todo el conjunto; `answer` dentro de `options`;
 *  - pinyin coherente con pinyin-pro (número de sílabas y sílabas base);
 *  - vocabulario dentro del nivel (HSK 1 + unidades anteriores) o declarado en `new`;
 *  - duplicados de enunciado entre ítems; coherencia enunciado/respuesta por tipo;
 *  - existencia del audio pregenerado (aviso, o error con --strict-audio);
 *  - cantidades mínimas por unidad (≥150 ítems, ≥15 tipos, ≥40 listening, ≥25 speaking) y por punto gramatical (≥25).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pinyin as pp } from "pinyin-pro";
import { hashString } from "../../lib/utils";

export interface BankIssue {
  level: "error" | "warn";
  where: string;
  msg: string;
}

const KNOWN_TYPES = new Set([
  "choose-meaning",
  "choose-character",
  "listen-choose",
  "listen-answer",
  "dictation-pinyin",
  "dictation-hanzi",
  "listen-tf",
  "dialogue-complete",
  "dialogue-order",
  "dialogue-who",
  "situation",
  "find-error",
  "transform",
  "build-question",
  "translate-bank",
  "translate-free",
  "cloze",
  "reading",
  "fill-blank",
  "order-words",
  "build-character",
  "radical-meaning",
  "speed-pinyin-hanzi",
  "speed-match",
  "tone-pair",
  "tone-sandhi",
  "speak-repeat",
  "speak-read",
  "speak-answer",
  "pinyin-input",
  "matching",
]);
const LISTENING = /^(listen-|dictation-)/;
const SPEAKING = /^speak-/;
const HAN = /[㐀-鿿]/;

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ü/g, "v")
    .replace(/[^a-z]/g, "");

/** Compara el pinyin escrito con el de pinyin-pro: mismo número de sílabas y mismas sílabas sin tono. */
function pinyinIssue(zh: string, py: string): string | null {
  const han = Array.from(zh)
    .filter((c) => HAN.test(c))
    .join("");
  if (!han || !py) return null;
  const auto = pp(han, { toneType: "none", type: "array", nonZh: "removed" }).map(strip).join("");
  const given = strip(py);
  if (auto === given) return null;
  // erhua: 儿 pegado a la sílaba anterior (nǎr) no cuenta como sílaba
  const erhua = (han.match(/(?<=[㐀-鿿])儿/g) ?? []).length;
  if (auto.replace(/er/g, "r") === given || auto.replace(/er$/, "r") === given) return null;
  // tolera polifonía: comprueba al menos el número de sílabas
  const nAuto = pp(han, { type: "array", nonZh: "removed" }).length - erhua;
  const nGiven = (py.match(/[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+(ng|n|r)?/gi) ?? []).length;
  if (nAuto !== nGiven) return `pinyin «${py}» tiene ${nGiven} sílabas y «${han}» tiene ${nAuto}`;
  return null;
}

interface Unit {
  id: string;
  order: number;
  lessons: { vocab: { hanzi: string }[]; steps: { type: string; lines?: { zh: string }[] }[] }[];
}

/** Hanzi enseñados hasta cada unidad (acumulado) + nombres propios. */
function vocabByUnit(root: string): Map<string, Set<string>> {
  const dir = path.join(root, "content", "zh", "course");
  const units = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Unit)
    .sort((a, b) => a.order - b.order);
  const seed = JSON.parse(
    readFileSync(path.join(root, "content", "zh", "seed", "hsk1_vocab.json"), "utf8"),
  ) as { words: { hanzi: string }[] };
  const names =
    "雨果安娜王明李老师大卫滴微信支付宝上海北京西班牙中国马德里巴塞罗那英美法德日本交通大学您托比小白";
  const acc = new Set<string>(Array.from(names));
  const out = new Map<string, Set<string>>();
  for (const u of units) {
    for (const l of u.lessons) {
      for (const v of l.vocab) for (const c of v.hanzi) acc.add(c);
      for (const s of l.steps)
        for (const line of s.lines ?? []) for (const c of line.zh) if (HAN.test(c)) acc.add(c);
    }
    out.set(u.id.startsWith("u0-") ? "u0" : u.id, new Set(acc));
  }
  // temario v2: acumulado por unidad nueva (e0, a1-u01…) a partir de content/zh/curriculum/lessons
  const v2dir = path.join(root, "content", "zh", "curriculum", "lessons");
  if (existsSync(v2dir)) {
    const rank = (id: string) => {
      const m = id.match(/^(e0|a1|a2|b1)-(?:u(\d+)-l(\d+)|(\d+|cp))$/);
      if (!m) return 1e9;
      const st = { e0: 0, a1: 1, a2: 2, b1: 3 }[m[1] as "e0"] * 1e6;
      return m[4]
        ? st + (m[4] === "cp" ? 99 : Number(m[4]))
        : st + Number(m[2]) * 100 + Number(m[3]);
    };
    const lessons = readdirSync(v2dir)
      .filter((x) => x.endsWith(".json"))
      .map(
        (x) =>
          JSON.parse(readFileSync(path.join(v2dir, x), "utf8")) as {
            id: string;
            vocab: { hanzi: string }[];
          },
      )
      .sort((a, b) => rank(a.id) - rank(b.id));
    const acc2 = new Set<string>(Array.from(names));
    for (const l of lessons) {
      for (const v of l.vocab) for (const c of v.hanzi) acc2.add(c);
      out.set(l.id.startsWith("e0-") ? "e0" : l.id.replace(/-l\d+$/, ""), new Set(acc2));
    }
  }
  const all = new Set(acc);
  for (const w of seed.words) for (const c of w.hanzi) all.add(c);
  out.set("all", all);
  return out;
}

export function checkBanks(
  root: string,
  opts: { strictAudio?: boolean } = {},
): { issues: BankIssue[]; summary: string } {
  const issues: BankIssue[] = [];
  const dir = path.join(root, "content", "zh", "exercises");
  if (!existsSync(dir))
    return {
      issues: [{ level: "warn", where: "zh/exercises", msg: "no hay bancos de ejercicios" }],
      summary: "sin bancos",
    };
  const vocab = vocabByUnit(root);
  const audioDir = path.join(root, "public", "audio");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const allIds = new Set<string>();
  let total = 0;
  let missingAudio = 0;
  const unitsSeen = new Set<string>();
  const grammarSeen = new Set<string>();
  const texts = new Map<string, string>();

  for (const f of files) {
    const where = `zh/exercises/${f}`;
    let bank: { id: string; unitId?: string; grammarId?: string; items: Record<string, unknown>[] };
    try {
      bank = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
    } catch (e) {
      issues.push({ level: "error", where, msg: `JSON inválido: ${(e as Error).message}` });
      continue;
    }
    const items = bank.items ?? [];
    const types = new Map<string, number>();
    const known =
      vocab.get(
        bank.unitId
          ? bank.unitId === "u0" || bank.unitId.startsWith("u0-")
            ? "u0"
            : bank.unitId
          : "all",
      ) ?? vocab.get("all")!;
    for (const it of items) {
      const id = String(it.id);
      const w = `${where}#${id}`;
      const type = String(it.type);
      types.set(type, (types.get(type) ?? 0) + 1);
      if (!KNOWN_TYPES.has(type))
        issues.push({ level: "error", where: w, msg: `tipo desconocido: ${type}` });
      if (allIds.has(id)) issues.push({ level: "error", where: w, msg: "id duplicado" });
      allIds.add(id);
      if (!it.explain) issues.push({ level: "warn", where: w, msg: "sin explain" });
      // respuesta coherente
      const options = it.options as string[] | undefined;
      if (
        Array.isArray(options) &&
        typeof it.answer === "number" &&
        (it.answer < 0 || it.answer >= options.length)
      )
        issues.push({ level: "error", where: w, msg: "answer fuera de rango" });
      if (type === "fill-blank" && Array.isArray(options) && !options.includes(String(it.answer)))
        issues.push({
          level: "error",
          where: w,
          msg: "fill-blank: la respuesta no está en las opciones",
        });
      if (type === "fill-blank" && !String(it.zh ?? "").includes("＿"))
        issues.push({ level: "error", where: w, msg: "fill-blank sin hueco ＿" });
      if (type === "cloze") {
        const blanks = (it.blanks as { answer: string; options: string[] }[]) ?? [];
        const holes = (String(it.text ?? "").match(/＿+/g) ?? []).length;
        if (holes !== blanks.length)
          issues.push({
            level: "error",
            where: w,
            msg: `cloze: ${holes} huecos y ${blanks.length} blanks`,
          });
        for (const b of blanks)
          if (!b.options.includes(b.answer))
            issues.push({
              level: "error",
              where: w,
              msg: `cloze: «${b.answer}» no está en sus opciones`,
            });
      }
      if (type === "find-error") {
        const tokens = (it.tokens as string[]) ?? [];
        const wi = Number(it.wrongIndex);
        if (wi < 0 || wi >= tokens.length)
          issues.push({ level: "error", where: w, msg: "find-error: wrongIndex fuera de rango" });
        if (
          tokens.join("").replace(/[，。！？]/g, "") !==
          String(it.zh ?? "").replace(/[，。！？\s]/g, "")
        )
          issues.push({
            level: "error",
            where: w,
            msg: "find-error: los tokens no reconstruyen zh",
          });
        if (String(it.correct) === String(it.zh))
          issues.push({ level: "error", where: w, msg: "find-error: correct es igual a zh" });
      }
      if (type === "dialogue-complete") {
        const lines = (it.lines as { zh: string }[]) ?? [];
        const m = Number(it.missing);
        if (!lines[m])
          issues.push({
            level: "error",
            where: w,
            msg: "dialogue-complete: missing fuera de rango",
          });
        else if (
          Array.isArray(options) &&
          typeof it.answer === "number" &&
          options[it.answer] !== lines[m].zh
        )
          issues.push({
            level: "error",
            where: w,
            msg: "dialogue-complete: la opción correcta no coincide con la línea que falta",
          });
      }
      if (type === "dialogue-who") {
        const lines = (it.lines as { speaker: string }[]) ?? [];
        const a = Number(it.ask);
        if (
          lines[a] &&
          Array.isArray(options) &&
          typeof it.answer === "number" &&
          options[it.answer] !== lines[a].speaker
        )
          issues.push({
            level: "error",
            where: w,
            msg: "dialogue-who: la opción correcta no es el hablante",
          });
      }
      if (type === "translate-bank") {
        const tiles = (it.tiles as string[]) ?? [];
        const zh = String(it.zh ?? "").replace(/[，。！？、]/g, "");
        let rest = zh;
        for (const t of tiles.slice().sort((a, b) => b.length - a.length))
          rest = rest.split(t).join("");
        if (rest.length)
          issues.push({
            level: "error",
            where: w,
            msg: `translate-bank: faltan fichas para «${rest}»`,
          });
      }
      if (type === "transform" && String(it.answer) === String(it.zh))
        issues.push({ level: "error", where: w, msg: "transform: answer igual a zh" });
      if (type === "tone-pair" && Array.isArray(options) && !options.includes(String(it.pattern)))
        issues.push({
          level: "error",
          where: w,
          msg: "tone-pair: pattern no está en las opciones",
        });
      // pinyin
      const pairs: [string, string][] = [];
      if (typeof it.zh === "string" && typeof it.py === "string")
        pairs.push([
          type === "fill-blank" && typeof it.answer === "string"
            ? it.zh.replace(/＿+/, it.answer)
            : it.zh,
          it.py,
        ]);
      if (typeof it.question === "string" && typeof it.questionPy === "string")
        pairs.push([it.question, it.questionPy]);
      if (typeof it.sample === "string" && typeof it.samplePy === "string")
        pairs.push([it.sample, it.samplePy]);
      for (const l of (it.lines as { zh: string; py?: string }[]) ?? [])
        if (l.py) pairs.push([l.zh, l.py]);
      for (const p of (it.pairs as { zh: string; py?: string }[]) ?? [])
        if (p.py) pairs.push([p.zh, p.py]);
      for (const [zh, py] of pairs) {
        const pi = pinyinIssue(zh, py);
        if (pi) issues.push({ level: "warn", where: w, msg: pi });
      }
      // vocabulario dentro del nivel
      const declared = new Set<string>(Array.from(((it.new as string[]) ?? []).join("")));
      const zhTexts: string[] = [];
      for (const k of ["zh", "question", "sample", "correct", "text", "situation"])
        if (typeof it[k] === "string") zhTexts.push(it[k] as string);
      for (const k of [
        "options",
        "answers",
        "tiles",
        "tokens",
        "examples",
        "keywords",
        "alternatives",
      ])
        if (Array.isArray(it[k]))
          zhTexts.push(...(it[k] as unknown[]).filter((x): x is string => typeof x === "string"));
      if (typeof it.answer === "string") zhTexts.push(it.answer);
      for (const l of (it.lines as { zh: string }[]) ?? []) zhTexts.push(l.zh);
      for (const p of (it.pairs as { zh: string }[]) ?? []) zhTexts.push(p.zh);
      const unknown = new Set<string>();
      for (const t of zhTexts)
        for (const c of t) if (HAN.test(c) && !known.has(c) && !declared.has(c)) unknown.add(c);
      if (unknown.size)
        issues.push({
          level: "warn",
          where: w,
          msg: `caracteres fuera del nivel/unidad no declarados en new: ${Array.from(unknown).join(" ")}`,
        });
      // duplicados de enunciado
      const stem = String(it.zh ?? it.es ?? it.question ?? it.text ?? "");
      const key = `${type}|${stem}`;
      if (stem.length > 3 && texts.has(key))
        issues.push({
          level: "warn",
          where: w,
          msg: `enunciado repetido (igual que ${texts.get(key)})`,
        });
      else texts.set(key, id);
      // audio
      const audioTexts: string[] = [];
      if (
        LISTENING.test(type) ||
        type === "tone-pair" ||
        type === "tone-sandhi" ||
        SPEAKING.test(type)
      ) {
        for (const k of ["zh", "question", "sample", "text"])
          if (typeof it[k] === "string" && HAN.test(it[k] as string))
            audioTexts.push(it[k] as string);
        for (const l of (it.lines as { zh: string }[]) ?? []) audioTexts.push(l.zh);
      }
      for (const t of audioTexts) {
        const voice = (it.voice as string) ?? "f";
        const file = path.join(
          audioDir,
          `${hashString(t.trim()).toString(16)}${voice === "f" ? "" : `-${voice}`}.mp3`,
        );
        const fallback = path.join(audioDir, `${hashString(t.trim()).toString(16)}.mp3`);
        if (!existsSync(file) && !existsSync(fallback)) missingAudio++;
      }
    }
    total += items.length;
    const n = items.length;
    const listening = items.filter((i) => LISTENING.test(String(i.type))).length;
    const speaking = items.filter((i) => SPEAKING.test(String(i.type))).length;
    if (bank.unitId) {
      unitsSeen.add(bank.unitId);
      if (n < 150)
        issues.push({ level: "error", where, msg: `unidad con ${n} ítems (mínimo 150)` });
      if (types.size < 15)
        issues.push({ level: "error", where, msg: `unidad con ${types.size} tipos (mínimo 15)` });
      if (listening < 40)
        issues.push({
          level: "error",
          where,
          msg: `unidad con ${listening} ítems de listening (mínimo 40)`,
        });
      if (speaking < 25)
        issues.push({
          level: "error",
          where,
          msg: `unidad con ${speaking} ítems de speaking (mínimo 25)`,
        });
    } else if (bank.grammarId) {
      grammarSeen.add(bank.grammarId);
      if (n < 25)
        issues.push({ level: "error", where, msg: `punto gramatical con ${n} ítems (mínimo 25)` });
    }
  }
  // cobertura
  const units = [
    "u0",
    "u01",
    "u02",
    "u03",
    "u04",
    "u05",
    "u06",
    "u07",
    "u08",
    "u09",
    "u10",
    "u11",
    "u12",
    "u13",
    "u14",
  ];
  for (const u of units)
    if (!unitsSeen.has(u) && !unitsSeen.has(`${u}-pronunciacion`))
      issues.push({
        level: "error",
        where: "zh/exercises",
        msg: `falta el banco de la unidad ${u}`,
      });
  const grammar = JSON.parse(
    readFileSync(path.join(root, "content", "zh", "grammar.json"), "utf8"),
  ) as { id: string }[];
  for (const g of grammar)
    if (!grammarSeen.has(g.id))
      issues.push({
        level: "error",
        where: "zh/exercises",
        msg: `falta el banco del punto gramatical ${g.id}`,
      });
  if (missingAudio)
    issues.push({
      level: opts.strictAudio ? "error" : "warn",
      where: "zh/exercises",
      msg: `${missingAudio} audios de listening/speaking sin pregenerar (npm run audio:build -- --banks)`,
    });
  return {
    issues,
    summary: `${files.length} bancos · ${total} ítems · ${unitsSeen.size} unidades (${units.filter((u) => unitsSeen.has(u)).length}/15 del temario antiguo) · ${grammarSeen.size}/${grammar.length} puntos gramaticales · ${missingAudio} audios ausentes`,
  };
}
