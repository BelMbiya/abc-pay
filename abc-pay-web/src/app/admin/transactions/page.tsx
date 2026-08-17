"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, RefreshCw, SlidersHorizontal, Download, ArrowLeftRight,
  ChevronRight, ArrowDownLeft, ArrowUpRight, ReceiptText, X,
} from "lucide-react";
import { Button, Pagination, useToast } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/backoffice/StatCard";
import { money, convert } from "@/lib/money";
import { cn } from "@/lib/cn";
import { channelLabel } from "@/lib/transactions-api";
import { fetchAdminEstablishments, type AdminEstablishment } from "@/lib/admin-api";
import {
  searchAdminTransactions, exportAdminTransactionsCsv, requestRefund,
  type TxRow, type TxFilters, type TxSearchResult,
} from "@/lib/tx-views-api";
import { ApiError } from "@/lib/api";

const EMPTY: TxFilters = { page: 1, per_page: 25 };
const selectCls =
  "w-full rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 px-3 py-2.5 text-[13px] text-ink focus:border-blue-500 focus:bg-white focus:outline-none";

const TYPE_OPTIONS = [
  { value: "tuition", label: "Scolarité" },
  { value: "send", label: "Envoi" },
  { value: "receive", label: "Réception" },
  { value: "service", label: "Service" },
  { value: "refund", label: "Remboursement" },
];
const DIRECTION_OPTIONS = [
  { value: "debit", label: "Débit (sortie)" },
  { value: "credit", label: "Crédit (entrée)" },
];
const STATUS_OPTIONS: { value: string; label: string; tone: string }[] = [
  { value: "confirmee", label: "Confirmée", tone: "bg-success-bg text-green" },
  { value: "en_attente", label: "En attente", tone: "bg-fee-bg text-gold-600" },
  { value: "echouee", label: "Échouée", tone: "bg-[#FDE7E8] text-red" },
  { value: "annulee", label: "Annulée", tone: "bg-white text-gray-500" },
  { value: "remboursee", label: "Remboursée", tone: "bg-blue-100 text-blue-700" },
];
const CHANNEL_OPTIONS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "airtel", label: "Airtel Money" },
  { value: "orange", label: "Orange Money" },
  { value: "africell", label: "Africell Money" },
  { value: "visa", label: "Carte Visa" },
];
const SCOPE_OPTIONS = [
  { value: "establishment", label: "Établissements" },
  { value: "user", label: "Comptes users" },
];
const TYPE_LABEL: Record<string, string> = { tuition: "Scolarité", send: "Envoi", receive: "Réception", service: "Service", refund: "Remboursement" };
const typeLabel = (v: string) => TYPE_LABEL[v] ?? v;
const statusMeta = (v: string) => STATUS_OPTIONS.find((s) => s.value === v);

function fdate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

function StatusBadge({ status }: { status: string }) {
  const m = statusMeta(status);
  return <span className={`rounded-pill px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${m?.tone ?? "bg-white text-gray-500"}`}>{m?.label ?? status}</span>;
}

/** Tuile de montant avec bascule de devise $ / FC (conversion à l'affichage). */
function MoneyTile({ label, amount, base, hint, tone, cur, onCur }: {
  label: string; amount: number; base: string; hint?: string;
  tone?: "navy" | "default"; cur: "USD" | "CDF"; onCur: (c: "USD" | "CDF") => void;
}) {
  const navy = tone === "navy";
  return (
    <div className={cn("rounded-2xl p-5", navy ? "bg-grad-navy text-white" : "bg-gray-100")}>
      <div className="flex items-center justify-between">
        <span className={cn("text-[12px] font-bold", navy ? "text-white/70" : "text-gray-500")}>{label}</span>
        <div className={cn("flex items-center gap-0.5 rounded-lg p-0.5", navy ? "bg-white/15" : "bg-white")} role="group" aria-label="Devise d'affichage">
          {(["USD", "CDF"] as const).map((c) => {
            const on = cur === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onCur(c)}
                aria-pressed={on}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-extrabold transition-colors",
                  on ? (navy ? "bg-gold-400 text-gold-ink" : "bg-blue-600 text-white")
                     : (navy ? "text-white/70 hover:text-white" : "text-gray-500 hover:text-ink"),
                )}
              >
                {c === "USD" ? "$" : "FC"}
              </button>
            );
          })}
        </div>
      </div>
      <p className={cn("mt-3 font-display text-[26px] font-extrabold tracking-tight", navy ? "text-white" : "text-ink")}>
        {money(convert(amount, base || "USD", cur), cur)}
      </p>
      {hint ? <p className={cn("mt-1 text-[11.5px]", navy ? "text-white/60" : "text-gray-500")}>{hint}</p> : null}
    </div>
  );
}

