import { api } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-auth";

export interface AdminAccount {
  id: number | string;
  name: string;
  email: string;
  role: string;
  role_label: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string | null;
}

export interface AdminRoleDef {
  id: string;
  label: string;
  permissions: string[];
}

const auth = () => ({ token: getAdminToken() ?? undefined });

export async function fetchAdmins(): Promise<{ admins: AdminAccount[]; roles: AdminRoleDef[] }> {
  return api.get<{ admins: AdminAccount[]; roles: AdminRoleDef[] }>("/api/v1/admin/admins", auth());
}

export async function createAdmin(input: { name: string; email: string; role: string; password: string }): Promise<AdminAccount> {
  return api.post<AdminAccount>("/api/v1/admin/admins", input, auth());
}

export async function updateAdmin(id: number | string, patch: { role?: string; is_active?: boolean }): Promise<AdminAccount> {
  return api.patch<AdminAccount>(`/api/v1/admin/admins/${id}`, patch, auth());
}

export async function deleteAdmin(id: number | string): Promise<void> {
  await api.delete(`/api/v1/admin/admins/${id}`, auth());
}

/** Réinitialise le mot de passe d'un autre admin → il devra le changer à sa prochaine connexion. */
export async function resetAdminPassword(id: number | string, newPassword: string): Promise<AdminAccount> {
  return api.post<AdminAccount>(`/api/v1/admin/admins/${id}/reset-password`, { new_password: newPassword }, auth());
}
