"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, TrendingUp, Percent, Banknote, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui";
import { StatCard, PageHeader } from "@/components/backoffice/StatCard";
import { money } from "@/lib/money";
import { fetchStaffDashboard, CHANNEL_COLORS, type EstablishmentDashboard } from "@/lib/dashboard-api";
import { fetchStaffTransactions } from "@/lib/tx-views-api";
import { channelLabel } from "@/lib/transactions-api";
import { downloadCsv } from "@/lib/csv";

export default function RapportsPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [d, setD] = useState<EstablishmentDashboard | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { transactions } = await fetchStaffTransactions();
      const header = ["Date", "Élève", "Matricule", "Type de frais", "Moyen", "Montant (USD)", "Commission (USD)", "Net (USD)", "Statut", "N° reçu"];
      const rows = transactions.map((t) => [
        t.created_at ? new Date(t.created_at).toLocaleString("fr-FR") : "",
        t.student_name ?? "",
        t.student_matricule ?? "",
        t.fee_type ?? "",
        channelLabel(t.channel),
        t.amount,
        t.commission,
        t.net,
        t.status,
        t.receipt_number ?? "",
      ]);
      downloadCsv(`rapport-abc-pay-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
    } finally {
      setExporting(false);
    }
  };

  const k = d?.kpis;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Rapports"
        subtitle="Synthèse de vos encaissements et export comptable"
        actions={<Button fullWidth={false} icon={Download} disabled={exporting || state !== "ready"} onClick={exportCsv}>{exporting ? "Export…" : "Exporter (CSV)"}</Button>}
      />

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger les rapports. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <StatCard label="Attendu" value={`${money(k?.expected ?? 0)}`} icon={Wallet} hint="Total à recouvrer" />
            <StatCard label="Encaissé" value={`${money(k?.collected ?? 0)}`} icon={TrendingUp} hint="Confirmé" />
            <StatCard label="Taux de recouvrement" value={`${k?.recovery_rate ?? 0} %`} icon={Percent} tone="navy" hint={`${money(k?.remaining ?? 0)} restants`} />
            <StatCard label="Net reversable" value={`${money(k?.pending_net ?? 0)}`} icon={Banknote} hint="Après commission" />
          </div>

          <div className="mt-4 rounded-2xl bg-gray-100 p-5">
            <h2 className="mb-4 font-display text-[14px] font-bold text-ink">Répartition par moyen de paiement</h2>
            {(d?.by_channel.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-[13px] text-gray-500">Aucune donnée.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {d!.by_channel.map((m) => (
                  <div key={m.channel}>
                    <div className="mb-1 flex items-center justify-between text-[12.5px]">
                      <span className="flex items-center gap-2 font-semibold text-gray-700"><span className="size-2.5 rounded-full" style={{ background: CHANNEL_COLORS[m.channel] ?? "#6B7484" }} />{m.label}</span>
                      <span className="font-bold text-ink">{m.pct} % · {money(m.amount)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-pill bg-white"><div className="h-full rounded-pill" style={{ width: `${m.pct}%`, background: CHANNEL_COLORS[m.channel] ?? "#6B7484" }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-blue-100 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600"><FileSpreadsheet className="size-[18px]" strokeWidth={2} /></span>
            <p className="text-[12.5px] leading-relaxed text-blue-700">Exportez le journal complet de vos paiements au format CSV (compatible Excel) pour votre comptabilité.</p>
          </div>
        </>
      )}
    </div>
  );
}