/** Montant signé par le sens (crédit = entrée, débit = sortie). */
function Amount({ t }: { t: TxRow }) {
  const credit = t.direction === "credit";
  return (
    <span className={`font-bold tabular-nums ${credit ? "text-green" : "text-ink"}`}>
      {credit ? "+" : "−"}{money(t.amount, t.currency)}
    </span>
  );
}

export default function AdminTransactionsPage() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState<TxFilters>(EMPTY);
  const [qInput, setQInput] = useState("");
  const [result, setResult] = useState<TxSearchResult | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [establishments, setEstablishments] = useState<AdminEstablishment[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<TxRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [displayCur, setDisplayCur] = useState<"USD" | "CDF">("USD");
  const first = useRef(true);

  useEffect(() => {
    fetchAdminEstablishments().then(setEstablishments).catch(() => {});
  }, []);

  const load = useCallback((f: TxFilters) => {
    setState("loading");
    searchAdminTransactions(f)
      .then((r) => { setResult(r); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() bascule l'état de chargement puis résout en async
  useEffect(() => { load(filters); }, [filters, load]);

  // Recherche texte débouncée (les autres filtres s'appliquent immédiatement).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const id = setTimeout(() => setFilters((f) => ({ ...f, q: qInput, page: 1 })), 400);
    return () => clearTimeout(id);
  }, [qInput]);

  /** Modifie un filtre et revient à la page 1. */
  const patch = (p: Partial<TxFilters>) => setFilters((f) => ({ ...f, ...p, page: 1 }));
  const reset = () => { setQInput(""); setFilters({ ...EMPTY }); };

  const activeCount = useMemo(() => {
    const keys: (keyof TxFilters)[] = ["q", "type", "direction", "status", "channel", "establishment_id", "scope", "registered", "date_from", "date_to", "amount_min", "amount_max"];
    return keys.filter((k) => filters[k] !== undefined && `${filters[k]}` !== "").length;
  }, [filters]);

  const doExport = async () => {
    setExporting(true);
    try {
      await exportAdminTransactionsCsv(filters);
      showToast("Export CSV téléchargé");
    } catch {
      showToast("Export impossible");
    } finally { setExporting(false); }
  };

  const rows = result?.transactions ?? [];
  const meta = result?.meta;
  const sum = result?.summary;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Transactions"
        subtitle="Toutes les opérations de la plateforme — établissements et comptes users."
        actions={<Button fullWidth={false} icon={Download} onClick={doExport} disabled={exporting || !rows.length}>{exporting ? "Export…" : "Exporter CSV"}</Button>}
      />

      {/* Synthèse (sur la sélection courante) */}
      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatCard label="Transactions" value={(sum?.count ?? 0).toLocaleString("fr-FR")} icon={ArrowLeftRight} hint="Sur la sélection" />
        <MoneyTile label="Volume" amount={sum?.volume ?? 0} base={sum?.base_currency ?? "USD"} tone="navy" hint="Sur la sélection" cur={displayCur} onCur={setDisplayCur} />
        <MoneyTile label="Commission" amount={sum?.commission ?? 0} base={sum?.base_currency ?? "USD"} hint="Sur la sélection" cur={displayCur} onCur={setDisplayCur} />
      </div>

      {/* Recherche + bascule filtres */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-gray-500" strokeWidth={2} />
          <input type="text" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Référence, reçu, acteur, élève, établissement, téléphone…" autoComplete="off" className="w-full rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 py-3 pl-11 pr-4 text-[14px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none" />
        </div>
        <button type="button" onClick={() => setShowFilters((v) => !v)} className={`relative flex h-[46px] shrink-0 items-center gap-2 rounded-[13px] px-4 text-[13px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showFilters || activeCount ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
          <SlidersHorizontal className="size-[17px]" strokeWidth={2.2} /> Filtres{activeCount ? ` · ${activeCount}` : ""}
        </button>
        <button type="button" onClick={() => load(filters)} aria-label="Actualiser" className="flex size-[46px] shrink-0 items-center justify-center rounded-[13px] bg-gray-100 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <RefreshCw className={`size-[17px] ${state === "loading" ? "animate-spin" : ""}`} strokeWidth={2.2} />
        </button>
      </div>

      {/* Panneau de filtres avancés */}
      {showFilters ? (
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl bg-gray-100 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Type
            <select className={selectCls} value={filters.type ?? ""} onChange={(e) => patch({ type: e.target.value })}>
              <option value="">Tous</option>
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Périmètre
            <select className={selectCls} value={filters.scope ?? ""} onChange={(e) => patch({ scope: e.target.value as TxFilters["scope"] })}>
              <option value="">Tous</option>
              {SCOPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Statut
            <select className={selectCls} value={filters.status ?? ""} onChange={(e) => patch({ status: e.target.value })}>
              <option value="">Tous</option>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Canal
            <select className={selectCls} value={filters.channel ?? ""} onChange={(e) => patch({ channel: e.target.value })}>
              <option value="">Tous</option>
              {CHANNEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Établissement
            <select className={selectCls} value={filters.establishment_id ?? ""} onChange={(e) => patch({ establishment_id: e.target.value })}>
              <option value="">Tous</option>
              {establishments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Sens
            <select className={selectCls} value={filters.direction ?? ""} onChange={(e) => patch({ direction: e.target.value })}>
              <option value="">Tous</option>
              {DIRECTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Acteur
            <select className={selectCls} value={filters.registered ?? ""} onChange={(e) => patch({ registered: e.target.value as TxFilters["registered"] })}>
              <option value="">Tous</option>
              <option value="1">Compte enregistré</option>
              <option value="0">Invité (non connecté)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Du
            <input type="date" className={selectCls} value={filters.date_from ?? ""} onChange={(e) => patch({ date_from: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Au
            <input type="date" className={selectCls} value={filters.date_to ?? ""} onChange={(e) => patch({ date_to: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Montant min
            <input type="number" min={0} inputMode="decimal" className={selectCls} value={filters.amount_min ?? ""} onChange={(e) => patch({ amount_min: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">Montant max
            <input type="number" min={0} inputMode="decimal" className={selectCls} value={filters.amount_max ?? ""} onChange={(e) => patch({ amount_max: e.target.value })} />
          </label>
          <div className="flex items-end">
            <button type="button" onClick={reset} disabled={!activeCount} className="text-[12.5px] font-bold text-blue-600 disabled:opacity-40 hover:underline">Réinitialiser les filtres</button>
          </div>
        </div>
      ) : null}

      {/* Résultats */}
      {state === "error" ? (
        <div className="rounded-2xl bg-gray-100 py-16 text-center text-[13px] text-gray-500">Chargement impossible. <button onClick={() => load(filters)} className="font-bold text-blue-600">Réessayer</button></div>
      ) : state === "ready" && rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-100 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-white text-gray-500"><ReceiptText className="size-6" strokeWidth={2} /></span>
          <p className="text-[13px] text-gray-500">{activeCount ? "Aucune transaction ne correspond aux filtres." : "Aucune transaction pour l'instant."}</p>
          {activeCount ? <button onClick={reset} className="text-[12.5px] font-bold text-blue-600 hover:underline">Réinitialiser les filtres</button> : null}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl bg-gray-100 p-5">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-3">Date</th>
                  <th className="pb-3 pr-3">Type</th>
                  <th className="pb-3 pr-3">Acteur</th>
                  <th className="pb-3 pr-3">Établissement</th>
                  <th className="pb-3 pr-3">Canal</th>
                  <th className="pb-3 pr-3 text-right">Montant</th>
                  <th className="pb-3 pr-3">Statut</th>
                  <th className="pb-3 text-right">Détail</th>
                </tr>
              </thead>
              <tbody>
                {state === "loading"
                  ? [0, 1, 2, 3, 4, 5].map((i) => <tr key={i} className="border-t border-white"><td colSpan={8} className="py-3"><div className="h-4 animate-pulse rounded bg-white" /></td></tr>)
                  : rows.map((t) => (
                      <tr key={t.id} onClick={() => setSelected(t)} className="cursor-pointer border-t border-white text-[13px] hover:bg-white/60">
                        <td className="py-3 pr-3 whitespace-nowrap text-gray-500">{fdate(t.created_at)}</td>
                        <td className="py-3 pr-3">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                            {t.direction === "credit" ? <ArrowDownLeft className="size-4 text-green" strokeWidth={2.2} /> : <ArrowUpRight className="size-4 text-gray-500" strokeWidth={2.2} />}
                            {typeLabel(t.type)}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-bold text-ink">{t.actor ?? "—"}</div>
                          {t.actor_phone ? <div className="text-[11.5px] text-gray-500">{t.actor_phone}</div> : null}
                        </td>
                        <td className="py-3 pr-3 text-gray-700">{t.establishment ?? <span className="text-gray-500">—</span>}</td>
                        <td className="py-3 pr-3 text-gray-500">{channelLabel(t.channel) || "—"}</td>
                        <td className="py-3 pr-3 text-right"><Amount t={t} /></td>
                        <td className="py-3 pr-3"><StatusBadge status={t.status} /></td>
                        <td className="py-3 text-right"><span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-600">Voir <ChevronRight className="size-4" strokeWidth={2.4} /></span></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {meta ? <Pagination page={meta.page} totalPages={meta.last_page} total={meta.total} pageSize={meta.per_page} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} /> : null}
        </>
      )}

      {selected ? <TxDetail tx={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

/* -------------------------- Fiche détail (drawer) ------------------------- */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2.5 last:border-b-0">
      <span className="shrink-0 text-[12px] font-semibold text-gray-500">{label}</span>
      <span className="text-right text-[13px] font-semibold text-ink">{value}</span>
    </div>
  );
}

function TxDetail({ tx, onClose }: { tx: TxRow; onClose: () => void }) {
  const cur = tx.currency;
  const { showToast } = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const askRefund = async () => {
    if (!reason.trim()) { showToast("Indique un motif"); return; }
    setBusy(true);
    try {
      await requestRefund(tx.id, reason.trim());
      setDone(true);
      showToast("Demande de remboursement créée — à valider (4 yeux)");
    } catch (e) {
      const field = e instanceof ApiError ? Object.values(e.fields ?? {})[0]?.[0] : undefined;
      showToast(field ?? (e instanceof ApiError ? e.message : "Demande impossible"));
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div onClick={onClose} className="absolute inset-0 bg-navy/30 backdrop-blur-[1px]" aria-hidden="true" />
      <aside role="dialog" aria-label="Détail de la transaction" className="relative flex h-full w-full max-w-[420px] flex-col border-l border-gray-100 bg-white shadow-hero">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-bold text-ink">{typeLabel(tx.type)} · {money(tx.amount, cur)}</h2>
            <p className="text-[11.5px] text-gray-500">{fdate(tx.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex size-8 items-center justify-center rounded-lg bg-gray-100 text-ink hover:bg-gray-300/40"><X className="size-4" strokeWidth={2.4} /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-2">
          <div className="my-2 flex items-center gap-2"><StatusBadge status={tx.status} /><span className="rounded-pill bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-gray-500">{tx.direction === "credit" ? "Entrée" : "Sortie"}</span></div>
          <Row label="Acteur" value={tx.actor} />
          <Row label="Téléphone" value={tx.actor_phone} />
          <Row label="Compte" value={tx.actor_registered ? "Enregistré" : "Invité (non connecté)"} />
          <Row label="Établissement" value={tx.establishment} />
          <Row label="Élève" value={tx.student_name} />
          <Row label="Matricule" value={tx.student_matricule} />
          <Row label="Payeur" value={tx.payer_name} />
          <Row label="Tél. payeur" value={tx.payer_phone} />
          <Row label="Contrepartie" value={tx.counterparty_name} />
          <Row label="Tél. contrepartie" value={tx.counterparty_phone} />
          <Row label="Libellé" value={tx.label} />
          <Row label="Type de frais" value={tx.fee_type} />
          <Row label="Canal" value={channelLabel(tx.channel)} />
          <Row label="Montant" value={money(tx.amount, cur)} />
          {tx.service_fee ? <Row label="Frais de service" value={money(tx.service_fee, cur)} /> : null}
          <Row label="Commission abc pay" value={money(tx.commission, cur)} />
          <Row label="Net établissement" value={money(tx.net, cur)} />
          <Row label="Total payé" value={money(tx.total, cur)} />
          <Row label="Référence" value={tx.reference} />
          <Row label="Reçu" value={tx.receipt_number} />
          <Row label="ID transaction" value={<span className="font-mono text-[11px]">{tx.id}</span>} />

          {/* Remboursement — seulement pour une transaction confirmée */}
          {tx.status === "confirmee" ? (
            <div className="mt-4 rounded-2xl bg-gray-100 p-3.5">
              {done ? (
                <p className="text-[12.5px] font-semibold text-green">Demande envoyée. Validation par un second administrateur requise (4 yeux) dans « Remboursements ».</p>
              ) : (
                <>
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-gray-500">Rembourser cette transaction</p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Motif : double paiement, erreur de montant…"
                    className="w-full resize-y rounded-xl border-[1.5px] border-gray-100 bg-white p-3 text-[13px] text-ink placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                  <Button className="mt-2.5 w-full" disabled={busy} onClick={askRefund}>Demander un remboursement</Button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
