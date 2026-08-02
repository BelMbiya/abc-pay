"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { StatusPill, Pagination, usePagination } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { money, toBase } from "@/lib/money";
import { channelLabel, CHANNEL_LABELS, txParty } from "@/lib/transactions-api";
import { fetchAdminTransactions, type TxRow, type TxSummary } from "@/lib/tx-views-api";
import { PERIODS, inPeriod, DEFAULT_PERIOD, type Period } from "@/lib/period";

const STATUS: Record<string, "live" | "gold" | "soon"> = { confirmee: "live", en_attente: "gold", echouee: "soon" };
const STATUS_LABEL: Record<string, string> = { confirmee: "Confirmé", en_attente: "En attente", echouee: "Échoué" };
const TYPE_LABEL: Record<string, string> = { tuition: "Tuition", send: "Envoi", service: "Service", receive: "Reçu" };

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: "gold" | "blue" }) {
  return (
    <div className="rounded-2xl bg-gray-100 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 font-display text-[20px] font-extrabold ${accent === "gold" ? "text-gold-600" : accent === "blue" ? "text-blue-600" : "text-ink"}`}>{value}</p>
    </div>
  );
}

const selectCls = "shrink-0 rounded-[12px] border-[1.5px] border-gray-100 bg-gray-100 px-3 py-2.5 text-[13px] font-semibold text-ink focus:border-blue-500 focus:bg-white focus:outline-none";

export default function CommissionsPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [rows, setRows] = useState<TxRow[]>([]);
  const [summary, setSummary] = useState<TxSummary | null>(null);
  const [q, setQ] = useState("");
  const [establishment, setEstablishment] = useState("all");
  const [channel, setChannel] = useState("all");
  const [type, setType] = useState("all");
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const data = await fetchAdminTransactions();
      setRows(data.transactions);
      setSummary(data.summary);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminTransactions()
      .then((d) => active && (setRows(d.transactions), setSummary(d.summary), setState("ready")))
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  const establishments = useMemo(() => Array.from(new Set(rows.map((r) => r.establishment).filter(Boolean))) as string[], [rows]);
  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.type))), [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (establishment !== "all" && r.establishment !== establishment) return false;
      if (channel !== "all" && r.channel !== channel) return false;
      if (type !== "all" && r.type !== type) return false;
      if (!inPeriod(r.created_at, period)) return false;
      if (!s) return true;
      return [r.establishment, r.student_name, r.counterparty_name, r.receipt_number].some((v) => (v ?? "").toLowerCase().includes(s));
    });
  }, [rows, q, establishment, channel, type, period]);

  // KPIs du jeu affiché : volume ventilé PAR DEVISE (USD / CDF) + commission convertie en base.
  const view = useMemo(() => {
    const usd = filtered.reduce((a, r) => a + (r.currency === "CDF" ? 0 : r.amount), 0);
    const cdf = filtered.reduce((a, r) => a + (r.currency === "CDF" ? r.amount : 0), 0);
    const commission = filtered.reduce((a, r) => a + toBase(r.commission, r.currency), 0);
    return { usd, cdf, commission, count: filtered.length };
  }, [filtered]);

  const anyFilter = establishment !== "all" || channel !== "all" || type !== "all" || period !== "all" || q.trim() !== "";

  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(filtered);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader title="Commissions & transactions" subtitle="Volume encaissé et commissions abc pay sur la plateforme" />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Volume ventilé par devise : USD et CDF séparés (jamais mélangés). */}
        <div className="rounded-2xl bg-gray-100 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{anyFilter ? "Volume (filtré)" : "Volume plateforme"}</p>
          <p className="mt-1 font-display text-[20px] font-extrabold text-blue-600">{money(view.usd, "USD")}</p>
          <p className="mt-0.5 font-display text-[16px] font-extrabold text-ink">{money(view.cdf, "CDF")}</p>
        </div>
        <Tile label="Commission abc pay" value={`${money(anyFilter ? view.commission : summary?.commission ?? 0)}`} accent="gold" />
        <Tile label="Transactions" value={`${anyFilter ? view.count : summary?.count ?? 0}`} />
      </div>

      {/* Filtres compacts sur une ligne */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-gray-500" strokeWidth={2} />
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Établissement, élève, n° de reçu…" autoComplete="off" className="w-full rounded-[12px] border-[1.5px] border-gray-100 bg-gray-100 py-2.5 pl-11 pr-4 text-[14px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none" />
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={selectCls} aria-label="Filtrer par période">
          {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select value={establishment} onChange={(e) => setEstablishment(e.target.value)} className={`${selectCls} max-w-[180px]`} aria-label="Filtrer par établissement">
          <option value="all">Tous les établissements</option>
          {establishments.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls} aria-label="Filtrer par type">
          <option value="all">Tous les types</option>
          {types.map((t) => <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>)}
        </select>
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className={selectCls} aria-label="Filtrer par moyen">
          <option value="all">Tous les moyens</option>
          {Object.entries(CHANNEL_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <button type="button" onClick={load} aria-label="Actualiser" className="flex size-[44px] shrink-0 items-center justify-center rounded-[12px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
        </button>
      </div>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger les transactions. <button onClick={load} className="font-bold text-blue-600">Réessayer</button></div>
      ) : state === "ready" && filtered.length === 0 ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Aucune transaction ne correspond.</div>
      ) : (
        <>
        <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-3">Date</th>
                <th className="pb-3 pr-3">Établissement / Contrepartie</th>
                <th className="pb-3 pr-3">Type</th>
                <th className="pb-3 pr-3">Moyen</th>
                <th className="pb-3 pr-3 text-right">Montant</th>
                <th className="pb-3 pr-3 text-right">Commission</th>
                <th className="pb-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {state === "loading"
                ? [0, 1, 2, 3].map((i) => <tr key={i} className="border-t border-white"><td colSpan={7} className="py-3"><div className="h-4 animate-pulse rounded bg-white" /></td></tr>)
                : pageItems.map((t) => (
                    <tr key={t.id} className="border-t border-white text-[13px]">
                      <td className="py-3 pr-3 text-gray-500">{fdate(t.created_at)}</td>
                      <td className="py-3 pr-3">
                        {(() => {
                          const p = txParty(t);
                          return (
                            <>
                              <div className="font-bold text-ink">{p.title}</div>
                              {p.sub ? <div className="text-[11.5px] text-gray-500">{p.sub}</div> : null}
                            </>
                          );
                        })()}
                      </td>
                      <td className="py-3 pr-3 text-gray-500">{TYPE_LABEL[t.type] ?? t.type}</td>
                      <td className="py-3 pr-3 text-gray-500">{channelLabel(t.channel)}</td>
                      <td className="py-3 pr-3 text-right font-bold text-ink">{money(t.amount, t.currency)}</td>
                      <td className="py-3 pr-3 text-right font-bold text-gold-600">{money(t.commission, t.currency)}</td>
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
