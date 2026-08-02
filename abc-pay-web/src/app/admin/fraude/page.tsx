"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldAlert, RefreshCw, Ban, Check } from "lucide-react";
import { StatusPill, Pagination, usePagination, useToast } from "@/components/ui";
import { PageHeader } from "@/components/backoffice/StatCard";
import { money } from "@/lib/money";
import { txParty } from "@/lib/transactions-api";
import { fetchFraud, dismissFlag, blockFlag, RULE_LABELS, SEVERITY, FRAUD_STATUS, type FraudFlag } from "@/lib/fraud-api";

const FILTERS = [
  { id: "open", label: "Ouverts" },
  { id: "all", label: "Tous" },
  { id: "actioned", label: "Traités" },
  { id: "dismissed", label: "Écartés" },
];

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
}

export default function FraudePage() {
  const { showToast } = useToast();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [open, setOpen] = useState(0);
  const [filter, setFilter] = useState("open");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (status = filter) => {
    setState("loading");
    try {
      const d = await fetchFraud(status);
      setFlags(d.flags);
      setOpen(d.open);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [filter]);

  useEffect(() => {
    let active = true;
    fetchFraud("open")
      .then((d) => active && (setFlags(d.flags), setOpen(d.open), setState("ready")))
      .catch(() => active && setState("error"));
    return () => {
      active = false;
    };
  }, []);

  const changeFilter = (id: string) => {
    setFilter(id);
    void load(id);
  };

  const act = async (fl: FraudFlag, action: "dismiss" | "block") => {
    setBusy(fl.id);
    try {
      if (action === "dismiss") {
        await dismissFlag(fl.id);
        showToast("Signalement écarté");
      } else {
        await blockFlag(fl.id);
        showToast("Compte bloqué");
      }
      await load();
    } catch {
      showToast("Action impossible");
    } finally {
      setBusy(null);
    }
  };

  const rows = useMemo(() => flags, [flags]);
  const { page, setPage, pageItems, total, totalPages, pageSize } = usePagination(rows);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Détection de fraude"
        subtitle="Transactions atypiques repérées automatiquement (LBC/FT)"
        actions={
          <button type="button" onClick={() => load()} aria-label="Actualiser" className="flex size-[42px] items-center justify-center rounded-[12px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl bg-gray-100 p-4">
          <span className={`flex size-10 items-center justify-center rounded-xl ${open > 0 ? "bg-[#FDE7E8] text-red" : "bg-success-bg text-green"}`}><ShieldAlert className="size-5" strokeWidth={2.2} /></span>
          <div>
            <p className="font-display text-[20px] font-extrabold text-ink">{open}</p>
            <p className="text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Signalement(s) ouvert(s)</p>
          </div>
        </div>
      </div>

      {/* Filtres statut */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => changeFilter(f.id)} className={`shrink-0 rounded-pill px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${filter === f.id ? "bg-ink text-white" : "bg-gray-100 text-gray-700"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Impossible de charger. <button onClick={() => load()} className="font-bold text-blue-600">Réessayer</button></div>
      ) : state === "ready" && rows.length === 0 ? (
        <div className="rounded-2xl bg-gray-100 py-14 text-center text-[13px] text-gray-500">Aucun signalement. 🎉</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-3">Date</th>
                  <th className="pb-3 pr-3">Contrepartie</th>
                  <th className="pb-3 pr-3">Montant</th>
                  <th className="pb-3 pr-3">Règle</th>
                  <th className="pb-3 pr-3">Sévérité</th>
                  <th className="pb-3 pr-3">Motif</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {state === "loading"
                  ? [0, 1, 2].map((i) => <tr key={i} className="border-t border-white"><td colSpan={7} className="py-3"><div className="h-4 animate-pulse rounded bg-white" /></td></tr>)
                  : pageItems.map((fl) => {
                      const sev = SEVERITY[fl.severity] ?? SEVERITY.low;
                      const p = fl.transaction ? txParty(fl.transaction) : { title: "—", sub: null };
                      return (
                        <tr key={fl.id} className="border-t border-white text-[13px] align-top">
                          <td className="py-3 pr-3 text-gray-500">{fdate(fl.created_at)}</td>
                          <td className="py-3 pr-3">
                            <div className="font-bold text-ink">{p.title}</div>
                            {p.sub ? <div className="text-[11.5px] text-gray-500">{p.sub}</div> : null}
                          </td>
                          <td className="py-3 pr-3 font-bold text-ink">{fl.transaction ? money(fl.transaction.amount, fl.transaction.currency) : "—"}</td>
                          <td className="py-3 pr-3 text-gray-700">{RULE_LABELS[fl.rule] ?? fl.rule}</td>
                          <td className="py-3 pr-3"><StatusPill tone={sev.tone}>{sev.label} · {fl.score}</StatusPill></td>
                          <td className="py-3 pr-3 text-[12px] text-gray-500">{fl.reason}</td>
                          <td className="py-3 text-right">
                            {fl.status === "open" ? (
                              <div className="flex justify-end gap-1.5">
                                <button type="button" title="Écarter (faux positif)" disabled={busy === fl.id} onClick={() => act(fl, "dismiss")} className="flex size-8 items-center justify-center rounded-lg bg-white text-green hover:opacity-80 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                  <Check className="size-4" strokeWidth={2.2} />
                                </button>
                                <button type="button" title="Bloquer le compte" disabled={busy === fl.id} onClick={() => act(fl, "block")} className="flex size-8 items-center justify-center rounded-lg bg-white text-red hover:opacity-80 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                  <Ban className="size-4" strokeWidth={2.2} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11.5px] font-bold text-gray-500">{FRAUD_STATUS[fl.status] ?? fl.status}</span>
                            )}
                          </td>
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
