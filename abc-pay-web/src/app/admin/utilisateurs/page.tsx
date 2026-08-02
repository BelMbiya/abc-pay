"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, BadgeCheck, Users as UsersIcon } from "lucide-react";
import { StatusPill, Pagination, usePagination } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { fetchUsers, ROLE_LABEL, type AdminUser } from "@/lib/admin-users-api";
import { AdminUserSheet } from "@/components/admin/AdminUserSheet";

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export default function AdminUsersPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setItems(await fetchUsers());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchUsers()
      .then((d) => active && (setItems(d), setState("ready")))
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((u) => [u.name, u.phone, u.email].some((v) => (v ?? "").toLowerCase().includes(s)));
  }, [items, q]);

  const blocked = useMemo(() => items.filter((u) => u.is_blocked).length, [items]);
  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(filtered);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader title="Utilisateurs" subtitle={`${items.length} compte${items.length > 1 ? "s" : ""} · ${blocked} bloqué${blocked > 1 ? "s" : ""}`} />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-gray-500" strokeWidth={2} />
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, téléphone, e-mail…" autoComplete="off" className="w-full rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 py-3 pl-11 pr-4 text-[14px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none" />
        </div>
        <button type="button" onClick={load} aria-label="Actualiser" className="flex size-[46px] shrink-0 items-center justify-center rounded-[13px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
        </button>
      </div>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : state === "ready" && filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-100 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-white text-gray-500"><UsersIcon className="size-6" strokeWidth={2} /></span>
          <p className="text-[13px] text-gray-500">Aucun utilisateur.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-3">Utilisateur</th>
                  <th className="pb-3 pr-3">Rôle</th>
                  <th className="pb-3 pr-3">KYC</th>
                  <th className="pb-3 pr-3 text-right">Transactions</th>
                  <th className="pb-3 pr-3">Membre depuis</th>
                  <th className="pb-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {state === "loading"
                  ? [0, 1, 2, 3].map((i) => <tr key={i} className="border-t border-white"><td colSpan={6} className="py-3"><div className="h-4 animate-pulse rounded bg-white" /></td></tr>)
                  : pageItems.map((u) => (
                      <tr key={u.id} onClick={() => setSelected(u.id)} className="cursor-pointer border-t border-white text-[13px] hover:bg-white/60">
                        <td className="py-3 pr-3">
                          <div className="font-bold text-ink">{u.name || "—"}</div>
                          <div className="text-[11.5px] text-gray-500">{u.phone}</div>
                        </td>
                        <td className="py-3 pr-3 text-gray-500">{ROLE_LABEL[u.role] ?? u.role}</td>
                        <td className="py-3 pr-3">{u.kyc_complete ? <span className="inline-flex items-center gap-1 text-[12px] font-bold text-green"><BadgeCheck className="size-4" strokeWidth={2.2} />Vérifié</span> : <span className="text-[12px] text-gray-500">Incomplet</span>}</td>
                        <td className="py-3 pr-3 text-right font-bold text-ink">{u.transactions_count}</td>
                        <td className="py-3 pr-3 text-gray-500">{fdate(u.created_at)}</td>
                        <td className="py-3"><StatusPill tone={u.is_blocked ? "soon" : "live"}>{u.is_blocked ? "Bloqué" : "Actif"}</StatusPill></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
        </>
      )}

      <AdminUserSheet userId={selected} onClose={() => setSelected(null)} onChanged={load} />
    </div>
  );
}
