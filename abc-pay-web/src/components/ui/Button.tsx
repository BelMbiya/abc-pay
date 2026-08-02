"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "dark" | "ghost" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  icon?: LucideIcon;
}

const variants: Record<Variant, string> = {
  // CTA signature : dégradé bleu (btn-primary du MVP)
  primary: "bg-grad-primary text-white shadow-[0_10px_24px_rgba(24,87,184,0.28)]",
  dark: "bg-navy text-white",
  ghost: "bg-gray-100 text-ink hover:bg-gray-300/60",
  outline: "border-[1.5px] border-gray-300 bg-white text-ink hover:border-gray-500",
};

/** Bouton abc pay — pill, Inter 700, états hover/active/focus accessibles. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", fullWidth = true, icon: Icon, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-pill px-4 py-[15px]",
        "text-[14.5px] font-bold leading-none transition-[transform,background,box-shadow] duration-150",
        "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        fullWidth && "w-full",
        variants[variant],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="size-[18px]" strokeWidth={2.2} /> : null}
      {children}
    </button>
  );
});
