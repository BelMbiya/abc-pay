/**
 * Historique des transactions du payeur connecté (front → Laravel).
 * Endpoint protégé JWT : GET /api/v1/transactions (le Bearer global est ajouté par api.ts).
 */
import { api } from "@/lib/api";

export interface MyTransaction {
  id: string;
  type: string; // tuition | send | service | receive
  direction?: string; // debit | credit
  establishment: string | null;
  establishment_type?: string | null;
  student_name?: string | null;
  student_matricule?: string | null;
  counterparty_name?: string | null;
  counterparty_phone?: string | null;
  label?: string | null;
  fee_type: string | null;
  channel: string;
  amount: number;
  service_fee: number;
  total: number;
  currency: string;
  status: string;
  reference?: string | null;
  receipt_number: string | null;
  created_at: string | null;
}

/** Catégories de transaction (libellé + filtre). */
export const TX_TYPES: { id: string; label: string }[] = [
  { id: "tuition", label: "Tuition" },
  { id: "send", label: "Envois" },
  { id: "service", label: "Services" },
  { id: "receive", label: "Reçus" },
];

const TYPE_LABEL: Record<string, string> = { tuition: "Tuition", send: "Envoi", service: "Service", receive: "Reçu" };

/** Libellé principal d'une transaction selon son type. */
export function txTitle(t: MyTransaction): string {
  if (t.type === "tuition") return `Tuition · ${t.establishment ?? "—"}`;
  if (t.type === "send") return `Envoi · ${t.counterparty_name || t.counterparty_phone || "destinataire"}`;
  if (t.type === "service") return t.label || "Paiement de service";
  if (t.type === "receive") return `Reçu · ${t.counterparty_name || t.counterparty_phone || "expéditeur"}`;
  return TYPE_LABEL[t.type] ?? t.type;
}

/**
 * Contrepartie affichable d'une transaction : titre + info secondaire (n° / élève / libellé),
 * adaptée au type. Utilisé par tous les tableaux (payeur, établissement, admin) pour ne plus
 * afficher « — » sur les envois/réceptions/services.
 */
export interface TxParty {
  title: string;
  sub: string | null;
}

export function txParty(t: {
  type: string;
  establishment?: string | null;
  student_name?: string | null;
  counterparty_name?: string | null;
  counterparty_phone?: string | null;
  label?: string | null;
  fee_type?: string | null;
}): TxParty {
  switch (t.type) {
    case "tuition":
      return { title: t.establishment || "Établissement", sub: t.student_name || t.fee_type || null };
    case "send":
      return { title: t.counterparty_name || "Destinataire", sub: t.counterparty_phone || null };
    case "receive":
      return { title: t.counterparty_name || "Expéditeur", sub: t.counterparty_phone || null };
    case "service":
      return { title: t.label || "Paiement de service", sub: t.counterparty_name || t.counterparty_phone || null };
    default:
      return { title: t.establishment || t.counterparty_name || t.label || "—", sub: t.counterparty_phone || null };
  }
}

/** Signe d'affichage du montant ("+" pour un crédit, "−" sinon). */
export function txSign(t: MyTransaction): "+" | "−" {
  return t.direction === "credit" ? "+" : "−";
}

/** Libellé lisible du canal de paiement (inverse de channelId). */
export const CHANNEL_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  airtel: "Airtel Money",
  orange: "Orange Money",
  africell: "Africell Money",
  visa: "Carte Visa",
};

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

/** Récupère les transactions du payeur connecté (les plus récentes d'abord). */
export async function fetchMyTransactions(): Promise<MyTransaction[]> {
  const data = await api.get<MyTransaction[]>("/api/v1/transactions");
  return Array.isArray(data) ? data : [];
}

/** Le payeur ouvre une demande de remboursement sur SA propre opération. */
export async function requestMyRefund(transactionId: string, reason: string): Promise<void> {
  await api.post("/api/v1/refunds", { transaction_id: transactionId, reason });
}
