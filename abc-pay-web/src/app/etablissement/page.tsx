"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, TrendingUp, Percent, Banknote, RefreshCw } from "lucide-react";
import { StatCard, PageHeader } from "@/components/backoffice/StatCard";
import { fmt } from "@/lib/api";
import { money } from "@/lib/money";
import { fetchStaffDashboard, CHANNEL_COLORS, type EstablishmentDashboard } from "@/lib/dashboard-api";
import { getStaffUser, updateStaffUser } from "@/lib/staff-auth";

export default function DashboardPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [d, setD] = useState<EstablishmentDashboard | null>(null);
  const [estName, setEstName] = useState<string | null>(null);

  // Nom de l'établissement connecté (session locale → repli, corrige les anciennes sessions).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- init depuis localStorage
  useEffect(() => setEstName(getStaffUser()?.establishment_name ?? null), []);

  // Le dashboard porte toujours le nom à jour → source prioritaire (indépendante de la session).
  const establishmentName = d?.establishment_name ?? estName;

  // Auto-réparation : réinjecte le nom dans la session (corrige le rail/avatar au prochain
  // rechargement pour les sessions ouvertes avant l'ajout du nom au login).
  useEffect(() => {
    if (d?.establishment_name) updateStaffUser({ establishment_name: d.establishment_name });
  }, [d?.establishment_name]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setD(await fetchStaffDashboard());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchStaffDashboard().then((r) => active && (setD(r), setState("ready"))).catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  const k = d?.kpis;
  const weekly = d?.weekly ?? [];
  const maxWeek = Math.max(1, ...weekly.map((w) => w.value));

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title={establishmentName ?? "Tableau de bord"}
        subtitle={establishmentName ? "Tableau de bord — vue en temps réel" : "Vue en temps réel de votre établissement"}
        actions={
          <button type="button" onClick={load} aria-label="Actualiser" className="flex size-[42px] items-center justify-center rounded-[12px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
          </button>
        }
      />

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger le tableau de bord. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <StatCard label="Attendu" value={`${money(k?.expected ?? 0)}`} icon={Wallet} hint="Total à recouvrer" />
            <StatCard label="Encaissé" value={`${money(k?.collected ?? 0)}`} icon={TrendingUp} hint="Paiements confirmés" />
            <StatCard label="Taux de recouvrement" value={`${k?.recovery_rate ?? 0} %`} icon={Percent} tone="navy" hint={`${money(k?.remaining ?? 0)} restants`} />
            <StatCard label="Net à reverser" value={`${money(k?.pending_net ?? 0)}`} icon={Banknote} hint="Après commission" />
          </div>

          <div className="mt-4 grid gap-3.5 lg:grid-cols-5">
            <div className="rounded-2xl bg-gray-100 p-5 lg:col-span-3">
              <h2 className="mb-4 font-display text-[14px] font-bold text-ink">Encaissements par semaine</h2>
              {weekly.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-gray-500">Aucun encaissement pour l&apos;instant.</p>
              ) : (
                <div className="flex h-40 items-end gap-2">
                  {weekly.map((w, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-[10px] font-bold text-ink">{fmt(w.value)}</span>
                      <div className="flex w-full flex-1 items-end">
                        <div className="w-full rounded-t-lg bg-grad-primary transition-all" style={{ height: `${Math.max(4, (w.value / maxWeek) * 100)}%` }} title={`${money(w.value)}`} />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-500">{w.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-gray-100 p-5 lg:col-span-2">
              <h2 className="mb-4 font-display text-[14px] font-bold text-ink">Par moyen de paiement</h2>
              {(d?.by_channel.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-[13px] text-gray-500">—</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {d!.by_channel.map((m) => (
                    <div key={m.channel}>
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <span className="flex items-center gap-2 font-semibold text-gray-700"><span className="size-2.5 rounded-full" style={{ background: CHANNEL_COLORS[m.channel] ?? "#6B7484" }} />{m.label}</span>
                        <span className="font-bold text-ink">{m.pct} %</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-pill bg-white"><div className="h-full rounded-pill" style={{ width: `${m.pct}%`, background: CHANNEL_COLORS[m.channel] ?? "#6B7484" }} /></div>
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
