/**
 * Léxico de respaldo para segmentar cuando el diccionario no está cargado (tests, primera carga):
 * las 300 palabras de la semilla HSK 1 + palabras funcionales frecuentes. En la app se usa el léxico del diccionario.
 */
import { lexiconFromSet, type Lexicon } from "@/lib/segment";
import seed from "@/content/zh/seed/hsk1_vocab.json";

const EXTRA = ["一点儿", "有点儿", "哪儿", "这儿", "那儿", "哪里", "这里", "那里", "一下", "一起", "为什么", "什么时候", "怎么样", "多少", "没有", "不是", "可以", "应该", "喜欢", "知道", "认识", "觉得", "时候", "现在", "今天", "明天", "昨天", "星期", "北京", "上海", "中国", "西班牙", "马德里", "汉语", "中文", "英语", "名字", "朋友", "老师", "学生", "学校", "医院", "饭馆", "商店", "公司", "图书馆", "电影", "电脑", "手机", "咖啡", "苹果", "米饭", "工作", "学习", "睡觉", "起床", "打电话", "游泳", "跑步", "唱歌", "看见", "听懂", "太", "了", "吗", "呢", "吧", "的", "也", "都", "很", "不", "没", "和", "在", "是", "有", "去", "来", "吃", "喝", "看", "买", "想", "要", "会", "能"];

let cached: Lexicon | undefined;
export function defaultLexicon(): Lexicon {
  if (!cached) {
    const set = new Set<string>(EXTRA);
    for (const w of (seed as { words: { hanzi: string }[] }).words) set.add(w.hanzi);
    cached = lexiconFromSet(set);
  }
  return cached;
}
