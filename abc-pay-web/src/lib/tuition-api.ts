/**
 * Intégration API du parcours Tuition (front → Laravel).
 * Chaque appel a un REPLI (fallback) local pour que le front reste utilisable
 * même sans backend en ligne (démo, dev).
 */
import { api, ApiError } from "@/lib/api";
import { schools, type School } from "@/lib/tuition-data";
import { pingNotifications } from "@/lib/notifications-api";

const V1 = "/api/v1";

/** Récupère les établissements depuis l'API, sinon les données mock. */
export async function fetchEstablishments(): Promise<School[]> {
  try {
    const data = await api.get<School[]>(`${V1}/establishments`);
    return Array.isArray(data) && data.length ? data : schools;
  } catch {
    return schools; // repli hors-ligne
  }
}

export interface TuitionPaymentPayload {
  establishment_id: string;
  student_name: string;
  student_matricule: string;
  student_info?: string;
  payer_name?: string;
  payer_phone?: string;
  payer_relation?: string;
  fee_type: string;
  channel: string;
  amount: number;
  reference?: string;
}

export interface TuitionPaymentResult {
  transactionId: string | null; // id de la transaction (pour le suivi de statut)
  receiptNumber: string | null;
  receiptToken: string | null; // jeton d'authenticité (QR + code de vérification)
  status: "confirmee" | "echouee" | "pending";
  reason: string | null; // raison exacte en cas d'échec
  // Passerelle : URL de page hébergée à ouvrir (CinetPay). NULL = push direct (Araka) →
  // on va directement à la page de statut qui interroge (poll) jusqu'à confirmation.
  redirectUrl: string | null;
}

/**
 * Crée le paiement côté API (idempotent). AUCUNE erreur silencieuse : un échec
 * (validation, plafond, réseau, 500) est remonté avec sa raison — jamais présenté
 * comme un succès. (Le repli mock ne concerne QUE la lecture des établissements.)
 */
export interface PaymentStatus {
  status: "pending" | "confirmee" | "failed" | "echouee";
  type: string | null; // tuition | service | send
  receiptNumber: string | null;
}

/** Statut d'un paiement (page de retour après redirection CinetPay). */
export async function fetchPaymentStatus(transactionId: string): Promise<PaymentStatus> {
  const data = await api.get<{ status?: string; type?: string; receipt?: { number?: string } }>(`${V1}/payments/${transactionId}/status`);
  const s = data?.status;
  return {
    status: s === "confirmee" ? "confirmee" : s === "failed" || s === "echouee" ? "failed" : "pending",
    type: data?.type ?? null,
    receiptNumber: data?.receipt?.number ?? null,
  };
}

export async function createTuitionPayment(payload: TuitionPaymentPayload): Promise<TuitionPaymentResult> {
  try {
    const data = await api.post<{ transaction?: { id?: string; status?: string; failure_reason?: string | null }; receipt?: { number?: string; qr_token?: string }; payment_url?: string }>(
      `${V1}/payments`,
      payload,
      { idempotent: true },
    );
    pingNotifications();
    const raw = data?.transaction?.status;
    const status: TuitionPaymentResult["status"] =
      raw === "echouee" ? "echouee" : raw === "pending" ? "pending" : "confirmee";
    return {
      transactionId: data?.transaction?.id ?? null,
      receiptNumber: data?.receipt?.number ?? null,
      receiptToken: data?.receipt?.qr_token ?? null,
      status,
      reason: data?.transaction?.failure_reason ?? null,
      redirectUrl: data?.payment_url ?? null,
    };
  } catch (e) {
    const reason =
      e instanceof ApiError
        ? (e.fields ? Object.values(e.fields).flat()[0] ?? e.message : e.message)
        : "Connexion impossible. Vérifie ta connexion et réessaie.";
    return { transactionId: null, receiptNumber: null, receiptToken: null, status: "echouee", reason, redirectUrl: null };
  }
}

/** Mappe l'id de canal du front vers l'enum attendu par l'API. */
export function channelId(methodTitle: string): string {
  const t = methodTitle.toLowerCase();
  if (t.includes("m-pesa") || t.includes("mpesa")) return "mpesa";
  if (t.includes("airtel")) return "airtel";
  if (t.includes("orange")) return "orange";
  if (t.includes("africell")) return "africell";
  return "visa";
}
