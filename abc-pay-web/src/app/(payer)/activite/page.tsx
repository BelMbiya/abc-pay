"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { GraduationCap, ArrowUpRight, ArrowDownLeft, Zap, Download, Inbox, RefreshCw, Search } from "lucide-react";
import { money, toBase } from "@/lib/money";
import { useToast, Pagination, usePagination } from "@/components/ui";
import { fetchMyTransactions, channelLabel, txTitle, txSign, TX_TYPES, type MyTransaction } from "@/lib/transactions-api";
import { downloadReceipt, type ReceiptData, type ReceiptKind } from "@/lib/receipt";
import { PERIODS, inPeriod, DEFAULT_PERIOD, type Period } from "@/lib/period";

const STATUS: Record<string, { label: string; className: string }> = {
  confirmee: { label: "Confirmé", className: "text-green" },
  en_attente: { label: "En attente", className: "text-gold-600" },
  echouee: { label: "Échoué", className: "text-red" },
};

const ICON: Record<string, LucideIcon> = { tuition: GraduationCap, send: ArrowUpRight, service: Zap, receive: ArrowDownLeft };

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
}

const RECEIPT_KINDS: ReceiptKind[] = ["tuition", "send", "receive", "service"];

function toReceiptData(t: MyTransaction): ReceiptData {
  const hasFee = t.service_fee > 0;
  const pct = t.amount > 0 ? Math.round((t.service_fee / t.amount) * 100) : 0;
  const kind: ReceiptKind = RECEIPT_KINDS.includes(t.type as ReceiptKind) ? (t.type as ReceiptKind) : "tuition";
  return {
    number: t.receipt_number ?? t.id,
    amountLabel: `${money(t.total, t.currency)}`,
    kind,
    // Tuition
    establishment: t.establishment ?? undefined,
    student: t.student_name ?? undefined,
    feeType: t.fee_type ?? undefined,
    // Envoi / Réception / Service
    counterpartyName: t.counterparty_name ?? undefined,
    counterpartyPhone: t.counterparty_phone ?? undefined,
    note: t.label ?? undefined,
    // Communs
    method: channelLabel(t.channel),
    reference: t.reference ?? undefined,
    feeLabel: hasFee ? `Frais de service (${pct} %)` : undefined,
    feeValue: hasFee ? `${money(t.service_fee, t.currency)}` : undefined,
    dateLabel: t.created_at ? new Date(t.created_at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }) : undefined,
  };
}

