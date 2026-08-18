/**
 * Enregistrement des transactions NON-Tuition du payeur (envoi P2P, paiement de service).
 * Renvoie le statut (succès/échec) et la raison — pour notifier/afficher côté front.
 */
import { api, ApiError } from "@/lib/api";
import { pingNotifications } from "@/lib/notifications-api";

export interface TransferInput {
  type: "send" | "service";
  amount: number;
  channel: string;
  currency?: string;
  counterparty_name?: string;
  counterparty_phone?: string;
  label?: string;
  reference?: string;
}

export interface TransferResult {
  transactionId: string | null; // id de la transaction (suivi de statut)
  receiptNumber: string | null;
  status: string; // confirmee | pending | echouee
  reason: string | null; // raison en cas d'échec
  // Passerelle (paiement de service) : URL de page hébergée à ouvrir (CinetPay). NULL =
  // push direct (Araka) → on va à la page de statut qui interroge (poll) jusqu'à confirmation.
  redirectUrl: string | null;
}

export async function recordTransaction(input: TransferInput): Promise<TransferResult> {
  try {
    const data = await api.post<{ transaction?: { id?: string; status?: string; failure_reason?: string | null }; receipt?: { number?: string }; payment_url?: string }>(
      "/api/v1/transactions",
      input,
      { idempotent: true },
    );
    pingNotifications(); // rafraîchit la cloche aussitôt
    return {
      transactionId: data?.transaction?.id ?? null,
      receiptNumber: data?.receipt?.number ?? null,
      status: data?.transaction?.status ?? "confirmee",
      reason: data?.transaction?.failure_reason ?? null,
      redirectUrl: data?.payment_url ?? null,
    };
  } catch (e) {
    // AUCUNE erreur silencieuse : un échec technique (réseau, validation, 500) ne doit
    // JAMAIS être présenté comme un succès. On remonte un échec réel avec la raison exacte.
    const reason =
      e instanceof ApiError
        ? (e.fields ? Object.values(e.fields).flat()[0] ?? e.message : e.message)
        : "Connexion impossible. Vérifie ta connexion et réessaie.";
    pingNotifications();
    return { transactionId: null, receiptNumber: null, status: "echouee", reason, redirectUrl: null };
  }
}
