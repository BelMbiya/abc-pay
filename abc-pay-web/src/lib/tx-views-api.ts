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
}

/** Paiements reçus par l'établissement du staff connecté. */
export async function fetchStaffTransactions(): Promise<{ transactions: TxRow[]; summary: TxSummary }> {
  return api.get("/api/v1/staff/transactions", { token: getStaffToken() ?? undefined });
}

/** Toutes les transactions (super-admin) + synthèse plateforme. */
export async function fetchAdminTransactions(): Promise<{ transactions: TxRow[]; summary: TxSummary }> {
  return api.get("/api/v1/admin/transactions", { token: getAdminToken() ?? undefined });
}

export interface Settlement {
  week_start: string;
  period: string;
  gross: number;
  commission: number;
  net: number;
  count: number;
  status: string; // pending | paid
}

export interface SettlementData {
  pending_net: number;
  pending_period: string | null;
  total_net: number;
  settlements: Settlement[];
  weekly: { label: string; net: number }[];
}

/** Reversements de l'établissement du staff connecté (dérivés des transactions). */
export async function fetchStaffSettlements(): Promise<SettlementData> {
  return api.get("/api/v1/staff/settlements", { token: getStaffToken() ?? undefined });
}
