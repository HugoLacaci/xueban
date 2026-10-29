import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { InkDivider } from "@/components/ornament";
import { PackCredits } from "@/components/layout/pack-credits";
import { Mixed } from "@/components/target/mixed";

export const metadata: Metadata = { title: "Créditos y licencias" };

const DATA = [
  { name: "CC-CEDICT", use: "Diccionario chino–inglés (≈125 000 entradas)", license: "CC BY-SA 4.0", url: "https://www.mdbg.net/chinese/dictionary?page=cc-cedict" },
  { name: "complete-hsk-vocabulary (drkameleon)", use: "Listas HSK 2.0 y 3.0, frecuencia, radical, POS, clasificadores", license: "MIT", url: "https://github.com/drkameleon/complete-hsk-vocabulary" },
  { name: "Make Me a Hanzi (skishore)", use: "Descomposición, radical, etimología y número de trazos de 9 574 caracteres", license: "Arphic Public License / LGPL", url: "https://github.com/skishore/makemeahanzi" },
  { name: "hanzi-writer y hanzi-writer-data", use: "Animación, quiz de escritura y datos de trazos (derivados de Make Me a Hanzi / Arphic)", license: "MIT (código) / Arphic PL (datos)", url: "https://hanziwriter.org" },
  { name: "Tatoeba (pares cmn–spa)", use: "Frases de ejemplo chino–español (11 518 pares)", license: "CC BY 2.0 FR", url: "https://tatoeba.org" },
  { name: "jieba (dict.txt)", use: "Frecuencia de palabras para ordenar el diccionario", license: "MIT", url: "https://github.com/fxsjy/jieba" },
  { name: "Chinese Grammar Wiki (AllSet Learning)", use: "Estructura de los puntos de gramática (las explicaciones son propias, en español, con enlace a la fuente)", license: "CC BY-NC-SA 4.0 (solo enlazada)", url: "https://resources.allsetlearning.com/chinese/grammar/" },
  { name: "汉考国际 · 新版HSK（1-6级）考试结构与样题示例", use: "Estructura del simulacro HSK 1", license: "Documento público (solo estructura)", url: "https://www.chinesetest.cn" },
  { name: "Radicales Kangxi (Unicode / Unihan)", use: "Lista de los 214 radicales; significados en español propios", license: "Unicode License", url: "https://www.unicode.org/charts/PDF/U2F00.pdf" },
  { name: "hsk1_vocab.json (Hugo)", use: "302 palabras HSK 1 con traducción al español, categoría y frase de ejemplo", license: "Propio", url: "" },
];

const LIBS = [
  ["Next.js, React, TypeScript, Tailwind CSS", "MIT"],
  ["Radix UI, cmdk, lucide-react, Motion", "MIT / ISC"],
  ["Dexie.js (IndexedDB)", "Apache 2.0"],
  ["ts-fsrs (algoritmo FSRS-6)", "MIT"],
  ["pinyin-pro", "MIT"],
  ["opencc-js (simplificado ⇄ tradicional)", "MIT (datos OpenCC: Apache 2.0)"],
  ["pitchy (detección de tono F0)", "MIT"],
  ["sql.js + JSZip (exportación .apkg)", "MIT"],
  ["youtubei.js, yt-dlp (transcripciones de YouTube)", "MIT / Unlicense"],
  ["msedge-tts (audio pregenerado, opcional)", "MIT"],
  ["react-markdown, remark-gfm", "MIT"],
  ["AnkiConnect (complemento de Anki 2055492159)", "GPLv3 (externo)"],
  ["wanakana (rōmaji ⇄ kana)", "MIT"],
  ["kuromoji.js (@sglkc/kuromoji)", "Apache 2.0"],
  ["es-hangul (Toss)", "MIT"],
  ["svg-path-properties (medianas de trazos KanjiVG)", "ISC"],
  ["Fontsource (empaquetado de fuentes)", "MIT (fuentes: OFL)"],
];

