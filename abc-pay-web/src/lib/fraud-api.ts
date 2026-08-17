/**
 * Détection de fraude (super-admin) — signalements persistés + actions.
 * Endpoints admin : GET /admin/fraud · POST /admin/fraud/{id}/dismiss · /block.
 */
import { api } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-auth";

export interface FraudFlag {
  id: string;
  rule: string;
  severity: string; // low | medium | high
  score: number;
  reason: string;
  status: string; // open | dismissed | actioned
  resolved_by: string | null;
  created_at: string | null;
  user_id: number | null;
  user: {
    id: number;
    name: string | null;
    phone: string | null;
    is_blocked: boolean;
    kyc_status: string;
  } | null;
  transaction: {
    id: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    channel: string;
    counterparty_name: string | null;
    counterparty_phone: string | null;
  } | null;
}

const auth = () => ({ token: getAdminToken() ?? undefined });

export async function fetchFraud(status?: string): Promise<{ flags: FraudFlag[]; open: number }> {
  return api.get(`/api/v1/admin/fraud${status && status !== "all" ? `?status=${status}` : ""}`, auth());
}

export async function dismissFlag(id: string): Promise<FraudFlag> {
  return api.post(`/api/v1/admin/fraud/${id}/dismiss`, {}, auth());
}

export async function blockFlag(id: string): Promise<FraudFlag> {
  return api.post(`/api/v1/admin/fraud/${id}/block`, {}, auth());
}

export const RULE_LABELS: Record<string, string> = {
  large_amount: "Montant élevé",
  failed: "Échec",
  velocity: "Vélocité anormale",
  no_kyc: "Compte non vérifié",
  blocked: "Compte bloqué",
  self_send: "Auto-envoi",
};

export const SEVERITY: Record<string, { label: string; tone: "soon" | "gold" | "live" }> = {
  high: { label: "Élevé", tone: "soon" },
  medium: { label: "Moyen", tone: "gold" },
  low: { label: "Faible", tone: "live" },
};

export const FRAUD_STATUS: Record<string, string> = {
  open: "Ouvert",
  dismissed: "Écarté",
  actioned: "Traité",
};
