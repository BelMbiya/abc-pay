"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, TrendingUp, Percent, Banknote, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui";
import { StatCard, PageHeader } from "@/components/backoffice/StatCard";
import { money } from "@/lib/money";
import { fetchStaffDashboard, CHANNEL_COLORS, type EstablishmentDashboard } from "@/lib/dashboard-api";
import { fetchStaffTransactions, type TxRow } from "@/lib/tx-views-api";
import { channelLabel } from "@/lib/transactions-api";
import { downloadCsv } from "@/lib/csv";
import { exportPdf, exportExcel, type ExportOptions } from "@/lib/export";
import { PERIODS, inPeriod, DEFAULT_PERIOD, type Period } from "@/lib/period";

export default function RapportsPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [d, setD] = useState<EstablishmentDashboard | null>(null);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [dash, tx] = await Promise.all([fetchStaffDashboard(), fetchStaffTransactions()]);
      setD(dash);
      setTxs(tx.transactions);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchStaffDashboard(), fetchStaffTransactions()])
      .then(([dash, tx]) => {
        if (!active) return;
        setD(dash);
        setTxs(tx.transactions);
        setState("ready");
      })
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  // Journal filtré par période (le rapport suit le filtre en cours).
  const filtered = useMemo(() => txs.filter((t) => inPeriod(t.created_at, period)), [txs, period]);
  const scoped = useMemo(() => {
    const done = filtered.filter((t) => t.status === "confirmee");
    return {
      count: done.length,
      collected: done.reduce((a, t) => a + t.amount, 0),
      commission: done.reduce((a, t) => a + t.commission, 0),
      net: done.reduce((a, t) => a + t.net, 0),
    };
  }, [filtered]);

  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? "";

  const exportCsv = () => {
    const header = ["Date", "Élève", "Matricule", "Type de frais", "Acteur", "Moyen", "Montant", "Commission", "Net", "Devise", "Statut", "N° reçu"];
    const rows = filtered.map((t) => [
      t.created_at ? new Date(t.created_at).toLocaleString("fr-FR") : "",
      t.student_name ?? "",
      t.student_matricule ?? "",
      t.fee_type ?? "",
      t.actor ?? "",
      channelLabel(t.channel),
      t.amount,
      t.commission,
      t.net,
      t.currency,
      t.status,
      t.receipt_number ?? "",
    ]);
    downloadCsv(`rapport-abc-pay-${period}-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  };

  // Jeu d'export (PDF/Excel) — TOUJOURS sur le journal filtré courant.
  const exportData = (): ExportOptions => ({
    title: "Rapport — encaissements",
    subtitle: `${periodLabel} · ${scoped.count} paiement(s) · encaissé ${money(scoped.collected)} · commission ${money(scoped.commission)} · net ${money(scoped.net)}`,
    columns: [
      { header: "Date", key: "date" },
      { header: "Élève", key: "student" },
      { header: "Matricule", key: "matricule" },
      { header: "Type", key: "fee" },
      { header: "Acteur", key: "actor" },
      { header: "Moyen", key: "channel" },
      { header: "Montant", key: "amount", align: "right" },
      { header: "Commission", key: "commission", align: "right" },
      { header: "Net", key: "net", align: "right" },
      { header: "Statut", key: "status" },
    ],
    rows: filtered.map((t) => ({
      date: t.created_at ? new Date(t.created_at).toLocaleString("fr-FR") : "",
      student: t.student_name ?? "",
      matricule: t.student_matricule ?? "",
      fee: t.fee_type ?? "",
      actor: t.actor ?? "",
      channel: channelLabel(t.channel),
      amount: money(t.amount, t.currency),
      commission: money(t.commission, t.currency),
      net: money(t.net, t.currency),
      status: t.status,
    })),
    filename: `rapport-abc-pay-${period}`,
  });

  const k = d?.kpis;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Rapports"
        subtitle="Synthèse de vos encaissements et export comptable"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" fullWidth={false} icon={FileText} disabled={state !== "ready" || filtered.length === 0} onClick={() => exportPdf(exportData())}>PDF</Button>
            <Button variant="outline" fullWidth={false} icon={FileSpreadsheet} disabled={state !== "ready" || filtered.length === 0} onClick={() => exportExcel(exportData())}>Excel</Button>
            <Button fullWidth={false} icon={Download} disabled={state !== "ready" || filtered.length === 0} onClick={exportCsv}>CSV</Button>
          </div>
        }
      />

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger les rapports. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : (
        <>
          {/* Filtre période : le journal exporté et la synthèse ci-dessous le suivent. */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-gray-100 px-4 py-3">
            <label htmlFor="periode" className="text-[12.5px] font-bold text-gray-700">Période</label>
            <select
              id="periode"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="rounded-[10px] border-[1.5px] border-white bg-white px-3 py-2 text-[13px] font-semibold text-ink focus:border-blue-500 focus:outline-none"
            >
              {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <span className="text-[12px] text-gray-500">
              {periodLabel} — <b className="text-gray-700">{scoped.count}</b> paiement(s) · encaissé <b className="text-gray-700">{money(scoped.collected)}</b> · commission {money(scoped.commission)} · net <b className="text-gray-700">{money(scoped.net)}</b>
            </span>
          </div>

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
