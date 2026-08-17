"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Star } from "lucide-react";
import { Button, StatusPill, Pagination, usePagination } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { ReviewSheet } from "@/components/payer/ReviewSheet";
import { EstablishmentSettingsCard } from "@/components/backoffice/EstablishmentSettingsCard";
import { fetchStaffMembers, type StaffMember } from "@/lib/staff-members-api";
import { getStaffUser, getStaffToken } from "@/lib/staff-auth";

const ROLE_LABEL: Record<string, string> = {
  direction: "Direction",
  comptable: "Comptable",
  caissier: "Caissier",
  consultation: "Consultation",
};

export default function ParametresPage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<ReturnType<typeof getStaffUser>>(null);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- lecture localStorage (client only) */
    setMe(getStaffUser());
    setToken(getStaffToken() ?? undefined);
    /* eslint-enable react-hooks/set-state-in-effect */
    let alive = true;
    fetchStaffMembers()
      .then((list) => alive && setMembers(list))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(members);

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader title="Paramètres" subtitle="Compte et personnel de l'établissement" />

      {me ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-grad-navy p-5 text-white">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15 text-gold-400">
            <ShieldCheck className="size-[22px]" strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[15px] font-bold">{me.establishment_name ?? me.name ?? me.email}</div>
            <div className="text-[12px] text-white/60">{me.email} · {ROLE_LABEL[me.role] ?? me.role}</div>
          </div>
        </div>
      ) : null}

      <EstablishmentSettingsCard canEdit={me?.role === "direction"} />

      {/* Avis de l'établissement sur abc pay (publié sur la landing après validation) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[1.5px] border-gray-100 bg-white p-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
            <Star className="size-4 shrink-0 fill-gold-500 text-gold-500" strokeWidth={1.5} /> Votre avis sur abc pay
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-500">Partagez votre expérience — les avis validés apparaissent sur notre page d&apos;accueil.</p>
        </div>
        <Button fullWidth={false} icon={Star} onClick={() => setReviewOpen(true)}>Donner mon avis</Button>
      </div>

      <h2 className="mb-3 font-display text-[14px] font-bold text-ink">Personnel ({members.length})</h2>
      <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
              <th className="pb-3 pr-3">Membre</th>
              <th className="pb-3 pr-3">Email</th>
              <th className="pb-3 text-right">Rôle</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((m) => (
              <tr key={m.id} className="border-t border-white text-[13px]">
                <td className="py-3 pr-3 font-bold text-ink">{m.name ?? "—"}</td>
                <td className="py-3 pr-3 text-gray-500">{m.email ?? "—"}</td>
                <td className="py-3 text-right">
                  <StatusPill tone={m.role === "direction" ? "gold" : "live"}>{ROLE_LABEL[m.role] ?? m.role}</StatusPill>
                </td>
              </tr>
            ))}
            {loading ? <tr><td colSpan={3} className="py-8 text-center text-[13px] text-gray-500">Chargement…</td></tr> : null}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />

      <ReviewSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        base="/api/v1/staff"
        token={token}
        rolePlaceholder="Ex : Directrice, Comptable"
      />
    </div>
  );
}
