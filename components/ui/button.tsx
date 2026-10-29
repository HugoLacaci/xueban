import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Mixed } from "@/components/target/mixed";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Botones de tinta:
 *  - default (sello): bermellón con texto papel → solo CTA principal.
 *  - ink: tinta con texto papel → acción principal neutra.
 *  - jade: celadón → éxito / continuar.
 *  - secondary: papel hundido. outline: contorno de pincel. ghost/link: sin fondo. destructive: 绛.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-btn)] text-sm font-medium transition-[background-color,color,transform,box-shadow,border-color] duration-[var(--dur-ui)] ease-[var(--ease-ink)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-px active:shadow-none select-none",
  {
    variants: {
      variant: {
        default: "bg-cinnabar text-paper-raised shadow-[0_1px_0_rgb(var(--cinnabar-ink)),0_6px_16px_-8px_rgb(var(--cinnabar)/.6)] hover:bg-cinnabar-ink",
        ink: "bg-ink text-paper shadow-[0_6px_16px_-10px_rgb(var(--ink)/.7)] hover:bg-ink/90",
        jade: "bg-celadon-ink text-paper-raised shadow-[0_6px_16px_-10px_rgb(var(--celadon)/.7)] hover:bg-celadon-ink/90",
        secondary: "bg-paper-sunk text-ink border border-line hover:border-ink/30 hover:bg-paper-sunk/80",
        outline: "brush-outline bg-transparent text-ink hover:bg-paper-sunk/70",
        ghost: "text-ink-soft hover:bg-paper-sunk hover:text-ink",
        link: "text-indigo underline-offset-4 hover:underline dark:text-indigo",
        destructive: "bg-danger text-paper-raised hover:bg-danger/90",
        soft: "bg-cinnabar/10 text-cinnabar-ink hover:bg-cinnabar/18",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-[10px] px-6 text-base",
        xl: "h-14 rounded-[12px] px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-14 w-14 rounded-[14px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  // el texto de los botones puede llevar palabras en la lengua meta: <Mixed> les pone lang
  const children = asChild ? props.children : React.Children.map(props.children, (c) => (typeof c === "string" ? <Mixed>{c}</Mixed> : c));
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>{children}</Comp>;
});
Button.displayName = "Button";

export { Button, buttonVariants };
