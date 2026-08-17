/** Centre de notifications du payeur (in-app). */
import { api } from "@/lib/api";

export interface AppNotification {
  id: string;
  type: string; // send | receive | service | tuition
  level: string; // success | error | info
  title: string;
  body?: string | null;
  read: boolean;
  created_at: string | null;
}

/**
 * Récupère les notifications de l'utilisateur. `token` optionnel : session staff
 * (établissement) ou admin ; sinon le token global (payeur) est utilisé.
 */
export async function fetchNotifications(
  token?: string,
  base = "/api/v1",
): Promise<{ notifications: AppNotification[]; unread: number }> {
  return api.get(`${base}/notifications`, token ? { token } : undefined);
}

export async function markNotificationsRead(token?: string, base = "/api/v1"): Promise<void> {
  await api.post(`${base}/notifications/read`, {}, token ? { token } : undefined);
}

export const NOTIFY_EVENT = "abcpay:notifications";

/** Signale un changement de notifications (après une action) → la cloche se rafraîchit aussitôt. */
export function pingNotifications(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(NOTIFY_EVENT));
}
