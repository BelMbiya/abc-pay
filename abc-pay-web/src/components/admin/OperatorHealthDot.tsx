import { cn } from "@/lib/cn";
import type { OperatorStatus } from "@/lib/admin-data";

const MAP: Record<OperatorStatus, { color: string; ring: string; label: string }> = {
  healthy: { color: "bg-green", ring: "bg-green/30", label: "Opérationnel" },
  degraded: { color: "bg-gold-500", ring: "bg-gold-500/30", label: "Dégradé" },
  down: { color: "bg-red", ring: "bg-red/30", label: "Hors service" },
};

/** Pastille de santé (point coloré + halo). */
export function OperatorHealthDot({ status, withLabel = false }: { status: OperatorStatus; withLabel?: boolean }) {
  const s = MAP[status];
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="relative flex size-2.5 items-center justify-center">
        <span className={cn("absolute size-2.5 animate-ping rounded-full", s.ring)} />
        <span className={cn("size-2 rounded-full", s.color)} />
      </span>
      {withLabel ? <span className="text-[12px] font-bold text-ink">{s.label}</span> : null}
    </span>
  );
}
