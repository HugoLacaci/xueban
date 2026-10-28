import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { InkDivider } from "@/components/ornament";

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
];

const FONTS = [
  { name: "Inter", role: "Interfaz latina, pinyin y números tabulares", author: "Rasmus Andersson", license: "SIL OFL 1.1" },
  { name: "Fraunces", role: "Títulos editoriales en español", author: "Undercase Type", license: "SIL OFL 1.1" },
  { name: "Noto Sans SC", role: "Chino de interfaz", author: "Google / Adobe", license: "SIL OFL 1.1" },
  { name: "Noto Serif SC (宋体)", role: "Carácter protagonista en tarjetas y fichas", author: "Google / Adobe", license: "SIL OFL 1.1" },
  { name: "LXGW WenKai Lite (霞鹜文楷)", role: "Caligrafía 楷书, citas y «fuente de estudio»", author: "LXGW (sobre Klee One de Fontworks)", license: "SIL OFL 1.1" },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Créditos y licencias" zh="致谢" subtitle="Xuébàn es software libre y gratuito, construido sobre datos abiertos. Gracias a todas estas personas y proyectos." />

      <InkDivider label="数据" />
      <section className="card-paper px-5 py-4" aria-labelledby="cr-datos">
        <h2 id="cr-datos" className="font-serif-es text-xl font-semibold tracking-tight text-ink">
          Datos
        </h2>
        <ul className="mt-2 divide-y divide-line">
          {DATA.map((d) => (
            <li key={d.name} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                      {d.name} <ExternalLink className="size-3 text-ink-faint" />
                    </a>
                  ) : (
                    d.name
                  )}
                </p>
                <p className="text-ink-faint">{d.use}</p>
              </div>
              <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft">{d.license}</span>
            </li>
          ))}
        </ul>
      </section>

      <InkDivider label="字体" className="mt-6" />
      <section className="card-paper px-5 py-4" aria-labelledby="cr-fuentes">
        <h2 id="cr-fuentes" className="font-serif-es text-xl font-semibold tracking-tight text-ink">
          Tipografías
        </h2>
        <p className="mt-1 text-sm text-ink-faint">Dos familias latinas y tres chinas, más una de exhibición para los sellos. Todas con licencia libre.</p>
        <ul className="mt-2 divide-y divide-line">
          {FONTS.map((f) => (
            <li key={f.name} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-ink">{f.name}</p>
                <p className="text-ink-faint">
                  {f.role} · {f.author}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft">{f.license}</span>
            </li>
          ))}
        </ul>
      </section>

      <InkDivider label="库" className="mt-6" />
      <section className="card-paper px-5 py-4" aria-labelledby="cr-libs">
        <h2 id="cr-libs" className="font-serif-es text-xl font-semibold tracking-tight text-ink">
          Librerías
        </h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          {LIBS.map(([n, l]) => (
            <li key={n} className="flex justify-between gap-2 py-2">
              <span className="text-ink">{n}</span>
              <span className="shrink-0 text-xs text-ink-faint">{l}</span>
            </li>
          ))}
        </ul>
      </section>

      <InkDivider label="注" className="mt-6" />
      <section className="card-paper px-5 py-4 text-sm text-ink-soft" aria-labelledby="cr-notas">
        <h2 id="cr-notas" className="font-serif-es text-xl font-semibold tracking-tight text-ink">
          Notas
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
          <li>Las definiciones de CC-CEDICT se muestran en inglés como respaldo cuando no hay traducción al español; el campo «significado» es editable.</li>
          <li>Las etimologías y pistas de componentes de Make Me a Hanzi están en inglés en origen.</li>
          <li>Los vídeos se reproducen desde YouTube (IFrame API); las transcripciones se obtienen de los subtítulos públicos de cada vídeo para uso personal.</li>
          <li>El contenido del curso, las lecturas, la gramática y los artículos han sido escritos para esta app y están marcados como «pendientes de revisar» hasta que los valide un profesor.</li>
          <li>Todas las ilustraciones (sellos, montañas, bambú, ciruelo, mascota 小墨) son SVG propios; no se usan imágenes de terceros.</li>
        </ul>
      </section>
    </div>
  );
}
