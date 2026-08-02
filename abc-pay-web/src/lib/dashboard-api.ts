/**
 * Données des tableaux de bord (établissement + plateforme), calculées côté serveur.
 */
import { api } from "@/lib/api";
import { getStaffToken } from "@/lib/staff-auth";
import { getAdminToken } from "@/lib/admin-auth";

export interface WeekPoint { week: string; label: string; value: number }
export interface ChannelSlice { channel: string; label: string; amount: number; pct: number }

export interface EstablishmentDashboard {
  kpis: { expected: number; collected: number; recovery_rate: number; remaining: number; pending_net: number };
  weekly: WeekPoint[];
  by_channel: ChannelSlice[];
  unpaid: { id: string; name: string; group: string; balance: number }[];
}

export interface AdminDashboard {
  kpis: { volume: number; commission: number; establishments: number; active_establishments: number; transactions: number };
  weekly: WeekPoint[];
  by_operator: ChannelSlice[];
  operators_health: { name: string; count: number; status: string }[];
  top_establishments: { name: string; volume: number }[];
  alerts: { title: string; level: string; detail: string }[];
}

/** Couleurs de marque par canal (pour les barres de répartition). */
export const CHANNEL_COLORS: Record<string, string> = {
  mpesa: "#E5484D",
  airtel: "#F5A623",
  orange: "#E08E00",
  africell: "#2D74D6",
  visa: "#0F1B30",
};

export async function fetchStaffDashboard(): Promise<EstablishmentDashboard> {
  return api.get("/api/v1/staff/dashboard", { token: getStaffToken() ?? undefined });
}

export async function fetchAdminDashboard(): Promise<AdminDashboard> {
  return api.get("/api/v1/admin/dashboard", { token: getAdminToken() ?? undefined });
}
