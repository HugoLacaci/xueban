"use client";
import { useState } from "react";
import { Moon, Sun, Plus, Search, Check } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Kbd, Label, Progress, Select, Skeleton, Slider, Spinner, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, EmptyState, SectionTitle, PageHeader, Tooltip, TooltipProvider, Option } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Seal, SealTag, Lattice, MoonGate, InkDivider, Enso, BrushCheck, FretBorder, CloudBorder, ScreenFrame, ShanShui, PlumBranch, XiaoMo, TianZiGe, Lantern } from "@/components/ornament";
import { HanziCard } from "@/components/target/word-card";
import { Pinyin } from "@/components/target/reading";
import { Hanzi } from "@/components/target/target-text";
import { LANG_META, LANGS } from "@/lib/languages/registry";
import { usePack } from "@/lib/languages/provider";
import { STYLE_DATA } from "./style-data";
import { LangPortalCompact, LangPortalHero } from "@/components/layout/lang-portal";
import NextLink from "next/link";
import { Mixed } from "@/components/target/mixed";

const COLOR_TOKENS: { token: string; use: string; text?: string }[] = [
  { token: "paper", use: "fondo principal" },
  { token: "paper-raised", use: "tarjetas" },
  { token: "paper-sunk", use: "zonas hundidas, inputs" },
  { token: "line", use: "bordes 1 px" },
  { token: "ink", use: "texto principal", text: "paper" },
  { token: "ink-soft", use: "texto secundario", text: "paper" },
  { token: "ink-faint", use: "texto terciario (≥ 4,5:1)", text: "paper" },
  { token: "cinnabar", use: "CTA, sellos, marca (≤ 5 %)", text: "paper-raised" },
  { token: "cinnabar-ink", use: "hover del bermellón", text: "paper-raised" },
  { token: "celadon", use: "éxito, conocido", text: "paper-raised" },
  { token: "indigo", use: "enlaces, info", text: "paper-raised" },
  { token: "gold", use: "aviso, logros", text: "ink" },
  { token: "danger", use: "error (≠ acento)", text: "paper-raised" },
];

const TYPE_SCALE = [12, 14, 16, 20, 25, 31, 39, 49, 61, 76];

