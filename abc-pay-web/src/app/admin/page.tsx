"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleDollarSign, Coins, Building2, ArrowLeftRight, ShieldAlert, RefreshCw } from "lucide-react";
import { StatCard, PageHeader } from "@/components/backoffice/StatCard";
import { money } from "@/lib/money";
import { fetchAdminDashboard, CHANNEL_COLORS, type AdminDashboard } from "@/lib/dashboard-api";

export default function AdminOverviewPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [d, setD] = useState<AdminDashboard | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setD(await fetchAdminDashboard());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminDashboard().then((r) => active && (setD(r), setState("ready"))).catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  const k = d?.kpis;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Vue d'ensemble"
        subtitle="Supervision financière globale de la plateforme abc pay"
        actions={
          <button type="button" onClick={load} aria-label="Actualiser" className="flex size-[42px] items-center justify-center rounded-[12px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
          </button>
        }
      />

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger la vue d&apos;ensemble. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <StatCard label="Volume traité" value={`${money(k?.volume ?? 0)}`} icon={CircleDollarSign} tone="navy" hint="Cumul plateforme" />
            <StatCard label="Commission générée" value={`${money(k?.commission ?? 0)}`} icon={Coins} hint="Revenu abc pay" />
            <StatCard label="Établissements actifs" value={`${k?.active_establishments ?? 0}`} icon={Building2} hint={`${k?.establishments ?? 0} au total`} />
            <StatCard label="Transactions" value={`${k?.transactions ?? 0}`} icon={ArrowLeftRight} hint="Confirmées" />
          </div>

          <div className="mt-4 grid gap-3.5 lg:grid-cols-5">
            <div className="rounded-2xl bg-gray-100 p-5 lg:col-span-3">
              <h2 className="mb-4 font-display text-[14px] font-bold text-ink">Volume par opérateur</h2>
              {(d?.by_operator.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-[13px] text-gray-500">Aucune transaction pour l&apos;instant.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {d!.by_operator.map((m) => (
                    <div key={m.channel}>
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <span className="flex items-center gap-2 font-semibold text-gray-700"><span className="size-2.5 rounded-full" style={{ background: CHANNEL_COLORS[m.channel] ?? "#6B7484" }} />{m.label}</span>
                        <span className="font-bold text-ink">{m.pct} % · {money(m.amount)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-pill bg-white"><div className="h-full rounded-pill" style={{ width: `${m.pct}%`, background: CHANNEL_COLORS[m.channel] ?? "#6B7484" }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-gray-100 p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-[14px] font-bold text-ink">Santé des opérateurs</h2>
                <Link href="/admin/integrations" className="text-[11px] font-bold text-blue-600 hover:underline">Détails</Link>
              </div>
              <div className="flex flex-col gap-2.5">
                {(d?.operators_health ?? []).map((o) => (
                  <div key={o.name} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5">
                    <span className={`size-2.5 rounded-full ${o.status === "operational" ? "bg-green" : "bg-gray-300"}`} />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">{o.name}</span>
                    <span className="shrink-0 text-[10.5px] font-semibold text-gray-500">{o.count} tx</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3.5 lg:grid-cols-5">
            <div className="rounded-2xl bg-gray-100 p-5 lg:col-span-3">
              <h2 className="mb-4 font-display text-[14px] font-bold text-ink">Top établissements (volume)</h2>
              {(d?.top_establishments.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-[13px] text-gray-500">—</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {d!.top_establishments.map((e, i) => (
                    <div key={e.name + i} className="flex items-center gap-3 border-t border-white py-2.5 text-[13px] first:border-t-0">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-white font-display text-[11px] font-bold text-blue-700">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-bold text-ink">{e.name}</span>
                      <span className="shrink-0 font-bold text-ink">{money(e.volume)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-gray-100 p-5 lg:col-span-2">
              <div className="mb-4 flex items-center gap-2"><ShieldAlert className="size-[18px] text-red" strokeWidth={2.2} /><h2 className="font-display text-[14px] font-bold text-ink">Alertes de risque</h2></div>
              {(d?.alerts.length ?? 0) === 0 ? (
                <p className="rounded-xl bg-white p-3 text-[12px] text-gray-500">Aucune alerte détectée.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {d!.alerts.map((a) => (
                    <div key={a.title} className="rounded-xl bg-white p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] font-bold text-ink">{a.title}</span>
                        <span className={a.level === "high" ? "rounded-pill bg-[#FDE7E8] px-2 py-0.5 text-[9.5px] font-extrabold uppercase text-red" : "rounded-pill bg-fee-bg px-2 py-0.5 text-[9.5px] font-extrabold uppercase text-gold-600"}>{a.level === "high" ? "Élevé" : "Moyen"}</span>
                      </div>
                      <p className="mt-1 text-[11.5px] text-gray-500">{a.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
