"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, QrCode, ChevronDown } from "lucide-react";
import { StatusPill, Pagination, usePagination } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { money } from "@/lib/money";
import { channelLabel, CHANNEL_LABELS } from "@/lib/transactions-api";
import { fetchStaffTransactions, type TxRow, type TxSummary } from "@/lib/tx-views-api";
import { getStaffUser } from "@/lib/staff-auth";
import { EstablishmentQrCard } from "@/components/qr/EstablishmentQrCard";
import { PERIODS, inPeriod, DEFAULT_PERIOD, type Period } from "@/lib/period";

const STATUS: Record<string, "live" | "gold" | "soon"> = { confirmee: "live", en_attente: "gold", echouee: "soon" };
const STATUS_LABEL: Record<string, string> = { confirmee: "Confirmé", en_attente: "En attente", echouee: "Échoué" };

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: "green" }) {
  return (
    <div className="rounded-2xl bg-gray-100 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 font-display text-[20px] font-extrabold ${accent === "green" ? "text-green" : "text-ink"}`}>{value}</p>
    </div>
  );
}

const selectCls = "shrink-0 rounded-[12px] border-[1.5px] border-gray-100 bg-gray-100 px-3 py-2.5 text-[13px] font-semibold text-ink focus:border-blue-500 focus:bg-white focus:outline-none";

export default function PaiementsPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [rows, setRows] = useState<TxRow[]>([]);
  const [summary, setSummary] = useState<TxSummary | null>(null);
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [showQr, setShowQr] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const data = await fetchStaffTransactions();
      setRows(data.transactions);
      setSummary(data.summary);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchStaffTransactions()
      .then((d) => active && (setRows(d.transactions), setSummary(d.summary), setState("ready")))
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (channel !== "all" && r.channel !== channel) return false;
      if (status !== "all" && r.status !== status) return false;
      if (!inPeriod(r.created_at, period)) return false;
      if (!s) return true;
      return [r.student_name, r.student_matricule, r.receipt_number, r.fee_type].some((v) => (v ?? "").toLowerCase().includes(s));
    });
  }, [rows, q, channel, status, period]);

  // Les tuiles s'adaptent au filtre (période/moyen/statut) ; sinon la synthèse serveur.
  const filteredActive = channel !== "all" || status !== "all" || period !== "all" || q.trim() !== "";
  const view = useMemo(() => ({
    volume: filtered.filter((r) => r.status === "confirmee").reduce((a, r) => a + r.amount, 0),
    net: filtered.filter((r) => r.status === "confirmee").reduce((a, r) => a + r.net, 0),
  }), [filtered]);

  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(filtered);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader title="Paiements" subtitle="Journal des encaissements de votre établissement" />

      {getStaffUser()?.establishment_id ? (
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            aria-expanded={showQr}
            aria-controls="qr-paiement"
            className="inline-flex items-center gap-2 rounded-[12px] bg-gray-100 px-4 py-2.5 text-[13px] font-bold text-ink transition-colors hover:bg-gray-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <QrCode className="size-[18px] text-blue-600" strokeWidth={2} />
            QR de paiement
            <ChevronDown className={`size-4 text-gray-500 transition-transform ${showQr ? "rotate-180" : ""}`} strokeWidth={2.4} />
          </button>
          {showQr ? (
            <div id="qr-paiement" className="mt-3">
              <EstablishmentQrCard refCode={getStaffUser()!.establishment_id} name={rows[0]?.establishment ?? "Votre établissement"} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Tile label={filteredActive ? "Encaissé (filtré)" : "Total encaissé"} value={`${money(filteredActive ? view.volume : summary?.volume ?? 0)}`} />
        <Tile label="Net à reverser" value={`${money(filteredActive ? view.net : summary?.net ?? 0)}`} accent="green" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-gray-500" strokeWidth={2} />
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Élève, matricule, n° de reçu…" autoComplete="off" className="w-full rounded-[12px] border-[1.5px] border-gray-100 bg-gray-100 py-2.5 pl-11 pr-4 text-[14px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none" />
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={selectCls} aria-label="Filtrer par période">
          {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className={selectCls} aria-label="Filtrer par moyen">
          <option value="all">Tous les moyens</option>
          {Object.entries(CHANNEL_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} aria-label="Filtrer par statut">
          <option value="all">Tous les statuts</option>
          <option value="confirmee">Confirmé</option>
          <option value="en_attente">En attente</option>
          <option value="echouee">Échoué</option>
        </select>
        <button type="button" onClick={load} aria-label="Actualiser" className="flex size-[44px] shrink-0 items-center justify-center rounded-[12px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
        </button>
      </div>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger les paiements. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : state === "ready" && filtered.length === 0 ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Aucun paiement ne correspond.</div>
      ) : (
        <>
        <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-3">Date</th>
                <th className="pb-3 pr-3">Élève</th>
                <th className="pb-3 pr-3">Moyen</th>
                <th className="pb-3 pr-3 text-right">Montant</th>
                <th className="pb-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {state === "loading"
                ? [0, 1, 2, 3].map((i) => <tr key={i} className="border-t border-white"><td colSpan={5} className="py-3"><div className="h-4 animate-pulse rounded bg-white" /></td></tr>)
                : pageItems.map((t) => (
                    <tr key={t.id} className="border-t border-white text-[13px]">
                      <td className="py-3 pr-3 text-gray-500">{fdate(t.created_at)}</td>
                      <td className="py-3 pr-3"><div className="font-bold text-ink">{t.student_name ?? "—"}</div><div className="text-[11px] text-gray-500">{t.student_matricule ?? ""} · {t.fee_type ?? ""}</div></td>
                      <td className="py-3 pr-3 text-gray-500">{channelLabel(t.channel)}</td>
                      <td className="py-3 pr-3 text-right font-bold text-ink">{money(t.amount, t.currency)}</td>
                      <td className="py-3"><StatusPill tone={STATUS[t.status] ?? "soon"}>{STATUS_LABEL[t.status] ?? t.status}</StatusPill></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
        </>
      )}
    </div>
  );
}
