"use client";
import { useState } from "react";
import { Moon, Sun, Plus, Search, Check } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, Kbd, Label, Progress, Select, Skeleton, Slider, Spinner, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, EmptyState, SectionTitle, PageHeader, Tooltip, TooltipProvider } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { Seal, SealTag, Lattice, MoonGate, InkDivider, Enso, BrushCheck, FretBorder, CloudBorder, ScreenFrame, ShanShui, PlumBranch, XiaoMo, TianZiGe, Lantern } from "@/components/ornament";
import { HanziCard } from "@/components/zh/hanzi-card";
import { Pinyin } from "@/components/zh/pinyin";
import { Hanzi } from "@/components/zh/chinese-text";

const COLORS: { token: string; zh: string; name: string; use: string; text?: string }[] = [
  { token: "paper", zh: "宣纸", name: "xuānzhǐ", use: "fondo principal" },
  { token: "paper-raised", zh: "月白", name: "yuèbái", use: "tarjetas" },
  { token: "paper-sunk", zh: "缃色", name: "xiāngsè", use: "zonas hundidas, inputs" },
  { token: "line", zh: "素", name: "sù", use: "bordes 1 px" },
  { token: "ink", zh: "墨", name: "mò", use: "texto principal", text: "paper" },
  { token: "ink-soft", zh: "淡墨", name: "dànmò", use: "texto secundario", text: "paper" },
  { token: "ink-faint", zh: "枯墨", name: "kūmò", use: "texto terciario (≥ 4,5:1)", text: "paper" },
  { token: "cinnabar", zh: "朱砂", name: "zhūshā", use: "CTA, sellos, marca (≤ 5 %)", text: "paper-raised" },
  { token: "cinnabar-ink", zh: "胭脂", name: "yānzhi", use: "hover del bermellón", text: "paper-raised" },
  { token: "celadon", zh: "青瓷", name: "qīngcí", use: "éxito, conocido", text: "paper-raised" },
  { token: "indigo", zh: "黛蓝", name: "dàilán", use: "enlaces, info", text: "paper-raised" },
  { token: "gold", zh: "赭金", name: "zhějīn", use: "aviso, logros", text: "ink" },
  { token: "danger", zh: "绛", name: "jiàng", use: "error (≠ acento)", text: "paper-raised" },
];

const TYPE_SCALE = [12, 14, 16, 20, 25, 31, 39, 49, 61, 76];

