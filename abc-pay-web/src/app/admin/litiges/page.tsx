"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LifeBuoy, RefreshCw } from "lucide-react";
import { StatusPill, Pagination, usePagination } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { money } from "@/lib/money";
import { channelLabel, txParty } from "@/lib/transactions-api";
import { fetchAdminTransactions, type TxRow } from "@/lib/tx-views-api";

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
}

export default function LitigesPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [rows, setRows] = useState<TxRow[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const { transactions } = await fetchAdminTransactions();
      setRows(transactions);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminTransactions().then((r) => active && (setRows(r.transactions), setState("ready"))).catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  // File de traitement : transactions non confirmées (échec / en attente).
  const cases = useMemo(() => rows.filter((r) => r.status !== "confirmee"), [rows]);
  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(cases);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Support & litiges"
        subtitle="Transactions à traiter (échecs, en attente, contestations)"
        actions={
          <button type="button" onClick={load} aria-label="Actualiser" className="flex size-[42px] items-center justify-center rounded-[12px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
          </button>
        }
      />

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-100 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-success-bg text-green"><LifeBuoy className="size-6" strokeWidth={2} /></span>
          <p className="text-[13.5px] font-bold text-ink">Aucun cas en attente</p>
          <p className="max-w-[300px] text-[12.5px] text-gray-500">Toutes les transactions sont confirmées. Les échecs et contestations apparaîtront ici.</p>
        </div>
      ) : (
        <>
        <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-3">Date</th>
                <th className="pb-3 pr-3">Établissement / Contrepartie</th>
                <th className="pb-3 pr-3">Moyen</th>
                <th className="pb-3 pr-3 text-right">Montant</th>
                <th className="pb-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((t) => {
                const p = txParty(t);
                return (
                <tr key={t.id} className="border-t border-white text-[13px]">
                  <td className="py-3 pr-3 text-gray-500">{fdate(t.created_at)}</td>
                  <td className="py-3 pr-3">
                    <div className="font-bold text-ink">{p.title}</div>
                    {p.sub ? <div className="text-[11.5px] text-gray-500">{p.sub}</div> : null}
                  </td>
                  <td className="py-3 pr-3 text-gray-500">{channelLabel(t.channel)}</td>
                  <td className="py-3 pr-3 text-right font-bold text-ink">{money(t.amount, t.currency)}</td>
                  <td className="py-3"><StatusPill tone={t.status === "echouee" ? "soon" : "gold"}>{t.status === "echouee" ? "Échoué" : "En attente"}</StatusPill></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
        </>
      )}
    </div>
  );
}
