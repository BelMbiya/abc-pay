import { api } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-auth";

/** Établissement vu côté super-admin (avec son compte de connexion). */
export interface AdminEstablishment {
  id: string;
  name: string;
  merchant_code: string;
  type: string;
  level: string;
  city?: string | null;
  commission_rate: number;
  currency: string;
  billing_mode: string;
  is_active: boolean;
  status?: "active" | "pending" | "suspended";
  verification_pending?: boolean;
  login_email?: string | null;
  login_name?: string | null;
  payout_phone?: string | null;   // numéro mobile money de réception des reversements
  payout_method?: string | null;  // opérateur (ex. code CinetPay)
}

const auth = () => ({ token: getAdminToken() ?? undefined });

/** Liste des établissements + leur compte de connexion. */
export async function fetchAdminEstablishments(): Promise<AdminEstablishment[]> {
  const data = await api.get<AdminEstablishment[]>("/api/v1/admin/establishments", auth());
  return Array.isArray(data) ? data : [];
}

export interface CreateEstablishmentInput {
  name: string;
  type: string;
  city?: string;
  commission_rate?: number;
  currency?: string;
  billing_mode?: "payment_only" | "fee_management";
  login_email: string;
  login_password: string;
  login_name?: string;
}

/** Crée un établissement + son compte de connexion. */
export async function createEstablishment(input: CreateEstablishmentInput): Promise<AdminEstablishment> {
  return api.post<AdminEstablishment>("/api/v1/admin/establishments", input, auth());
}

export interface UpdateLoginInput {
  login_email?: string;
  login_password?: string;
  login_name?: string;
}

/** Modifie le compte de connexion (email / mot de passe) d'un établissement. */
export async function updateEstablishmentLogin(id: string, input: UpdateLoginInput): Promise<AdminEstablishment> {
  return api.patch<AdminEstablishment>(`/api/v1/admin/establishments/${id}/login`, input, auth());
}

export interface UpdateEstablishmentInput {
  name?: string;
  type?: string;
  city?: string;
  commission_rate?: number;
  currency?: string;
  billing_mode?: "payment_only" | "fee_management";
  is_active?: boolean;
  payout_phone?: string | null;
  payout_method?: string | null;
}

/** Modifie les informations d'un établissement (nom, type, ville, commission, statut). */
export async function updateEstablishment(id: string, input: UpdateEstablishmentInput): Promise<AdminEstablishment> {
  return api.patch<AdminEstablishment>(`/api/v1/admin/establishments/${id}`, input, auth());
}

/** Suppression définitive (refusée côté serveur si historique de transactions → suspendre). */
export async function deleteEstablishment(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/api/v1/admin/establishments/${id}`, auth());
}

/* ------------------------------ Reversements ------------------------------ */

export interface SettlementPending {
  gross: number;
  commission: number;
  net: number;
  count: number;
  period_start: string | null;
  period_end: string | null;
}

export interface EstablishmentSettlements {
  establishment: { id: string; name: string; currency: string };
  pending: SettlementPending;
  history: Array<{ period: string; gross: number; commission: number; net: number; count: number; status: string; reference: string | null; paid_at: string | null }>;
}

/** En attente + historique des reversements d'un établissement (admin). */
export async function fetchEstablishmentSettlements(id: string): Promise<EstablishmentSettlements> {
  return api.get<EstablishmentSettlements>(`/api/v1/admin/establishments/${id}/settlements`, auth());
}

/** Exécute le reversement des encaissements en attente (acte comptable admin). */
export async function executeSettlement(id: string, reference?: string): Promise<{ id: string; net: number; transactions_count: number; status: string }> {
  return api.post(`/api/v1/admin/establishments/${id}/settlements`, reference ? { reference } : {}, auth());
}

// ── Vérification (KYC responsable + KYB documents), pilotable par l'admin même sans dépôt ──

export interface KybDocItem {
  type: string;
  label: string;
  hint?: string;
  required: boolean;
  needs_number: boolean;
  provided: boolean;
  number?: string | null;
  status: string; // missing | pending | approved | rejected
  note?: string | null;
}

export interface EstablishmentVerification {
  items: KybDocItem[];
  completeness: { required: number; approved: number; complete: boolean; missing: string[] };
  director: { user_id: number; name?: string | null; phone?: string | null; kyc_required: boolean; kyc_status: string } | null;
}

/** Aperçu vérification d'un établissement (documents KYB + KYC du responsable). */
export async function fetchEstablishmentVerification(id: string): Promise<EstablishmentVerification> {
  return api.get<EstablishmentVerification>(`/api/v1/admin/establishments/${id}/documents`, auth());
}

/** Pose/actualise le statut (ou le numéro) d'une pièce KYB — sans exiger de fichier. */
export async function reviewEstablishmentDoc(
  id: string,
  input: { type: string; status?: "pending" | "approved" | "rejected"; number?: string; note?: string },
): Promise<KybDocItem & { completeness: EstablishmentVerification["completeness"] }> {
  return api.post(`/api/v1/admin/establishments/${id}/documents`, input, auth());
}

/** Confirme/rejette l'identité (KYC) d'un utilisateur — même s'il n'a rien soumis. */
export async function decideUserKyc(userId: number, decision: "approve" | "reject", reason?: string): Promise<unknown> {
  return api.post(`/api/v1/admin/kyc/${userId}/decide`, reason ? { decision, reason } : { decision }, auth());
}
