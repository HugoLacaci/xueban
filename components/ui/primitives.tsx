"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { targetLang } from "@/lib/languages/registry";
import { Mixed, hasTargetScript, langOfRun } from "@/components/target/mixed";

/* ---------------- Card ---------------- */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card-paper min-w-0 p-4 sm:p-5", className)} {...props} />;
}
/** Texto plano → <Mixed> (envuelve con lang los tramos en la lengua meta); el resto se deja igual. */
const mx = (n: React.ReactNode) => (typeof n === "string" ? <Mixed>{n}</Mixed> : Array.isArray(n) ? React.Children.map(n, (c) => (typeof c === "string" ? <Mixed>{c}</Mixed> : c)) : n);

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold tracking-tight text-ink", className)} {...props}>
      {mx(props.children)}
    </h3>
  );
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-ink-faint", className)} {...props}>
      {mx(props.children)}
    </p>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "outline" | "jade" | "lacquer" | "gold" | "muted" | "seal" | "indigo" }) {
  const styles = {
    default: "bg-paper-sunk text-ink-soft border-line",
    outline: "bg-transparent border-line-strong text-ink-soft",
    jade: "bg-celadon/14 text-celadon-ink border-transparent",
    lacquer: "bg-cinnabar/10 text-cinnabar-ink border-transparent",
    gold: "bg-gold/15 text-gold-ink border-transparent",
    indigo: "bg-indigo/10 text-indigo border-transparent dark:text-indigo",
    muted: "bg-transparent text-ink-faint border-transparent",
    seal: "bg-transparent border-cinnabar text-cinnabar font-seal rounded-[4px] border-[1.5px]",
  }[variant];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4", styles, className)} {...props}>
      {mx(props.children)}
    </span>
  );
}

/* ---------------- Input / Textarea ---------------- */
const fieldBase =
  "w-full rounded-[8px] border border-line bg-paper-sunk/70 px-3 py-2 text-sm text-ink shadow-[var(--shadow-sunk)] placeholder:text-ink-faint/80 transition-colors focus-visible:border-ink/50 focus-visible:bg-paper-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => <input ref={ref} className={cn("flex h-10", fieldBase, className)} {...props} />);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => <textarea ref={ref} className={cn("flex min-h-[80px]", fieldBase, className)} {...props} />);
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-sm font-medium text-ink-soft", className)} {...props}>
      {mx(props.children)}
    </label>
  );
}

/** <option> con lang cuando su texto incluye la lengua meta. */
export function Option({ children, ...props }: React.OptionHTMLAttributes<HTMLOptionElement> & { children: string }) {
  return (
    <option {...props} lang={hasTargetScript(children) ? langOfRun(children) : undefined}>
      {children}
    </option>
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("h-10 rounded-[8px] border border-line bg-paper-sunk/70 px-3 text-sm text-ink shadow-[var(--shadow-sunk)] focus-visible:border-ink/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15", className)} {...props}>
      {children}
    </select>
  );
}

/* ---------------- Switch ---------------- */
export const Switch = React.forwardRef<React.ComponentRef<typeof SwitchPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn("peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-celadon data-[state=unchecked]:bg-line disabled:opacity-50", className)}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-paper-raised shadow-md transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

/* ---------------- Progress: trazo de pincel que se rellena de tinta ---------------- */
export function Progress({ value, className, color, brush = true, label = "Progreso" }: { value: number; className?: string; color?: string; brush?: boolean; label?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <ProgressPrimitive.Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-ink/10", className)} value={v} aria-label={label}>
      <ProgressPrimitive.Indicator
        className={cn("h-full rounded-full transition-[width] duration-500 ease-[var(--ease-ink)]", brush && "brush-fill")}
        style={{ width: `${v}%`, background: color ?? "rgb(var(--ink))" }}
      />
    </ProgressPrimitive.Root>
  );
}

/* ---------------- Slider ---------------- */
export const Slider = React.forwardRef<React.ComponentRef<typeof SliderPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root ref={ref} className={cn("relative flex w-full touch-none select-none items-center", className)} {...props}>
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-ink/10">
      <SliderPrimitive.Range className="absolute h-full bg-ink" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-ink bg-paper-raised shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30" />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";

/* ---------------- Tabs ---------------- */
export const Tabs = TabsPrimitive.Root;
export const TabsList = React.forwardRef<React.ComponentRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn("inline-flex h-10 items-center justify-center gap-1 rounded-[10px] bg-paper-sunk p-1 text-ink-faint", className)} {...props} />
));
TabsList.displayName = "TabsList";
export const TabsTrigger = React.forwardRef<React.ComponentRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-[8px] px-3 py-1.5 text-sm font-medium transition-all disabled:opacity-50 data-[state=active]:bg-paper-raised data-[state=active]:text-ink data-[state=active]:shadow-paper", className)}
    {...props}
  >
    {mx(props.children)}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = "TabsTrigger";
