import type { LucideIcon } from "lucide-react";
import { PageHeader } from "./StatCard";

/** Écran de section back-office en cours de construction (mêmes styles). */
export function SectionPlaceholder({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-100/50 py-20 text-center">
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-card">
          <Icon className="size-6" strokeWidth={2} />
        </span>
        <p className="font-display text-[16px] font-bold text-ink">Section en cours de construction</p>
        <p className="mt-1 max-w-sm text-[13px] text-gray-500">
          Cet écran sera branché sur l&apos;API abc pay lors de la prochaine étape.
        </p>
      </div>
    </div>
  );
}
