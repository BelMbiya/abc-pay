/**
 * Gestion des comptes utilisateurs (super-admin).
 * Endpoints admin : GET /admin/users · GET /admin/users/{id} · POST .../block|unblock|disconnect · DELETE.
 */
import { api } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-auth";

export interface AdminUser {
  id: number;
  name: string | null;
  phone: string;
  email: string | null;
  role: "particulier" | "etablissement";
  kyc_complete: boolean;
  is_blocked: boolean;
  status: "active" | "blocked";
  transactions_count: number;
  sessions_revoked_at: string | null;
  created_at: string | null;
}

export interface AdminUserDetail extends AdminUser {
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  id_doc_type: string | null;
  id_doc_number: string | null;
  blocked_reason: string | null;
  transactions: {
    id: string; type: string; amount: number; currency: string; status: string;
    channel: string; counterparty_name: string | null; counterparty_phone: string | null; created_at: string | null;
  }[];
  fraud_flags: { id: string; rule: string; severity: string; score: number; reason: string; status: string; created_at: string | null }[];
}

const auth = () => ({ token: getAdminToken() ?? undefined });

export async function fetchUsers(q?: string): Promise<AdminUser[]> {
  return api.get<AdminUser[]>(`/api/v1/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, auth());
}

export async function fetchUser(id: number): Promise<AdminUserDetail> {
  return api.get<AdminUserDetail>(`/api/v1/admin/users/${id}`, auth());
}

export async function blockUser(id: number, reason?: string): Promise<AdminUserDetail> {
  return api.post<AdminUserDetail>(`/api/v1/admin/users/${id}/block`, { reason }, auth());
}

export async function unblockUser(id: number): Promise<AdminUserDetail> {
  return api.post<AdminUserDetail>(`/api/v1/admin/users/${id}/unblock`, {}, auth());
}

export async function disconnectUser(id: number): Promise<AdminUserDetail> {
  return api.post<AdminUserDetail>(`/api/v1/admin/users/${id}/disconnect`, {}, auth());
}

export async function deleteUser(id: number): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/api/v1/admin/users/${id}`, auth());
}

export const ROLE_LABEL: Record<string, string> = {
  particulier: "Particulier",
  etablissement: "Établissement",
};