export const TabsContent = React.forwardRef<React.ComponentRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn("mt-3 focus-visible:outline-none", className)} {...props} />);
TabsContent.displayName = "TabsContent";

/* ---------------- Dialog (hoja de papel) ---------------- */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({
  className,
  children,
  title,
  description,
  side = "center",
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: React.ReactNode; description?: React.ReactNode; side?: "center" | "bottom" | "right" }) {
  const pos = {
    center: "left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[14px]",
    bottom: "inset-x-0 bottom-0 w-full max-h-[90vh] rounded-t-[16px] sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[14px]",
    right: "inset-y-0 right-0 h-full w-full max-w-md rounded-l-[14px]",
  }[side];
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content className={cn("fixed z-50 flex flex-col gap-3 overflow-y-auto border border-line bg-paper-raised p-5 shadow-float outline-none data-[state=open]:animate-pop", pos, className)} {...props}>
        <span className="pointer-events-none absolute inset-x-5 top-0 h-[2px] rounded-b bg-cinnabar/80" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="font-serif-es text-lg font-semibold text-ink">{title}</DialogPrimitive.Title>
            {description ? <DialogPrimitive.Description className="mt-0.5 text-sm text-ink-faint">{description}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : "Diálogo"}</DialogPrimitive.Description>}
          </div>
          <DialogPrimitive.Close className="rounded-md p-1 text-ink-faint hover:bg-paper-sunk hover:text-ink" aria-label="Cerrar">
            <X className="size-5" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/* ---------------- Popover ---------------- */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverContent = React.forwardRef<React.ComponentRef<typeof PopoverPrimitive.Content>, React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>>(({ className, align = "center", sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content ref={ref} align={align} sideOffset={sideOffset} collisionPadding={8} className={cn("z-50 w-72 rounded-[12px] border border-line bg-paper-raised p-4 text-ink shadow-float outline-none data-[state=open]:animate-pop", className)} {...props} />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";

/* ---------------- Tooltip ---------------- */
export const TooltipProvider = TooltipPrimitive.Provider;
export function Tooltip({ children, label, side = "bottom" }: { children: React.ReactNode; label: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side={side} sideOffset={6} className="z-50 max-w-xs rounded-md bg-ink px-2 py-1 text-xs text-paper shadow-md data-[state=delayed-open]:animate-fade-in">
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/* ---------------- Misc ---------------- */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-paper-sunk px-1 font-mono text-[10px] font-medium text-ink-faint", className)}>{children}</kbd>;
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block size-5 animate-spin rounded-full border-2 border-line border-t-ink", className)} role="status" aria-label="Cargando" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("ink-skeleton", className)} aria-hidden="true" />;
}

export function EmptyState({ icon, title, description, action, className, zh }: { icon?: React.ReactNode; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string; zh?: { zh: string; py?: string; es: string } }) {
  return (
    <div className={cn("relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-[14px] border border-dashed border-line px-6 py-10 text-center", className)}>
      {icon ? <div className="text-ink-faint [&_svg]:size-8">{icon}</div> : null}
      <p className="font-serif-es text-lg font-medium text-ink">{title}</p>
      {zh ? (
        <p className="text-sm">
          <span lang={targetLang()} className="zh-kai text-base text-ink">
            {zh.zh}
          </span>
          {zh.py ? <span className="ml-2 text-xs text-ink-faint"><Mixed>{zh.py}</Mixed></span> : null}
          <span className="block text-xs text-ink-faint"><Mixed>{zh.es}</Mixed></span>
        </p>
      ) : null}
      {description ? <p className="max-w-sm text-sm text-ink-faint">{mx(description)}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, className, action }: { children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <h2 className="font-serif-es text-lg font-semibold tracking-tight text-ink">{mx(children)}</h2>
      {action}
    </div>
  );
}

/** Cabecera de página: título editorial (Fraunces), carácter chino en 楷书 como marca de agua. */
export function PageHeader({ title, subtitle, action, zh }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; zh?: string }) {
  return (
    <header className="relative mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {zh ? (
          <span className="zh-display mb-1 block text-sm text-cinnabar" lang={targetLang()}>
            {zh}
          </span>
        ) : null}
        <h1 className="font-serif-es text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[34px]">{mx(title)}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-ink-faint">{mx(subtitle)}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}
