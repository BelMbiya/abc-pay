import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Bloc récapitulatif (surface grise) — cf. .recap du MVP. */
export function Recap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("my-1.5 rounded-2xl bg-gray-100 px-4 py-0.5", className)}>{children}</div>;
}

/** Ligne label/valeur, séparateur léger. */
export function RecapRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-black/5 py-[11px] text-[12.5px] last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-bold text-ink">{value}</span>
    </div>
  );
}

/** Bandeau « frais de service » (fond ambre) — cf. .recap-fee du MVP. */
export function RecapFee({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="my-2.5 flex justify-between rounded-xl bg-fee-bg px-4 py-3 text-[12px] font-bold text-gold-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