export function StyleGuide() {
  const theme = useSettings((s) => s.settings.theme);
  const update = useSettings((s) => s.update);
  const [sw, setSw] = useState(true);
  const [tab, setTab] = useState("a");
  const [stamped, setStamped] = useState(0);
  const toggleTheme = () => void update({ theme: theme === "dark" ? "light" : "dark" });

  return (
    <TooltipProvider>
      <div className="space-y-12 pb-20">
        <PageHeader
          zh="设计"
          title="Guía de estilo viva"
          subtitle="宣纸与墨 · papel y tinta. Tokens, tipografía, componentes y ornamentos tal como se renderizan en la app. Cambia el tema para revisar ambos modos."
          action={
            <Button variant="outline" onClick={toggleTheme}>
              {theme === "dark" ? <Sun /> : <Moon />} Tema {theme === "dark" ? "claro" : "oscuro"}
            </Button>
          }
        />

        {/* ---------- Colores ---------- */}
        <section id="color">
          <SectionTitle>1 · Color</SectionTitle>
          <p className="mb-4 max-w-2xl text-sm text-ink-faint">Proporción 80 / 15 / 5: papel y tinta mandan, el jade y el añil acompañan, el bermellón es un sello y se usa solo en el CTA, sellos, progreso activo y marca.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLORS.map((c) => (
              <div key={c.token} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper-raised">
                <div className="flex h-20 items-end justify-between p-2" style={{ background: `rgb(var(--${c.token}))`, color: c.text ? `rgb(var(--${c.text}))` : "rgb(var(--ink))" }}>
                  <span className="zh-kai text-2xl" lang="zh-CN">
                    {c.zh}
                  </span>
                  <span className="text-[11px]">{c.name}</span>
                </div>
                <div className="p-2 text-xs">
                  <p className="font-mono text-ink">--{c.token}</p>
                  <p className="text-ink-faint">{c.use}</p>
                </div>
              </div>
            ))}
          </div>
          <h3 className="mb-2 mt-6 text-sm font-medium text-ink">Tonos (esquema 学伴)</h3>
          <div className="flex flex-wrap gap-2">
            {[
              ["1", "mā", "朱 alto plano"],
              ["2", "má", "青 ascendente"],
              ["3", "mǎ", "靛 bajo"],
              ["4", "mà", "紫 descendente"],
              ["5", "ma", "灰 neutro"],
            ].map(([n, py, label]) => (
              <div key={n} className="flex items-center gap-2 rounded-[8px] border border-line bg-paper-raised px-3 py-2">
                <span className="size-4 rounded-full" style={{ background: `rgb(var(--tone-${n}))` }} />
                <span className="text-lg font-medium" style={{ color: `rgb(var(--tone-${n}))` }}>
                  {py}
                </span>
                <span className="text-xs text-ink-faint">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 rounded-[8px] border border-line bg-paper-raised px-3 py-2">
              <Pinyin text="nǐ hǎo, xué bàn" className="text-lg" />
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
                    Aprender chino con calma
                  </span>
                </div>
              ))}
              <p className="tabular text-sm text-ink-soft">Números tabulares: 1 234 · 0,90 · 12:45</p>
            </Card>
            <Card className="space-y-4">
              <p className="text-xs uppercase tracking-wide text-ink-faint">Familias chinas (lang=zh-CN)</p>
              {[
                ["zh", "Noto Sans SC · interfaz", "你好，我叫雨果。"],
                ["zh-serif", "Noto Serif SC · protagonista", "学而时习之，不亦说乎"],
                ["zh-kai", "LXGW WenKai · estudio / caligrafía", "千里之行，始于足下"],
                ["zh-display", "LXGW WenKai · sellos y marca (solo decorativo)", "学伴"],
              ].map(([cls, label, sample]) => (
                <div key={cls}>
                  <p className="text-[11px] text-ink-faint">{label}</p>
                  <p className={cn(cls, "text-2xl leading-relaxed text-ink")} lang="zh-CN">
                    {sample}
                  </p>
                </div>
              ))}
              <div>
                <p className="text-[11px] text-ink-faint">Ruby pinyin · 45–50 % · sin salto al ocultarlo</p>
                <p className="text-2xl" lang="zh-CN">
                  <ruby className="zh">
                    我<rt style={{ color: "rgb(var(--tone-3))" }}>wǒ</rt>
                  </ruby>
                  <ruby className="zh">
                    爱<rt style={{ color: "rgb(var(--tone-4))" }}>ài</rt>
                  </ruby>
                  <ruby className="zh">
                    学<rt style={{ color: "rgb(var(--tone-2))" }}>xué</rt>
                  </ruby>
                  <ruby className="zh">
                    中<rt style={{ color: "rgb(var(--tone-1))" }}>zhōng</rt>
                  </ruby>
                  <ruby className="zh">
                    文<rt style={{ color: "rgb(var(--tone-2))" }}>wén</rt>
                  </ruby>
                </p>
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
              <Button variant="outline" onClick={() => toast.info("Pinyin oculto", "Pulsa P para mostrarlo.")}>
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
                <Input id="sg-in" placeholder="Escribe hanzi, pinyin o español…" />
              </div>
              <div>
                <Label htmlFor="sg-in2">Con error</Label>
                <Input id="sg-in2" defaultValue="nǐ hào" aria-invalid className="border-danger focus-visible:border-danger" />
                <p className="mt-1 flex items-center gap-1 text-xs text-danger">⚠ Tono incorrecto: hǎo es tercer tono.</p>
              </div>
              <div>
                <Label htmlFor="sg-sel">Selector</Label>
                <Select id="sg-sel" defaultValue="b">
                  <option value="a">学伴 (armonizado)</option>
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
                  <TabsTrigger value="a">Hanzi</TabsTrigger>
                  <TabsTrigger value="b">Pinyin</TabsTrigger>
                  <TabsTrigger value="c">Español</TabsTrigger>
                </TabsList>
                <TabsContent value="a">Pestaña {tab}</TabsContent>
                <TabsContent value="b">Pestaña {tab}</TabsContent>
                <TabsContent value="c">Pestaña {tab}</TabsContent>
              </Tabs>
              <div className="flex flex-wrap gap-1.5">
                <Badge>Normal</Badge>
                <Badge variant="outline">Contorno</Badge>
                <Badge variant="jade">Conocida</Badge>
                <Badge variant="lacquer">Nueva</Badge>
                <Badge variant="gold">Difícil</Badge>
                <Badge variant="indigo">Info</Badge>
                <Badge variant="seal">HSK 1</Badge>
                <SealTag>印</SealTag>
                <SealTag tone="ink">墨</SealTag>
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
                <span className="zh-serif text-2xl" lang="zh-CN">
                  {["你好", "谢谢", "再见", "对不起"][i]}
                </span>
                <span className="ml-auto text-xs text-ink-faint">{state}</span>
                {state === "correcta" ? <BrushCheck size={22} animate={false} /> : null}
              </button>
            ))}
          </div>
        </section>

        {/* ---------- Tarjetas ---------- */}
        <section id="cards">
          <SectionTitle>6 · HanziCard y superficies</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <HanziCard hanzi="学" pinyin="xué" meaning="estudiar, aprender" example="我学中文。" examplePinyin="Wǒ xué Zhōngwén." exampleTranslation="Estudio chino." hsk="HSK 1" flippable footer="Pulsa para girar" />
            <HanziCard hanzi="朋友" pinyin="péng you" meaning="amigo/a" hsk="HSK 1" size="md" flippable />
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
              <p className="text-xs uppercase tracking-wide text-ink-faint">印章 Sellos</p>
              <div className="flex flex-wrap items-end gap-4">
                <Seal text="学伴" size={72} />
                <Seal text="雨果" size={64} variant="round" rotate={-4} />
                <Seal text="完成" size={56} variant="oval" tone="ink" />
                <Seal text="HSK1" size={56} tone="gold" />
                <Seal text="好" size={48} tone="celadon" variant="round" />
                <Button size="sm" variant="outline" onClick={() => setStamped((n) => n + 1)}>
                  Estampar
                </Button>
                {stamped ? <Seal key={stamped} text="好" size={64} stamped rotate={-6} /> : null}
              </div>
              <p className="text-xs uppercase tracking-wide text-ink-faint">Divisores, ensō, lámpara, 田字格</p>
              <InkDivider label="第一课" />
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
                  <Hanzi text="永" size="2xl" font="serif" />
                </TianZiGe>
                <TianZiGe size={96} variant="mi">
                  <Hanzi text="永" size="2xl" font="kai" />
                </TianZiGe>
                <TianZiGe size={96} faint>
                  <Hanzi text="永" size="2xl" font="serif" />
                </TianZiGe>
              </div>
            </Card>
            <Card className="space-y-4">
              <p className="text-xs uppercase tracking-wide text-ink-faint">山水, bordes y mascota</p>
              <ShanShui height={120} phase="dusk" className="rounded-[10px]" />
              <FretBorder />
              <CloudBorder className="p-4 text-center text-sm text-ink-soft">云纹 · marco de nubes para informes y logros</CloudBorder>
              <ScreenFrame>
                <div className="flex h-20 items-center justify-center bg-paper-sunk text-sm text-ink-faint">屏风 · marco del reproductor</div>
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
          </div>
        </section>

        {/* ---------- Vacíos ---------- */}
        <section id="empty">
          <SectionTitle>8 · Estados vacíos y foco</SectionTitle>
          <EmptyState
            icon={<Check />}
            title="Nada pendiente por hoy"
            zh={{ zh: "千里之行，始于足下", py: "qiān lǐ zhī xíng, shǐ yú zú xià", es: "Un viaje de mil li empieza con un paso." }}
            description="Las citas acompañan los vacíos y las cargas; nunca decoran las zonas de respuesta."
            action={<Button>Empezar lección</Button>}
          />
          <p className="mt-3 text-xs text-ink-faint">Anillo de foco: 2 px de tinta con separación (pulsa Tab). Movimiento reducido: solo fundidos.</p>
        </section>
      </div>
    </TooltipProvider>
  );
}
