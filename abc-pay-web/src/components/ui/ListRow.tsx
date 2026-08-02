"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface ListRowProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Ligne de liste (moyen de paiement, option de menu, service…) — cf. .list-row.
 * Rendue en <button> si cliquable (a11y + focus), sinon en <div>.
 */
export function ListRow({ icon: Icon, title, subtitle, right, onClick, disabled, className }: ListRowProps) {
  const inner = (
    <>
      {Icon ? (
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-bold text-ink">{title}</span>
        {subtitle ? <span className="mt-px block truncate text-[11.5px] text-gray-500">{subtitle}</span> : null}
      </span>
      {right ? <span className="ml-auto shrink-0">{right}</span> : null}
    </>
  );

  const base = "flex w-full items-center gap-3 rounded-xl bg-gray-100 p-3 pl-3.5 text-left";

  if (!onClick) return <div className={cn(base, disabled && "opacity-55", className)}>{inner}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        base,
        "transition-[transform,background] duration-150 hover:bg-gray-300/40 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        disabled && "opacity-55",
        className,
      )}
    >
      {inner}
    </button>
  );
}
