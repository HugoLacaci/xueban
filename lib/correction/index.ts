/**
 * Motor de corrección por capas para «traducir al chino» (cuaderno de ejercicios, ejercicios incrustados, tutor):
 *  1. normalización (normalize.ts) · 2. alineación con referencias (align.ts) · 3. linter gramatical (linter.ts)
 *  4. tutor IA opcional (lib/tutor/corrector.ts): sus errores se añaden; si contradice una regla verificada, prevalece la regla.
 * Sin referencia y sin IA solo se ejecuta el linter y el informe es «parcial» (no se inventa la respuesta).
 */
import type { Lexicon } from "@/lib/segment";
import { wordPinyin } from "@/lib/languages/zh/pinyin/convert";
import { alignHanzi, bestReference, bestReferencePinyin, pinyinReferenceSyllables } from "./align";
import { pinyinToHanzi } from "./pinyin-hanzi";
import { numberedToMarked } from "@/lib/languages/zh/pinyin/tones";
import { lint } from "./linter";
import { loadT2S, normalizeAnswer, canonicalize, detectKind, parsePinyin, stripAll, toSimplified } from "./normalize";
import type { Alternative, CorrectionError, CorrectionInput, CorrectionReport } from "./types";

export * from "./types";
export { lint, RULES, ruleById } from "./linter";
export { normalizeAnswer, parsePinyin, canonicalize } from "./normalize";
export { alignHanzi, alignPinyin, needlemanWunsch } from "./align";

export interface CorrectOptions {
  lexicon?: Lexicon;
  /** Capa 4: función del tutor (inyectada para poder simularla en tests) */
  tutor?: (input: CorrectionInput, partial: CorrectionReport) => Promise<Partial<CorrectionReport> | null>;
}

/** Pinyin de una frase en hanzi con espacios entre sílabas y mayúscula inicial. */
export function sentencePinyin(zh: string): string {
  const p = wordPinyin(stripAll(zh));
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}

const PENALTY: Record<string, number> = { missing: 15, extra: 10, order: 18, char: 12, word: 15, tone: 6, pinyin: 10, grammar: 15 };
function scoreFrom(similarity: number, errors: CorrectionError[]): number {
  let s = 100;
  let order = false;
  for (const e of errors) {
    if (e.type === "order" && e.severity === "error") {
      if (order) continue;
      order = true;
    }
    s -= e.severity === "info" ? 0 : e.severity === "warn" ? 4 : (PENALTY[e.type] ?? 10);
  }
  if (similarity < 0.34) s = Math.min(s, 30);
  return Math.max(0, Math.min(100, s));
}

/** Alternativas: las demás referencias etiquetadas por registro (heurística sencilla). */
function alternativesFrom(refs: string[], chosen: string): Alternative[] {
  return refs
    .filter((r) => canonicalize(stripAll(r)) !== canonicalize(stripAll(chosen)))
    .slice(0, 5)
    .map((zh) => (detectKind(zh) === "pinyin" ? { zh: numberedToMarked(zh), py: "", register: "neutral" as const } : { zh, py: sentencePinyin(zh), register: /您|请|可以/.test(zh) ? "formal" : /吧|啊|呗|一下/.test(zh) ? "colloquial" : "neutral" }));
}

