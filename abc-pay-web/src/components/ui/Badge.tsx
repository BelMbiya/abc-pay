import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

/** Badge « vérifié / payé » (vert) — cf. .profile-badge/.receipt-status du MVP. */
export function VerifiedBadge({ children = "Vérifié", className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill bg-success-bg px-2.5 py-1.5 text-[10.5px] font-extrabold text-green",
        className,
      )}
    >
      <ShieldCheck className="size-3" strokeWidth={2.4} />
      {children}
    </span>
  );
}

/** Pastille de statut (Disponible / Bientôt…). */
export function StatusPill({
  children,
  tone = "soon",
  className,
}: {
  children: ReactNode;
  tone?: "soon" | "live" | "gold";
  className?: string;
}) {
  const tones = {
    soon: "bg-gray-300 text-gray-700",
    live: "bg-success-bg text-green",
    gold: "bg-gold-400 text-gold-ink",
  } as const;
  return (
    <span
      className={cn(
        "rounded-pill px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
