/**
 * Vues transactions — back-office établissement (scopé staff) et super-admin (plateforme).
 */
import { api } from "@/lib/api";
import { getStaffToken } from "@/lib/staff-auth";
import { getAdminToken } from "@/lib/admin-auth";

export interface TxRow {
  id: string;
  type: string; // tuition | send | service | receive
  direction?: string;
  establishment: string | null;
  establishment_type?: string | null;
  actor?: string | null; // compte à l'origine de l'opération (audit)
  actor_phone?: string | null;
  actor_registered?: boolean;
  student_name?: string | null;
  student_matricule?: string | null;
  payer_name?: string | null;
  payer_phone?: string | null;
  counterparty_name?: string | null;
  counterparty_phone?: string | null;
  label?: string | null;
  fee_type: string | null;
  channel: string;
  amount: number;
  service_fee?: number;
  commission: number;
  net: number;
  total: number;
  currency: string;
  status: string;
  reference?: string | null;
  receipt_number?: string | null;
  created_at: string | null;
}

export interface TxSummary {
  count: number;
  volume: number;
  commission: number;
  net?: number;
  base_currency?: string;
}

/** Paiements reçus par l'établissement du staff connecté. */
export async function fetchStaffTransactions(): Promise<{ transactions: TxRow[]; summary: TxSummary }> {
  return api.get("/api/v1/staff/transactions", { token: getStaffToken() ?? undefined });
}

/** Toutes les transactions (super-admin) + synthèse plateforme. */
export async function fetchAdminTransactions(): Promise<{ transactions: TxRow[]; summary: TxSummary }> {
  return api.get("/api/v1/admin/transactions", { token: getAdminToken() ?? undefined });
}

/* ---- Recherche plateforme filtrée + paginée (page dédiée /admin/transactions) ---- */

export interface TxFilters {
  q?: string;
  type?: string;
  direction?: string;
  status?: string;
  channel?: string;
  establishment_id?: string;
  scope?: "" | "establishment" | "user";
  registered?: "" | "1" | "0";
  date_from?: string;
  date_to?: string;
  amount_min?: string;
  amount_max?: string;
  page?: number;
  per_page?: number;
}

export interface TxMeta { page: number; per_page: number; total: number; last_page: number }
export interface TxSearchResult { transactions: TxRow[]; meta: TxMeta; summary: TxSummary }

/** Construit la query string à partir des filtres non vides. */
function txQuery(f: TxFilters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== null && `${v}` !== "") p.set(k, `${v}`);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Recherche filtrée + paginée (super-admin). */
export async function searchAdminTransactions(filters: TxFilters): Promise<TxSearchResult> {
  return api.get(`/api/v1/admin/transactions/search${txQuery(filters)}`, { token: getAdminToken() ?? undefined });
}

/**
 * Télécharge le CSV de la sélection courante (tout l'historique filtré, pas seulement
 * la page). Fetch brut (le client `api` est JSON-strict) avec le jeton admin → blob.
 */
export async function exportAdminTransactionsCsv(filters: TxFilters): Promise<void> {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  const { page: _p, per_page: _pp, ...rest } = filters; // l'export ignore la pagination
  void _p; void _pp;
  const res = await fetch(`${base}/api/v1/admin/transactions/export${txQuery(rest)}`, {
    headers: { Authorization: `Bearer ${getAdminToken() ?? ""}`, Accept: "text/csv" },
  });
  if (!res.ok) throw new Error(`export ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------ Remboursements ---------------------------- */

export type RefundStatus = "demande" | "approuve" | "rejete";

export interface AdminRefund {
  id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  needs_establishment: boolean;
  establishment_decision: "approuve" | "refuse" | null;
  establishment_decided_by: string | null;
  establishment_decided_at: string | null;
  requested_by: string;
  decided_by: string | null;
  decision_note: string | null;
  decided_at: string | null;
  forced: boolean;
  force_reason: string | null;
  created_at: string | null;
  transaction_reference?: string | null;
}

export async function fetchAdminRefunds(status?: string): Promise<AdminRefund[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return api.get<AdminRefund[]>(`/api/v1/admin/refunds${qs}`, { token: getAdminToken() ?? undefined });
}

/** Ouvre une demande de remboursement pour une transaction confirmée. */
export async function requestRefund(transactionId: string, reason: string): Promise<AdminRefund> {
  return api.post<AdminRefund>("/api/v1/admin/refunds", { transaction_id: transactionId, reason }, { token: getAdminToken() ?? undefined });
}

/**
 * Décision FINALE de l'administrateur. `force` = forçage (force majeure) : exécute malgré
 * un refus/attente établissement — `note` porte alors le motif de force majeure (obligatoire).
 */
export async function decideRefund(id: string, decision: "approuve" | "rejete", note?: string, force?: boolean): Promise<AdminRefund> {
  return api.post<AdminRefund>(`/api/v1/admin/refunds/${id}/decide`, { decision, note, force }, { token: getAdminToken() ?? undefined });
}

/* ---- Côté établissement (staff) : validation de premier niveau (Tuition) ---- */

export async function fetchStaffRefunds(): Promise<AdminRefund[]> {
  return api.get<AdminRefund[]>("/api/v1/staff/refunds", { token: getStaffToken() ?? undefined });
}

/** L'établissement ouvre une demande de remboursement sur un paiement qu'il a reçu. */
export async function requestStaffRefund(transactionId: string, reason: string): Promise<void> {
  await api.post("/api/v1/staff/refunds", { transaction_id: transactionId, reason }, { token: getStaffToken() ?? undefined });
}

/** L'établissement valide ou refuse un remboursement Tuition qui le concerne. */
export async function staffDecideRefund(id: string, decision: "approuve" | "refuse"): Promise<AdminRefund> {
  return api.post<AdminRefund>(`/api/v1/staff/refunds/${id}/decide`, { decision }, { token: getStaffToken() ?? undefined });
}

export interface Settlement {
  week_start: string;
  period: string;
  gross: number;
  commission: number;
  clawback?: number; // reprises déduites (remboursements de transactions déjà reversées)
  net: number;
  count: number;
  status: string; // pending | paid
  gateway?: string | null; // araka | cinetpay | null (démo)
  transfer_id?: string | null; // id du transfert côté passerelle (traçabilité portail)
}

export interface SettlementData {
  pending_net: number;
  pending_clawback?: number; // reprises en attente (déduites du net à reverser)
  pending_period: string | null;
  total_net: number;
  settlements: Settlement[];
  weekly: { label: string; net: number }[];
}

/** Reversements de l'établissement du staff connecté (dérivés des transactions). */
export async function fetchStaffSettlements(): Promise<SettlementData> {
  return api.get("/api/v1/staff/settlements", { token: getStaffToken() ?? undefined });
}