const FONTS = [
  { name: "Inter", role: "Interfaz latina, pinyin y números tabulares", author: "Rasmus Andersson", license: "SIL OFL 1.1" },
  { name: "Fraunces", role: "Títulos editoriales en español", author: "Undercase Type", license: "SIL OFL 1.1" },
  { name: "Noto Sans SC", role: "Chino de interfaz", author: "Google / Adobe", license: "SIL OFL 1.1" },
  { name: "Noto Serif SC (宋体)", role: "Carácter protagonista en tarjetas y fichas", author: "Google / Adobe", license: "SIL OFL 1.1" },
  { name: "LXGW WenKai Lite (霞鹜文楷)", role: "Caligrafía 楷书, citas y «fuente de estudio»", author: "LXGW (sobre Klee One de Fontworks)", license: "SIL OFL 1.1" },
  { name: "Noto Sans JP / Noto Serif JP", role: "Japonés de interfaz y de imprenta (明朝)", author: "Google / Adobe", license: "SIL OFL 1.1" },
  { name: "Klee One", role: "Japonés de libro de texto (letra de cuaderno)", author: "Fontworks", license: "SIL OFL 1.1" },
  { name: "Zen Old Mincho", role: "Títulos y sellos en japonés", author: "Yoshimichi Ohira", license: "SIL OFL 1.1" },
  { name: "Noto Sans KR / Noto Serif KR", role: "Coreano de interfaz y de imprenta", author: "Google / Adobe", license: "SIL OFL 1.1" },
  { name: "Gowun Batang / Gowun Dodum", role: "Títulos y acento manuscrito en coreano", author: "Yanghee Ryu", license: "SIL OFL 1.1" },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Créditos y licencias" zh="致谢 · 謝辞 · 감사의 말" subtitle="Software libre y gratuito, construido sobre datos abiertos para chino, japonés y coreano. Gracias a todas estas personas y proyectos." />

      <InkDivider />
      <section className="card-paper px-5 py-4" aria-labelledby="cr-datos">
        <h2 id="cr-datos" className="font-serif-es text-xl font-semibold tracking-tight text-ink">
          Datos · Chino <span lang="zh-CN" className="text-base text-ink-faint">中文</span>
        </h2>
        <ul className="mt-2 divide-y divide-line">
          {DATA.map((d) => (
            <li key={d.name} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                      <Mixed>{d.name}</Mixed> <ExternalLink className="size-3 text-ink-faint" />
                    </a>
                  ) : (
                    d.name
                  )}
                </p>
                <p className="text-ink-faint"><Mixed>{d.use}</Mixed></p>
              </div>
              <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft"><Mixed>{d.license}</Mixed></span>
            </li>
          ))}
        </ul>
      </section>

      <PackCredits langs={["ja", "ko"]} />

      <InkDivider className="mt-6" />
      <section className="card-paper px-5 py-4" aria-labelledby="cr-fuentes">
        <h2 id="cr-fuentes" className="font-serif-es text-xl font-semibold tracking-tight text-ink">
          Tipografías
        </h2>
        <p className="mt-1 text-sm text-ink-faint">Dos familias latinas y varias para cada idioma (chino, japonés y coreano). Todas con licencia libre.</p>
        <ul className="mt-2 divide-y divide-line">
          {FONTS.map((f) => (
            <li key={f.name} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-ink"><Mixed>{f.name}</Mixed></p>
                <p className="text-ink-faint">
                  <Mixed>{f.role}</Mixed> · <Mixed>{f.author}</Mixed>
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft"><Mixed>{f.license}</Mixed></span>
            </li>
          ))}
        </ul>
      </section>

      <InkDivider className="mt-6" />
      <section className="card-paper px-5 py-4" aria-labelledby="cr-libs">
        <h2 id="cr-libs" className="font-serif-es text-xl font-semibold tracking-tight text-ink">
          Librerías
        </h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          {LIBS.map(([n, l]) => (
            <li key={n} className="flex justify-between gap-2 py-2">
              <span className="text-ink">{n}</span>
              <span className="shrink-0 text-xs text-ink-faint"><Mixed>{l}</Mixed></span>
            </li>
          ))}
        </ul>
      </section>

      <InkDivider className="mt-6" />
      <section className="card-paper px-5 py-4 text-sm text-ink-soft" aria-labelledby="cr-notas">
        <h2 id="cr-notas" className="font-serif-es text-xl font-semibold tracking-tight text-ink">
          Notas
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
          <li>Las definiciones de CC-CEDICT se muestran en inglés como respaldo cuando no hay traducción al español; el campo «significado» es editable.</li>
          <li>Las etimologías y pistas de componentes de Make Me a Hanzi están en inglés en origen.</li>
          <li>Los vídeos se reproducen desde YouTube (IFrame API); las transcripciones se obtienen de los subtítulos públicos de cada vídeo para uso personal.</li>
          <li>El contenido del curso, las lecturas, la gramática y los artículos han sido escritos para esta app y están marcados como «pendientes de revisar» hasta que los valide un profesor.</li>
          <li>Todas las ilustraciones (sellos, montañas, bambú, ciruelo, cerezo, torii, mugunghwa, vasija luna, bojagi, mascota <span lang="zh-CN">小墨</span>) son SVG propios; no se usan imágenes de terceros.</li>
          <li>No existen listas oficiales de vocabulario del JLPT desde 2010: las listas N5 de la app son comunitarias (basadas en las de Jonathan Waller). Para el coreano se usa la lista de vocabulario de aprendizaje del NIKL (2003).</li>
          <li>Las traducciones al español del coreano proceden de la semilla propia; el resto del diccionario coreano está en inglés (Wiktionary) salvo que configures una clave gratuita de KRDict en .env.local.</li>
        </ul>
      </section>
    </div>
  );
}
