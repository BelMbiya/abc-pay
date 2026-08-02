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
  receiptNumber: string | null;
  status: string; // confirmee | echouee
  reason: string | null; // raison en cas d'échec
}

export async function recordTransaction(input: TransferInput): Promise<TransferResult> {
  try {
    const data = await api.post<{ transaction?: { status?: string; failure_reason?: string | null }; receipt?: { number?: string } }>(
      "/api/v1/transactions",
      input,
      { idempotent: true },
    );
    pingNotifications(); // rafraîchit la cloche aussitôt
    return {
      receiptNumber: data?.receipt?.number ?? null,
      status: data?.transaction?.status ?? "confirmee",
      reason: data?.transaction?.failure_reason ?? null,
    };
  } catch (e) {
    // AUCUNE erreur silencieuse : un échec technique (réseau, validation, 500) ne doit
    // JAMAIS être présenté comme un succès. On remonte un échec réel avec la raison exacte.
    const reason =
      e instanceof ApiError
        ? (e.fields ? Object.values(e.fields).flat()[0] ?? e.message : e.message)
        : "Connexion impossible. Vérifie ta connexion et réessaie.";
    pingNotifications();
    return { receiptNumber: null, status: "echouee", reason };
  }
}