/** Práctica extra: 3 frases nuevas con la misma estructura (del banco interno por regla, si existe). */
const EXTRA: Record<string, { es: string; zh: string }[]> = {
  "time-before-verb": [
    { es: "Mañana voy a la escuela.", zh: "我明天去学校。" },
    { es: "Hoy ella no trabaja.", zh: "她今天不工作。" },
    { es: "Por la noche vemos una película.", zh: "我们晚上看电影。" },
  ],
  "zai-place-before-verb": [
    { es: "Como en el restaurante.", zh: "我在饭馆吃饭。" },
    { es: "Él estudia en la biblioteca.", zh: "他在图书馆学习。" },
    { es: "Trabajamos en Shanghái.", zh: "我们在上海工作。" },
  ],
  "shi-adjective": [
    { es: "Estoy muy ocupado.", zh: "我很忙。" },
    { es: "Hoy hace frío.", zh: "今天很冷。" },
    { es: "Mi profesor está muy contento.", zh: "我的老师很高兴。" },
  ],
  "missing-hen": [
    { es: "Estoy cansado.", zh: "我很累。" },
    { es: "Este libro es caro.", zh: "这本书很贵。" },
    { es: "Ella es guapa.", zh: "她很漂亮。" },
  ],
  "bu-mei-past": [
    { es: "No fui a la escuela ayer.", zh: "我昨天没去学校。" },
    { es: "No tengo dinero.", zh: "我没有钱。" },
    { es: "Nunca he estado en China.", zh: "我没去过中国。" },
  ],
  "er-liang": [
    { es: "Tengo dos hermanos.", zh: "我有两个哥哥。" },
    { es: "Quiero dos tés.", zh: "我要两杯茶。" },
    { es: "Son las dos.", zh: "现在两点。" },
  ],
  "missing-measure": [
    { es: "Tengo tres amigos chinos.", zh: "我有三个中国朋友。" },
    { es: "Compro un libro.", zh: "我买一本书。" },
    { es: "Esa persona es mi profesor.", zh: "那个人是我的老师。" },
  ],
  "ma-with-question-word": [
    { es: "¿Qué quieres beber?", zh: "你想喝什么？" },
    { es: "¿Dónde vives?", zh: "你住在哪儿？" },
    { es: "¿Cuántos años tienes?", zh: "你几岁？" },
  ],
  "le-with-bu": [
    { es: "No comí.", zh: "我没吃饭。" },
    { es: "Ya no voy.", zh: "我不去了。" },
    { es: "No vino ayer.", zh: "他昨天没来。" },
  ],
  "ye-dou-position": [
    { es: "Yo también soy estudiante.", zh: "我也是学生。" },
    { es: "Todos somos españoles.", zh: "我们都是西班牙人。" },
    { es: "Ellos también están todos ocupados.", zh: "他们也都很忙。" },
  ],
  "tai-le": [
    { es: "¡Qué caro!", zh: "太贵了！" },
    { es: "No es muy difícil.", zh: "不太难。" },
    { es: "¡Qué bien!", zh: "太好了！" },
  ],
  "modal-hui-neng": [
    { es: "Sé hablar un poco de chino.", zh: "我会说一点儿中文。" },
    { es: "¿Puedo entrar?", zh: "我可以进来吗？" },
    { es: "Hoy no puedo ir.", zh: "我今天不能去。" },
  ],
  "zai-shi-place": [
    { es: "Estoy en casa.", zh: "我在家。" },
    { es: "Mi madre está en Madrid.", zh: "我妈妈在马德里。" },
    { es: "¿Dónde está el profesor?", zh: "老师在哪儿？" },
  ],
};

export function extraPracticeFor(ruleIds: string[], n = 3): { es: string; zh: string; py: string }[] {
  const out: { es: string; zh: string; py: string }[] = [];
  for (const id of ruleIds) for (const x of EXTRA[id] ?? []) if (!out.some((o) => o.zh === x.zh)) out.push({ ...x, py: sentencePinyin(x.zh) });
  return out.slice(0, n);
}

/** Propone hanzi para una respuesta en pinyin a partir de la referencia más cercana (sílaba a sílaba). */
function hanziFromPinyinAlignment(ref: string): string {
  return stripAll(ref);
}

