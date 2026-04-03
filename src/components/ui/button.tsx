import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border text-sm font-semibold ring-offset-background transition-[background-color,border-color,transform,box-shadow,color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-[linear-gradient(135deg,rgba(103,232,249,0.98)_0%,rgba(56,189,248,0.95)_45%,rgba(251,191,36,0.9)_100%)] text-slate-950 shadow-[0_18px_40px_-18px_rgba(56,189,248,0.9)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-18px_rgba(56,189,248,0.85)] active:translate-y-0",
        destructive:
          "border-destructive/20 bg-destructive text-destructive-foreground shadow-[0_12px_30px_-16px_rgba(244,63,94,0.7)] hover:-translate-y-0.5 hover:bg-destructive/90",
        outline:
          "border-white/10 bg-white/[0.04] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/[0.08] hover:text-foreground",
        secondary:
          "border-white/10 bg-secondary/80 text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:-translate-y-0.5 hover:bg-secondary",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:border-white/10 hover:bg-white/[0.05] hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3.5 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
