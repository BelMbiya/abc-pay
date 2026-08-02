"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, CalendarClock, Banknote, RefreshCw } from "lucide-react";
import { StatCard, PageHeader } from "@/components/backoffice/StatCard";
import { StatusPill, Pagination, usePagination } from "@/components/ui";
import { fmt } from "@/lib/api";
import { money } from "@/lib/money";
import { fetchStaffSettlements, type SettlementData } from "@/lib/tx-views-api";

export default function ReversementsPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<SettlementData | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await fetchStaffSettlements());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchStaffSettlements()
      .then((d) => active && (setData(d), setState("ready")))
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  const weekly = data?.weekly ?? [];
  const maxNet = Math.max(1, ...weekly.map((w) => w.net));
  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(data?.settlements ?? []);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Reversements"
        subtitle="Net à reverser, dérivé de vos encaissements confirmés"
        actions={
          <button type="button" onClick={load} aria-label="Actualiser" className="flex size-[42px] items-center justify-center rounded-[12px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
          </button>
        }
      />

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger les reversements. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <StatCard label="Net à reverser" value={`${money(data?.pending_net ?? 0)}`} icon={Wallet} tone="navy" hint="Semaine en cours, après commission" />
            <StatCard label="Prochain reversement" value={data?.pending_period ?? "—"} icon={CalendarClock} hint="Période en attente" />
            <StatCard label="Total net (historique)" value={`${money(data?.total_net ?? 0)}`} icon={Banknote} hint="Cumul sur la période" />
          </div>

          {/* Graphe : net par semaine */}
          <div className="mb-6 rounded-2xl bg-gray-100 p-5">
            <h2 className="mb-4 font-display text-[14px] font-bold text-ink">Net reversé par semaine</h2>
            {weekly.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-gray-500">Aucun encaissement pour l&apos;instant.</p>
            ) : (
              <div className="flex items-end gap-3" style={{ height: 160 }}>
                {weekly.map((w, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[10.5px] font-bold text-ink">{fmt(w.net)}</span>
                    <div className="w-full rounded-t-lg bg-grad-primary transition-all" style={{ height: `${Math.max(4, (w.net / maxNet) * 120)}px` }} />
                    <span className="text-[10px] text-gray-500">{w.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h2 className="mb-3 font-display text-[14px] font-bold text-ink">Historique des reversements</h2>
          <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-3">Période</th>
                  <th className="pb-3 pr-3 text-right">Brut encaissé</th>
                  <th className="pb-3 pr-3 text-right">Commission</th>
                  <th className="pb-3 pr-3 text-right">Net</th>
                  <th className="pb-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {state === "loading" ? (
                  [0, 1, 2].map((i) => <tr key={i} className="border-t border-white"><td colSpan={5} className="py-3"><div className="h-4 animate-pulse rounded bg-white" /></td></tr>)
                ) : (data?.settlements.length ?? 0) === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-[13px] text-gray-500">Aucun reversement pour l&apos;instant.</td></tr>
                ) : (
                  pageItems.map((s) => (
                    <tr key={s.week_start} className="border-t border-white text-[13px]">
                      <td className="py-3 pr-3 font-bold text-ink">{s.period}<div className="text-[11px] font-normal text-gray-500">{s.count} transaction{s.count > 1 ? "s" : ""}</div></td>
                      <td className="py-3 pr-3 text-right text-gray-700">{money(s.gross)}</td>
                      <td className="py-3 pr-3 text-right text-gold-600">− {money(s.commission)}</td>
                      <td className="py-3 pr-3 text-right font-bold text-ink">{money(s.net)}</td>
                      <td className="py-3">{s.status === "paid" ? <StatusPill tone="live">Reversé</StatusPill> : <StatusPill tone="gold">En attente</StatusPill>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
        </>
      )}
    </div>
  );
}