export function StyleGuide() {
  const theme = useSettings((s) => s.settings.theme);
  const update = useSettings((s) => s.update);
  const [sw, setSw] = useState(true);
  const [tab, setTab] = useState("a");
  const [stamped, setStamped] = useState(0);
  const [portalOpen, setPortalOpen] = useState<"zh" | "ja" | "ko">("zh");
  const pack = usePack();
  const D = STYLE_DATA[pack.id];
  const COLORS = COLOR_TOKENS.map((c) => ({ ...c, zh: D.colors[c.token]?.native ?? "", name: D.colors[c.token]?.name ?? "" }));
  const { Landscape, Branch, DailyShape, Pattern } = pack.theme.ornaments;
  const toggleTheme = () => void update({ theme: theme === "dark" ? "light" : "dark" });

  return (
    <TooltipProvider>
      <div className="space-y-12 pb-20">
        <PageHeader
          zh={pack.theme.name}
          title="Guía de estilo viva"
          subtitle={`${D.tagline}. Tokens, tipografía, componentes y ornamentos tal como se renderizan en la app. Cambia el tema para revisar ambos modos y el idioma para ver cada piel.`}
          action={
            <Button variant="outline" onClick={toggleTheme}>
              {theme === "dark" ? <Sun /> : <Moon />} Tema {theme === "dark" ? "claro" : "oscuro"}
            </Button>
          }
        />

        <nav className="-mt-6 flex flex-wrap gap-1.5" aria-label="Idioma de la guía">
          {LANGS.map((l) => (
            <NextLink key={l} href={`/design?lang=${l}`} className={cn("rounded-full border px-3 py-1 text-sm", l === pack.id ? "border-ink bg-ink text-paper" : "border-line text-ink-soft")}>
              <span lang={LANG_META[l].bcp47}><Mixed>{LANG_META[l].names.native}</Mixed></span> · <Mixed>{LANG_META[l].names.es}</Mixed>
            </NextLink>
          ))}
        </nav>

        {/* ---------- Piel del idioma ---------- */}
        <section id="skin">
          <SectionTitle>0 · Piel del idioma: <Mixed>{pack.theme.nameEs}</Mixed></SectionTitle>
          <p className="mb-4 max-w-2xl text-sm text-ink-faint"><Mixed>{pack.theme.description}</Mixed></p>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-3">
              <Landscape height={130} phase="day" className="rounded-[10px]" />
              <div className="flex flex-wrap items-end gap-4">
                <Branch progress={0.7} className="h-28 w-44" label="70 %" />
                <DailyShape progress={0.6} size={96} label="60 %" />
                <Seal text={D.seals.brand} size={64} />
                <Seal text={D.seals.user} size={56} rotate={-4} />
              </div>
            </Card>
            <Card className="relative space-y-3 overflow-hidden">
              {Pattern ? (
                <div className="text-ink">
                  <Pattern opacity={0.08} />
                </div>
              ) : null}
              <div className="relative">
                <p className="text-xs uppercase tracking-wide text-ink-faint">Motivos</p>
                <p lang={pack.bcp47} className="mt-1 text-lg text-ink">
                  {pack.theme.motifs.join(" · ")}
                </p>
                <p className="mt-3 text-xs uppercase tracking-wide text-ink-faint">Prohibido</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-ink-soft">
                  {pack.theme.prohibited.map((p) => (
                    <li key={p}><Mixed>{p}</Mixed></li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </section>

        {/* ---------- Colores ---------- */}
        <section id="color">
          <SectionTitle>1 · Color</SectionTitle>
          <p className="mb-4 max-w-2xl text-sm text-ink-faint">Proporción 80 / 15 / 5: papel y tinta mandan, el jade y el añil acompañan, el bermellón es un sello y se usa solo en el CTA, sellos, progreso activo y marca.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLORS.map((c) => (
              <div key={c.token} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper-raised">
                <div className="flex h-20 items-end justify-between p-2" style={{ background: `rgb(var(--${c.token}))`, color: c.text ? `rgb(var(--${c.text}))` : "rgb(var(--ink))" }}>
                  <span className="zh-kai text-2xl" lang={pack.bcp47}>
                    <Mixed>{c.zh}</Mixed>
                  </span>
                  <span className="text-[11px]"><Mixed>{c.name}</Mixed></span>
                </div>
                <div className="p-2 text-xs">
                  <p className="font-mono text-ink">--{c.token}</p>
                  <p className="text-ink-faint"><Mixed>{c.use}</Mixed></p>
                </div>
              </div>
            ))}
          </div>
          <h3 className="mb-2 mt-6 text-sm font-medium text-ink"><Mixed>{pack.prosody.name}</Mixed> (paleta de prosodia)</h3>
          <div className="flex flex-wrap gap-2">
            {[
              ...(pack.id === "zh"
                ? [
                    ["1", "mā", "alto plano"],
                    ["2", "má", "ascendente"],
                    ["3", "mǎ", "bajo"],
                    ["4", "mà", "descendente"],
                    ["5", "ma", "neutro"],
                  ]
                : (pack.prosody.legend ?? []).map((x, i) => [String(i + 1), "●", x.label])),
            ].map(([n, py, label]) => (
              <div key={n} className="flex items-center gap-2 rounded-[8px] border border-line bg-paper-raised px-3 py-2">
                <span className="size-4 rounded-full" style={{ background: `rgb(var(--tone-${n}))` }} />
                <span className="text-lg font-medium" style={{ color: `rgb(var(--tone-${n}))` }}>
                  <Mixed>{py}</Mixed>
                </span>
                <span className="text-xs text-ink-faint">
                  <Mixed>{label}</Mixed>
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 rounded-[8px] border border-line bg-paper-raised px-3 py-2">
              <Hanzi text={D.card1.example} size="lg" />
            </div>
          </div>
        </section>

        {/* ---------- Tipografía ---------- */}
        <section id="type">
          <SectionTitle>2 · Tipografía</SectionTitle>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-ink-faint">Escala modular 1,25 · Inter / Fraunces</p>
              {TYPE_SCALE.map((px) => (
                <div key={px} className="flex items-baseline gap-3 overflow-hidden">
                  <span className="w-8 shrink-0 text-right font-mono text-[10px] text-ink-faint">{px}</span>
                  <span className={cn("truncate leading-tight text-ink", px >= 25 && "font-serif-es")} style={{ fontSize: px }}>
                    {`Aprender ${pack.meta.names.adjective} con calma`}
                  </span>
                </div>
              ))}
              <p className="tabular text-sm text-ink-soft">Números tabulares: 1 234 · 0,90 · 12:45</p>
            </Card>
            <Card className="space-y-4">
              <p className="text-xs uppercase tracking-wide text-ink-faint">{`Familias de ${pack.meta.names.adjective} (lang=${pack.bcp47})`}</p>
              {D.families.map(([cls, label, sample]) => (
                <div key={cls}>
                  <p className="text-[11px] text-ink-faint">
                    <Mixed>{label}</Mixed>
                  </p>
                  <p className={cn(cls, "text-2xl leading-relaxed text-ink")} lang={pack.bcp47}>
                    <Mixed>{sample}</Mixed>
                  </p>
                </div>
              ))}
              <div>
                <p className="text-[11px] text-ink-faint">Ruby {pack.readingAid.name.toLowerCase()} · 45–50 % · sin salto al ocultarlo</p>
                <Hanzi text={D.card1.example} size="xl" />
              </div>
            </Card>
          </div>
        </section>

        {/* ---------- Botones ---------- */}
        <section id="buttons">
          <SectionTitle>3 · Botones</SectionTitle>
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Sello (CTA)</Button>
              <Button variant="ink">Tinta</Button>
              <Button variant="jade">Jade</Button>
              <Button variant="secondary">Secundario</Button>
              <Button variant="outline">Pincel</Button>
              <Button variant="ghost">Fantasma</Button>
              <Button variant="link">Enlace</Button>
              <Button variant="soft">Suave</Button>
              <Button variant="destructive">Borrar</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Pequeño</Button>
              <Button>Normal</Button>
              <Button size="lg">Grande</Button>
              <Button size="xl">Extra</Button>
              <Button size="icon" aria-label="Añadir">
                <Plus />
              </Button>
              <Button size="icon-lg" variant="ink" aria-label="Buscar">
                <Search />
              </Button>
              <Button disabled>Desactivado</Button>
              <Button variant="ink" disabled>
                <Spinner className="size-4 border-paper/40 border-t-paper" /> Cargando
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => toast.success("Guardado", "La palabra está en tu mazo.")}>
                Toast éxito
              </Button>
              <Button variant="outline" onClick={() => toast.error("Sin conexión con Anki", "Abre Anki y comprueba AnkiConnect.")}>
                Toast error
              </Button>
              <Button variant="outline" onClick={() => toast.info(`${pack.readingAid.name} oculto`, "Pulsa P para mostrarlo.")}>
                Toast info
              </Button>
              <Tooltip label="Tooltip de papel">
                <Button variant="ghost">Tooltip</Button>
              </Tooltip>
              <span className="text-xs text-ink-faint">
                Atajos: <Kbd>P</Kbd> <Kbd>T</Kbd> <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>
              </span>
            </div>
          </Card>
        </section>

        {/* ---------- Formularios ---------- */}
        <section id="forms">
          <SectionTitle>4 · Formularios y estados</SectionTitle>
          <Card className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <Label htmlFor="sg-in">Campo</Label>
                <Input id="sg-in" placeholder={`Escribe en ${pack.meta.names.adjective}, ${pack.readingAid.name.toLowerCase()} o español…`} />
              </div>
              <div>
                <Label htmlFor="sg-in2">Con error</Label>
                <Input id="sg-in2" defaultValue={pack.id === "zh" ? "nǐ hào" : D.tiles[0].slice(0, -1)} aria-invalid className="border-danger focus-visible:border-danger" />
                <p className="mt-1 flex items-center gap-1 text-xs text-danger">⚠ <Mixed>{pack.id === "zh" ? "Tono incorrecto: hǎo es tercer tono." : `Casi: falta el final («${D.tiles[0]}»).`}</Mixed></p>
              </div>
              <div>
                <Label htmlFor="sg-sel">Selector</Label>
                <Select id="sg-sel" defaultValue="b">
                  <Option value="a">学伴 (armonizado)</Option>
                  <option value="b">Pleco clásico</option>
                  <option value="c">Sin colores</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="sg-ta">Notas</Label>
                <Textarea id="sg-ta" placeholder="Apuntes de clase…" />
              </div>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3 text-sm">
                Sonidos <Switch checked={sw} onCheckedChange={setSw} />
              </label>
              <div>
                <p className="mb-2 text-sm">Meta diaria · 15 min</p>
                <Slider defaultValue={[15]} max={60} step={5} />
              </div>
              <div className="space-y-2">
                <p className="text-sm">Progreso (pincel)</p>
                <Progress value={62} />
                <Progress value={35} color="rgb(var(--cinnabar))" />
                <Progress value={80} brush={false} color="rgb(var(--celadon))" />
              </div>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="a"><Mixed>{pack.meta.names.native}</Mixed></TabsTrigger>
                  <TabsTrigger value="b"><Mixed>{pack.readingAid.name}</Mixed></TabsTrigger>
                  <TabsTrigger value="c">Español</TabsTrigger>
                </TabsList>
                <TabsContent value="a">Pestaña <Mixed>{tab}</Mixed></TabsContent>
                <TabsContent value="b">Pestaña <Mixed>{tab}</Mixed></TabsContent>
                <TabsContent value="c">Pestaña <Mixed>{tab}</Mixed></TabsContent>
              </Tabs>
              <div className="flex flex-wrap gap-1.5">
                <Badge>Normal</Badge>
                <Badge variant="outline">Contorno</Badge>
                <Badge variant="jade">Conocida</Badge>
                <Badge variant="lacquer">Nueva</Badge>
                <Badge variant="gold">Difícil</Badge>
                <Badge variant="indigo">Info</Badge>
                <Badge variant="seal"><Mixed>{pack.curriculum.levelTitle}</Mixed></Badge>
                <SealTag><Mixed>{D.seals.ok}</Mixed></SealTag>
                <SealTag tone="ink"><Mixed>{D.colors.ink.native}</Mixed></SealTag>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex items-center gap-2 text-sm text-ink-faint">
                  <Spinner /> Cargando diccionario…
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ---------- Fichas de ejercicio ---------- */}
        <section id="tiles">
          <SectionTitle>5 · Opciones de ejercicio</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["normal", "border-line bg-paper-raised"],
              ["seleccionada", "border-ink bg-paper-raised ring-2 ring-ink/15"],
              ["correcta", "border-celadon bg-celadon/14 text-celadon-ink"],
              ["incorrecta", "border-danger bg-danger/10 text-danger"],
            ].map(([state, cls], i) => (
              <button key={state} className={cn("flex min-h-14 items-center gap-3 rounded-[10px] border px-4 py-3 text-left transition-colors", cls)}>
                <Kbd>{i + 1}</Kbd>
                <span className="zh-serif text-2xl" lang={pack.bcp47}>
                  <Mixed>{D.tiles[i]}</Mixed>
                </span>
                <span className="ml-auto text-xs text-ink-faint"><Mixed>{state}</Mixed></span>
                {state === "correcta" ? <BrushCheck size={22} animate={false} /> : null}
              </button>
            ))}
          </div>
        </section>

        {/* ---------- Tarjetas ---------- */}
        <section id="cards">
          <SectionTitle>6 · Tarjeta de palabra y superficies</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <HanziCard hanzi={D.card1.word} pinyin={D.card1.reading} meaning={D.card1.meaning} example={D.card1.example} examplePinyin={D.card1.exampleReading} exampleTranslation={D.card1.exampleTranslation} hsk={pack.curriculum.levelTitle} flippable footer="Pulsa para girar" />
            <HanziCard hanzi={D.card2.word} pinyin={D.card2.reading} meaning={D.card2.meaning} hsk={pack.curriculum.levelTitle} size="md" flippable />
            <div className="space-y-3">
              <div className="card-paper p-4 text-sm">
                <p className="font-serif-es text-base text-ink">card-paper</p>
                <p className="text-ink-faint">Papel elevado, sombra cálida.</p>
              </div>
              <div className="card-sunk p-4 text-sm">
                <p className="font-serif-es text-base text-ink">card-sunk</p>
                <p className="text-ink-faint">Papel hundido para zonas secundarias.</p>
              </div>
              <div className="card-plate p-4 text-sm">
                <p className="font-serif-es text-base text-ink">card-plate</p>
                <p className="text-ink-faint">Placa de jade, esquinas achaflanadas.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Ornamentos ---------- */}
        <section id="ornament">
          <SectionTitle>7 · Ornamentos</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-4">
              <p className="text-xs uppercase tracking-wide text-ink-faint">Sellos</p>
              <div className="flex flex-wrap items-end gap-4">
                <Seal text={D.seals.brand} size={72} />
                <Seal text={D.seals.user} size={64} variant="round" rotate={-4} />
                <Seal text={D.seals.done} size={56} variant="oval" tone="ink" />
                <Seal text={D.seals.level} size={56} tone="gold" />
                <Seal text={D.seals.ok} size={48} tone="celadon" variant="round" />
                <Button size="sm" variant="outline" onClick={() => setStamped((n) => n + 1)}>
                  Estampar
                </Button>
                {stamped ? <Seal key={stamped} text={D.seals.ok} size={64} stamped rotate={-6} /> : null}
              </div>
              <p className="text-xs uppercase tracking-wide text-ink-faint">Divisores, ensō, lámpara y cuadrícula de escritura</p>
              <InkDivider label={D.divider} />
              <div className="flex flex-wrap items-center gap-6">
                <Enso size={96} progress={0.66} label="66 %">
                  <span className="tabular text-lg font-medium text-ink">10′</span>
                </Enso>
                <div className="flex gap-1">
                  {[1, 1, 1, 0, 0, 0, 0].map((l, i) => (
                    <Lantern key={i} lit={Boolean(l)} />
                  ))}
                </div>
                <TianZiGe size={96}>
                  <Hanzi text={D.grid} size="2xl" font="serif" />
                </TianZiGe>
                <TianZiGe size={96} variant="mi">
                  <Hanzi text={D.grid} size="2xl" font="kai" />
                </TianZiGe>
                <TianZiGe size={96} faint>
                  <Hanzi text={D.grid} size="2xl" font="serif" />
                </TianZiGe>
              </div>
            </Card>
            {pack.id === "zh" ? (
            <Card className="space-y-4">
              <p className="text-xs uppercase tracking-wide text-ink-faint">
                  <Mixed>山水, bordes y mascota</Mixed>
                </p>
              <ShanShui height={120} phase="dusk" className="rounded-[10px]" />
              <FretBorder />
              <CloudBorder className="p-4 text-center text-sm text-ink-soft">
                <Mixed>云纹 · marco de nubes para informes y logros</Mixed>
              </CloudBorder>
              <ScreenFrame>
                <div className="flex h-20 items-center justify-center bg-paper-sunk text-sm text-ink-faint"><Mixed>屏风 · marco del reproductor</Mixed></div>
              </ScreenFrame>
              <div className="flex flex-wrap items-center gap-4">
                <MoonGate size={96}>
                  <Lattice opacity={0.25} size={24} />
                  <XiaoMo size={56} />
                </MoonGate>
                <XiaoMo size={64} mood="think" />
                <XiaoMo size={64} mood="cheer" />
                <PlumBranch count={120} height={90} className="h-24 w-40" />
              </div>
            </Card>
            ) : (
              <Card className="space-y-4">
                <p className="text-xs uppercase tracking-wide text-ink-faint">Mascota</p>
                <div className="flex flex-wrap items-center gap-4">
                  <XiaoMo size={64} />
                  <XiaoMo size={64} mood="think" />
                  <XiaoMo size={64} mood="cheer" />
                </div>
                <p className="text-sm text-ink-faint">Los ornamentos propios de esta piel están en la sección 0. Las grecas, nubes y biombo chinos no se usan aquí.</p>
              </Card>
            )}
          </div>
        </section>

        {/* ---------- Portada ---------- */}
        <section id="portada">
          <SectionTitle>9 · Portada «Tres puertas»</SectionTitle>
          <p className="mb-4 max-w-2xl text-sm text-ink-faint">Cada puerta lleva la piel completa de su idioma (data-skin). Estados: recomendada y abierta, activa, entornada (no activa). Pasa el ratón o tabula para abrirlas. Debajo, la miniatura compact de la cabecera, el onboarding y /me.</p>
          <div className="flex h-[480px] gap-4">
            {(
              [
                ["zh", "recommended"],
                ["ja", "active"],
                ["ko", "inactive"],
              ] as const
            ).map(([l, st], i) => (
              <LangPortalHero
                key={l}
                lang={l}
                index={i}
                state={st}
                phase="day"
                open={portalOpen === l}
                stats={st === "inactive" ? undefined : { due: 12 - i * 5, wordsKnown: 160 - i * 70, wordsTotal: 700, minutesWeek: 90, streak: 9 - i * 4 }}
                onOpenChange={(o) => setPortalOpen(o ? l : "zh")}
                onActivate={(e) => e.preventDefault()}
                href="#portada"
                className="h-full min-w-0 basis-0"
                style={{ flexGrow: portalOpen === l ? 1.6 : st === "inactive" ? 0.7 : 1 }}
              />
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <LangPortalCompact lang="zh" phase="day" stats={{ due: 12, wordsKnown: 160, wordsTotal: 300, minutesWeek: 90, streak: 9 }} current />
            <LangPortalCompact lang="ja" phase="night" stats={{ due: 7, wordsKnown: 90, wordsTotal: 700, minutesWeek: 40, streak: 5 }} selected />
            <LangPortalCompact lang="ko" phase="dusk" state="inactive" />
          </div>
        </section>

        {/* ---------- Vacíos ---------- */}
        <section id="empty">
          <SectionTitle>8 · Estados vacíos y foco</SectionTitle>
          <EmptyState
            icon={<Check />}
            title="Nada pendiente por hoy"
            zh={{ zh: D.empty.text, py: D.empty.reading, es: D.empty.es }}
            description="Las citas acompañan los vacíos y las cargas; nunca decoran las zonas de respuesta."
            action={<Button>Empezar lección</Button>}
          />
          <p className="mt-3 text-xs text-ink-faint">Anillo de foco: 2 px de tinta con separación (pulsa Tab). Movimiento reducido: solo fundidos.</p>
        </section>
      </div>
    </TooltipProvider>
  );
}
