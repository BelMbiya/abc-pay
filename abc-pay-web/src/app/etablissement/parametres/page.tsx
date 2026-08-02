"use client";

import { useEffect, useState } from "react";
import { UserPlus, ShieldCheck } from "lucide-react";
import { Button, StatusPill, Pagination, usePagination } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { InviteStaffSheet } from "@/components/backoffice/InviteStaffSheet";
import { fetchStaffMembers, type StaffMember } from "@/lib/staff-members-api";
import { getStaffUser } from "@/lib/staff-auth";

const ROLE_LABEL: Record<string, string> = {
  direction: "Direction",
  comptable: "Comptable",
  caissier: "Caissier",
  consultation: "Consultation",
};

export default function ParametresPage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [me, setMe] = useState<ReturnType<typeof getStaffUser>>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture localStorage (client only)
    setMe(getStaffUser());
    let alive = true;
    fetchStaffMembers()
      .then((list) => alive && setMembers(list))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const isDirection = me?.role === "direction";
  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(members);

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Paramètres"
        subtitle="Personnel et rôles de l'établissement"
        actions={isDirection ? <Button fullWidth={false} icon={UserPlus} onClick={() => setInviteOpen(true)}>Inviter un membre</Button> : undefined}
      />

      {me ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-grad-navy p-5 text-white">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15 text-gold-400">
            <ShieldCheck className="size-[22px]" strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <div className="truncate font-display text-[15px] font-bold">{me.name ?? me.email}</div>
            <div className="text-[12px] text-white/60">{me.email} · {ROLE_LABEL[me.role] ?? me.role}</div>
          </div>
        </div>
      ) : null}

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

      {!isDirection && !loading ? (
        <p className="mt-4 text-[12px] text-gray-500">Seule la direction peut inviter de nouveaux membres.</p>
      ) : null}

      <InviteStaffSheet open={inviteOpen} onClose={() => setInviteOpen(false)} onCreated={(m) => setMembers((prev) => [...prev, m])} />
    </div>
  );
}
