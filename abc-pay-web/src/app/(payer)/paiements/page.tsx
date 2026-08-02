"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { ListRow, StatusPill } from "@/components/ui";
import { PayServiceSheet, type PayTarget } from "@/components/payer/PayServiceSheet";
import { categories, type PayCategory } from "@/lib/payments-data";

export default function PaiementsPage() {
  const router = useRouter();
  const [active, setActive] = useState<PayCategory | null>(null);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);

  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 px-5 py-6">
      {!active ? (
        <>
          <h1 className="font-display text-[16px] font-bold text-ink">Tous les paiements</h1>
          <p className="mb-4 mt-0.5 text-[12.5px] text-gray-500">Tout ce que vous devez payer, au même endroit.</p>

          {/* Hero Tuition */}
          <div className="relative mb-6 overflow-hidden rounded-4xl bg-[linear-gradient(135deg,var(--color-navy),var(--color-blue-700))] p-5 text-white shadow-hero">
            <span className="mb-2.5 inline-block rounded-pill bg-gold-400 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-wide text-gold-ink">
              Notre innovation
            </span>
            <div className="font-display text-[16px] font-bold">Tuition</div>
            <p className="mt-1 text-[12px] leading-relaxed text-[#C7D3EC]">
              Tuitionne les frais scolaires et académiques, avec reçu numérique à l&apos;appui.
            </p>
            <button
              type="button"
              onClick={() => router.push("/tuition")}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-pill bg-white px-4 py-2.5 text-[12.5px] font-bold text-navy"
            >
              <GraduationCap className="size-3.5" strokeWidth={2.4} />
              Tuitionner maintenant
            </button>
          </div>

          {/* Légende + grille des catégories */}
          <div className="mb-3.5 flex items-center gap-2 text-[11.5px] text-gray-500">
            <span className="size-1.5 rounded-full bg-green" /> Disponible &nbsp;·&nbsp;
            <span className="size-1.5 rounded-full bg-gray-300" /> Bientôt (V2)
          </div>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((c) => {
              const live = c.items.filter((i) => i.live).length;
              const Icon = c.icon;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActive(c)}
                  className="rounded-2xl bg-gray-100 p-4 text-left transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span className="mb-2.5 flex size-[34px] items-center justify-center rounded-xl bg-white text-blue-600">
                    <Icon className="size-[17px]" strokeWidth={2} />
                  </span>
                  <h3 className="text-[12.5px] font-bold leading-tight text-ink">{c.title}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-gray-500">
                    <span className={`size-1.5 rounded-full ${live > 0 ? "bg-green" : "bg-gray-300"}`} />
                    {live > 0 ? `${live} disponible${live > 1 ? "s" : ""}` : `${c.items.length} bientôt`}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setActive(null)}
            className="mb-4 flex items-center gap-2 text-[13px] font-bold text-gray-700 hover:text-ink"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-gray-100">
              <ArrowLeft className="size-[18px]" strokeWidth={2.2} />
            </span>
            {active.title}
          </button>
          <div className="flex flex-col gap-2.5">
            {active.items.map((it) => (
              <ListRow
                key={it.label}
                icon={it.icon}
                title={it.label}
                subtitle={it.sub}
                disabled={!it.live}
                right={!it.live ? <StatusPill tone="soon">Bientôt</StatusPill> : undefined}
                onClick={it.live ? () => setPayTarget({ label: it.label, sub: it.sub }) : undefined}
              />
            ))}
          </div>
        </>
      )}

      <PayServiceSheet target={payTarget} onClose={() => setPayTarget(null)} />
    </div>
  );
}
