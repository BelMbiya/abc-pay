"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Puce sélectionnable (relation, type de frais…) — cf. .chip/.chip.sel du MVP. */
export function Chip({ selected = false, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "rounded-pill border-[1.5px] px-3.5 py-2.5 text-[12.5px] font-bold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        selected
          ? "border-blue-500 bg-blue-100 text-blue-700"
          : "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-300/50",
        className,
      )}
      {...props}
    />
  );
}

/** Conteneur de puces (wrap). */
export function ChipGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>;
}
