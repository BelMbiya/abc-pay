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
  login_email?: string | null;
  login_name?: string | null;
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
}

/** Modifie les informations d'un établissement (nom, type, ville, commission, statut). */
export async function updateEstablishment(id: string, input: UpdateEstablishmentInput): Promise<AdminEstablishment> {
  return api.patch<AdminEstablishment>(`/api/v1/admin/establishments/${id}`, input, auth());
}
