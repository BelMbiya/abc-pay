"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/backoffice/StatCard";
import { fetchAdminDashboard, type AdminDashboard } from "@/lib/dashboard-api";

export default function AdminIntegrationsPage() {
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

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Intégrations opérateurs"
        subtitle="Santé des canaux de paiement (activité réelle sur la plateforme)"
        actions={
          <button type="button" onClick={load} aria-label="Actualiser" className="flex size-[42px] items-center justify-center rounded-[12px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
          </button>
        }
      />

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger les intégrations. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {(d?.operators_health ?? []).map((o) => (
            <div key={o.name} className="rounded-2xl bg-gray-100 p-5">
              <div className="mb-3 flex items-start justify-between">
                <h2 className="font-display text-[14.5px] font-bold text-ink">{o.name}</h2>
                <span className={`flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[10px] font-extrabold ${o.status === "operational" ? "bg-success-bg text-green" : "bg-gray-300/40 text-gray-500"}`}>
                  <span className={`size-2 rounded-full ${o.status === "operational" ? "bg-green" : "bg-gray-500"}`} />
                  {o.status === "operational" ? "Opérationnel" : "En veille"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5">
                <span className="text-[12px] text-gray-500">Transactions traitées</span>
                <span className="text-[12px] font-bold text-ink">{o.count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
