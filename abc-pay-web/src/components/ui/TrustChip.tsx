import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Puce de réassurance (icône bleue + texte) — cf. .trust-chip du MVP. */
export function TrustChip({ icon: Icon, children, className }: { icon: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill bg-gray-100 px-3 py-2 text-[11px] font-bold text-gray-700",
        className,
      )}
    >
      <Icon className="size-[13px] text-blue-600" strokeWidth={2.2} />
      {children}
    </span>
  );
}