export default function ActivitePage() {
  const { showToast } = useToast();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [txs, setTxs] = useState<MyTransaction[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setTxs(await fetchMyTransactions());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchMyTransactions()
      .then((data) => active && (setTxs(data), setState("ready")))
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return txs.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (!inPeriod(t.created_at, period)) return false;
      if (!s) return true;
      return [txTitle(t), t.receipt_number, t.counterparty_phone, t.student_matricule].some((v) => (v ?? "").toString().toLowerCase().includes(s));
    });
  }, [txs, typeFilter, period, q]);

  // Total (débits) sur la période filtrée, converti en devise plateforme.
  const periodTotal = useMemo(() => filtered.filter((t) => t.direction !== "credit").reduce((a, t) => a + toBase(t.total, t.currency), 0), [filtered]);

  // Compteurs par type (pour n'afficher que les filtres pertinents).
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    txs.forEach((t) => (c[t.type] = (c[t.type] ?? 0) + 1));
    return c;
  }, [txs]);

  const handleDownload = async (t: MyTransaction) => {
    setDownloading(t.id);
    try {
      await downloadReceipt(toReceiptData(t));
      showToast("Reçu téléchargé");
    } catch {
      showToast("Échec du téléchargement");
    } finally {
      setDownloading(null);
    }
  };

  const activeTypes = TX_TYPES.filter((t) => counts[t.id]);

  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(filtered);

  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 px-5 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-[16px] font-bold text-ink">Activité</h1>
        <button type="button" onClick={load} aria-label="Actualiser" className="flex size-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <RefreshCw className={`size-[15px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
        </button>
      </div>

      {/* Recherche + filtres par catégorie (n'affiche que les types présents) */}
      {state === "ready" && txs.length > 0 ? (
        <>
          <div className="mb-3 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[16px] -translate-y-1/2 text-gray-500" strokeWidth={2} />
              <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" autoComplete="off" className="w-full rounded-[12px] border-[1.5px] border-gray-100 bg-gray-100 py-2.5 pl-10 pr-4 text-[13px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none" />
            </div>
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="Filtrer par période" className="shrink-0 rounded-[12px] border-[1.5px] border-gray-100 bg-gray-100 px-3 py-2.5 text-[12.5px] font-semibold text-ink focus:border-blue-500 focus:bg-white focus:outline-none">
              {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          {period !== "all" ? <p className="mb-3 text-[12px] text-gray-500">{filtered.length} transaction{filtered.length > 1 ? "s" : ""} · total <b className="text-ink">{money(periodTotal)}</b></p> : null}
          {activeTypes.length > 1 ? (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {[{ id: "all", label: "Tout" }, ...activeTypes].map((f) => (
                <button key={f.id} type="button" onClick={() => setTypeFilter(f.id)} className={`shrink-0 rounded-pill px-3.5 py-1.5 text-[12px] font-bold transition-colors ${typeFilter === f.id ? "bg-ink text-white" : "bg-gray-100 text-gray-700"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {state === "loading" ? (
        <div className="flex flex-col">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-b-0">
              <span className="size-[38px] shrink-0 animate-pulse rounded-xl bg-gray-100" />
              <div className="flex-1"><div className="mb-2 h-3 w-1/2 animate-pulse rounded bg-gray-100" /><div className="h-2.5 w-1/3 animate-pulse rounded bg-gray-100" /></div>
              <div className="h-3 w-12 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : null}

      {state === "error" ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-[13px] text-gray-500">Impossible de charger tes transactions.</p>
          <button type="button" onClick={load} className="rounded-pill bg-gray-100 px-4 py-2 text-[12.5px] font-bold text-ink">Réessayer</button>
        </div>
      ) : null}

      {state === "ready" && txs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-gray-100 text-gray-500"><Inbox className="size-6" strokeWidth={2} /></span>
          <p className="text-[13.5px] font-bold text-ink">Aucune transaction pour l&apos;instant</p>
          <p className="max-w-[260px] text-[12.5px] text-gray-500">Tes paiements et envois apparaîtront ici avec leur reçu.</p>
          <Link href="/tuition" className="mt-1 rounded-pill bg-grad-primary px-5 py-2.5 text-[12.5px] font-bold text-white">Payer une tuition</Link>
        </div>
      ) : null}

      {state === "ready" && txs.length > 0 ? (
        filtered.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-gray-500">Aucune transaction ne correspond.</p>
        ) : (
          <>
          <div className="flex flex-col">
            {pageItems.map((t) => {
              const Icon = ICON[t.type] ?? GraduationCap;
              const st = STATUS[t.status] ?? { label: t.status, className: "text-gray-500" };
              const credit = t.direction === "credit";
              return (
                <button key={t.id} type="button" onClick={() => handleDownload(t)} disabled={downloading === t.id} className="group flex items-center gap-3 border-b border-gray-100 py-3 text-left last:border-b-0 disabled:opacity-60">
                  <span className={`flex size-[38px] shrink-0 items-center justify-center rounded-xl ${credit ? "bg-success-bg text-green" : "bg-gray-100 text-blue-600"}`}>
                    <Icon className="size-[17px]" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold text-ink">{txTitle(t)}</div>
                    <div className="truncate text-[11px] text-gray-500">
                      {fdate(t.created_at)} · <span className={st.className}>{st.label}</span>{t.receipt_number ? ` · ${t.receipt_number}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className={`font-display text-[13.5px] font-extrabold ${credit ? "text-green" : "text-ink"}`}>{txSign(t)}{money(t.total, t.currency)}</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                      <Download className="size-3" strokeWidth={2.4} />{downloading === t.id ? "…" : "Reçu"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
          </>
        )
      ) : null}
    </div>
  );
}