export async function correct(input: CorrectionInput, opts: CorrectOptions = {}): Promise<CorrectionReport> {
  await loadT2S();
  // las soluciones en caracteres tradicionales se comparan en simplificado (喜歡 = 喜欢)
  const refs = (input.references ?? []).map((r) => r.trim()).filter(Boolean).map((r) => (detectKind(r) === "pinyin" ? r : toSimplified(r)));
  const norm = normalizeAnswer(input.answer);
  const mode = input.mode ?? (norm.kind === "pinyin" ? "pinyin" : "hanzi");
  const base: CorrectionReport = {
    verdict: "partial",
    score: 0,
    answer: norm.text,
    alignment: [],
    errors: [],
    alternatives: [],
    extraPractice: [],
    layers: { normalize: true, align: false, linter: false, tutor: false },
    mode,
  };
  if (norm.kind === "empty") return { ...base, verdict: "wrong", errors: [{ type: "missing", explanation: "No has escrito nada.", severity: "error", source: "align" }] };

  let hanzi = norm.hanzi ?? "";
  // referencias del profesor escritas en pinyin (con números o tildes)
  const pinyinRefs = refs.filter((r) => detectKind(r) === "pinyin");
  const hanziRefs = refs.filter((r) => detectKind(r) !== "pinyin");
  /** Muestra una referencia en pinyin con tildes (nunca con números) y su versión probable en hanzi para el audio. */
  let chosenRef: string | undefined;
  const hanziCache = new Map<string, string | null>();
  const refHanzi = (ref: string) => {
    if (!hanziCache.has(ref)) hanziCache.set(ref, pinyinToHanzi(pinyinReferenceSyllables(ref)));
    return hanziCache.get(ref) ?? null;
  };
  const setPinyinCorrected = (ref: string) => {
    chosenRef = ref;
    base.corrected = numberedToMarked(ref.replace(/v/g, "ü"));
    base.correctedPy = undefined;
    base.correctedHanzi = refHanzi(ref) ?? undefined;
  };
  // ---- capa 2: alineación
  if (refs.length) {
    base.layers.align = true;
    // respuesta en hanzi y solución solo en pinyin: se compara por sílabas a partir del pinyin de la respuesta
    if (norm.kind !== "pinyin" && !hanziRefs.length && pinyinRefs.length) {
      const py = parsePinyin(sentencePinyin(hanzi));
      const syl = py.syllables.map((s) => ({ ...s, tone: s.tone || 5 }));
      const a = bestReferencePinyin(syl, pinyinRefs, opts.lexicon, refHanzi);
      if (a) {
        base.alignment = a.tokens;
        base.errors.push(...a.errors);
        setPinyinCorrected(a.reference);
        base.answerPy = sentencePinyin(hanzi);
        base.score = scoreFrom(a.similarity, base.errors);
      }
    } else if (norm.kind === "pinyin" && norm.syllables) {
      // en una respuesta con tonos, la sílaba sin tono es tono neutro (de, ma, le…)
      const syl = norm.hasTones ? norm.syllables.map((s) => ({ ...s, tone: s.tone || 5 })) : norm.syllables;
      const a = bestReferencePinyin(syl, refs, opts.lexicon, refHanzi);
      if (a) {
        const refPinyin = detectKind(a.reference) === "pinyin";
        base.alignment = a.tokens;
        base.errors.push(...a.errors);
        if (refPinyin) setPinyinCorrected(a.reference);
        else {
          base.corrected = a.reference;
          base.correctedPy = sentencePinyin(a.reference);
        }
        base.answerPy = norm.text;
        // con referencia en pinyin no hay hanzi fiables sobre los que pasar el linter
        hanzi = !refPinyin && a.similarity >= 0.6 ? hanziFromPinyinAlignment(a.reference) : "";
        base.answer = hanzi || norm.text;
        if (!norm.hasTones) base.errors.push({ type: "tone", explanation: "Has escrito el pinyin sin tonos: se corrige solo la sílaba. Añade números (ni3) o tildes para practicar los tonos.", severity: "warn", source: "align" });
        base.score = scoreFrom(a.similarity, base.errors);
      }
    } else {
      const a = bestReference(hanzi, hanziRefs.length ? hanziRefs : refs, opts.lexicon);
      if (a) {
        base.alignment = a.tokens;
        base.errors.push(...a.errors);
        base.corrected = a.reference;
        base.correctedPy = sentencePinyin(a.reference);
        base.answerPy = sentencePinyin(hanzi);
        base.score = scoreFrom(a.similarity, base.errors);
      }
    }
    base.alternatives = alternativesFrom(refs, chosenRef ?? base.corrected ?? refs[0]);
  } else if (norm.kind !== "pinyin") {
    base.answerPy = sentencePinyin(hanzi);
  } else if (norm.syllables) {
    const syl = norm.hasTones ? norm.syllables.map((s) => ({ base: s.base, tone: s.tone || 5 })) : norm.syllables.map((s) => ({ base: s.base, tone: 0 }));
    const probable = pinyinToHanzi(syl);
    base.answerPy = norm.text;
    if (probable) {
      hanzi = probable;
      base.answer = probable;
      base.errors.push({ type: "word", explanation: `Sin solución del profesor: interpreto tu pinyin como «${probable}» para revisar la gramática. Si querías otros caracteres, escríbelos en hanzi.`, severity: "info", source: "align" });
    }
  }

  // ---- capa 3: linter (sobre hanzi; si la respuesta fue en pinyin, sobre los hanzi propuestos si los hay)
  if (hanzi) {
    base.layers.linter = true;
    const issues = lint(hanzi, opts.lexicon);
    for (const i of issues) {
      // no duplicar: si la alineación ya marcó la zona (p. ej. orden) se añade como explicación de regla
      base.errors.push({ ...i });
    }
    if (refs.length) base.score = Math.max(0, base.score - issues.filter((i) => i.severity === "error").length * 10);
    if (!refs.length) {
      const fix = issues.find((i) => i.fix)?.fix;
      if (fix) {
        base.corrected = fix;
        base.correctedPy = sentencePinyin(fix);
      }
      base.score = Math.max(0, 100 - issues.reduce((a, i) => a + (i.severity === "warn" ? 8 : 20), 0));
    }
  }

  // ---- capa 4: tutor (opcional)
  if (input.useTutor !== false && opts.tutor) {
    try {
      const t = await opts.tutor(input, base);
      if (t) {
        base.layers.tutor = true;
        const ruleIds = new Set(base.errors.filter((e) => e.source === "linter").map((e) => e.ruleId));
        const disagreements: string[] = [];
        for (const e of t.errors ?? []) {
          // el tutor no puede «desmarcar» una regla verificada; sus errores se añaden si no duplican
          if (e.ruleId && ruleIds.has(e.ruleId)) continue;
          base.errors.push({ ...e, source: "tutor", severity: e.severity ?? "error" });
        }
        if (t.corrected && base.corrected && refs.length && canonicalize(stripAll(t.corrected)) !== canonicalize(stripAll(base.corrected)) && !refs.some((r) => canonicalize(stripAll(r)) === canonicalize(stripAll(t.corrected!)))) {
          disagreements.push(`El tutor propone «${t.corrected}», pero la referencia del profesor es «${base.corrected}»: prevalece la referencia.`);
          base.alternatives.push({ zh: t.corrected, py: sentencePinyin(t.corrected), register: "neutral", note: "propuesta del tutor" });
        } else if (t.corrected && !base.corrected) {
          base.corrected = t.corrected;
          base.correctedPy = sentencePinyin(t.corrected);
        }
        if (t.alternatives?.length) base.alternatives.push(...t.alternatives.filter((a) => !base.alternatives.some((b) => b.zh === a.zh)).map((a) => ({ ...a, py: sentencePinyin(a.zh) })));
        if (t.tip) base.tip = t.tip;
        if (t.extraPractice?.length) base.extraPractice = t.extraPractice.map((x) => ({ ...x, py: sentencePinyin(x.zh) }));
        if (typeof t.score === "number" && refs.length === 0 && hanzi) base.score = Math.round((base.score + t.score) / 2);
        if (disagreements.length) base.disagreements = disagreements;
        if (t.verdict && !refs.length) base.verdict = t.verdict;
      }
    } catch {
      /* el tutor es opcional: si falla, se sigue con las reglas */
    }
  }

  // ---- veredicto
  const hard = base.errors.filter((e) => e.severity === "error");
  const warns = base.errors.filter((e) => e.severity === "warn");
  if (refs.length) {
    const grammar = hard.some((e) => e.source === "linter" || e.type === "grammar" || e.type === "order");
    const onlyTones = hard.length > 0 && hard.every((e) => e.type === "tone");
    if (!hard.length) base.verdict = warns.length ? "improvable" : "correct";
    else if (grammar) base.verdict = "wrong";
    else if (onlyTones) base.verdict = hard.length <= 2 ? "improvable" : "wrong";
    else base.verdict = base.score >= 85 && hard.length === 1 ? "improvable" : "wrong";
  } else if (base.layers.tutor && base.verdict !== "partial") {
    /* el tutor decidió */
  } else if (hanzi) {
    base.verdict = hard.length ? "wrong" : warns.length ? "improvable" : "partial";
  }
  if (!base.extraPractice.length) base.extraPractice = extraPracticeFor(base.errors.map((e) => e.ruleId).filter((x): x is string => Boolean(x)));
  if (!base.tip) base.tip = base.errors.find((e) => e.tip)?.tip;
  // ordena errores: primero alineación (en orden de aparición), luego linter
  base.errors.sort((a, b) => (a.span?.from ?? 99) - (b.span?.from ?? 99));
  return base;
}
