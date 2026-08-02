import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Tuile KPI du tableau de bord (libellé, valeur XXL, tendance optionnelle). */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "navy";
}) {
  const navy = tone === "navy";
  return (
    <div className={cn("rounded-2xl p-5", navy ? "bg-grad-navy text-white" : "bg-gray-100")}>
      <div className="flex items-center justify-between">
        <span className={cn("text-[12px] font-bold", navy ? "text-white/70" : "text-gray-500")}>{label}</span>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-[10px]",
            navy ? "bg-white/15 text-gold-400" : "bg-white text-blue-600",
          )}
        >
          <Icon className="size-[17px]" strokeWidth={2.1} />
        </span>
      </div>
      <p className={cn("mt-3 font-display text-[26px] font-extrabold tracking-tight", navy ? "text-white" : "text-ink")}>
        {value}
      </p>
      {hint ? <p className={cn("mt-1 text-[11.5px]", navy ? "text-white/60" : "text-gray-500")}>{hint}</p> : null}
    </div>
  );
}

/** En-tête de page back-office (titre + sous-titre + actions à droite). */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13px] text-gray-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
