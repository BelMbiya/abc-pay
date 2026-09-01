import { api } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-auth";

export interface AuditLog {
  id: number | string;
  admin_id: string | null;
  admin_name: string | null;
  admin_role: string | null;
  action: string;
  method: string;
  path: string;
  target_type: string | null;
  target_id: string | null;
  status: number;
  ip: string | null;
  created_at: string | null;
}

/** Journal d'audit des actions admin (super-admin uniquement). */
export async function fetchAuditLogs(q?: string): Promise<AuditLog[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  const data = await api.get<{ logs: AuditLog[] }>(`/api/v1/admin/audit-logs${query}`, { token: getAdminToken() ?? undefined });
  return data.logs;
}
