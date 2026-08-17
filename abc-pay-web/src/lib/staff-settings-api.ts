import { api } from "@/lib/api";
import { getStaffToken } from "@/lib/staff-auth";

export interface EstablishmentSettings {
  accept_refunds: boolean;
  refund_window_days: number | null; // null = délai plateforme
  notify_staff_on_payment: boolean;
}

export interface StaffSettingsResponse {
  settings: EstablishmentSettings;
  platform_refund_window_days: number;
}

const auth = () => ({ token: getStaffToken() ?? undefined });

export async function fetchStaffSettings(): Promise<StaffSettingsResponse> {
  return api.get<StaffSettingsResponse>("/api/v1/staff/settings", auth());
}

export async function updateStaffSettings(patch: Partial<EstablishmentSettings>): Promise<{ settings: EstablishmentSettings }> {
  return api.put<{ settings: EstablishmentSettings }>("/api/v1/staff/settings", patch, auth());
}
